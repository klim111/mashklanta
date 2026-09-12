'use client';

import { useMemo, useRef } from 'react';
import { analyzeProfile, requestedMortgage } from '@/lib/mortgage-plan';
import type { MixData, PlanData } from '@/lib/mortgage-plan';
import { MortgageWorkspace } from '@/components/mortgage-advisor/MortgageWorkspace';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { PrepaymentEvent } from '@/components/mortgage-advisor/engine';

function toMixData(saved: SavedMix, notes: string, asFinal = false): MixData {
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
    isFinal: asFinal || Boolean(saved.isFinal),
    finalLocked: asFinal || Boolean(saved.locked),
  };
}

/**
 * הכנסה חד-פעמית שהוצהרה בפרופיל הופכת לפירעון מוקדם מתוכנן:
 * הסכום והמועד נשמרים, והלקוח בוחר לאיזה מסלול לייעד אותם.
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
  planId,
  focusMixKey,
  clientId,
}: {
  data: PlanData;
  onChange: (next: MixData) => void;
  planId: string;
  focusMixKey?: string | null;
  /**
   * תיק הלקוח, כשהמסך נפתח אצל היועץ. זה ההבדל היחיד בין מה שהיועץ רואה למה
   * שהלקוח רואה: אותו כלי בדיוק, על התמהילים של אותו לקוח.
   */
  clientId?: string;
}) {
  const analysis = analyzeProfile(data.ANALYSIS);
  const profile = data.ANALYSIS;
  const preApproval = data.APPLICATIONS;
  const persist = useRef(onChange);
  persist.current = onChange;
  const notes = useRef(data.MIX.notes);
  notes.current = data.MIX.notes;
  const mixState = useRef(data.MIX);
  mixState.current = data.MIX;


  /**
   * כשהסלים האחידים כבר נשמרו כתמהילים, השלב נפתח ברשימת התמהילים ולא באשף —
   * כדי שהלקוח יתחיל מהסלים שקיבל בפועל ולא יזין הכול מחדש.
   */
  const basketsSaved = preApproval.baskets.some((basket) => basket.mixKey);
  const preferredMixIds = useMemo(() => {
    const fromBaskets = preApproval.baskets.flatMap((basket) =>
      basket.mixKey ? [basket.mixKey] : []
    );
    if (data.MIX.mixKey && !fromBaskets.includes(data.MIX.mixKey)) {
      return [data.MIX.mixKey, ...fromBaskets];
    }
    return fromBaskets;
  }, [preApproval.baskets, data.MIX.mixKey]);
  const prepayments = plannedPrepayments(data);
  /** ברירת מחדל: מחיר הנכס לפי אחוז המימון שהוזן בפרופיל, או פחות ההון העצמי */
  const defaultMortgage =
    requestedMortgage(
      profile.propertyValue ?? 0,
      profile.equity,
      profile.dealType,
      profile.targetLtvPercent
    ) ?? undefined;

  return (
    <div className="space-y-4">
      {/*
        הסכומים שהוצהרו לעתיד עוברים לכלי התמהיל עצמו דרך `defaultEvents`, ושם
        הם הופכים לפירעון מוקדם על מסלול. הרשימה שהייתה כאן רק חזרה על אותו
        מידע מעל הכלי, ולכן הוסרה.
      */}
      <MortgageWorkspace
        embedded
        skipPropertySetup
        planId={planId}
        clientId={clientId}
        startInSetup={!data.MIX.mixKey && !basketsSaved && !focusMixKey}
        preferredMixIds={preferredMixIds}
        activeMixKey={focusMixKey || data.MIX.mixKey}
        soloMixKey={focusMixKey || undefined}
        allowSelectFinal
        finalMixKey={data.MIX.finalLocked ? data.MIX.mixKey : null}
        disposableIncome={Math.round(analysis.disposableIncome) || undefined}
        defaultSetupSeed={{
          dealType: profile.dealType ?? undefined,
          maxMonthlyPayment: Math.round(analysis.maxMonthlyPayment) || undefined,
          totalAmount: defaultMortgage,
          propertyValue: profile.propertyValue ?? undefined,
          propertyAddress: profile.propertyAddress.trim() || undefined,
          equity: profile.equity ?? undefined,
        }}
        defaultEvents={prepayments}
        onActiveMix={(item) => {
          const current = mixState.current;
          if (current.finalLocked && current.mixKey && current.mixKey !== item.mix.id) return;
          persist.current(toMixData(item, notes.current, current.finalLocked && current.mixKey === item.mix.id));
        }}
        onSelectFinal={(item) => persist.current(toMixData(item, notes.current, true))}
      />
    </div>
  );
}
