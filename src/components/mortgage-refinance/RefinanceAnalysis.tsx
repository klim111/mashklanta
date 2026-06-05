'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Banknote,
  Shield,
  ChevronDown,
  Percent,
  Calendar,
  Pencil,
  Target,
  TrendingDown,
  Clock,
  Coins,
  Activity,
  Gauge,
  Split,
  AlertTriangle,
} from 'lucide-react';
import type { MortgageMix, MortgageTrack, MortgageCalculation, TrackCalculation } from '@/components/mortgage-advisor/types';
import { TRACK_TYPES, DEFAULT_INTEREST_RATES } from '@/components/mortgage-advisor/types';
import { formatCurrency, formatPercentage, calculateMortgageMix } from '@/components/mortgage-advisor/mortgageCalculations';
import { isRateVariable, isIndexLinked } from '@/components/mortgage-advisor/scenarioCalculations';
import { MortgageMixBuilder } from '@/components/mortgage-advisor/MortgageMixBuilder';
import {
  AnalysisCharts,
  DeltaBadge,
  mergeSeries,
  mixYearlySeries,
  trackYearlySeries,
  compactCurrency,
  ANALYSIS_COLORS,
} from '@/components/mortgage-advisor/analysisCharts';
import {
  trackRiskProfile,
  mixRiskScore,
  riskLevelFromScore,
  volatilityBand,
  RISK_META,
} from '@/components/mortgage-refinance/riskAnalysis';

type RefinanceMode = 'whole' | 'per-track';

interface RefinanceAnalysisProps {
  currentMix: MortgageMix;
  onEdit: () => void;
}

function trackColor(type: MortgageTrack['type']): string {
  if (type === 'fixed_unlinked') return 'bg-blue-500';
  if (type === 'fixed_linked') return 'bg-blue-400';
  if (type === 'prime') return 'bg-orange-500';
  if (type === 'variable_unlinked') return 'bg-green-500';
  if (type === 'variable_linked') return 'bg-green-400';
  if (type === 'makam') return 'bg-purple-500';
  return 'bg-slate-500';
}

function rateBounds(track: MortgageTrack): { min: number; max: number; hasRange: boolean } {
  const def = DEFAULT_INTEREST_RATES[track.type] ?? track.interestRate;
  const max = track.interestRate;
  let min = Math.max(0.1, Math.min(track.interestRate, def - 1));
  if (min >= max) min = Math.max(0.1, max - 0.5);
  const hasRange = max - min >= 0.05;
  return { min, max, hasRange };
}

const joinNames = (tracks: MortgageTrack[]) => tracks.map((t) => t.name).join(', ');

/* ------------------------------------------------------------------ */
/* Compact current-state KPI box (dark, centered)                      */
/* ------------------------------------------------------------------ */

function StateBox({ icon: Icon, label, value, gradient }: { icon: React.ElementType; label: string; value: string; gradient: string }) {
  return (
    <div className={`rounded-xl ${gradient} text-white px-4 py-3 shadow-md text-center w-full sm:w-56`}>
      <div className="flex items-center justify-center gap-1.5 text-slate-300 text-[11px] mb-0.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">במצב הנוכחי</p>
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
/* Per-track row: risk line + (per-track) sliders + per-track graphs   */
/* ------------------------------------------------------------------ */

function RefinanceTrackRow({
  track,
  baseTrackCalc,
  refinedTrackCalc,
  rate,
  onRateChange,
  years,
  onYearsChange,
  editable,
  effectiveYears,
}: {
  track: MortgageTrack;
  baseTrackCalc?: TrackCalculation;
  refinedTrackCalc?: TrackCalculation;
  rate: number;
  onRateChange: (v: number) => void;
  years: number;
  onYearsChange: (v: number) => void;
  editable: boolean;
  effectiveYears: number;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (editable) setOpen(true);
  }, [editable]);

  const { min, max, hasRange } = rateBounds(track);
  const risk = useMemo(() => trackRiskProfile(track), [track]);
  const meta = RISK_META[risk.level];

  const baseMonthly = baseTrackCalc?.monthlyPayment ?? 0;
  const baseInterest = baseTrackCalc?.totalInterest ?? 0;
  const curMonthly = refinedTrackCalc?.monthlyPayment ?? baseMonthly;
  const curInterest = refinedTrackCalc?.totalInterest ?? baseInterest;
  const mDelta = curMonthly - baseMonthly;

  const changed = editable && (Math.abs(mDelta) > 1 || Math.abs(curInterest - baseInterest) > 1);
  const worse = curInterest > baseInterest + 1;
  const scenarioColor = worse ? ANALYSIS_COLORS.worse : ANALYSIS_COLORS.better;

  const lineData = useMemo(() => {
    if (!open || !baseTrackCalc || !refinedTrackCalc) return [];
    return mergeSeries(trackYearlySeries(baseTrackCalc), trackYearlySeries(refinedTrackCalc));
  }, [open, baseTrackCalc, refinedTrackCalc]);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-right"
      >
        <span className={`w-1.5 h-9 rounded-full shrink-0 ${trackColor(track.type)}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-900 truncate">{track.name}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {TRACK_TYPES[track.type]} · {formatCurrency(track.amount)} · {editable ? effectiveYears : track.years} שנים ·{' '}
            {formatPercentage(rate)}
          </p>
        </div>
        <span className={`hidden sm:inline text-[10px] font-bold shrink-0 ${meta.text}`}>{meta.label}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 space-y-4">
          {/* per-track risk line (moved here from the analysis box) */}
          <div className={`rounded-lg border p-3 ${meta.bg}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-sm text-slate-900">פרופיל סיכון</span>
              <span className={`text-[11px] font-bold ${meta.text}`}>{meta.label}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{risk.description}</p>
            {risk.stationNote && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {risk.stationNote}
              </p>
            )}
          </div>

          {editable && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-blue-600" />
                    ריבית המסלול
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatPercentage(track.interestRate)} → <span className="text-emerald-600">{formatPercentage(rate)}</span>
                  </span>
                </div>
                {hasRange ? (
                  <>
                    <Slider dir="ltr" value={[rate]} onValueChange={([v]) => onRateChange(v)} min={min} max={max} step={0.05} />
                    <div dir="ltr" className="flex justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-emerald-500" />
                        מופחתת {formatPercentage(min)}
                      </span>
                      <span>נוכחית {formatPercentage(max)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400">אין מרווח להורדת ריבית במסלול זה.</p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-violet-600" />
                    תקופת המסלול
                  </span>
                  <span className="text-sm font-bold text-slate-800">{years} שנים</span>
                </div>
                <Slider dir="ltr" value={[years]} onValueChange={([v]) => onYearsChange(v)} min={4} max={30} step={1} />
                <div dir="ltr" className="flex justify-between text-[10px] text-slate-400">
                  <span>4 שנים</span>
                  <span>30 שנים</span>
                </div>
              </div>
            </div>
          )}

          {baseTrackCalc && refinedTrackCalc && (
            <AnalysisCharts
              lineData={lineData}
              changed={changed}
              scenarioColor={scenarioColor}
              scenarioName="ממוחזר"
              principal={track.amount}
              interest={curInterest}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main refinance analysis                                             */
/* ------------------------------------------------------------------ */

export function RefinanceAnalysis({ currentMix, onEdit }: RefinanceAnalysisProps) {
  const baseCalc = useMemo<MortgageCalculation>(() => calculateMortgageMix(currentMix), [currentMix]);

  const [mode, setMode] = useState<RefinanceMode>('per-track');
  const [trackYears, setTrackYears] = useState<Record<string, number>>(() =>
    Object.fromEntries(currentMix.tracks.map((t) => [t.id, Math.min(30, Math.max(4, t.years))]))
  );
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(currentMix.tracks.map((t) => [t.id, t.interestRate]))
  );
  const [newMix, setNewMix] = useState<MortgageMix | null>(null);

  useEffect(() => {
    setMode('per-track');
    setTrackYears(Object.fromEntries(currentMix.tracks.map((t) => [t.id, Math.min(30, Math.max(4, t.years))])));
    setRates(Object.fromEntries(currentMix.tracks.map((t) => [t.id, t.interestRate])));
    setNewMix(null);
  }, [currentMix.id, currentMix.tracks.length]);

  const perTrack = mode === 'per-track';

  const refinedMix = useMemo<MortgageMix>(() => {
    if (mode === 'whole') return newMix ?? currentMix;
    return {
      ...currentMix,
      tracks: currentMix.tracks.map((t) => ({
        ...t,
        years: trackYears[t.id] ?? t.years,
        interestRate: rates[t.id] ?? t.interestRate,
      })),
    };
  }, [mode, newMix, currentMix, trackYears, rates]);

  const refinedCalc = useMemo<MortgageCalculation>(() => calculateMortgageMix(refinedMix), [refinedMix]);

  const baseByTrackId = useMemo(
    () => Object.fromEntries(baseCalc.trackCalculations.map((c) => [c.track.id, c])),
    [baseCalc]
  );
  const refinedByTrackId = useMemo(
    () => Object.fromEntries(refinedCalc.trackCalculations.map((c) => [c.track.id, c])),
    [refinedCalc]
  );

  const monthlyDelta = refinedCalc.summary.totalMonthlyPayment - baseCalc.summary.totalMonthlyPayment;
  const interestDelta = refinedCalc.summary.totalInterest - baseCalc.summary.totalInterest;
  const changed = Math.abs(monthlyDelta) > 1 || Math.abs(interestDelta) > 1;
  const worse = refinedCalc.summary.totalInterest > baseCalc.summary.totalInterest + 1;
  const scenarioColor = worse ? ANALYSIS_COLORS.worse : ANALYSIS_COLORS.better;

  const lineData = useMemo(
    () => mergeSeries(mixYearlySeries(baseCalc), mixYearlySeries(refinedCalc)),
    [baseCalc, refinedCalc]
  );

  const principal = currentMix.tracks.reduce((s, t) => s + t.amount, 0);

  const newMixSeed = useMemo<MortgageMix>(
    () => ({
      ...currentMix,
      id: `refi-target-${currentMix.id}`,
      name: 'תמהיל מוצע למיחזור',
      tracks: currentMix.tracks.map((t) => ({ ...t })),
    }),
    [currentMix]
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* ===== Current state box ===== */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              המצב הנוכחי
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onEdit} className="text-slate-500">
              <Pencil className="h-3.5 w-3.5 ml-1" />
              עריכה
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compact current-state boxes (centered) */}
          <div className="flex flex-wrap justify-center gap-3">
            <StateBox
              icon={Wallet}
              label="החזר חודשי"
              value={formatCurrency(baseCalc.summary.totalMonthlyPayment)}
              gradient="bg-gradient-to-br from-slate-900 to-indigo-900"
            />
            <StateBox
              icon={Banknote}
              label="סך ריבית"
              value={formatCurrency(baseCalc.summary.totalInterest)}
              gradient="bg-gradient-to-br from-slate-900 to-blue-900"
            />
            <StateBox
              icon={Coins}
              label="סכום הקרן שנותר"
              value={formatCurrency(principal)}
              gradient="bg-gradient-to-br from-slate-900 to-slate-700"
            />
          </div>

          {/* Refinance mode radio */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setMode('whole')}
                className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                  mode === 'whole' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                מחזור כל המשכנתא
              </button>
              <button
                type="button"
                onClick={() => setMode('per-track')}
                className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                  mode === 'per-track' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                מחזור כל מסלול בנפרד
              </button>
            </div>
          </div>

          {/* Track rows */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            {currentMix.tracks.map((track) => (
              <RefinanceTrackRow
                key={track.id}
                track={track}
                baseTrackCalc={baseByTrackId[track.id]}
                refinedTrackCalc={perTrack ? refinedByTrackId[track.id] : baseByTrackId[track.id]}
                rate={rates[track.id] ?? track.interestRate}
                onRateChange={(v) => setRates((prev) => ({ ...prev, [track.id]: v }))}
                years={trackYears[track.id] ?? track.years}
                onYearsChange={(v) => setTrackYears((prev) => ({ ...prev, [track.id]: v }))}
                editable={perTrack}
                effectiveYears={trackYears[track.id] ?? track.years}
              />
            ))}
          </div>

          {/* ===== Whole-mortgage graphs (inside the current-state box) ===== */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">השוואה גרפית — המשכנתא כולה</p>
              <p className="text-[11px] text-slate-500">המצב הנוכחי מול המצב הממוחזר לפי הבקרות שנבחרו.</p>
            </div>
            <AnalysisCharts
              lineData={lineData}
              changed={changed}
              scenarioColor={scenarioColor}
              scenarioName="ממוחזר"
              principal={refinedMix.tracks.reduce((s, t) => s + t.amount, 0)}
              interest={refinedCalc.summary.totalInterest}
            />

            <CurrentStateAnalysis mix={currentMix} calc={baseCalc} showOptions={perTrack} />
          </div>
        </CardContent>
      </Card>

      {/* ===== Whole-mortgage: new target mix input (like the first screen) ===== */}
      <AnimatePresence>
        {mode === 'whole' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  הזנת התמהיל החדש למיחזור
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MortgageMixBuilder
                  editingMix={newMix ?? newMixSeed}
                  onSave={(mix) => setNewMix(mix)}
                />
                {newMix && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white p-4 shadow-md">
                      <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                        <Wallet className="h-3.5 w-3.5" />
                        החזר חודשי — בתמהיל החדש
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(refinedCalc.summary.totalMonthlyPayment)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-[11px]">נוכחי:</span>
                        <span className="text-xs">{formatCurrency(baseCalc.summary.totalMonthlyPayment)}</span>
                        <DeltaBadge value={monthlyDelta} />
                      </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-4 shadow-md">
                      <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                        <Banknote className="h-3.5 w-3.5" />
                        סך ריבית — בתמהיל החדש
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(refinedCalc.summary.totalInterest)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-[11px]">נוכחי:</span>
                        <span className="text-xs">{formatCurrency(baseCalc.summary.totalInterest)}</span>
                        <DeltaBadge value={interestDelta} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
