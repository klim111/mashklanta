'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, Loader2, Mail, UserRound, UserRoundCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { BankPreApproval } from '@/lib/mortgage-plan';
import type { AdvisorHandoffView } from '@/lib/preapproval-handoff-store';
import { fromLocalInputValue, toLocalInputValue } from './ui';

/**
 * הבנקים שהלקוח העביר ליועץ בשלב האישור העקרוני ("הגשה באמצעות יועץ משכלנתא").
 *
 * כאן היועץ קובע מועד לפגישה להשלמת הפרטים — המועד שנקבע הוא הסופי, ומופיע
 * אצל הלקוח עם התאריך והשעה — ולכל בנק מזין את הבנקאי המטפל ואת יום קבלת
 * האישור העקרוני. הלקוח רואה את הבנקאי עם כפתור מייל אליו, ואת תוקף הריביות.
 */
export function AdvisorBankHandoffs({ planId }: { planId: string | null }) {
  const [view, setView] = useState<AdvisorHandoffView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!planId) return;
    try {
      const response = await fetch(`/api/plans/${planId}/preapproval-handoff`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      setView((await response.json()) as AdvisorHandoffView);
    } catch {
      setView(null);
    }
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    if (!planId) return false;
    setError(null);
    try {
      const response = await fetch(`/api/plans/${planId}/preapproval-handoff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof result?.error === 'string' ? result.error : 'השמירה נכשלה');
        return false;
      }
      setView(result as AdvisorHandoffView);
      return true;
    } catch {
      setError('השמירה נכשלה');
      return false;
    }
  };

  if (!view || view.banks.length === 0) return null;

  return (
    <Card className="border-violet-200 bg-violet-50/40">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
            <UserRoundCheck className="h-4 w-4 text-violet-600" />
            הגשות שהלקוח העביר אליכם
          </p>
          <p className="text-[11px] text-slate-500">
            הלקוח בחר שיועץ משכלנתא יגיש בשמו ל{view.banks.map((row) => row.bank).join(', ')}. קבעו פגישה
            להשלמת הפרטים, ואחרי ההגשה הזינו את הבנקאי המטפל ואת תאריך האישור — הלקוח יראה אותם בכרטיס
            של הבנק, עם תוקף הריביות.
          </p>
        </div>

        <MeetingPicker
          startsAt={view.meeting?.startsAt ?? null}
          onSave={(iso) => patch({ meetingAt: iso })}
        />

        <div className="grid gap-2 md:grid-cols-2">
          {view.banks.map((row) => (
            <HandoffBankRow key={row.bank} row={row} onSave={(values) => patch({ bank: row.bank, ...values })} />
          ))}
        </div>

        {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

function MeetingPicker({
  startsAt,
  onSave,
}: {
  startsAt: string | null;
  onSave: (iso: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(startsAt ? toLocalInputValue(startsAt) : '');
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(startsAt ? toLocalInputValue(startsAt) : ''), [startsAt]);

  const iso = value ? fromLocalInputValue(value) : null;
  const changed = Boolean(iso) && iso !== startsAt;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-white p-2.5">
      <CalendarClock className="h-4 w-4 shrink-0 text-violet-600" />
      <p className="text-xs font-black text-slate-700">פגישה להשלמת פרטים להגשה לבנקים</p>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 focus:border-violet-400 focus:outline-none"
      />
      <button
        type="button"
        disabled={!changed || busy}
        onClick={async () => {
          if (!iso) return;
          setBusy(true);
          await onSave(iso);
          setBusy(false);
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {startsAt ? 'שינוי המועד' : 'קביעת המועד'}
      </button>
      <p className="w-full text-[11px] text-slate-500">
        {startsAt
          ? 'המועד נקבע ומופיע אצל הלקוח בשלב האישור העקרוני ובלוח השנה שלו.'
          : 'עוד לא נקבע מועד. המועד שתקבעו יופיע אצל הלקוח כפגישה קבועה.'}
      </p>
    </div>
  );
}

function HandoffBankRow({
  row,
  onSave,
}: {
  row: BankPreApproval;
  onSave: (values: { bankerName: string; bankerEmail: string; approvedAt: string | null }) => Promise<boolean>;
}) {
  const [name, setName] = useState(row.bankerName ?? '');
  const [email, setEmail] = useState(row.bankerEmail ?? '');
  const [approvedAt, setApprovedAt] = useState(row.approved && row.approvedAt ? row.approvedAt.slice(0, 10) : '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(row.bankerName ?? '');
    setEmail(row.bankerEmail ?? '');
    setApprovedAt(row.approved && row.approvedAt ? row.approvedAt.slice(0, 10) : '');
  }, [row.bankerName, row.bankerEmail, row.approved, row.approvedAt]);

  const today = new Date();
  const max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-black text-slate-900">
        {row.bank}
        <span className={`mr-2 text-[11px] font-bold ${row.approved ? 'text-emerald-700' : 'text-violet-700'}`}>
          {row.approved ? 'אישור עקרוני התקבל' : 'בטיפולכם'}
        </span>
      </p>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 focus-within:border-violet-400">
        <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="שם הבנקאי המטפל"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 focus-within:border-violet-400">
        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          type="email"
          dir="ltr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="banker@bank.co.il"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-left text-xs font-bold text-slate-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
        תאריך קבלת האישור העקרוני
        <input
          type="date"
          value={approvedAt}
          max={max}
          onChange={(event) => setApprovedAt(event.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 focus:border-violet-400 focus:outline-none"
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setSaved(false);
            const ok = await onSave({ bankerName: name, bankerEmail: email, approvedAt: approvedAt || null });
            setBusy(false);
            setSaved(ok);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          שמירה
        </button>
        {saved && <span className="text-[11px] font-bold text-emerald-700">נשמר ומוצג ללקוח</span>}
      </div>
    </div>
  );
}
