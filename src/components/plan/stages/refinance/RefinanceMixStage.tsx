'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Gavel, Pencil, RefreshCw } from 'lucide-react';
import type { MixData, PlanData, RefinanceMixData } from '@/lib/mortgage-plan';
import { REFINANCE_GOAL_LABELS, mixWithRemainingTerms } from '@/lib/refinance';
import type { MarketRates } from '@/lib/refinance';
import type { MortgageMix } from '@/components/mortgage-advisor/types';
import { calculateMortgageMix, formatCurrency } from '@/components/mortgage-advisor/mortgageCalculations';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import { RateRequestDialog } from '@/components/mortgage-advisor/rateRequest/RateRequestDialog';
import { RefinanceMortgageInput } from '@/components/mortgage-refinance/RefinanceMortgageInput';
import { reviveMix } from '@/components/refinance-check/refinanceCheckStore';
import { useToolData } from '@/components/tool-data/toolData';
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
  newRefinanceMixId,
  refinanceMixDataFrom,
  refinanceWorkspaceMix,
} from '@/components/mortgage-refinance/refinancePlan';
import type { RefinanceSaveOutcome, RefinanceSavePayload } from '@/components/mortgage-refinance/refinancePlan';
import { PanelBadge, StagePanel } from '../auction/ui';

const MODE_LABELS = { INTERNAL: 'מיחזור פנימי', EXTERNAL: 'מיחזור חיצוני' } as const;

/**
 * שדות שלב התמהיל לתמהיל למיחזור שנשמר — הסיכומים שהכרטיסים והשלבים הבאים
 * קוראים בלי לחשב לוח סילוקין מחדש.
 */
export function refinanceMixFields(
  mix: MixData,
  next: RefinanceMixData,
  recordId: string | null | undefined
): MixData {
  return {
    ...mix,
    mixRecordId: recordId ?? mix.mixRecordId,
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
  };
}

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
  advisorClientId,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: MixData) => void;
  market?: MarketRates | null;
  /**
   * תיק הלקוח, כשהמסך נפתח אצל היועץ. אז אותו כלי בדיוק, אבל מה שהיועץ שומר
   * נשמר כטיוטה (`advisorRefinanceDraft`) ואינו מגיע ללקוח עד שהיועץ משדר אותו.
   */
  advisorClientId?: string;
}) {
  const advisor = Boolean(advisorClientId);
  /** אצל היועץ העריכה ממשיכה מהטיוטה שלו, אם יש כזו */
  const refinance = (advisor ? data.MIX.advisorRefinanceDraft : null) ?? data.MIX.refinance;
  const { saved, save } = useSavedMixes({ planId, clientId: advisorClientId });
  /**
   * שמירת התמהיל למיחזור: אצל הלקוח — ישר לתהליך; אצל היועץ — כטיוטה שלו,
   * בלי לגעת במה שהלקוח רואה.
   */
  const commit = (next: RefinanceMixData, recordId: string | null | undefined) => {
    if (advisor) {
      onChange({ ...data.MIX, advisorRefinanceDraft: next });
      return;
    }
    onChange({ ...refinanceMixFields(data.MIX, next, recordId), refinancePending: false });
  };
  const [editing, setEditing] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  /** המשכנתא הנוכחית כפי שהיא נערכת בכלי — נפתחת ממה שנשמר */
  const [currentMix, setCurrentMix] = useState<MortgageMix | null>(null);
  const [perTrack, setPerTrack] = useState(false);
  /** תהליך שנפתח מהאזור האישי ועדיין אין בו תמהיל — המשכנתא הנוכחית מוזנת כאן */
  const [firstMix, setFirstMix] = useState<MortgageMix>(() => ({
    id: 'refinance-current',
    name: 'המשכנתא הנוכחית',
    totalAmount: 0,
    tracks: [],
    createdAt: new Date(),
  }));
  /**
   * המשכנתא הנוכחית שכבר הוזנה בכלי המיחזור — גם לפני ההרשמה — ממלאת את
   * התהליך החדש, כדי שלא יצטרכו להזין את המסלולים שוב.
   */
  const toolData = useToolData('refinance', reviveMix);
  useEffect(() => {
    // אצל היועץ הנתונים השמורים בכלי הם שלו, לא של הלקוח
    if (advisor || !toolData.ready || !toolData.initial) return;
    const known = toolData.initial;
    setFirstMix((current) => (current.tracks.length > 0 ? current : known));
  }, [advisor, toolData.ready, toolData.initial]);

  const calcs = useMemo(() => {
    if (!refinance) return null;
    return {
      base: calculateMortgageMix(mixWithRemainingTerms(mortgageMixOf(refinance.currentMix, refinance.savedAt))),
      refined: calculateMortgageMix(mortgageMixOf(refinance.refinancedMix, refinance.savedAt)),
    };
  }, [refinance]);

  if (!refinance) {
    // השמירה הראשונה בכלי ממלאת את נתוני המיחזור בתהליך הזה
    const saveFirst = async (payload: RefinanceSavePayload): Promise<RefinanceSaveOutcome> => {
      const next = refinanceMixDataFrom(payload, null);
      const mix = refinanceWorkspaceMix(next);
      const stored = await save(mix, { planId });
      commit(next, stored.recordId);
      return { planId, href: null, mix };
    };

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3" dir="rtl">
          <p className="text-sm font-bold text-blue-900">
            השלב הראשון במיחזור: מזינים את המשכנתא כפי שהיא היום, בונים בפאנל השליטה את התמהיל למיחזור, ושומרים
            אותו לתהליך בלחיצה על "שמור מצב נוכחי כתמהיל למיחזור".
          </p>
        </div>
        <RefinanceMortgageInput
          mix={firstMix}
          onMixChange={setFirstMix}
          perTrackRefinanceEnabled={perTrack}
          onPerTrackRefinanceEnabledChange={setPerTrack}
          onSaveRefinance={saveFirst}
          saveContext="plan"
          market={market}
        />
      </div>
    );
  }

  if (!calcs) return null;

  /** התמהיל למיחזור כתמהיל של כלי התכנון — מהתמהילים השמורים, או מתורגם מהשלב */
  const quoteMix =
    saved.find((item) => item.mix.id === refinance.refinancedMix.id)?.mix ?? refinanceWorkspaceMix(refinance);

  const persist = async (payload: RefinanceSavePayload): Promise<RefinanceSaveOutcome> => {
    /*
      הטיוטה הראשונה של היועץ מקבלת מזהה תמהיל משלה: התמהיל נשמר אצלו, ואם
      יחזור באותו מזהה של התמהיל שהלקוח כבר שמר, יופיעו אצל הלקוח שניים זהים.
    */
    const base =
      advisor && !data.MIX.advisorRefinanceDraft
        ? { ...refinance, refinancedMix: { ...refinance.refinancedMix, id: newRefinanceMixId() } }
        : refinance;
    const next = refinanceMixDataFrom(payload, base);
    const mix = refinanceWorkspaceMix(next);
    const stored = await save(mix, { planId });
    commit(next, stored.recordId);
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
            {advisor
              ? 'עורכים את התמהיל למיחזור. השמירה נשארת אצלכם כטיוטה, והלקוח יראה אותה רק אחרי שתשדרו אותה.'
              : 'עורכים את התמהיל למיחזור. שינויים נשמרים לתהליך רק בלחיצה על "שמור את התמהיל למיחזור".'}
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
        title={advisor && data.MIX.advisorRefinanceDraft ? 'הטיוטה שלכם למיחזור' : 'התמהיל שאושר למיחזור'}
        description={
          advisor && data.MIX.advisorRefinanceDraft
            ? `${REFINANCE_GOAL_LABELS[refinance.goal]} · המשכנתא הנוכחית ב${refinance.bank} מול הטיוטה ששמרתם. הלקוח עדיין רואה את התמהיל הקודם, עד שתשדרו את הטיוטה.`
            : `${REFINANCE_GOAL_LABELS[refinance.goal]} · המשכנתא הנוכחית ב${refinance.bank} מול התמהיל שבניתם. אפשר לפתוח את התמהיל לעריכה בכלי המיחזור ולשמור אותו שוב.`
        }
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
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-blue-700"
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
