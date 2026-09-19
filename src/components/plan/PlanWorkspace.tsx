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
  isPlanStage,
  missingForStage,
  stageIndex,
  stageIsComplete,
  unfinishedPrerequisites,
} from '@/lib/mortgage-plan';
import type {
  AnalysisData,
  AuctionData,
  MixData,
  PlanStageId,
  PlanStageStatus,
  PreApprovalData,
  SigningData,
} from '@/lib/mortgage-plan';
import { PLAN_STAGE_ACTIONS, journeyStageFor } from '@/data/platform/planStages';
import { usePlan } from './usePlan';
import type { PlanView, SaveState } from './usePlan';
import { PlanTour, TOUR_FREE_CHANGES, tourAllowsTry } from './PlanTour';
import { StageTasksPanel } from './tasks/StageTasksPanel';
import { VaultButton } from './documents/VaultButton';
import Mashkalanta from '@/components/ui/mashkalanta';
import { StageRail } from './StageRail';
import { StageLockedPreview } from './StageLockedPreview';
import { formatShekel } from './ui';
import { AdvisorStageNotes } from './AdvisorStageNotes';
import { AdvisorStageSummary } from './advisor/AdvisorStageSummary';
import { StageGate } from './StageGate';
import { useAdvisorOrders } from './advisor/useAdvisorOrders';
import { useClientMeetings, meetingForStage } from './advisor/useClientMeetings';
import { isAdvisorStage } from '@/lib/advisor-orders';
import { AnalysisStage } from './stages/AnalysisStage';
import { MixStage } from './stages/MixStage';
import { PreApprovalStage } from './stages/PreApprovalStage';
import { AuctionStage } from './stages/AuctionStage';
import { SigningStage } from './stages/SigningStage';
import { StageOverview as SigningStageOverview } from './stages/signing/StageOverview';

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
 * ב-`tour` הוא רץ על תהליך הדגמה: מסכי ההסבר צפים מעל הכלי, "נסו את השלב"
 * פותח אותו לשלושה ערכים ואז ההסבר חוזר, והסרגל למעלה זז יחד עם הדפים.
 */
export function PlanWorkspace({ planId, tour = false }: { planId: string; tour?: boolean }) {
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
   * השלבים שהלקוח בחר לעבור בעצמו ("נתח לבד"). נשמר בדפדפן לפי התהליך, כדי
   * שהשער לא יופיע שוב בכל טעינה אחרי שכבר נכנס לעבוד.
   */
  const [enteredStages, setEnteredStages] = useState<PlanStageId[]>([]);
  /** השלב שעבורו נשלחת כעת בקשת ליווי חינמית */
  const [handoffBusy, setHandoffBusy] = useState<PlanStageId | null>(null);
  const orders = useAdvisorOrders(planId);
  const { meetings } = useClientMeetings();

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
        // אחסון חסום — נמשיך בלי לשמור, השער יופיע שוב בטעינה הבאה
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
      const map = {} as Record<PlanStageId, PlanStageStatus>;
      PLAN_STAGES.forEach((stageId) => {
        map[stageId] = plan.stages.find((item) => item.stage === stageId)?.status ?? 'PENDING';
      });
      if (unfinishedPrerequisites(requested, map).length > 0) {
        setViewingStage(requested);
      } else {
        void goToStage(requested);
      }
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
        <h2 className="text-xl font-black text-slate-900">התהליך לא נמצא</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
        >
          חזרה לאזור האישי
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const stage = viewingStage ?? plan.currentStage;
  const unfinished = unfinishedPrerequisites(stage, statuses);
  /** מסך שרק מציצים בו בסיור (האישור העקרוני): כל לחיצה מחזירה להסבר */
  const lookOnly = tour && !tourOpen && !tourAllowsTry(stage);
  // בסיור כל שלב פתוח להצצה — אין נעילה לפי שלבים קודמים
  const isPreview = !tour && unfinished.length > 0;
  const journey = journeyStageFor(stage);
  const action = PLAN_STAGE_ACTIONS[stage];
  const StageIcon = journey.icon;
  const index = stageIndex(stage);
  const canComplete = !isPreview && stageIsComplete(stage, plan.data);
  const missing = missingForStage(stage, plan.data);
  const isDone = statuses[stage] === 'COMPLETED';
  const previous = index > 0 ? PLAN_STAGES[index - 1] : null;
  const next = PLAN_STAGES[index + 1] ?? null;
  const save = saveLabels[saveState];
  /** כלי בניית התמהיל רחב מדי לפריסה עם סרגל צדדי; שלב הפרופיל מקבל את כל הרוחב כדי שהשאלה הראשונה תישב במרכז */
  const usesExistingTool = stage === 'MIX' || stage === 'ANALYSIS';
  /* המסך האחרון בשלב הפרופיל הוא הדוח — התוצר שלו — ולכן שם נסגר השלב */
  const analysisOnLastSubstep =
    stage !== 'ANALYSIS' ||
    (Boolean(plan.data.ANALYSIS.intent) &&
      (plan.data.ANALYSIS.profileScreen || 'overview') === 'report');
  /**
   * מסך "על השלב" של החתימה נפתח גם למי שקפץ לשלב לפני שסגר את קודמיו: הוא
   * רק מסביר מה השלב עושה, ולכן הוא נשאר פעיל מעל התוכן הנעול.
   */
  const signingOverviewOpen =
    stage === 'SIGNING' && (plan.data.SIGNING.screen || 'overview') === 'overview';

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
  /*
    בשלב הפרופיל ההסבר על השלב מוצג גם כשיועץ מטפל בו, ומסך "היועץ מטפל בשלב
    זה" בא מיד אחריו — בתוך ההסבר, ולא מעליו. "פרטים נוספים" פותח את השלב המלא.
  */
  const analysisAdvisorIntro = stage === 'ANALYSIS' && advisorRun && !showingDetails;
  const showAdvisorSummary = advisorRun && !analysisAdvisorIntro;
  const advisorSummaryOnly = advisorRun && !showingDetails && !analysisAdvisorIntro;
  const showStageFooter =
    !tour && !isPreview && analysisOnLastSubstep && !analysisAdvisorIntro && (canComplete || isDone);
  const advisorName =
    orders.orders.find(
      (order) =>
        order.stages.includes(stage) &&
        (order.status === 'PAID' || order.status === 'REQUESTED')
    )?.advisorName ?? null;
  const stageMeeting = meetingForStage(meetings, stage);

  /*
    שער השלב: לפני שנכנסים לעבוד, כל שלב (למעט הפרופיל והחתימה, שיש להם מסך
    "על השלב" משלהם) מציע לבחור בין ניתוח עצמי לבין ליווי יועץ. השער מוצג רק
    כשעדיין לא נבחרה דרך, השלב אינו מטופל על ידי יועץ, וטרם נסגר.
  */
  const needsGate =
    !tour &&
    !isPreview &&
    !advisorRun &&
    !isDone &&
    stage !== 'ANALYSIS' &&
    stage !== 'SIGNING' &&
    !enteredStages.includes(stage);

  const toggleStageDetails = () =>
    setDetailStages((current) =>
      current.includes(stage) ? current.filter((item) => item !== stage) : [...current, stage]
    );
  const openStageDetails = () =>
    setDetailStages((current) => (current.includes(stage) ? current : [...current, stage]));

  /** מסך "היועץ מטפל בשלב זה" — מעל השלב, או בסוף ההסבר בשלב הפרופיל */
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
    if (unfinishedPrerequisites(nextStage, statuses).length > 0) {
      setViewingStage(nextStage);
      return;
    }
    setViewingStage(null);
    void goToStage(nextStage);
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
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition-all hover:bg-slate-700"
                      >
                        המשיכו לשלב הבא
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canComplete || completing}
                        onClick={() => void onComplete()}
                        className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white transition-all ${
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
                      <span className="text-[11px] text-slate-400">
                        כדי לסגור את השלב חסר: {missing.join(', ')}
                      </span>
                    )}
                    {blocked === stage && (
                      <span className="text-[11px] font-bold text-rose-500">
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
      <header className="relative overflow-hidden bg-slate-950">
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
                  <h1 className="text-2xl font-black text-white md:text-3xl">{plan.name}</h1>
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
                  <h1 className="truncate text-2xl font-black text-white md:text-3xl">
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

          <StageRail current={stage} statuses={statuses} onSelect={selectStage} />

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
              <div className="text-sm font-black text-emerald-900">התהליך הושלם</div>
              <div className="text-xs text-emerald-800">
                חמשת השלבים נסגרו. המשכנתא מופיעה עכשיו באזור האישי כמשכנתא שתוכננה.
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

        {/* כותרת השלב הפעיל */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
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
                      שלב {index + 1} מתוך {PLAN_STAGES.length}
                    </span>
                    {isDone && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
                        <Check className="h-3 w-3" />
                        הושלם
                      </span>
                    )}
                    {isPreview && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-800">
                        תצוגה מקדימה
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 md:text-xl">{journey.title}</h2>
                  <p className="text-sm text-slate-500">{action.hint}</p>
                </div>

              </div>
            </div>

            {/* מה שהיועץ כתב ללקוח בשלב הזה, מעל תוכן השלב עצמו */}
            {!tour && <AdvisorStageNotes stage={stage} />}

            {/* המשימות המתוכננות של השלב — לכל לקוח עם תהליך פתוח */}
            {!tour && !isPreview && !advisorSummaryOnly && <StageTasksPanel planId={plan.id} stage={stage} />}

            {showAdvisorSummary && <div className="mb-4">{advisorSummaryCard}</div>}

            {isPreview && (
              <StageLockedPreview
                stage={stage}
                unfinished={unfinished}
                onSelectStage={selectStage}
              />
            )}

            {/*
              מסך "על השלב" של החתימה, כשהגיעו אליו לפני שנסגרו קודמיו: ההסבר
              עצמו פעיל, והתוכן הנעול שמתחתיו מוחלף בו עד שבוחרים להתחיל.
            */}
            {isPreview && signingOverviewOpen && (
              <SigningStageOverview
                onStart={() =>
                  updateStage('SIGNING', { ...plan.data.SIGNING, screen: 'documents' })
                }
                onAdvisor={() => void requestFreeHandoff('SIGNING')}
                advisorBusy={handoffBusy === 'SIGNING'}
              />
            )}

            {/* שער השלב: הבחירה בין ניתוח עצמי לבין ליווי יועץ, זהה בכל השלבים */}
            {!advisorSummaryOnly && needsGate && (
              <StageGate
                stage={stage}
                onSelfService={() => enterStage(stage)}
                onAdvisor={() => void requestFreeHandoff(stage)}
                busy={handoffBusy === stage}
              />
            )}

            {/*
              כשיועץ מטפל בשלב, מה שמוצג הוא הסיכום בלבד. "הצג פרטים" פותח את
              השלב המלא — אותם כלים, אותם מסכים, בלי שום הסתרה.
            */}
            {!advisorSummaryOnly && !needsGate && !(isPreview && signingOverviewOpen) && (
            <div className={isPreview ? 'relative' : undefined}>
              {isPreview && (
                <div
                  aria-hidden
                  className="absolute inset-0 z-10 rounded-3xl bg-slate-50/10"
                />
              )}
              <div
                className={
                  isPreview
                    ? 'pointer-events-none select-none opacity-55 grayscale-[70%]'
                    : undefined
                }
              >
            {usesExistingTool ? (
              <div className="space-y-5">
                {stage === 'ANALYSIS' && (
                  <AnalysisStage
                    data={plan.data}
                    planId={plan.id}
                    planName={plan.propertyAddress || plan.name}
                    onRequestAdvisor={() => void requestFreeHandoff('ANALYSIS')}
                    advisorBusy={handoffBusy === 'ANALYSIS'}
                    advisorSummary={analysisAdvisorIntro ? advisorSummaryCard : undefined}
                    onShowDetails={openStageDetails}
                    onChange={(next: AnalysisData) => updateStage('ANALYSIS', next)}
                    onChangeSigning={(next: SigningData) => updateStage('SIGNING', next)}
                  />
                )}
                {/*
                  שלב התמהיל מוצג בלי שורת "כלים נוספים": כלי בניית התמהיל הוא
                  מסך עבודה מלא, וקישורים לכלים אחרים מעליו רק מושכים החוצה ממנו.
                */}
                {stage === 'MIX' && (
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
                  />
                )}
                {stage === 'AUCTION' && (
                  <AuctionStage
                    data={plan.data}
                    planId={plan.id}
                    onChange={(next: AuctionData) => updateStage('AUCTION', next)}
                    advisorRun={advisorRun}
                  />
                )}
                {stage === 'SIGNING' && (
                  <SigningStage
                    data={plan.data}
                    planId={plan.id}
                    onChange={(next: SigningData) => updateStage('SIGNING', next)}
                    onRequestAdvisor={() => void requestFreeHandoff('SIGNING')}
                    advisorBusy={handoffBusy === 'SIGNING'}
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
      </main>

      {/*
        הכפתורים הצפים של הפינה הימנית — תיק המסמכים למעלה והחזרה לדאשבורד
        מתחתיו, בעמודה אחת. הפינה השמאלית שמורה לכפתור «פנו ליועץ» של השלב,
        וכך השניים אינם עולים זה על זה.
      */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
        {!tour && <VaultButton planId={plan.id} data={plan.data} stage={stage} variant="compact" />}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-[15px] font-black text-white shadow-xl shadow-slate-900/30 transition-transform hover:-translate-y-0.5"
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
        <span className="text-[9px] font-bold text-white/40">הושלם</span>
      </div>
    </div>
  );
}
