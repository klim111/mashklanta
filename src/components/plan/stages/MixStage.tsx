'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { analyzeProfile, mortgageFromProperty } from '@/lib/mortgage-plan';
import type { MixData, PlanData } from '@/lib/mortgage-plan';
import { MortgageWorkspace } from '@/components/mortgage-advisor/MortgageWorkspace';
import type { PendingPrepay } from '@/components/mortgage-advisor/MortgageWorkspace';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { PrepaymentEvent } from '@/components/mortgage-advisor/engine';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

function FutureLumpAssign({
  event,
  mixes,
  onAssign,
}: {
  event: PrepaymentEvent;
  mixes: SavedMix[];
  onAssign: (next: PendingPrepay) => void;
}) {
  const withTracks = mixes.filter((item) => item.mix.tracks.length > 0);

  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="mt-2">
      <Select
        key={resetKey}
        onValueChange={(value) => {
          const separator = value.indexOf('::');
          if (separator <= 0) return;
          onAssign({
            mixId: value.slice(0, separator),
            trackId: value.slice(separator + 2),
            amount: event.amount,
            month: event.month,
            label: event.label,
          });
          setResetKey((current) => current + 1);
        }}
      >
        <SelectTrigger className="h-9 max-w-lg bg-white text-xs">
          <SelectValue placeholder="לאיזה מסלול לייעד את הסכום?" />
        </SelectTrigger>
        <SelectContent>
          {withTracks.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">שמרו תמהיל כדי לייעד את הסכום למסלול.</div>
          ) : (
            withTracks.map((item) => (
              <SelectGroup key={item.mix.id}>
                <SelectLabel className="pr-3 text-right text-[11px] font-black text-slate-700">
                  {item.mix.name || 'תמהיל ללא שם'}
                </SelectLabel>
                {item.mix.tracks.map((track) => (
                  <SelectItem key={`${item.mix.id}::${track.id}`} value={`${item.mix.id}::${track.id}`}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
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

  const { saved } = useSavedMixes();
  const [pendingPrepay, setPendingPrepay] = useState<PendingPrepay | null>(null);
  const clearPendingPrepay = useCallback(() => setPendingPrepay(null), []);

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
  const hasFutureIncome = prepayments.length > 0 || Boolean(profile.futureMonthlyIncrease);
  /** ברירת מחדל: מחיר הנכס פחות ההון העצמי שהוזן בפרופיל */
  const defaultMortgage =
    mortgageFromProperty(profile.propertyValue ?? 0, profile.equity, profile.dealType) ?? undefined;

  return (
    <div className="space-y-4">
      {hasFutureIncome && (
        <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h4 className="text-sm font-black text-slate-900">מה שהצהרתם עליו לעתיד</h4>
          </div>
          <ul className="space-y-2.5">
            {prepayments.map((event) => (
              <li key={event.id} className="text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                  <span>
                    <span className="font-bold text-slate-900">
                      {event.label} · {formatShekel(event.amount)}
                    </span>{' '}
                    צפוי בחודש {event.month}. בחרו מסלול כדי לפתוח פירעון מוקדם עם הסכום והמועד האלה.
                  </span>
                </div>
                <FutureLumpAssign event={event} mixes={saved} onAssign={setPendingPrepay} />
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
        skipPropertySetup
        startInSetup={!data.MIX.mixKey && !basketsSaved}
        preferredMixIds={preferredMixIds}
        activeMixKey={data.MIX.mixKey}
        defaultSetupSeed={{
          dealType: profile.dealType ?? undefined,
          maxMonthlyPayment: Math.round(analysis.maxMonthlyPayment) || undefined,
          totalAmount: defaultMortgage,
          propertyValue: profile.propertyValue ?? undefined,
          propertyAddress: profile.propertyAddress.trim() || undefined,
          equity: profile.equity ?? undefined,
        }}
        defaultEvents={prepayments}
        pendingPrepay={pendingPrepay}
        onPendingPrepayHandled={clearPendingPrepay}
        onActiveMix={(item) => persist.current(toMixData(item, notes.current))}
      />
    </div>
  );
}
