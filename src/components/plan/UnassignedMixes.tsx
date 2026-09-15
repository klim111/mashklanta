'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, Trash2 } from 'lucide-react';
import { formatShekel, NumberField } from './ui';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';

/**
 * תמהילים שנשמרו בלי נכס.
 *
 * הם חיים באזור "תמהילים שמורים" ולא ברשימת המשכנתאות, כי הם עדיין לא
 * משכנתא: שיוך כתובת וסכום הוא מה שהופך תמהיל כזה לתהליך מלא עם חמשת השלבים.
 */
export function UnassignedMixesSection({
  mixes,
  onDelete,
}: {
  mixes: SavedMix[];
  onDelete: (mixId: string) => void;
}) {
  if (mixes.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-xl font-black text-slate-900">
        <Layers className="h-5 w-5 text-violet-600" />
        תמהילים ללא שיוך לנכס
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-slate-600">
          {mixes.length}
        </span>
      </h2>
      <UnassignedMixes mixes={mixes} onDelete={onDelete} />
    </section>
  );
}

function UnassignedMixes({
  mixes,
  onDelete,
}: {
  mixes: SavedMix[];
  onDelete: (mixId: string) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const attach = async (mix: SavedMix, deal: { address: string; value: number | null; amount: number | null }) => {
    if (!mix.recordId) return;
    setBusyId(mix.recordId);
    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMixId: mix.recordId,
          propertyAddress: deal.address,
          propertyValue: deal.value,
          mortgageAmount: deal.amount,
        }),
      });
      if (!response.ok) throw new Error('failed');
      const plan = await response.json();
      router.push(`/dashboard/plans/${plan.id}`);
    } finally {
      setBusyId(null);
    }
  };

  if (mixes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          אין תמהילים כלליים. אפשר ליצור אותם ב{' '}
          <Link href="/dashboard/mix-planner" className="font-black text-blue-600">
            כלי תכנון המשכנתאות
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {mixes.map((mix) => (
        <UnassignedMixCard
          key={mix.mix.id}
          mix={mix}
          busy={busyId === mix.recordId}
          onAttach={(deal) => void attach(mix, deal)}
          onDelete={() => onDelete(mix.mix.id)}
        />
      ))}
    </div>
  );
}

function UnassignedMixCard({
  mix,
  busy,
  onAttach,
  onDelete,
}: {
  mix: SavedMix;
  busy: boolean;
  onAttach: (deal: { address: string; value: number | null; amount: number | null }) => void;
  onDelete: () => void;
}) {
  const [address, setAddress] = useState('');
  const [value, setValue] = useState<number | null>(mix.mix.propertyValue ?? null);
  const [amount, setAmount] = useState<number | null>(mix.mix.totalAmount || null);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">{mix.mix.name || 'תמהיל ללא שם'}</h3>
          <p className="mt-1 text-xs text-slate-500">תמהיל כללי · ממתין לשיוך לנכס</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/mix-planner?mix=${encodeURIComponent(mix.mix.id)}`}
            className="text-xs font-black text-blue-600"
          >
            פתיחה בכלי התכנון
          </Link>
          {/* תמהיל כללי אינו קשור לשום תהליך, ולכן אפשר למחוק אותו מכאן */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('למחוק את התמהיל הזה? הוא אינו משויך לנכס, והמחיקה סופית.')) {
                onDelete();
              }
            }}
            aria-label="מחיקת התמהיל"
            title="מחיקת התמהיל"
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="סכום" value={formatShekel(mix.mix.totalAmount)} />
        <Stat label="החזר" value={formatShekel(mix.summary.monthlyPayment)} />
        <Stat label="ריבית ממוצעת" value={`${mix.summary.averageRate.toFixed(2)}%`} />
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <AddressAutocomplete value={address} onChange={setAddress} placeholder="כתובת הנכס לשיוך" />
        </div>
        <NumberField label="עלות הנכס" value={value} onChange={setValue} suffix="₪" />
        <NumberField label="גובה המשכנתא" value={amount} onChange={setAmount} suffix="₪" />
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy || !address.trim()}
            onClick={() => onAttach({ address, value, amount })}
            className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white disabled:opacity-50"
          >
            {busy ? 'משייך…' : 'שייכו לנכס והפכו למשכנתא בתהליך'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[13px] font-bold text-slate-500">{label}</div>
      <div className="text-lg font-black tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
