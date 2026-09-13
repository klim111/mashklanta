'use client';

import React, { useMemo } from 'react';
import { Crown, PiggyBank, TrendingDown } from 'lucide-react';
import { MixComparison } from '@/components/mortgage-advisor/MixComparison';
import type { ComparisonEntry } from '@/components/mortgage-advisor/MixComparison';
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
  signedMixKey?: string | null;
  onSelectForSigning?: (mixId: string) => void;
}

/**
 * מה שמוצג מתחת לדאשבורד.
 *
 * כשההצעה שבדאשבורד היא הזולה ביותר אין מה להשוות — מוצג כמה היא חוסכת מול
 * ההצעה היקרה שהתקבלה. כשנלחצה הצעה אחרת, מוצגת ההשוואה המלאה בינה לבין
 * הזולה: זו השאלה היחידה שנשאלת ברגע כזה — מה עולה לוותר על הזולה לטובתה.
 */
export function OfferComparisonArea({
  cheapest,
  featured,
  costliest,
  signedMixKey,
  onSelectForSigning,
}: OfferComparisonAreaProps) {
  const comparing = Boolean(
    cheapest && featured && featured.mix.id !== cheapest.mix.id
  );

  const entries = useMemo<ComparisonEntry[]>(() => {
    if (!comparing || !cheapest || !featured) return [];
    return [
      {
        id: cheapest.mix.id,
        label: `${cheapest.bank} · ההצעה הזולה`,
        mix: cheapest.mix,
        recordId: cheapest.recordId,
        isFinal: signedMixKey === cheapest.mix.id,
      },
      {
        id: featured.mix.id,
        label: `${featured.bank} · ${featured.mix.name}`,
        mix: featured.mix,
        recordId: featured.recordId,
        current: true,
        isFinal: signedMixKey === featured.mix.id,
      },
    ];
  }, [comparing, cheapest, featured, signedMixKey]);

  if (!cheapest || !featured) return null;

  if (!comparing) {
    return <BestOfferNote cheapest={cheapest} costliest={costliest} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-base font-black text-slate-800">
        {featured.bank} מול ההצעה הזולה של {cheapest.bank}
      </p>

      <MixComparison
        entries={entries}
        allowSelectFinal={Boolean(onSelectForSigning)}
        onSelectFinal={onSelectForSigning}
        selectFinalLabel="בחר תמהיל זה כתמהיל סופי לחתימה"
        selectFinalConfirm="לבחור את ההצעה הזו כתמהיל הסופי לחתימה? היא תופיע באזור האישי כ׳המשכנתא שלי׳, ומולה יאומתו מסמכי הבנק בשלב החתימה."
        selectedFinalLabel="זה התמהיל שנבחר לחתימה"
      />
    </div>
  );
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
            <SavingTile label="בסך התשלומים" value={formatShekel(saving.paid)} />
            <SavingTile label="בסך הריבית" value={formatShekel(saving.interest)} />
            <SavingTile label="בהחזר החודשי" value={formatShekel(saving.monthly)} />
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

function SavingTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-white p-3 text-center">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span className="mt-0.5 flex items-center justify-center gap-1 text-xl font-black tabular-nums text-emerald-700">
        <TrendingDown className="h-4 w-4" />
        {value}
      </span>
    </div>
  );
}
