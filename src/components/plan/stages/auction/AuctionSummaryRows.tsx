'use client';

import React from 'react';
import { Building2, Crown } from 'lucide-react';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';

/**
 * שורת ההצעה הזולה ביותר.
 *
 * זו השורה הראשונה במסך, והיא תמיד ההצעה הזולה — הפילטור שלה אוטומטי ואינו
 * מושפע מסימון בנקים או מבחירה בדאשבורד. מי שמסתכל על המסך צריך לדעת מיד מה
 * ההצעה הטובה ביותר שיש כרגע על השולחן.
 */
export function CheapestOfferRow({ winner }: { winner: PricedMix | null }) {
  if (!winner) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-5 py-6 text-center text-sm font-bold text-slate-600">
        עדיין לא התקבלה אף הצעה מתומחרת. כשתתקבל הראשונה היא תופיע כאן.
      </div>
    );
  }

  const tone = bankTone(winner.bank);
  const { summary } = winner;

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-amber-400 bg-white shadow-sm">
      <div className="h-1.5 w-full bg-amber-400" />

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* הבנק שנתן את ההצעה הזולה — הבלוק הראשון בשורה */}
        <div
          className="flex flex-col items-center justify-center rounded-2xl p-3 text-center text-white"
          style={{ backgroundColor: tone.dot }}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-white/90">
            <Crown className="h-3.5 w-3.5" />
            ההצעה הזולה
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xl font-black">
            <Building2 className="h-5 w-5" />
            {winner.bank}
          </span>
        </div>

        <SummaryBlock label="החזר חודשי" value={formatShekel(summary.monthlyPayment)} emphasized />
        <SummaryBlock label="סך ריביות" value={formatShekel(summary.totalInterest)} />
        <SummaryBlock label="סך תשלומים" value={formatShekel(summary.totalPaid)} />
        <SummaryBlock label="ריבית ממוצעת" value={formatPercentage(summary.averageRate)} />
      </div>
    </div>
  );
}

/**
 * שורת המצב של ההתמחרות: כמה הצעות התקבלו, מכמה בנקים, ומה הפער ביניהן
 * בהחזר החודשי ובסך הריבית. הפער הוא מה שההתמחרות שווה בפועל, ולכן עם הצעה
 * אחת נאמר במפורש שאין עדיין מה להשוות — במקום להציג אפס שנקרא כאילו כל
 * הבנקים נתנו את אותו מחיר.
 */
export function OffersStatsRow({
  offers,
  banks,
  monthlyGap,
  interestGap,
}: {
  offers: number;
  banks: number;
  monthlyGap: number | null;
  interestGap: number | null;
}) {
  const single = 'יש כרגע הצעה אחת בלבד';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryBlock label="הצעות שהתקבלו" value={String(offers)} boxed />
      <SummaryBlock label="בנקים שתמחרו" value={String(banks)} boxed />
      <SummaryBlock
        label="פער בין הזולה ליקרה בהחזר החודשי"
        value={monthlyGap === null ? single : formatShekel(monthlyGap)}
        muted={monthlyGap === null}
        boxed
      />
      <SummaryBlock
        label="פער בין הזולה ליקרה בסך הריבית"
        value={interestGap === null ? single : formatShekel(interestGap)}
        muted={interestGap === null}
        boxed
      />
    </div>
  );
}

function SummaryBlock({
  label,
  value,
  emphasized = false,
  boxed = false,
  muted = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  boxed?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center ${
        boxed ? 'border-2 border-slate-200 bg-white shadow-sm' : 'bg-slate-50/70'
      }`}
    >
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span
        className={`mt-1 font-black tabular-nums ${
          muted ? 'text-sm text-slate-500' : emphasized ? 'text-2xl text-slate-900' : 'text-xl text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
