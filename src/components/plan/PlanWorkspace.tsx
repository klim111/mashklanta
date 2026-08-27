'use client';

import { useMemo, useState } from 'react';
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
  Loader2,
  PartyPopper,
  Pencil,
  Sparkles,
} from 'lucide-react';
import {
  PLAN_STAGES,
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
import type { SaveState } from './usePlan';
import Mashkalanta from '@/components/ui/mashkalanta';
import { StageRail } from './StageRail';
import { StageLockedPreview } from './StageLockedPreview';
import { StageTools } from './StageTools';
import { formatShekel } from './ui';
import { AnalysisStage } from './stages/AnalysisStage';
import { MixStage } from './stages/MixStage';
import { PreApprovalStage } from './stages/PreApprovalStage';
import { AuctionStage } from './stages/AuctionStage';
import { SigningStage } from './stages/SigningStage';

const saveLabels: Record<SaveState, { label: string; className: string }> = {
  idle: { label: 'הכל שמור', className: 'text-white/80' },
  dirty: { label: 'שומר…', className: 'text-white/70' },
  saving: { label: 'שומר…', className: 'text-white/70' },
  saved: { label: 'נשמר בחשבון שלכם', className: 'text-emerald-300' },
  error: { label: 'השמירה נכשלה', className: 'text-rose-300' },
};

export function PlanWorkspace({ planId }: { planId: string }) {
  const {
    plan,
    ready,
    error,
    saveState,
    blocked,
    updateStage,
    completeStage,
    goToStage,
    rename,
  } = usePlan(planId);

  const [completing, setCompleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [viewingStage, setViewingStage] = useState<PlanStageId | null>(null);

  const statuses = useMemo(() => {
    const map = {} as Record<PlanStageId, PlanStageStatus>;
    PLAN_STAGES.forEach((stage) => {
      map[stage] = plan?.stages.find((item) => item.stage === stage)?.status ?? 'PENDING';
    });
    return map;
  }, [plan]);

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
  const isPreview = unfinished.length > 0;
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
  const analysisOnIntent =
    stage === 'ANALYSIS' &&
    (!plan.data.ANALYSIS.intent || plan.data.ANALYSIS.profileScreen === 'intent');

  const selectStage = (nextStage: PlanStageId) => {
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

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      {/* כותרת התהליך ופס השלבים */}
      <header className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="mb-6 grid items-center gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto]">
            <Mashkalanta variant="header" autoPlay />

            <div className="min-w-0 md:text-center">
              <Link
                href="/dashboard"
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-white/70 transition-colors hover:text-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                האזור האישי
              </Link>

              {editingName ? (
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
            </div>

            <ProgressRing value={plan.progress} />
          </div>

          <StageRail current={stage} statuses={statuses} onSelect={selectStage} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

            {isPreview && (
              <StageLockedPreview
                stage={stage}
                unfinished={unfinished}
                onSelectStage={selectStage}
              />
            )}

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
                    onChange={(next: AnalysisData) => updateStage('ANALYSIS', next)}
                  />
                )}
                {stage === 'MIX' && (
                  <>
                    <StageTools stage={stage} data={plan.data} planId={plan.id} compact />
                    <MixStage
                      data={plan.data}
                      onChange={(next: MixData) => updateStage('MIX', next)}
                    />
                  </>
                )}
                {!isPreview && !analysisOnIntent && stageFooter}
              </div>
            ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                {stage === 'APPLICATIONS' && (
                  <PreApprovalStage
                    data={plan.data}
                    onChange={(next: PreApprovalData) => updateStage('APPLICATIONS', next)}
                    onGoToProfile={() => selectStage('ANALYSIS')}
                  />
                )}
                {stage === 'AUCTION' && (
                  <AuctionStage
                    data={plan.data}
                    onChange={(next: AuctionData) => updateStage('AUCTION', next)}
                  />
                )}
                {stage === 'SIGNING' && (
                  <SigningStage
                    data={plan.data}
                    onChange={(next: SigningData) => updateStage('SIGNING', next)}
                  />
                )}

                {!isPreview && stageFooter}
              </div>

              <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    מה הפלטפורמה עושה בשלב הזה
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {journey.selfServiceSummary}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {journey.selfServiceSteps.map((step, i) => (
                      <li key={step} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[9px] font-black text-white">
                          {i + 1}
                        </span>
                        <span className="text-xs leading-relaxed text-slate-600">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <StageTools stage={stage} data={plan.data} planId={plan.id} />
              </aside>
            </div>
            )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
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
