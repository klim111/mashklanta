'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  LayoutDashboard,
  Loader2,
  PartyPopper,
  Pencil,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import {
  PLAN_STAGES,
  flowStages,
  isPlanStage,
  missingForStage,
  nextPlanStage,
  planFlowOf,
  previousPlanStage,
  stageIndex,
  stageIsComplete,
  unfinishedPrerequisites,
} from '@/lib/mortgage-plan';
import type {
  AnalysisData,
  AuctionData,
  MixData,
  PlanFlow,
  PlanStageId,
  PlanStageStatus,
  PreApprovalData,
  RefinanceMode,
  SigningData,
} from '@/lib/mortgage-plan';
import { journeyStageFor, planStageMeta } from '@/data/platform/planStages';
import { usePlan } from './usePlan';
import type { PlanView, SaveState } from './usePlan';
import { PlanTour, TOUR_FREE_CHANGES, tourAllowsTry } from './PlanTour';
import { StageTasksPanel } from './tasks/StageTasksPanel';
import { VaultButton } from './documents/VaultButton';
import Mashkalanta from '@/components/ui/mashkalanta';
import { StageRail } from './StageRail';
import { StageIntro } from './StageIntro';
import { formatShekel } from './ui';
import { AdvisorStageNotes } from './AdvisorStageNotes';
import { AdvisorStageSummary } from './advisor/AdvisorStageSummary';
import { useAdvisorOrders } from './advisor/useAdvisorOrders';
import { useClientMeetings, meetingForStage } from './advisor/useClientMeetings';
import { isAdvisorStage } from '@/lib/advisor-orders';
import { AnalysisStage } from './stages/AnalysisStage';
import { MixStage } from './stages/MixStage';
import { PreApprovalStage } from './stages/PreApprovalStage';
import { AuctionStage } from './stages/AuctionStage';
import { SigningStage } from './stages/SigningStage';
import { RefinanceMixStage } from './stages/refinance/RefinanceMixStage';
import { RefinanceModeChoice } from './stages/refinance/RefinanceModeChoice';
import { AdvisorHelpButton } from './stages/analysis/AdvisorHelpButton';
import { useMarketRates } from '@/hooks/useMarketRates';
import { demoId } from '@/demo/demo-attr';

const saveLabels: Record<SaveState, { label: string; className: string }> = {
  idle: { label: 'הכל שמור', className: 'text-white/80' },
  dirty: { label: 'שומר…', className: 'text-white/70' },
  saving: { label: 'שומר…', className: 'text-white/70' },
  saved: { label: 'נשמר בחשבון שלכם', className: 'text-emerald-300' },
  error: { label: 'השמירה נכשלה', className: 'text-rose-300' },
};

/**
 * שולחן העבודה של התהליך.
 *
 * כל שלב פתוח מהסרגל שלמעלה, גם כשהשלבים שלפניו עוד לא הושלמו: הלקוח משלים
 * את השלבים בסדר שהוא בוחר, ושדה שנשען על שלב פתוח מוצג ריק עם הפניה לשלב
 * שבו משלימים אותו.
 *
 * ב-`tour` הוא רץ על תהליך הדגמה: מסכי ההסבר צפים מעל הכלי, "נסו את השלב"
 * פותח אותו לשלושה ערכים ואז ההסבר חוזר, והסרגל למעלה זז יחד עם הדפים.
 */
export function PlanWorkspace({
  planId,
  tour = false,
}: {
  planId: string;
  tour?: boolean;
}) {
  const {
    plan,
    ready,
    error,
    saveState,
    blocked,
    updateStage: rawUpdateStage,
    completeStage,
    goToStage,
    rename,
  } = usePlan(planId);

  // ─────────────────────────── הסיור ───────────────────────────
  const [tourOpen, setTourOpen] = useState(tour);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourReturned, setTourReturned] = useState(false);
  /** הערכים ששונו מאז "נסו את השלב" — נספרים לפי שדה, לא לפי הקשה */
  const changedKeys = useRef<Set<string>>(new Set());
  const planRef = useRef<PlanView | null>(null);
  planRef.current = plan;

  /** מעבר בין דפי ההסבר מזיז גם את הסרגל למעלה ואת הכלי שמתחת */
  const changeTourIndex = useCallback(
    (index: number) => {
      setTourIndex(index);
      setTourReturned(false);
      const target = PLAN_STAGES[Math.min(index, PLAN_STAGES.length - 1)];
      void goToStage(target);
    },
    [goToStage]
  );

  const tryStage = useCallback(() => {
    changedKeys.current = new Set();
    setTourReturned(false);
    setTourOpen(false);
  }, []);


  /** בסיור כל ערך שמשתנה בכלי נספר, ואחרי שלושה ערכים מסך ההסבר חוזר */
  const updateStage = useCallback(
    <S extends PlanStageId>(stage: S, next: PlanView['data'][S]) => {
      const previous = planRef.current?.data[stage] as Record<string, unknown> | undefined;
      rawUpdateStage(stage, next);
      // מסך שרק מציצים בו חוזר להסבר בלחיצה, לא לפי ספירת שינויים
      if (!tour || tourOpen || !tourAllowsTry(stage)) return;
      const incoming = next as unknown as Record<string, unknown>;
      Object.keys(incoming).forEach((key) => {
        // מסכי הניווט הפנימיים אינם ערך שהלקוח הזין
        if (key === 'profileScreen' || key === 'screen') return;
        if (JSON.stringify(incoming[key]) !== JSON.stringify(previous?.[key])) {
          changedKeys.current.add(`${stage}.${key}`);
        }
      });
      if (changedKeys.current.size >= TOUR_FREE_CHANGES) {
        changedKeys.current = new Set();
        setTourReturned(true);
        setTourOpen(true);
      }
    },
    [rawUpdateStage, tour, tourOpen]
  );

  const [completing, setCompleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [viewingStage, setViewingStage] = useState<PlanStageId | null>(null);
  const [focusMixKey, setFocusMixKey] = useState<string | null>(null);
  /**
   * השלבים שהלקוח פתח בהם את הפירוט המלא למרות שיועץ מטפל בהם. ברירת המחדל
   * היא הסיכום, ו"הצג פרטים" פותח את השלב עצמו.
   */
  const [detailStages, setDetailStages] = useState<PlanStageId[]>([]);
  /**
   * השלבים שהלקוח כבר התחיל, אחרי עמוד ההסבר. נשמר בדפדפן לפי התהליך, כדי
   * שעמוד ההסבר לא יופיע שוב בכל טעינה אחרי שכבר נכנס לעבוד.
   */
  const [enteredStages, setEnteredStages] = useState<PlanStageId[]>([]);
  /** השלב שעבורו נשלחת כעת בקשת ליווי חינמית */
  const [handoffBusy, setHandoffBusy] = useState<PlanStageId | null>(null);
  /** סוג המיחזור שנבחר כרגע ונשמר — עד שהשרת פותח את השלב הבא */
  const [choosingMode, setChoosingMode] = useState<RefinanceMode | null>(null);
  const orders = useAdvisorOrders(planId);
  const { meetings } = useClientMeetings();
  /** הריביות הממוצעות בשוק — לכלי המיחזור בתוך התהליך */
  const { market } = useMarketRates();

  const enteredKey = `mashklanta:stage-diy:${planId}`;
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(enteredKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setEnteredStages(PLAN_STAGES.filter((stage) => parsed.includes(stage)));
    } catch {
      setEnteredStages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const enterStage = (stage: PlanStageId) => {
    setEnteredStages((prev) => {
      if (prev.includes(stage)) return prev;
      const next = [...prev, stage];
      try {
        window.localStorage.setItem(enteredKey, JSON.stringify(next));
      } catch {
        // אחסון חסום — נמשיך בלי לשמור, ההסבר יופיע שוב בטעינה הבאה
      }
      return next;
    });
  };

  const requestFreeHandoff = async (stage: PlanStageId) => {
    if (tour) {
      // בסיור אין תהליך אמיתי לבקש עליו ליווי — חוזרים להסבר, שמסתיים בהצעה
      setTourReturned(false);
      setTourOpen(true);
      return;
    }
    setHandoffBusy(stage);
    try {
      await orders.requestFree(stage);
    } finally {
      setHandoffBusy(null);
    }
  };

  const statuses = useMemo(() => {
    const map = {} as Record<PlanStageId, PlanStageStatus>;
    PLAN_STAGES.forEach((stage) => {
      map[stage] = plan?.stages.find((item) => item.stage === stage)?.status ?? 'PENDING';
    });
    return map;
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    const params = new URLSearchParams(window.location.search);
    const mix = params.get('mix');
    const requested = params.get('stage');
    if (mix) setFocusMixKey(mix);
    if (requested && isPlanStage(requested)) {
      setViewingStage(requested);
      void goToStage(requested);
    }
    // נקרא פעם אחת כשהתהליך נטען, כדי לפתוח תמהיל סופי מהדאשבורד
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h2 className="text-subtitle font-black text-slate-900">התהליך לא נמצא</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-button font-bold text-white"
        >
          חזרה לאזור האישי
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  /**
   * סוג התהליך: משכנתא חדשה, או מיחזור — פנימי או חיצוני. הוא קובע את סדר
   * השלבים, את הכותרות שלהם ואת הכלי שנפתח בשלב התמהיל.
   */
  const flow = planFlowOf(plan.data);
  const stages = flowStages(flow);
  const refinance = plan.data.MIX.refinance;
  const isRefinance = flow.kind === 'REFINANCE';
  const internalRefinance = isRefinance && flow.refinanceMode === 'INTERNAL';
  /** מיחזור שעדיין לא נבחר בו בין פנימי לחיצוני — קודם המסך שמסביר את ההבדל */
  const modePending = isRefinance && flow.refinanceMode === null;

  const stage = viewingStage ?? plan.currentStage;
  /*
    שלבים קודמים שעוד לא הושלמו אינם נועלים את השלב. מה שנשאר מהם הוא ההפניה:
    אם חסרים בהם פרטים, מעל הכלי מופיעה שורה שאומרת איפה משלימים אותם.
  */
  const openPrerequisites = tour
    ? []
    : unfinishedPrerequisites(stage, statuses, flow).filter(
        (prior) => missingForStage(prior, plan.data).length > 0
      );
  /** מסך שרק מציצים בו בסיור (האישור העקרוני): כל לחיצה מחזירה להסבר */
  const lookOnly = tour && !tourOpen && !tourAllowsTry(stage);
  const journey = journeyStageFor(stage);
  const meta = planStageMeta(stage, flow);
  const StageIcon = journey.icon;
  const index = stageIndex(stage, flow);
  const canComplete = stageIsComplete(stage, plan.data);
  const missing = missingForStage(stage, plan.data);
  const isDone = statuses[stage] === 'COMPLETED';
  const previous = previousPlanStage(stage, flow);
  const next = nextPlanStage(stage, flow);
  const save = saveLabels[saveState];
  /** כלי בניית התמהיל רחב מדי לפריסה עם סרגל צדדי; שלב הפרופיל מקבל את כל הרוחב כדי שהשאלה הראשונה תישב במרכז */
  const usesExistingTool = stage === 'MIX' || stage === 'ANALYSIS';
  /* המסך האחרון בשלב הפרופיל הוא הדוח — התוצר שלו — ולכן שם נסגר השלב */
  const analysisOnLastSubstep =
    stage !== 'ANALYSIS' ||
    (Boolean(plan.data.ANALYSIS.intent) &&
      (plan.data.ANALYSIS.profileScreen || 'overview') === 'report');
  /*
    שלב שהלקוח הזמין ליווי עליו ושילם עובר לתצוגת סיכום: דאשבורד אחד קצר
    במקום הכלים, עם כפתור "ראה פרטים" שפותח את השלב המלא כמו שהוא.
  */
  /*
    שלב שהלקוח ביקש עליו ליווי מטופל על ידי היועץ: מוצג כרטיס סיכום עם הפגישה
    שנקבעה, ו"הצג פרטים" פותח את השלב המלא. זהה בכל חמשת השלבים.
  */
  const advisorRun = isAdvisorStage(orders.orders, stage);
  const showingDetails = detailStages.includes(stage);
  const advisorSummaryOnly = advisorRun && !showingDetails;
  const showStageFooter = !tour && analysisOnLastSubstep && (canComplete || isDone);
  const advisorName =
    orders.orders.find(
      (order) =>
        order.stages.includes(stage) &&
        (order.status === 'PAID' || order.status === 'REQUESTED')
    )?.advisorName ?? null;
  const stageMeeting = meetingForStage(meetings, stage);

  /*
    עמוד ההסבר: לפני כל שלב, למעט כלי בניית התמהיל, מופיע עמוד הסבר אחד עם
    כפתור "התחילו את השלב". בפרופיל ובחתימה הוא התת-שלב הראשון ("על השלב")
    ולכן הם מציגים אותו בעצמם; כאן הוא מוצג לאישור העקרוני ולמכרז. אין בו
    שאלה אם לעשות את השלב לבד או עם יועץ — הפנייה ליועץ זמינה מהכפתור הצף.
  */
  const needsIntro =
    !tour &&
    !advisorRun &&
    !isDone &&
    (stage === 'APPLICATIONS' || stage === 'AUCTION') &&
    !enteredStages.includes(stage);

  const toggleStageDetails = () =>
    setDetailStages((current) =>
      current.includes(stage) ? current.filter((item) => item !== stage) : [...current, stage]
    );

  /** מסך "היועץ מטפל בשלב זה" — מעל השלב */
  const advisorSummaryCard = advisorRun ? (
    <AdvisorStageSummary
      stage={stage}
      data={plan.data}
      status={statuses[stage]}
      advisorName={advisorName}
      meeting={stageMeeting}
      detailsOpen={showingDetails}
      onToggleDetails={toggleStageDetails}
    />
  ) : null;

  const selectStage = (nextStage: PlanStageId) => {
    if (tour) {
      // לחיצה על הסרגל בסיור פותחת את דף ההסבר של אותו שלב
      setViewingStage(null);
      setTourIndex(stageIndex(nextStage));
      setTourReturned(false);
      setTourOpen(true);
      void goToStage(nextStage);
      return;
    }
    /*
      המעבר מיידי ואינו תלוי בשלבים הקודמים. השלב שנבחר נשמר גם בשרת, כדי
      שהכניסה הבאה לתהליך תחזור אליו.
    */
    setViewingStage(nextStage);
    void goToStage(nextStage);
  };

  /**
   * הבחירה בין מיחזור פנימי לחיצוני. היא נשמרת בנתוני שלב התמהיל וסוגרת
   * אותו — ומכאן השרת פותח את השלב הבא לפי סוג המיחזור שנבחר.
   */
  const chooseRefinanceMode = async (mode: RefinanceMode) => {
    if (!refinance) return;
    setChoosingMode(mode);
    try {
      rawUpdateStage('MIX', { ...plan.data.MIX, refinance: { ...refinance, mode } });
      await completeStage('MIX');
      setViewingStage(null);
    } finally {
      setChoosingMode(null);
    }
  };

  const stageFooter = (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <button
                    type="button"
                    disabled={!previous}
                    onClick={() => previous && selectStage(previous)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="h-4 w-4" />
                    השלב הקודם
                  </button>

                  <div className="flex flex-col items-end gap-1.5">
                    {isDone && next ? (
                      <button
                        type="button"
                        onClick={() => selectStage(next)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-button font-black text-white transition-all hover:bg-slate-700"
                      >
                        המשיכו לשלב הבא
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canComplete || completing}
                        onClick={() => void onComplete()}
                        className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-button font-black text-white transition-all ${
                          canComplete
                            ? `bg-gradient-to-l ${journey.gradient} shadow-lg hover:shadow-xl hover:brightness-110`
                            : 'cursor-not-allowed bg-slate-200 text-slate-400'
                        }`}
                      >
                        {completing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {next ? 'סגרו את השלב והמשיכו' : 'סיימו את התהליך'}
                      </button>
                    )}

                    {!canComplete && missing.length > 0 && (
                      <span className="text-2xs text-slate-400">
                        כדי לסגור את השלב חסר: {missing.join(', ')}
                      </span>
                    )}
                    {blocked === stage && (
                      <span className="text-2xs font-bold text-rose-500">
                        השרת דחה את סגירת השלב — הנתונים נשמרו, אך עדיין חסר מידע.
                      </span>
                    )}
                  </div>
                </div>
  );

  const submitName = async () => {
    const clean = draftName.trim();
    setEditingName(false);
    if (clean && clean !== plan.name) await rename(clean);
  };

  const onComplete = async () => {
    setCompleting(true);
    await completeStage(stage);
    setViewingStage(null);
    setCompleting(false);
  };

  /**
   * אישור התמהיל הסופי סוגר את שלב בניית התמהיל וממשיך לאישור העקרוני: זו
   * המשמעות של הבחירה, ולכן אין טעם להשאיר את המשתמש על המסך שכבר סיים.
   */
  const finishMixStage = async () => {
    await completeStage('MIX');
    setViewingStage(null);
    await goToStage('APPLICATIONS');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      {/* כותרת התהליך ופס השלבים */}
      <header className="relative overflow-hidden bg-slate-950" {...demoId('plan-header')}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col items-center gap-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <Mashkalanta variant="header" autoPlay />

            <div className="min-w-0 md:text-center">
              <Link
                href="/dashboard"
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-white/70 transition-colors hover:text-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                האזור האישי
              </Link>

              {tour ? (
                <div className="md:mx-auto">
                  <h1 className="text-title font-black text-white">{plan.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 md:justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-100 ring-1 ring-amber-300/40">
                      <Sparkles className="h-3.5 w-3.5" />
                      סיור היכרות · הנתונים לא נשמרים
                    </span>
                    {!tourOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setTourReturned(false);
                          setTourOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-white/25"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        חזרה להסבר על השלב
                      </button>
                    )}
                  </div>
                </div>
              ) : editingName ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={submitName}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void submitName();
                    if (event.key === 'Escape') setEditingName(false);
                  }}
                  className="w-full max-w-md rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-2xl font-black text-white outline-none focus:border-white/50 md:mx-auto"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(plan.name);
                    setEditingName(true);
                  }}
                  className="group flex items-center gap-2 md:mx-auto"
                >
                  <h1 className="truncate text-title font-black text-white">
                    {plan.name}
                  </h1>
                  <Pencil className="h-4 w-4 shrink-0 text-white/50 transition-colors group-hover:text-white" />
                </button>
              )}

              {!tour && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs md:justify-center">
                {plan.propertyAddress && (
                  <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white/80">
                    {plan.propertyAddress}
                  </span>
                )}
                {isRefinance && refinance && (
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 font-bold text-emerald-100 ring-1 ring-emerald-300/40">
                    {flow.refinanceMode === 'INTERNAL'
                      ? `מיחזור פנימי · ${refinance.bank}`
                      : flow.refinanceMode === 'EXTERNAL'
                        ? `מיחזור חיצוני · מ${refinance.bank}`
                        : `מיחזור · ${refinance.bank}`}
                  </span>
                )}
                {plan.mortgageAmount ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white/80">
                    משכנתא {formatShekel(plan.mortgageAmount)}
                  </span>
                ) : null}
                {plan.monthlyPayment ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white/80">
                    החזר {formatShekel(plan.monthlyPayment)}
                  </span>
                ) : null}
                <span className={`inline-flex items-center gap-1.5 font-bold ${save.className}`}>
                  {saveState === 'error' ? (
                    <CloudOff className="h-3.5 w-3.5" />
                  ) : saveState === 'saving' || saveState === 'dirty' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Cloud className="h-3.5 w-3.5" />
                  )}
                  {save.label}
                </span>
              </div>
              )}
            </div>

            <ProgressRing value={plan.progress} />
          </div>

          {/* עד שנבחר סוג המיחזור לא ידוע אילו שלבים יהיו — הסרגל מחכה לבחירה */}
          {!modePending && (
            <StageRail current={stage} statuses={statuses} onSelect={selectStage} flow={flow} />
          )}

          {/* תיק המסמכים — זמין מכל שלב, עם ההתקדמות לכל שלב ולכל התהליך */}
          {!tour && (
            <div className="mt-4">
              <VaultButton planId={plan.id} data={plan.data} stage={stage} variant="header" />
            </div>
          )}
        </div>
      </header>

      <main
        className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 ${lookOnly ? 'cursor-pointer' : ''}`}
        onClickCapture={
          lookOnly
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                setTourReturned(false);
                setTourOpen(true);
              }
            : undefined
        }
      >
        {plan.status === 'COMPLETED' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-teal-50 px-5 py-4"
          >
            <PartyPopper className="h-6 w-6 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-black text-emerald-900">
                {isRefinance ? 'המיחזור הושלם' : 'התהליך הושלם'}
              </div>
              <div className="text-xs text-emerald-800">
                {isRefinance
                  ? `כל ${stages.length} השלבים נסגרו. המשכנתא לאחר המיחזור מופיעה עכשיו באזור האישי.`
                  : 'חמשת השלבים נסגרו. המשכנתא מופיעה עכשיו באזור האישי כמשכנתא שתוכננה.'}
              </div>
            </div>
            <Link
              href="/mortgage-dashboard"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-700"
            >
              למעקב אחרי המשכנתא
            </Link>
          </motion.div>
        )}

        {/* מיחזור שטרם נבחר בו סוג: קודם ההסבר על ההבדל בין פנימי לחיצוני */}
        {modePending && refinance && (
          <RefinanceModeChoice refinance={refinance} onChoose={(mode) => void chooseRefinanceMode(mode)} busy={choosingMode} />
        )}

        {/* כותרת השלב הפעיל */}
        {!modePending && (
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            {...demoId('plan-stage-title')}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28 }}
          >
            <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className={`h-1.5 w-full bg-gradient-to-l ${journey.gradient}`} />
              <div className="flex flex-wrap items-center gap-4 p-4 md:px-6 md:py-4">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${journey.gradient} shadow-lg`}
                >
                  <StageIcon className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-400">
                      שלב {index + 1} מתוך {stages.length}
                    </span>
                    {isDone && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs font-black text-emerald-700">
                        <Check className="h-3 w-3" />
                        הושלם
                      </span>
                    )}
                  </div>
                  <h2 className="text-subtitle font-black text-slate-900">{meta.title}</h2>
                  <p className="text-sm text-slate-500">{meta.hint}</p>
                </div>

              </div>
            </div>

            {/* מה שהיועץ כתב ללקוח בשלב הזה, מעל תוכן השלב עצמו */}
            {!tour && <AdvisorStageNotes stage={stage} />}

            {/* המשימות המתוכננות של השלב — לכל לקוח עם תהליך פתוח */}
            {!tour && !advisorSummaryOnly && !needsIntro && (
              <div {...demoId('plan-stage-tasks')}>
                <StageTasksPanel planId={plan.id} stage={stage} />
              </div>
            )}

            {advisorRun && <div className="mb-4">{advisorSummaryCard}</div>}

            {/* עמוד ההסבר של השלב — מסך אחד, ומיד "התחילו את השלב" */}
            {!advisorSummaryOnly && needsIntro && (
              <StageIntro stage={stage} flow={flow} onStart={() => enterStage(stage)} />
            )}

            {/*
              שלב שנפתח לפני שקודמיו הושלמו: הכלי פתוח במלואו, והשורה הזו אומרת
              באיזה שלב משלימים את הפרטים שהשדות הריקים נשענים עליהם.
            */}
            {!advisorSummaryOnly && !needsIntro && openPrerequisites.length > 0 && (
              <PrerequisiteNotice
                stages={openPrerequisites}
                flow={flow}
                onSelectStage={selectStage}
              />
            )}

            {/*
              כשיועץ מטפל בשלב, מה שמוצג הוא הסיכום בלבד. "הצג פרטים" פותח את
              השלב המלא — אותם כלים, אותם מסכים, בלי שום הסתרה.
            */}
            {!advisorSummaryOnly && !needsIntro && (
            <div {...demoId('plan-stage-content')}>
              <div>
            {usesExistingTool ? (
              <div className="space-y-5">
                {stage === 'ANALYSIS' && (
                  <AnalysisStage
                    data={plan.data}
                    planId={plan.id}
                    planName={plan.propertyAddress || plan.name}
                    onChange={(next: AnalysisData) => updateStage('ANALYSIS', next)}
                    onChangeSigning={(next: SigningData) => updateStage('SIGNING', next)}
                    refinance={isRefinance}
                    flow={flow}
                  />
                )}
                {/*
                  שלב התמהיל מוצג בלי שורת "כלים נוספים": כלי בניית התמהיל הוא
                  מסך עבודה מלא, וקישורים לכלים אחרים מעליו רק מושכים החוצה ממנו.
                */}
                {/* במיחזור שלב התמהיל הוא כלי המיחזור, על התמהיל שכבר אושר */}
                {stage === 'MIX' && isRefinance && (
                  <RefinanceMixStage
                    data={plan.data}
                    planId={plan.id}
                    market={market}
                    onChange={(next: MixData) => updateStage('MIX', next)}
                  />
                )}
                {stage === 'MIX' && !isRefinance && (
                  <MixStage
                    data={plan.data}
                    planId={plan.id}
                    focusMixKey={focusMixKey}
                    onChange={(next: MixData) => updateStage('MIX', next)}
                    onFinalConfirmed={() => void finishMixStage()}
                    onAnalysisChange={(next: AnalysisData) => updateStage('ANALYSIS', next)}
                  />
                )}
                {showStageFooter && stageFooter}
              </div>
            ) : (
              <div className="space-y-5">
                {stage === 'APPLICATIONS' && (
                  <PreApprovalStage
                    data={plan.data}
                    planId={plan.id}
                    onChange={(next: PreApprovalData) => updateStage('APPLICATIONS', next)}
                    onGoToProfile={() => selectStage('ANALYSIS')}
                    /* במיחזור פנימי מגישים לבנק שבו המשכנתא מנוהלת בלבד */
                    banks={internalRefinance && refinance ? [refinance.bank] : undefined}
                    copy={
                      internalRefinance
                        ? {
                            mixTitle: 'התמהיל למיחזור',
                            mixDescription:
                              'זה התמהיל שאושר בשלב הקודם, ועליו מוגשת בקשת המיחזור לבנק. לשינוי, חזרו לשלב התמהיל ופתחו אותו לעריכה.',
                            banksTitle: 'הגשת בקשת המיחזור לבנק',
                            banksDescription:
                              'הקישור פותח את אזור המשכנתאות הדיגיטלי של הבנק שבו המשכנתא מנוהלת. רוב הנתונים כבר אצלו, ולכן נדרשים פחות מסמכים וזמן. את האישור שתקבלו העלו כאן — ואז ממשיכים לאימות ההצעה.',
                          }
                        : isRefinance
                          ? {
                              mixTitle: 'התמהיל למיחזור',
                              mixDescription:
                                'זה התמהיל שנבחר למיחזור, ועליו מוגשת הבקשה לאישור עקרוני. לשינוי, חזרו לשלב התמהיל ופתחו אותו לעריכה.',
                              banksTitle: 'הגשת בקשת אישור עקרוני למיחזור',
                              banksDescription:
                                'בנק חדש בוחן את הפרופיל הפיננסי ואת הנכס מחדש, בדיוק כמו במשכנתא חדשה. פנו לכל בנק שתרצו להתמחר מולו, והעלו כאן את האישור העקרוני שהתקבל.',
                            }
                          : undefined
                    }
                  />
                )}
                {stage === 'AUCTION' && (
                  <AuctionStage
                    data={plan.data}
                    planId={plan.id}
                    onChange={(next: AuctionData) => updateStage('AUCTION', next)}
                    advisorRun={advisorRun}
                    banks={internalRefinance && refinance ? [refinance.bank] : undefined}
                    refinance={refinance}
                  />
                )}
                {stage === 'SIGNING' && (
                  <SigningStage
                    data={plan.data}
                    planId={plan.id}
                    onChange={(next: SigningData) => updateStage('SIGNING', next)}
                    flow={flow}
                  />
                )}

                {showStageFooter && stageFooter}
              </div>
            )}
              </div>
            </div>
            )}
          </motion.div>
        </AnimatePresence>
        )}
      </main>

      {/*
        הכפתורים הצפים של הפינה הימנית — תיק המסמכים למעלה והחזרה לדאשבורד
        מתחתיו, בעמודה אחת. הפינה השמאלית שמורה לכפתור «פנו ליועץ» של השלב,
        וכך השניים אינם עולים זה על זה.
      */}
      {/*
        פנייה ליועץ — בכל מסך, בכל שלב ובכל סוג תהליך. זו הדרך היחידה להביא
        יועץ לשלב: אין לפני השלבים שאלה אם לעשות אותם לבד או עם יועץ.
      */}
      {!tour && !advisorRun && !modePending && (
        <AdvisorHelpButton
          key={stage}
          stageLabel={`שלב ${index + 1} מתוך ${stages.length} · ${meta.shortTitle}`}
          title="היעזרו ביועץ משכנתא בשלב הזה"
          description={
            stage === 'ANALYSIS' && !isRefinance
              ? undefined
              : `יועץ משכלנתא ייקח על עצמו את ${meta.title}${isRefinance ? ' במיחזור שלכם' : ''}: יבחן את מה שכבר הזנתם, ישלים את מה שחסר וילווה אתכם מול הבנק. הבקשה חינמית — התשלום מסודר מולו בהמשך, רק אם תחליטו להמשיך.`
          }
          onRequestAdvisor={() => void requestFreeHandoff(stage)}
          busy={handoffBusy === stage}
        />
      )}

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
        {!tour && <VaultButton planId={plan.id} data={plan.data} stage={stage} variant="compact" />}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-button font-black text-white shadow-xl shadow-slate-900/30 transition-transform hover:-translate-y-0.5"
        >
          <LayoutDashboard className="h-5 w-5" />
          חזרה לדאשבורד
        </Link>
      </div>

      <AnimatePresence>
        {tour && tourOpen && (
          <PlanTour
            key="tour"
            index={tourIndex}
            onIndexChange={changeTourIndex}
            onTry={tryStage}
            returnedAfterChanges={tourReturned}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ההפניה לשלבים הקודמים שעוד חסרים בהם פרטים. השלב עצמו פתוח במלואו; השדות
 * שנשענים על הפרטים האלה מוצגים ריקים עד שמשלימים אותם.
 */
function PrerequisiteNotice({
  stages,
  flow,
  onSelectStage,
}: {
  stages: PlanStageId[];
  flow: PlanFlow;
  onSelectStage: (stage: PlanStageId) => void;
}) {
  const names = stages.map((item) => `«${planStageMeta(item, flow).shortTitle}»`).join(' ו');
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 text-info leading-relaxed text-amber-950">
        <span className="font-black">השלימו מילוי פרטים בשלב {names}.</span> עד אז השדות שנשענים
        עליהם מוצגים כאן ריקים — אבל אפשר לעבוד בשלב הזה כבר עכשיו.
      </p>
      <div className="flex flex-wrap gap-2">
        {stages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelectStage(item)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-black text-amber-900 transition-colors hover:border-amber-500"
          >
            לשלב {stageIndex(item, flow) + 1} · {planStageMeta(item, flow).shortTitle}
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={radius} className="fill-none stroke-white/35" strokeWidth="7" />
        <motion.circle
          cx="38"
          cy="38"
          r={radius}
          className="fill-none stroke-emerald-400"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white">{value}%</span>
        <span className="text-2xs font-bold text-white/40">הושלם</span>
      </div>
    </div>
  );
}
