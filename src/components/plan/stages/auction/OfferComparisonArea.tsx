'use client';

import React from 'react';
import { AlertTriangle, Crown, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';

interface OfferComparisonAreaProps {
  /** ההצעה הזולה ביותר */
  cheapest: PricedMix | null;
  /** ההצעה שפתוחה בדאשבורד */
  featured: PricedMix | null;
  /** ההצעה היקרה ביותר — מולה נמדד החיסכון */
  costliest: PricedMix | null;
}

/**
 * מה שמוצג מתחת לדאשבורד.
 *
 * במסך מוצגת הצעה אחת בכל רגע, ולא כולן יחד. כשזו הזולה — מוצג כמה היא חוסכת
 * מול ההצעה היקרה שהתקבלה. כשנפתחה הצעה אחרת — נאמר במפורש שהיא אינה
 * המשתלמת ביותר, וכמה היא עולה יותר מהזולה. זו השאלה היחידה שנשאלת ברגע כזה.
 */
export function OfferComparisonArea({
  cheapest,
  featured,
  costliest,
}: OfferComparisonAreaProps) {
  if (!cheapest || !featured) return null;

  if (featured.mix.id === cheapest.mix.id) {
    return <BestOfferNote cheapest={cheapest} costliest={costliest} />;
  }

  return <NotBestOfferNote featured={featured} cheapest={cheapest} />;
}

/** ההצעה המשתלמת ביותר, וכמה היא חוסכת מול היקרה שהתקבלה */
function BestOfferNote({
  cheapest,
  costliest,
}: {
  cheapest: PricedMix;
  costliest: PricedMix | null;
}) {
  const tone = bankTone(cheapest.bank);
  const saving =
    costliest && costliest.mix.id !== cheapest.mix.id
      ? {
          paid: costliest.summary.totalPaid - cheapest.summary.totalPaid,
          monthly: costliest.summary.monthlyPayment - cheapest.summary.monthlyPayment,
          interest: costliest.summary.totalInterest - cheapest.summary.totalInterest,
          bank: costliest.bank,
        }
      : null;

  return (
    <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50/60 p-5 text-center">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black text-white"
        style={{ backgroundColor: tone.dot }}
      >
        <Crown className="h-4 w-4" />
        ההצעה המשתלמת ביותר — בנק {cheapest.bank}
      </span>

      <p className="mt-2 text-sm font-bold text-slate-700">
        החזר {formatShekel(cheapest.summary.monthlyPayment)} · סך תשלום{' '}
        {formatShekel(cheapest.summary.totalPaid)} · ריבית ממוצעת{' '}
        {formatPercentage(cheapest.summary.averageRate)}
      </p>

      {saving ? (
        <>
          <h4 className="mt-4 flex items-center justify-center gap-2 text-xl font-black text-emerald-800">
            <PiggyBank className="h-6 w-6" />
            חוסכת {formatShekel(saving.paid)} מול ההצעה של {saving.bank}
          </h4>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <GapTile label="בסך התשלומים" value={formatShekel(saving.paid)} better />
            <GapTile label="בסך הריבית" value={formatShekel(saving.interest)} better />
            <GapTile label="בהחזר החודשי" value={formatShekel(saving.monthly)} better />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm font-bold text-slate-600">
          זו ההצעה היחידה שהתקבלה עד כה. כשתתקבל הצעה נוספת יוצג כאן החיסכון ביניהן.
        </p>
      )}
    </div>
  );
}

/** ההצעה שנפתחה אינה הזולה — כמה היא עולה יותר, ומול מי */
function NotBestOfferNote({
  featured,
  cheapest,
}: {
  featured: PricedMix;
  cheapest: PricedMix;
}) {
  const tone = bankTone(cheapest.bank);
  const gap = {
    paid: featured.summary.totalPaid - cheapest.summary.totalPaid,
    monthly: featured.summary.monthlyPayment - cheapest.summary.monthlyPayment,
    interest: featured.summary.totalInterest - cheapest.summary.totalInterest,
  };

  return (
    <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/60 p-5 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-sm font-black text-white">
        <AlertTriangle className="h-4 w-4" />
        זו אינה ההצעה המשתלמת ביותר
      </span>

      <h4 className="mt-3 text-lg font-black text-slate-900">
        ההצעה של {featured.bank} יקרה ב-{formatShekel(Math.abs(gap.paid))} מזו של{' '}
        <span
          className="rounded-full px-2.5 py-0.5 text-white"
          style={{ backgroundColor: tone.dot }}
        >
          {cheapest.bank}
        </span>
      </h4>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <GapTile label="בסך התשלומים" value={formatShekel(Math.abs(gap.paid))} better={gap.paid < 0} />
        <GapTile
          label="בסך הריבית"
          value={formatShekel(Math.abs(gap.interest))}
          better={gap.interest < 0}
        />
        <GapTile
          label="בהחזר החודשי"
          value={formatShekel(Math.abs(gap.monthly))}
          better={gap.monthly < 0}
        />
      </div>

      <p className="mt-3 text-sm font-bold text-slate-600">
        להצגת ההצעה המשתלמת ביותר — לחצו על {cheapest.bank} בשורת הבנקים או בטבלה שלמעלה.
      </p>
    </div>
  );
}

function GapTile({
  label,
  value,
  better,
}: {
  label: string;
  value: string;
  better: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 bg-white p-3 text-center ${
        better ? 'border-emerald-200' : 'border-amber-200'
      }`}
    >
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span
        className={`mt-0.5 flex items-center justify-center gap-1 text-xl font-black tabular-nums ${
          better ? 'text-emerald-700' : 'text-amber-700'
        }`}
      >
        {better ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
        {value}
      </span>
    </div>
  );
}
