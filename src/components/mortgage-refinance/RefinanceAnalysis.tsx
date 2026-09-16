'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Wallet,
  Banknote,
  Shield,
  ChevronDown,
  Pencil,
  Target,
  TrendingDown,
  Coins,
  Activity,
  Gauge,
  Split,
  AlertTriangle,
  Layers,
  RefreshCcw,
  SlidersHorizontal,
  LayoutDashboard,
} from 'lucide-react';
import type { MortgageMix, MortgageTrack, MortgageCalculation } from '@/components/mortgage-advisor/types';
import { DEFAULT_INTEREST_RATES, TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { formatCurrency, calculateMortgageMix } from '@/components/mortgage-advisor/mortgageCalculations';
import { monthsToYears } from '@/lib/mortgage-plan';
import {
  MIN_TRACK_AMOUNT,
  REFINANCE_GOAL_LABELS,
  REFI_TERM_MONTHS_MIN,
  clampRefiTermMonths,
  clampTrackAmount,
  findAboveMarketTracks,
  goalForTermChange,
  rateWorsensTerms,
  trackRemainingMonths,
  unallocatedAmount,
} from '@/lib/refinance';
import type { MarketRates, RefinanceGoal } from '@/lib/refinance';
import { goalProgress } from '@/lib/refinance-guidance';
import type { TrackDraft } from '@/lib/refinance-guidance';
import {
  GuestLimitDialog,
  useRefinanceGuestGate,
} from '@/components/mortgage-refinance/guestGate';
import {
  MarketRateNotice,
  RateWorsenedNotice,
  RegistrationInvite,
} from '@/components/mortgage-refinance/RefinanceNotices';
import {
  GoalGuidanceStrip,
  RefinanceControlPanel,
} from '@/components/mortgage-refinance/RefinanceControlPanel';
import type { RefinanceScope } from '@/components/mortgage-refinance/RefinanceControlPanel';
import {
  ComparisonCharts,
  MixResultRow,
  MixRowsHeader,
  NoChangeNotice,
  StateBlocksRow,
  UnallocatedWarning,
  TrackComparisonCharts,
  mixStatsOf,
  snapshotOf,
  trackStatsOf,
} from '@/components/mortgage-refinance/RefinanceResultsDashboard';
import { isRateVariable, isIndexLinked } from '@/components/mortgage-advisor/scenarioCalculations';
import { compactCurrency, mixYearlySeries } from '@/components/mortgage-advisor/analysisCharts';
import {
  trackRiskProfile,
  mixRiskScore,
  riskLevelFromScore,
  volatilityBand,
  RISK_META,
} from '@/components/mortgage-refinance/riskAnalysis';

interface RefinanceAnalysisProps {
  currentMix: MortgageMix;
  onEdit: () => void;
  /** משתמש שאינו רשום — הכלי פתוח לבדיקה אחת, וכל שינוי נוסף מזמין להרשמה */
  isGuest?: boolean;
  /** הריביות הממוצעות בשוק לפי בנק ישראל, להשוואה מול הריביות שהוזנו */
  market?: MarketRates | null;
}

const joinNames = (tracks: MortgageTrack[]) => tracks.map((t) => t.name).join(', ');

/* ------------------------------------------------------------------ */
/* Compact current-state KPI box (dark, centered)                      */
/* ------------------------------------------------------------------ */

function StateBox({
  icon: Icon,
  label,
  value,
  gradient,
  caption = 'במצב הנוכחי',
  delta,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  gradient: string;
  caption?: string;
  /** הפרש מול המצב הנוכחי — מוצג בקופסאות של "לאחר המיחזור" */
  delta?: number;
}) {
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > 1;
  const improved = (delta ?? 0) < 0;
  return (
    <div className={`rounded-xl ${gradient} text-white px-3 py-2 shadow-md text-center w-full sm:w-48`}>
      <div className="flex items-center justify-center gap-1.5 text-slate-300 text-[10px]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {hasDelta ? (
        <p className={`text-[10px] font-bold ${improved ? 'text-emerald-300' : 'text-red-300'}`}>
          {improved ? '−' : '+'}
          {formatCurrency(Math.abs(delta as number))} {improved ? 'חיסכון' : 'תוספת'}
        </p>
      ) : (
        <p className="text-[10px] text-slate-400">{caption}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Risk meter                                                          */
/* ------------------------------------------------------------------ */

function RiskMeter({ score }: { score: number }) {
  const level = riskLevelFromScore(score);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-blue-600" />
          רמת סיכון/תנודתיות כוללת
        </span>
        <span className="text-xs font-bold" style={{ color: RISK_META[level].bar }}>
          {RISK_META[level].label}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-gradient-to-l from-emerald-400 via-amber-400 to-red-500">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow border-2"
          style={{ borderColor: RISK_META[level].bar, right: `calc(${Math.min(100, Math.max(0, score))}% - 7px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>יציב · עלות גבוהה</span>
        <span>תנודתי · חסכוני</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Current-state analysis: summary + options + volatility graph        */
/* ------------------------------------------------------------------ */

function CurrentStateAnalysis({
  mix,
  calc,
  showOptions,
}: {
  mix: MortgageMix;
  calc: MortgageCalculation;
  showOptions: boolean;
}) {
  const mixRisk = useMemo(() => mixRiskScore(mix.tracks), [mix.tracks]);

  const bandData = useMemo(() => {
    const series = mixYearlySeries(calc).map((p) => ({ year: p.year, payment: p.payment }));
    return volatilityBand(series, mixRisk);
  }, [calc, mixRisk]);

  const riskyTracks = useMemo(
    () => mix.tracks.filter((t) => ['high', 'highest'].includes(trackRiskProfile(t).level)),
    [mix.tracks]
  );
  const variableTracks = useMemo(
    () => mix.tracks.filter((t) => isRateVariable(t.type) && !isIndexLinked(t.type)),
    [mix.tracks]
  );
  const linkedTracks = useMemo(() => mix.tracks.filter((t) => isIndexLinked(t.type)), [mix.tracks]);
  const fixedTracks = useMemo(() => mix.tracks.filter((t) => t.type === 'fixed_unlinked'), [mix.tracks]);

  const options: { icon: React.ElementType; tone: string; title: string; text: string }[] = [];
  if (riskyTracks.length > 0) {
    options.push({
      icon: Shield,
      tone: 'bg-red-50 border-red-200 text-red-800',
      title: 'הורדת סיכון',
      text: `מומלץ למחזר את ${joinNames(riskyTracks)} להורדת הסיכון הכולל של התמהיל.`,
    });
  }
  if (variableTracks.length > 0) {
    options.push({
      icon: TrendingDown,
      tone: 'bg-orange-50 border-orange-200 text-orange-800',
      title: 'מסלולים משתנים',
      text: `${joinNames(variableTracks)}: מחזור להורדת התשלום החודשי או להקטנת התנודתיות.`,
    });
  }
  if (linkedTracks.length > 0) {
    options.push({
      icon: Split,
      tone: 'bg-violet-50 border-violet-200 text-violet-800',
      title: 'מסלולים צמודים',
      text: `${joinNames(linkedTracks)}: מחזור ופיצול המסלולים להקטנת התנודתיות והגברת קצב החזר הקרן.`,
    });
  }
  if (fixedTracks.length > 0) {
    options.push({
      icon: Wallet,
      tone: 'bg-blue-50 border-blue-200 text-blue-800',
      title: 'מסלולים קבועים',
      text: `${joinNames(fixedTracks)}: מחזור להקטנת ההחזר החודשי (כרוך בהגדלת הסיכון לתנודתיות).`,
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-600" />
        <h3 className="text-base font-bold text-slate-900">ניתוח המצב הנוכחי — סיכון מול חיסכון</h3>
      </div>

      {/* summary */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
        <AlertTriangle className={`h-5 w-5 shrink-0 ${riskyTracks.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
        <p className="text-sm text-slate-700">
          {riskyTracks.length > 0 ? (
            <>
              בתמהיל <span className="font-bold text-amber-700">{riskyTracks.length}</span> מתוך {mix.tracks.length} מסלולים
              בסיכון/תנודתיות גבוהה.
            </>
          ) : (
            <>כל {mix.tracks.length} המסלולים בתמהיל יציבים — אין מסלולים בסיכון גבוה.</>
          )}
        </p>
      </div>

      <RiskMeter score={mixRisk} />

      {/* options (per-track refinance mode only) */}
      {showOptions && options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <div key={opt.title} className={`rounded-lg border p-3 ${opt.tone}`}>
                <div className="flex items-center gap-1.5 font-semibold text-sm mb-1">
                  <Icon className="h-4 w-4" />
                  {opt.title}
                </div>
                <p className="text-xs leading-relaxed">{opt.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* single graph: volatility band (diverging) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-800">תנודתיות ההחזר החודשי</p>
        <p className="text-[11px] text-slate-500 mb-2 leading-snug">
          טווח ההחזר החודשי הצפוי לאורך הזמן — מתרחב ככל שהתמהיל תנודתי יותר. קצב החזר הקרן מוצג בגרף "יתרת קרן" שלמעלה.
        </p>
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={bandData} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const get = (k: string) => payload.find((p) => p.dataKey === k)?.value as number | undefined;
                const expected = get('expected') ?? 0;
                const low = get('low') ?? 0;
                const band = get('band') ?? 0;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-2 text-xs shadow" dir="rtl">
                    <p className="font-medium text-slate-700">שנה {label}</p>
                    <p className="text-slate-600">החזר צפוי: {formatCurrency(expected)}</p>
                    <p className="text-slate-500">טווח: {formatCurrency(low)}–{formatCurrency(low + band)}</p>
                  </div>
                );
              }}
            />
            <Area dataKey="low" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="band" stackId="band" stroke="none" fill="#3b82f6" fillOpacity={0.16} isAnimationActive={false} />
            <Line dataKey="expected" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main refinance analysis — control panel + results dashboard         */
/* ------------------------------------------------------------------ */

/** ערכי הפתיחה של מסלול בפאנל: מה שיש היום */
function draftFromTrack(track: MortgageTrack): TrackDraft {
  return {
    interestRate: track.interestRate,
    months: clampRefiTermMonths(trackRemainingMonths(track)),
    amount: track.amount,
    type: track.type,
    amortizationType: track.amortizationType ?? 'spitzer',
  };
}

function draftsFromTracks(tracks: MortgageTrack[]): Record<string, TrackDraft> {
  return Object.fromEntries(tracks.map((track) => [track.id, draftFromTrack(track)]));
}

/** המסלול כפי שהוא אחרי החלת הערכים מהפאנל */
function applyDraft(track: MortgageTrack, draft?: TrackDraft, totalAmount = 0): MortgageTrack {
  if (!draft) return track;
  return {
    ...track,
    type: draft.type,
    interestRate: draft.interestRate,
    years: monthsToYears(draft.months),
    amount: draft.amount,
    percentage: totalAmount > 0 ? (draft.amount / totalAmount) * 100 : track.percentage,
    amortizationType: draft.amortizationType,
  };
}

export function RefinanceAnalysis({
  currentMix,
  onEdit,
  isGuest = false,
  market = null,
}: RefinanceAnalysisProps) {
  const baseCalc = useMemo<MortgageCalculation>(() => calculateMortgageMix(currentMix), [currentMix]);

  /** מטרת המיחזור. ברירת המחדל היא הקטנת ההחזר החודשי — מה שרוב הלקוחות מחפשים */
  const [goal, setGoal] = useState<RefinanceGoal>('reduce_payment');
  /** נרשם כשהמטרה התחלפה אוטומטית בעקבות הארכת תקופה */
  const [goalSwitched, setGoalSwitched] = useState(false);
  /** מיחזור כל המשכנתא, או מסלול אחד בלבד */
  const [scope, setScope] = useState<RefinanceScope>('whole');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  /** מסלולים שנוספו בפאנל על הסכום שלא שובץ */
  const [addedTracks, setAddedTracks] = useState<MortgageTrack[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TrackDraft>>(() =>
    draftsFromTracks(currentMix.tracks)
  );
  /** המסלול שפתוח לפירוט בדאשבורד */
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const gate = useRefinanceGuestGate(isGuest);

  useEffect(() => {
    setGoal('reduce_payment');
    setGoalSwitched(false);
    setScope('whole');
    setSelectedTrackId(null);
    setExpandedTrackId(null);
    setAddedTracks([]);
    setDrafts(draftsFromTracks(currentMix.tracks));
  }, [currentMix.id, currentMix.tracks.length]);

  const singleMode = scope === 'single';
  /** המסלולים שבפאנל: אלה של המשכנתא, ומה שנוסף בפאנל עצמו */
  const panelTracks = useMemo(
    () => [...currentMix.tracks, ...addedTracks],
    [currentMix.tracks, addedTracks]
  );
  const selectedTrack = panelTracks.find((track) => track.id === selectedTrackId) ?? null;

  const totalAmount = Math.max(
    currentMix.totalAmount,
    currentMix.tracks.reduce((sum, track) => sum + track.amount, 0)
  );
  const draftAmounts = panelTracks.map((track) => drafts[track.id]?.amount ?? track.amount);
  const unallocated = unallocatedAmount(totalAmount, draftAmounts);

  /**
   * שינוי פרמטר בפאנל. כל שינוי עובר דרך ההגבלה של משתמש שאינו רשום, מיישר את
   * הערך לגבולות החוקיים, ומעדכן את המטרה כשהיא כבר לא מתאימה למה שנבחר.
   */
  const changeDraft = (trackId: string, patch: Partial<TrackDraft>) => {
    const track = panelTracks.find((item) => item.id === trackId);
    if (!track) return;

    const controlKey = `${Object.keys(patch)[0] ?? 'draft'}:${trackId}`;
    if (!gate.allow(controlKey)) return;

    const current = drafts[trackId] ?? draftFromTrack(track);
    const next: TrackDraft = { ...current, ...patch };

    // מעבר לסוג מסלול אחר מביא איתו את הריבית הממוצעת בשוק לאותו סוג
    if (patch.type && patch.type !== current.type) {
      const marketRate = market?.rates?.[patch.type];
      if (typeof marketRate === 'number' && Number.isFinite(marketRate)) {
        next.interestRate = Number(marketRate.toFixed(2));
      }
    }

    if (patch.months !== undefined) {
      const baseMonths = clampRefiTermMonths(trackRemainingMonths(track));
      next.months = clampRefiTermMonths(patch.months);
      const nextGoal = goalForTermChange(goal, next.months, baseMonths);
      if (nextGoal !== goal) {
        setGoal(nextGoal);
        setGoalSwitched(true);
      }
    }

    // סכום המסלול לעולם לא חורג מגובה המשכנתא בשאר המסלולים
    if (patch.amount !== undefined) {
      const index = panelTracks.findIndex((item) => item.id === trackId);
      next.amount = clampTrackAmount(patch.amount, totalAmount, draftAmounts, index);
    }

    setDrafts((prev) => ({ ...prev, [trackId]: next }));
  };

  /** הוספת מסלול על הסכום שלא שובץ — מוצג בפאנל ומשתקף בדאשבורד ככל מסלול */
  const addTrack = () => {
    if (unallocated < MIN_TRACK_AMOUNT) return;
    if (!gate.allow('add-track')) return;

    const longestMonths = panelTracks.reduce(
      (max, track) => Math.max(max, clampRefiTermMonths(trackRemainingMonths(track))),
      REFI_TERM_MONTHS_MIN
    );
    const type: MortgageTrack['type'] = 'fixed_unlinked';
    const rate = market?.rates?.[type] ?? DEFAULT_INTEREST_RATES[type];

    const track: MortgageTrack = {
      id: `refi-added-${Date.now()}`,
      name: 'מסלול חדש במיחזור',
      type,
      amount: unallocated,
      percentage: totalAmount > 0 ? (unallocated / totalAmount) * 100 : 0,
      interestRate: Number(rate.toFixed(2)),
      years: monthsToYears(longestMonths),
      amortizationType: 'spitzer',
    };

    setAddedTracks((prev) => [...prev, track]);
    setDrafts((prev) => ({ ...prev, [track.id]: draftFromTrack(track) }));
  };

  const removeTrack = (trackId: string) => {
    setAddedTracks((prev) => prev.filter((track) => track.id !== trackId));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
    if (selectedTrackId === trackId) setSelectedTrackId(null);
    if (expandedTrackId === trackId) setExpandedTrackId(null);
  };

  const changeGoal = (nextGoal: RefinanceGoal) => {
    if (nextGoal === goal) return;
    setGoal(nextGoal);
    setGoalSwitched(false);

    // במטרת הקטנת סך הריבית אין מקום לתקופה ארוכה מהקיימת — מיישרים חזרה
    if (nextGoal === 'reduce_interest') {
      setDrafts((prev) => {
        const next = { ...prev };
        panelTracks.forEach((track) => {
          const baseMonths = clampRefiTermMonths(trackRemainingMonths(track));
          const draft = next[track.id];
          if (draft && draft.months > baseMonths) {
            next[track.id] = { ...draft, months: baseMonths };
          }
        });
        return next;
      });
    }
  };

  const changeScope = (nextScope: RefinanceScope) => {
    setScope(nextScope);
    if (nextScope === 'single') {
      const fallback = selectedTrackId ?? (panelTracks.length === 1 ? panelTracks[0].id : null);
      setSelectedTrackId(fallback);
      setExpandedTrackId(fallback);
    }
  };

  const selectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setExpandedTrackId(trackId);
  };

  /** התמהיל לאחר המיחזור — רק המסלולים שנמצאים בפאנל מושפעים */
  const refinedMix = useMemo<MortgageMix>(() => {
    const tracks = panelTracks
      .map((track) => {
        const inPanel = !singleMode || track.id === selectedTrackId;
        return inPanel ? applyDraft(track, drafts[track.id], totalAmount) : track;
      })
      // מסלול שנוסף בפאנל אינו חלק ממיחזור של מסלול בודד
      .filter((track) => !singleMode || currentMix.tracks.some((item) => item.id === track.id));

    return { ...currentMix, tracks };
  }, [currentMix, panelTracks, drafts, singleMode, selectedTrackId, totalAmount]);

  const refinedCalc = useMemo<MortgageCalculation>(() => calculateMortgageMix(refinedMix), [refinedMix]);

  const monthlyDelta = refinedCalc.summary.totalMonthlyPayment - baseCalc.summary.totalMonthlyPayment;
  const interestDelta = refinedCalc.summary.totalInterest - baseCalc.summary.totalInterest;
  const changed = Math.abs(monthlyDelta) > 1 || Math.abs(interestDelta) > 1;

  const progress = goalProgress({
    goal,
    baseMonthly: baseCalc.summary.totalMonthlyPayment,
    refinedMonthly: refinedCalc.summary.totalMonthlyPayment,
    baseInterest: baseCalc.summary.totalInterest,
    refinedInterest: refinedCalc.summary.totalInterest,
  });

  /** המסלולים שבהם הריבית שהוזנה גבוהה מהריבית הממוצעת בשוק */
  const marketFindings = useMemo(
    () => findAboveMarketTracks(currentMix.tracks, market),
    [currentMix.tracks, market]
  );

  /** מסלולים שבהם נבחרה ריבית גבוהה מהריבית הקיימת — מיחזור כזה מרע את התנאים */
  const worsenedTracks = useMemo(
    () =>
      currentMix.tracks.filter((track) => {
        const inPanel = !singleMode || track.id === selectedTrackId;
        const draft = drafts[track.id];
        return inPanel && !!draft && rateWorsensTerms(draft.interestRate, track.interestRate);
      }),
    [currentMix.tracks, drafts, singleMode, selectedTrackId]
  );

  const baseByTrackId = useMemo(
    () => Object.fromEntries(baseCalc.trackCalculations.map((tc) => [tc.track.id, tc])),
    [baseCalc]
  );
  const refinedByTrackId = useMemo(
    () => Object.fromEntries(refinedCalc.trackCalculations.map((tc) => [tc.track.id, tc])),
    [refinedCalc]
  );

  const monthsByTrackId = (calc: MortgageCalculation) =>
    Object.fromEntries(calc.trackCalculations.map((tc) => [tc.track.id, tc.amortSchedule.length]));

  const expandedTrack = expandedTrackId
    ? {
        base: baseByTrackId[expandedTrackId],
        refined: refinedByTrackId[expandedTrackId],
        track:
          refinedMix.tracks.find((track) => track.id === expandedTrackId) ??
          panelTracks.find((track) => track.id === expandedTrackId),
      }
    : null;

  const trackChanged =
    expandedTrack?.base && expandedTrack?.refined
      ? Math.abs(expandedTrack.refined.monthlyPayment - expandedTrack.base.monthlyPayment) > 1 ||
        Math.abs(expandedTrack.refined.totalInterest - expandedTrack.base.totalInterest) > 1
      : false;

  return (
    <div className="space-y-3" dir="rtl">
      {/* ===== פאנל השליטה: כותרת, מטרה והיקף, ואז המסלולים ===== */}
      <Card className="border-0 shadow-md">
        <CardContent className="space-y-2.5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
              פאנל השליטה
            </p>
            <div className="flex items-center gap-2">
              <p className="hidden text-[10px] text-slate-500 sm:block">
                כל שינוי מתעדכן מיד בדאשבורד שמתחת
              </p>
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-slate-500">
                <Pencil className="h-3.5 w-3.5 ml-1" />
                עריכת נתוני המשכנתא
              </Button>
            </div>
          </div>

          {/* מטרת המיחזור והיקפו — הבחירה כאן מעדכנת את ההמלצות בכל מסלול */}
          <div className="grid gap-2 lg:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500">מה המטרה שלכם במיחזור?</p>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton
                  active={goal === 'reduce_payment'}
                  onClick={() => changeGoal('reduce_payment')}
                  icon={Wallet}
                  title={REFINANCE_GOAL_LABELS.reduce_payment}
                  hint="אפשר גם להאריך תקופה"
                />
                <ChoiceButton
                  active={goal === 'reduce_interest'}
                  onClick={() => changeGoal('reduce_interest')}
                  icon={Banknote}
                  title={REFINANCE_GOAL_LABELS.reduce_interest}
                  hint="קיצור תקופה והורדת ריבית"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500">מה ממחזרים?</p>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton
                  active={!singleMode}
                  onClick={() => changeScope('whole')}
                  icon={Layers}
                  title="מיחזור כל המשכנתא"
                  hint="כל המסלולים, כולל הסכומים"
                />
                <ChoiceButton
                  active={singleMode}
                  onClick={() => changeScope('single')}
                  icon={RefreshCcw}
                  title="מיחזור מסלול בודד"
                  hint="בוחרים מסלול אחד"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <GoalGuidanceStrip goal={goal} scope={scope} />
            {goalSwitched && goal === 'reduce_payment' && (
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                הארכתם תקופה — המטרה עברה להקטנת ההחזר החודשי
              </span>
            )}
          </div>

          <RefinanceControlPanel
            /* מיחזור מסלול בודד נעשה על מסלולי המשכנתא הקיימת בלבד */
            tracks={singleMode ? currentMix.tracks : panelTracks}
            drafts={drafts}
            onDraftChange={changeDraft}
            goal={goal}
            market={market}
            scope={scope}
            selectedTrackId={selectedTrackId}
            onSelectTrack={selectTrack}
            totalAmount={totalAmount}
            unallocated={unallocated}
            onAddTrack={addTrack}
            addedTrackIds={addedTracks.map((track) => track.id)}
            onRemoveTrack={removeTrack}
          />
        </CardContent>
      </Card>

      {/* ===== דאשבורד התוצאות ===== */}
      <Card className="border-0 shadow-md">
        <CardContent className="space-y-2.5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <LayoutDashboard className="h-4 w-4 text-emerald-600" />
              דאשבורד התוצאות
            </p>
            <GoalProgressChip
              label={progress.label}
              delta={progress.delta}
              tradeoff={progress.tradeoff}
              achieved={progress.achieved}
              regressed={progress.regressed}
              changed={changed}
            />
          </div>

          {/* שורת המצב הנוכחי, ומתחתיה — אחרי שינוי — המצב שלאחר המיחזור */}
          <StateBlocksRow
            title="המצב הנוכחי"
            caption={`${currentMix.bank ?? 'המשכנתא הנוכחית'} · ${formatCurrency(
              baseCalc.trackCalculations.reduce((sum, tc) => sum + tc.track.amount, 0)
            )} קרן`}
            snapshot={snapshotOf(baseCalc)}
            tone="current"
          />

          {unallocated >= MIN_TRACK_AMOUNT && !singleMode && (
            <UnallocatedWarning unallocated={unallocated} totalAmount={totalAmount} />
          )}

          {changed ? (
            <StateBlocksRow
              title="המצב לאחר המיחזור"
              caption="לפי הפרמטרים שבפאנל השליטה"
              snapshot={snapshotOf(refinedCalc)}
              baseline={snapshotOf(baseCalc)}
              tone="refinanced"
            />
          ) : (
            <NoChangeNotice text="טרם בוצע שינוי — לצפייה במצב שלאחר המיחזור שנו אחד הפרמטרים בפאנל השליטה." />
          )}

          {/* שורות התמהיל: הפרטים המלאים והחלוקה למסלולים */}
          <div className="space-y-2 border-t border-slate-100 pt-2.5">
            <MixRowsHeader />

            <MixResultRow
              title="התמהיל היום"
              subtitle={changed ? undefined : 'טרם בוצע שינוי בתמהיל'}
              stats={mixStatsOf(baseCalc)}
              tone="current"
              tracks={currentMix.tracks}
              trackMonths={monthsByTrackId(baseCalc)}
              onTrackClick={(id) => setExpandedTrackId((prev) => (prev === id ? null : id))}
              activeTrackId={expandedTrackId}
            />

            {changed && (
              <MixResultRow
                title="התמהיל לאחר המיחזור"
                subtitle={singleMode ? 'לאחר מיחזור המסלול שנבחר' : 'לפי פאנל השליטה'}
                stats={mixStatsOf(refinedCalc)}
                baseline={mixStatsOf(baseCalc)}
                tone="refinanced"
                tracks={refinedMix.tracks}
                trackMonths={monthsByTrackId(refinedCalc)}
                onTrackClick={(id) => setExpandedTrackId((prev) => (prev === id ? null : id))}
                activeTrackId={expandedTrackId}
              />
            )}

            {/* פירוט המסלול שנלחץ: שורות וגרפים */}
            {expandedTrack?.track && (expandedTrack.base || expandedTrack.refined) && (
              <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/40 p-2.5">
                {expandedTrack.base && (
                  <MixResultRow
                    title={`${TRACK_TYPES[expandedTrack.base.track.type]} — היום`}
                    subtitle={trackChanged ? 'המסלול לפני המיחזור' : 'לא בוצע שינוי במסלול זה'}
                    stats={trackStatsOf(expandedTrack.base)}
                    tone="track"
                  />
                )}

                {expandedTrack.refined && (trackChanged || !expandedTrack.base) && (
                  <MixResultRow
                    title={`${TRACK_TYPES[expandedTrack.refined.track.type]} — ${
                      expandedTrack.base ? 'לאחר המיחזור' : 'מסלול חדש שנוסף'
                    }`}
                    subtitle="לפי פאנל השליטה"
                    stats={trackStatsOf(expandedTrack.refined)}
                    baseline={expandedTrack.base ? trackStatsOf(expandedTrack.base) : undefined}
                    tone="track"
                  />
                )}

                <TrackComparisonCharts
                  title={`גרפים למסלול — ${TRACK_TYPES[expandedTrack.track.type]}`}
                  hint={
                    trackChanged
                      ? 'המסלול לפני המיחזור ואחריו.'
                      : 'לא בוצע שינוי במסלול — מוצג המצב הנוכחי בלבד.'
                  }
                  baseTrack={expandedTrack.base ?? expandedTrack.refined!}
                  refinedTrack={expandedTrack.refined ?? expandedTrack.base!}
                />
              </div>
            )}
          </div>

          {/* גרפי ההשוואה של המשכנתא כולה */}
          <div className="border-t border-slate-100 pt-2.5">
            <ComparisonCharts
              title={singleMode ? 'המשכנתא כולה לאחר מיחזור המסלול' : 'המשכנתא כולה'}
              hint={
                changed
                  ? 'המצב הנוכחי מול המצב שלאחר המיחזור.'
                  : 'טרם בוצע שינוי — מוצג המצב הנוכחי בלבד.'
              }
              baseCalc={baseCalc}
              refinedCalc={refinedCalc}
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== התרעות ===== */}
      {marketFindings.length > 0 && market && (
        <MarketRateNotice findings={marketFindings} market={market} />
      )}

      {worsenedTracks.map((track) => (
        <RateWorsenedNotice
          key={`worse-${track.id}`}
          trackName={track.name}
          baseRate={track.interestRate}
          nextRate={drafts[track.id]?.interestRate ?? track.interestRate}
        />
      ))}

      {gate.spent && <RegistrationInvite />}

      {/* ===== ניתוח סיכון — נפתח בלחיצה, כדי לא להאריך את המסך ===== */}
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none p-3 text-sm font-bold text-slate-900">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            ניתוח המצב הנוכחי — סיכון מול חיסכון
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </span>
        </summary>
        <div className="p-3 pt-0">
          <CurrentStateAnalysis mix={currentMix} calc={baseCalc} showOptions />
        </div>
      </details>

      <GuestLimitDialog open={gate.promptOpen} onClose={gate.closePrompt} />
    </div>
  );
}

/** כפתור בחירה — מטרת המיחזור והיקפו */
function ChoiceButton({
  active,
  onClick,
  icon: Icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border p-2 text-right transition-all ${
        active
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[12px] font-bold leading-tight ${active ? 'text-blue-900' : 'text-slate-800'}`}>
          {title}
        </span>
        <span className="block text-[10px] leading-tight text-slate-500">{hint}</span>
      </span>
    </button>
  );
}

/** כמה התקדמנו לעבר המטרה, ומה המחיר בצד השני */
function GoalProgressChip({
  label,
  delta,
  tradeoff,
  achieved,
  regressed,
  changed,
}: {
  label: string;
  delta: number;
  tradeoff: number;
  achieved: boolean;
  regressed: boolean;
  changed: boolean;
}) {
  if (!changed) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
        טרם בוצע שינוי בפאנל
      </span>
    );
  }

  const tone = achieved
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
    : regressed
      ? 'border-red-300 bg-red-50 text-red-800'
      : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {label}: {delta < 0 ? '−' : '+'}
      {formatCurrency(Math.abs(delta))}
      {Math.abs(tradeoff) > 1 && (
        <span className="font-medium text-slate-500">
          {' '}· בצד השני {tradeoff < 0 ? '−' : '+'}
          {formatCurrency(Math.abs(tradeoff))}
        </span>
      )}
    </span>
  );
}
