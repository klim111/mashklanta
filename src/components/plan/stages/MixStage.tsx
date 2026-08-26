'use client';

import { useRef } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { analyzeProfile } from '@/lib/mortgage-plan';
import type { MixData, PlanData } from '@/lib/mortgage-plan';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { PrepaymentEvent } from '@/components/mortgage-advisor/engine';
import { MortgageWorkspace } from '@/components/mortgage-advisor/MortgageWorkspace';
import { formatShekel } from '../ui';

function toMixData(saved: SavedMix, notes: string): MixData {
  return {
    mixRecordId: saved.recordId ?? null,
    mixKey: saved.mix.id,
    mixName: saved.mix.name || 'תמהיל ללא שם',
    totalAmount: saved.mix.totalAmount,
    monthlyPayment: saved.summary.monthlyPayment,
    averageRate: saved.summary.averageRate,
    totalInterest: saved.summary.totalInterest,
    totalPaid: saved.summary.totalPaid,
    months: saved.summary.months,
    propertyAddress: saved.mix.propertyAddress?.trim() ?? '',
    propertyValue: saved.mix.propertyValue ?? null,
    notes,
  };
}

/**
 * הכנסה חד-פעמית שהוצהרה בפרופיל הופכת לפירעון מוקדם מתוכנן בתמהיל החדש:
 * קיצור תקופה הוא מה שחוסך הכי הרבה ריבית, ולכן זו ברירת המחדל.
 */
function plannedPrepayments(data: PlanData): PrepaymentEvent[] {
  return data.ANALYSIS.futureLumpSums.flatMap((item) => {
    if (!item.amount || item.amount <= 0 || !item.inYears) return [];
    return [
      {
        id: `plan-${item.id}`,
        kind: 'prepayment' as const,
        month: Math.max(1, Math.round(item.inYears * 12)),
        amount: item.amount,
        mode: 'shorten_term' as const,
        label: item.label || 'הכנסה עתידית מהפרופיל',
      },
    ];
  });
}

export function MixStage({
  data,
  onChange,
}: {
  data: PlanData;
  onChange: (next: MixData) => void;
}) {
  const analysis = analyzeProfile(data.ANALYSIS);
  const profile = data.ANALYSIS;
  const preApproval = data.APPLICATIONS;
  const persist = useRef(onChange);
  persist.current = onChange;
  const notes = useRef(data.MIX.notes);
  notes.current = data.MIX.notes;

  /**
   * כשהסלים האחידים כבר נשמרו כתמהילים, השלב נפתח ברשימת התמהילים ולא באשף —
   * כדי שהלקוח יתחיל מהסלים שקיבל בפועל ולא יזין הכול מחדש.
   */
  const basketsSaved = preApproval.baskets.some((basket) => basket.mixKey);
  const prepayments = plannedPrepayments(data);
  const hasFutureIncome = prepayments.length > 0 || Boolean(profile.futureMonthlyIncrease);

  return (
    <div className="space-y-4">
      {hasFutureIncome && (
        <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h4 className="text-sm font-black text-slate-900">מה שהצהרתם עליו לעתיד</h4>
          </div>
          <ul className="space-y-1.5">
            {prepayments.map((event) => (
              <li key={event.id} className="flex items-center gap-2 text-xs text-slate-600">
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span>
                  <span className="font-bold text-slate-900">
                    {event.label} · {formatShekel(event.amount)}
                  </span>{' '}
                  נכנס לתמהיל חדש כפירעון מוקדם בחודש {event.month}, בשיטת קיצור תקופה.
                </span>
              </li>
            ))}
            {profile.futureMonthlyIncrease ? (
              <li className="flex items-center gap-2 text-xs text-slate-600">
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span>
                  תוספת חודשית צפויה של{' '}
                  <span className="font-bold text-slate-900">
                    {formatShekel(profile.futureMonthlyIncrease)}
                  </span>
                  {profile.futureMonthlyIncreaseInYears
                    ? ` בעוד ${profile.futureMonthlyIncreaseInYears} שנים`
                    : ''}{' '}
                  — שווה לשקול תקופה קצרה יותר במסלול אחד, או פירעון מוקדם שוטף.
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      )}

      <MortgageWorkspace
        embedded
        startInSetup={!data.MIX.mixKey && !basketsSaved}
        defaultSetupSeed={{
          dealType: profile.dealType ?? undefined,
          maxMonthlyPayment: Math.round(analysis.maxMonthlyPayment) || undefined,
          totalAmount: preApproval.approvedAmount ?? (analysis.requiredLoan || undefined),
          propertyValue: profile.propertyValue ?? undefined,
          propertyAddress: profile.propertyAddress.trim() || undefined,
        }}
        defaultEvents={prepayments}
        onActiveMix={(item) => persist.current(toMixData(item, notes.current))}
      />
    </div>
  );
}
