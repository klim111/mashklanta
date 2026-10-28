'use client';

import { BadgeCheck, Building2, Layers } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TrackStrip } from '@/components/plan/stages/auction/TrackStrip';
import { bankTone } from '@/components/plan/stages/auction/pricedMixes';
import { formatShekel, formatPercent } from '@/components/plan/ui';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { PlanView } from '@/components/plan/usePlan';

export interface PlanMix {
  /** האם זהו התמהיל שכבר תומחר ונבחר לחתימה */
  priced: boolean;
  title: string;
  bank: string | null;
  monthlyPayment: number | null;
  averageRate: number | null;
  totalInterest: number | null;
  totalPaid: number | null;
  saved: SavedMix | null;
}

/**
 * התמהיל של התהליך, כפי שהוא עומד עכשיו.
 *
 * אם כבר נבחרה הצעה מתומחרת בשלב המכרז — זו המשכנתא, והיא מוצגת עם הבנק
 * והריביות שקיבל. אחרת מוצג התמהיל שנבנה בשלב 2, במבנה בלבד: הריביות שלו הן
 * הערכה, ואין טעם להציג אותן כאילו בנק כבר נקב בהן.
 */
export function planMixOf(plan: PlanView, mixes: SavedMix[]): PlanMix | null {
  const signed = plan.data.AUCTION.signedMix;
  if (signed) {
    return {
      priced: true,
      title: signed.name,
      bank: signed.bank,
      monthlyPayment: signed.monthlyPayment,
      averageRate: signed.averageRate,
      totalInterest: signed.totalInterest,
      totalPaid: signed.totalPaid,
      saved: mixes.find((item) => item.mix.id === signed.mixKey) ?? null,
    };
  }

  const mix = plan.data.MIX;
  if (!mix.mixKey && !mix.mixName) return null;
  return {
    priced: false,
    title: mix.mixName || 'התמהיל שבניתם',
    bank: null,
    monthlyPayment: mix.monthlyPayment,
    averageRate: mix.averageRate,
    totalInterest: mix.totalInterest,
    totalPaid: mix.totalPaid,
    saved: mixes.find((item) => item.mix.id === mix.mixKey) ?? null,
  };
}

/** כרטיס התמהיל — בחלון ההצצה ובשורת הפירוט בסקירה */
export function PlanMixDetail({ mix, planId }: { mix: PlanMix; planId: string }) {
  const tone = bankTone(mix.bank);

  return (
    <div className={`rounded-2xl border-2 p-4 ${mix.priced ? `${tone.border} ${tone.surface}` : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="inline-flex items-center gap-1.5 text-lg font-black text-slate-900">
          {mix.priced ? (
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
          ) : (
            <Layers className="h-5 w-5 text-violet-600" />
          )}
          {mix.priced ? 'התמהיל המתומחר שנבחר' : 'התמהיל שבניתם'}
        </span>
        {mix.bank && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black text-white"
            style={{ backgroundColor: tone.dot }}
          >
            <Building2 className="h-3.5 w-3.5" />
            בנק {mix.bank}
          </span>
        )}
      </div>
      <p className="mt-1 text-center text-sm text-slate-600">{mix.title}</p>

      {mix.saved && mix.saved.mix.tracks.length > 0 && (
        <div className="mt-4">
          <TrackStrip tracks={mix.saved.mix.tracks} variant={mix.priced ? 'rates' : 'structure'} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MixStat label="החזר חודשי" value={formatShekel(mix.monthlyPayment)} />
        <MixStat label="ריבית ממוצעת" value={formatPercent(mix.averageRate, 2)} />
        <MixStat label="סך ריבית" value={formatShekel(mix.totalInterest)} />
        <MixStat label="סך תשלום" value={formatShekel(mix.totalPaid)} />
      </div>

      <div className="mt-4 flex justify-center">
        <Link
          href={`/dashboard/plans/${planId}?stage=${mix.priced ? 'SIGNING' : 'MIX'}`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-info font-black text-white transition-colors hover:bg-blue-700"
        >
          {mix.priced ? 'לשלב החתימה' : 'לעריכת התמהיל'}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MixStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-black tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
