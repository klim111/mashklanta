'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Building2, Gavel, Pencil, RefreshCw } from 'lucide-react';
import type { MixData, PlanData } from '@/lib/mortgage-plan';
import { REFINANCE_GOAL_LABELS, mixWithRemainingTerms } from '@/lib/refinance';
import type { MarketRates } from '@/lib/refinance';
import type { MortgageMix } from '@/components/mortgage-advisor/types';
import { calculateMortgageMix, formatCurrency } from '@/components/mortgage-advisor/mortgageCalculations';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import { RateRequestDialog } from '@/components/mortgage-advisor/rateRequest/RateRequestDialog';
import { RefinanceMortgageInput } from '@/components/mortgage-refinance/RefinanceMortgageInput';
import {
  MixResultRow,
  MixRowsHeader,
  StateBlocksRow,
  mixStatsOf,
  snapshotOf,
} from '@/components/mortgage-refinance/RefinanceResultsDashboard';
import {
  draftStateOf,
  mortgageMixOf,
  refinanceMixDataFrom,
  refinanceWorkspaceMix,
} from '@/components/mortgage-refinance/refinancePlan';
import type { RefinanceSaveOutcome, RefinanceSavePayload } from '@/components/mortgage-refinance/refinancePlan';
import { PanelBadge, StagePanel } from '../auction/ui';

const MODE_LABELS = { INTERNAL: 'מיחזור פנימי', EXTERNAL: 'מיחזור חיצוני' } as const;

/**
 * שלב התמהיל בתהליך מיחזור.
 *
 * במקום כלי בניית התמהילים של משכנתא חדשה, השלב מציג את התמהיל שכבר אושר
 * למיחזור — המשכנתא הנוכחית מולו — ומאפשר לפתוח אותו לעריכה בכלי המיחזור
 * עצמו ולשמור שוב. "הכנת בקשה להצעת מחיר לבנק" היא בדיוק אותה בקשה שמכינים
 * במשכנתא חדשה, על התמהיל למיחזור.
 */
export function RefinanceMixStage({
  data,
  planId,
  onChange,
  market = null,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: MixData) => void;
  market?: MarketRates | null;
}) {
  const refinance = data.MIX.refinance;
  const { saved, save } = useSavedMixes({ planId });
  const [editing, setEditing] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  /** המשכנתא הנוכחית כפי שהיא נערכת בכלי — נפתחת ממה שנשמר */
  const [currentMix, setCurrentMix] = useState<MortgageMix | null>(null);
  const [perTrack, setPerTrack] = useState(false);

  const calcs = useMemo(() => {
    if (!refinance) return null;
    return {
      base: calculateMortgageMix(mixWithRemainingTerms(mortgageMixOf(refinance.currentMix, refinance.savedAt))),
      refined: calculateMortgageMix(mortgageMixOf(refinance.refinancedMix, refinance.savedAt)),
    };
  }, [refinance]);

  if (!refinance || !calcs) return null;

  /** התמהיל למיחזור כתמהיל של כלי התכנון — מהתמהילים השמורים, או מתורגם מהשלב */
  const quoteMix =
    saved.find((item) => item.mix.id === refinance.refinancedMix.id)?.mix ?? refinanceWorkspaceMix(refinance);

  const persist = async (payload: RefinanceSavePayload): Promise<RefinanceSaveOutcome> => {
    const next = refinanceMixDataFrom(payload, refinance);
    const mix = refinanceWorkspaceMix(next);
    const stored = await save(mix, { planId });
    onChange({
      ...data.MIX,
      mixRecordId: stored.recordId ?? data.MIX.mixRecordId,
      mixKey: next.refinancedMix.id,
      mixName: next.refinancedMix.name,
      totalAmount: next.refinancedMix.totalAmount,
      monthlyPayment: next.refinanced.monthlyPayment,
      averageRate: next.refinanced.averageRate,
      totalInterest: next.refinanced.totalInterest,
      totalPaid: next.refinanced.totalPaid,
      months: next.refinanced.months,
      isFinal: true,
      refinance: next,
    });
    return { planId, href: null, mix };
  };

  const openEditor = () => {
    setCurrentMix(mortgageMixOf(refinance.currentMix, refinance.savedAt));
    setPerTrack(false);
    setEditing(true);
  };

  const monthsOf = (calc: typeof calcs.base) =>
    Object.fromEntries(calc.trackCalculations.map((tc) => [tc.track.id, tc.amortSchedule.length]));

  if (editing && currentMix) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-bold text-slate-700">
            עורכים את התמהיל למיחזור. שינויים נשמרים לתהליך רק בלחיצה על "שמור את התמהיל למיחזור".
          </p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-button font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לתמהיל שאושר
          </button>
        </div>
        <RefinanceMortgageInput
          mix={currentMix}
          onMixChange={setCurrentMix}
          perTrackRefinanceEnabled={perTrack}
          onPerTrackRefinanceEnabledChange={setPerTrack}
          initialSummaryRevealed
          refinanceInitial={draftStateOf(refinance)}
          onSaveRefinance={persist}
          saveContext="plan"
          onRefinanceSaveDone={() => setEditing(false)}
          market={market}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StagePanel
        tone="accent"
        badge={
          <PanelBadge tone="emerald">
            <RefreshCw className="h-3.5 w-3.5" />
            {refinance.mode ? MODE_LABELS[refinance.mode] : 'תמהיל למיחזור'}
          </PanelBadge>
        }
        title="התמהיל שאושר למיחזור"
        description={`${REFINANCE_GOAL_LABELS[refinance.goal]} · המשכנתא הנוכחית ב${refinance.bank} מול התמהיל שבניתם. אפשר לפתוח את התמהיל לעריכה בכלי המיחזור ולשמור אותו שוב.`}
      >
        <div className="space-y-2.5" dir="rtl">
          <StateBlocksRow
            title="המצב הנוכחי"
            caption={`${refinance.bank} · ${formatCurrency(refinance.currentMix.totalAmount)} קרן`}
            snapshot={snapshotOf(calcs.base)}
            tone="current"
          />
          <StateBlocksRow
            title="התמהיל למיחזור"
            caption="כפי שנשמר"
            snapshot={snapshotOf(calcs.refined)}
            baseline={snapshotOf(calcs.base)}
            tone="refinanced"
          />

          <div className="space-y-2 border-t border-slate-100 pt-2.5">
            <MixRowsHeader />
            <MixResultRow
              title="התמהיל היום"
              stats={mixStatsOf(calcs.base)}
              tone="current"
              tracks={refinance.currentMix.tracks}
              trackMonths={monthsOf(calcs.base)}
            />
            <MixResultRow
              title="התמהיל למיחזור"
              subtitle={`${refinance.refinancedMix.tracks.length} מסלולים`}
              stats={mixStatsOf(calcs.refined)}
              baseline={mixStatsOf(calcs.base)}
              tone="refinanced"
              tracks={refinance.refinancedMix.tracks}
              trackMonths={monthsOf(calcs.refined)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 py-2.5 text-button font-black text-slate-800 transition-colors hover:border-slate-900"
          >
            <Pencil className="h-4 w-4" />
            פתח תמהיל נבחר לעריכה
          </button>
          <button
            type="button"
            onClick={() => setQuoteOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-slate-700"
          >
            <Gavel className="h-4 w-4" />
            הכנת בקשה להצעת מחיר לבנק
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Building2 className="h-3.5 w-3.5" />
            {refinance.bank}
          </span>
        </div>
      </StagePanel>

      {/*
        מיחזור פנימי מוגש לבנק שבו המשכנתא מנוהלת, ולכן המכתב מופנה אליו ואין
        שורת בחירת בנק. במיחזור חיצוני הלקוח פונה לבנקים אחרים, ולכן הבחירה
        נשארת פתוחה — והניסוח מציין את הבנק שבו המשכנתא מנוהלת היום.
      */}
      <RateRequestDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        mix={quoteMix}
        purpose="refinance"
        currentBank={refinance.bank}
        fixedBank={refinance.mode === 'EXTERNAL' ? undefined : refinance.bank}
      />
    </div>
  );
}
