'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Percent,
  BarChart3,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  Layers,
} from 'lucide-react';
import type { MortgageMix, MortgageTrack } from './types';
import { formatTrackTypeWithAmortization } from './types';
import { calculateMortgageMix, formatCurrency, formatPercentage } from './mortgageCalculations';
import {
  getTrackScenarioKind,
  getDefaultTrackScenario,
  getOptimisticTrackScenario,
  getPessimisticTrackScenario,
  calculateMixWithScenarios,
  calculateTrackWithScenario,
  buildScenariosMap,
  SCENARIO_RATE_DELTA,
  SCENARIO_CPI_ANNUAL,
  type TrackScenarioValues,
  type TrackScenarioKind,
} from './scenarioCalculations';

interface ScenarioAnalysisProps {
  baseMix: MortgageMix;
  onClose?: () => void;
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

function DeltaBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (Math.abs(value) < 1) {
    return <span className="text-xs text-muted-foreground">ללא שינוי</span>;
  }
  const positive = value > 0;
  return (
    <span className={`text-xs font-semibold ${positive ? 'text-red-600' : 'text-emerald-600'}`}>
      {positive ? '+' : ''}
      {suffix === '%' ? `${value.toFixed(1)}%` : formatCurrency(value)}
      {suffix && suffix !== '%' ? ` ${suffix}` : ''}
    </span>
  );
}

interface TrackScenarioCardProps {
  track: MortgageTrack;
  baseCalc: { monthlyPayment: number; totalInterest: number };
  scenario: TrackScenarioValues;
  onScenarioChange: (values: TrackScenarioValues) => void;
}

function TrackScenarioCard({ track, baseCalc, scenario, onScenarioChange }: TrackScenarioCardProps) {
  const kind = getTrackScenarioKind(track.type);
  const optimistic = getOptimisticTrackScenario(track);
  const pessimistic = getPessimisticTrackScenario(track);

  const scenarioCalc = useMemo(
    () => calculateTrackWithScenario(track, scenario),
    [track, scenario]
  );

  const monthlyDelta = scenarioCalc.monthlyPayment - baseCalc.monthlyPayment;
  const interestDelta = scenarioCalc.totalInterest - baseCalc.totalInterest;

  const rateMin = Math.max(0.1, track.interestRate + SCENARIO_RATE_DELTA.optimistic);
  const rateMax = track.interestRate + SCENARIO_RATE_DELTA.pessimistic;
  const currentRate = scenario.interestRate ?? track.interestRate;

  const cpiMin = SCENARIO_CPI_ANNUAL.optimistic;
  const cpiMax = SCENARIO_CPI_ANNUAL.pessimistic;
  const currentCpi = scenario.annualInflation ?? SCENARIO_CPI_ANNUAL.base;

  const sliderPercent =
    kind === 'rate'
      ? ((currentRate - rateMin) / (rateMax - rateMin)) * 100
      : kind === 'cpi'
        ? ((currentCpi - cpiMin) / (cpiMax - cpiMin)) * 100
        : 0;

  return (
    <Card className="overflow-hidden border-0 shadow-md ring-1 ring-slate-200/80 bg-white">
      <div className={`h-1 ${trackColor(track.type)}`} />
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-bold truncate">{track.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5 line-clamp-2">
              {formatTrackTypeWithAmortization(track)} · {formatCurrency(track.amount)} ·{' '}
              {track.years} שנים
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {Math.round(track.percentage)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        {kind === 'stable' && (
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="rounded-lg bg-slate-200 p-2">
              <Shield className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">מסלול יציב</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                ריבית קבועה לא צמודה — המסלול אינו עתיד להשתנות בכל אופן. התשלום החודשי וסך
                הריביות נשארים קבועים לאורך כל התקופה.
              </p>
            </div>
          </div>
        )}

        {kind === 'rate' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-800">ריבית למסלול</span>
            </div>
            <p className="text-xs text-slate-500 -mt-1">
              שינוי הריבית משפיע על התשלום החודשי ועל סך הריביות שישולמו
            </p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-slate-900">{formatPercentage(currentRate)}</span>
              <div className="flex gap-3 text-[10px]">
                <span className="text-emerald-600 font-medium">
                  אופטימי {formatPercentage(optimistic.interestRate!)}
                </span>
                <span className="text-red-600 font-medium">
                  פסימי {formatPercentage(pessimistic.interestRate!)}
                </span>
              </div>
            </div>
            <Slider
              value={[currentRate]}
              onValueChange={([v]) => onScenarioChange({ interestRate: v })}
              min={rateMin}
              max={rateMax}
              step={0.05}
              className="py-1"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-emerald-500" />
                תרחיש אופטימי
              </span>
              <span className="flex items-center gap-1">
                תרחיש פסימי
                <TrendingUp className="h-3 w-3 text-red-500" />
              </span>
            </div>
          </div>
        )}

        {kind === 'cpi' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-slate-800">מדד המחירים (אינפלציה שנתית)</span>
            </div>
            <p className="text-xs text-slate-500 -mt-1">
              עליית המדד מגדילה את גובה הקרן ואת סך הריביות לאורך התקופה
            </p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-slate-900">{formatPercentage(currentCpi)}</span>
              <div className="flex gap-3 text-[10px]">
                <span className="text-emerald-600 font-medium">
                  אופטימי {formatPercentage(SCENARIO_CPI_ANNUAL.optimistic)}
                </span>
                <span className="text-red-600 font-medium">
                  פסימי {formatPercentage(SCENARIO_CPI_ANNUAL.pessimistic)}
                </span>
              </div>
            </div>
            <Slider
              value={[currentCpi]}
              onValueChange={([v]) => onScenarioChange({ annualInflation: v })}
              min={cpiMin}
              max={cpiMax}
              step={0.1}
              className="py-1"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>אינפלציה נמוכה</span>
              <span>אינפלציה גבוהה</span>
            </div>
          </div>
        )}

        {kind !== 'stable' && (
          <>
            <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-red-500 transition-all"
                style={{ width: `${sliderPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                <p className="text-[10px] text-slate-500 mb-0.5">תשלום חודשי</p>
                <p className="text-sm font-bold">{formatCurrency(scenarioCalc.monthlyPayment)}</p>
                <DeltaBadge value={monthlyDelta} />
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                <p className="text-[10px] text-slate-500 mb-0.5">סך ריבית</p>
                <p className="text-sm font-bold">{formatCurrency(scenarioCalc.totalInterest)}</p>
                <DeltaBadge value={interestDelta} />
              </div>
            </div>
          </>
        )}

        {kind === 'stable' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-0.5">תשלום חודשי</p>
              <p className="text-sm font-bold">{formatCurrency(baseCalc.monthlyPayment)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-0.5">סך ריבית</p>
              <p className="text-sm font-bold">{formatCurrency(baseCalc.totalInterest)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ScenarioAnalysis({ baseMix, onClose }: ScenarioAnalysisProps) {
  const baseCalculation = useMemo(() => calculateMortgageMix(baseMix), [baseMix]);

  const [trackScenarios, setTrackScenarios] = useState<Record<string, TrackScenarioValues>>(() =>
    buildScenariosMap(baseMix.tracks, getDefaultTrackScenario)
  );

  const updateTrackScenario = useCallback((trackId: string, values: TrackScenarioValues) => {
    setTrackScenarios((prev) => ({ ...prev, [trackId]: values }));
  }, []);

  const applyPreset = useCallback(
    (picker: (track: MortgageTrack) => TrackScenarioValues) => {
      setTrackScenarios(buildScenariosMap(baseMix.tracks, picker));
    },
    [baseMix.tracks]
  );

  const currentCalculation = useMemo(
    () => calculateMixWithScenarios(baseMix, trackScenarios),
    [baseMix, trackScenarios]
  );

  const optimisticCalculation = useMemo(
    () =>
      calculateMixWithScenarios(
        baseMix,
        buildScenariosMap(baseMix.tracks, getOptimisticTrackScenario)
      ),
    [baseMix]
  );

  const pessimisticCalculation = useMemo(
    () =>
      calculateMixWithScenarios(
        baseMix,
        buildScenariosMap(baseMix.tracks, getPessimisticTrackScenario)
      ),
    [baseMix]
  );

  const monthlyDelta =
    currentCalculation.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment;
  const interestDelta =
    currentCalculation.summary.totalInterest - baseCalculation.summary.totalInterest;

  const trackStats = useMemo(() => {
    const counts: Record<TrackScenarioKind, number> = { stable: 0, rate: 0, cpi: 0 };
    baseMix.tracks.forEach((t) => {
      counts[getTrackScenarioKind(t.type)]++;
    });
    return counts;
  }, [baseMix.tracks]);

  const monthlyDeltaPercent =
    baseCalculation.summary.totalMonthlyPayment > 0
      ? (monthlyDelta / baseCalculation.summary.totalMonthlyPayment) * 100
      : 0;

  const scenarioPositionOnScale = useMemo(() => {
    const opt = optimisticCalculation.summary.totalMonthlyPayment;
    const pes = pessimisticCalculation.summary.totalMonthlyPayment;
    const cur = currentCalculation.summary.totalMonthlyPayment;
    if (pes === opt) return 50;
    return Math.min(100, Math.max(0, ((cur - opt) / (pes - opt)) * 100));
  }, [optimisticCalculation, pessimisticCalculation, currentCalculation]);

  const baseTrackCalcs = useMemo(
    () => Object.fromEntries(baseCalculation.trackCalculations.map((c) => [c.track.id, c])),
    [baseCalculation]
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">ניתוח תרחישים</h2>
          </div>
          <p className="text-slate-600 text-sm">{baseMix.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset(getDefaultTrackScenario)}>
            <RotateCcw className="h-3.5 w-3.5 ml-1" />
            איפוס
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => applyPreset(getOptimisticTrackScenario)}
          >
            <Sparkles className="h-3.5 w-3.5 ml-1" />
            הכל אופטימי
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => applyPreset(getPessimisticTrackScenario)}
          >
            <AlertTriangle className="h-3.5 w-3.5 ml-1" />
            הכל פסימי
          </Button>
          {onClose && (
            <Button variant="default" size="sm" onClick={onClose}>
              חזור
            </Button>
          )}
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2 border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <CardContent className="pt-6 pb-5">
            <p className="text-slate-300 text-xs mb-1">תשלום חודשי — תרחיש נוכחי</p>
            <p className="text-3xl font-bold">
              {formatCurrency(currentCalculation.summary.totalMonthlyPayment)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-400 text-xs">בסיס:</span>
              <span className="text-sm">{formatCurrency(baseCalculation.summary.totalMonthlyPayment)}</span>
              <DeltaBadge value={monthlyDelta} />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>אופטימי</span>
                <span>פסימי</span>
              </div>
              <div className="relative h-2 rounded-full bg-slate-700">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg border-2 border-blue-400 transition-all"
                  style={{ right: `calc(${scenarioPositionOnScale}% - 6px)` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Banknote className="h-3.5 w-3.5" />
              סך ריבית — תרחיש נוכחי
            </div>
            <p className="text-xl font-bold">{formatCurrency(currentCalculation.summary.totalInterest)}</p>
            <DeltaBadge value={interestDelta} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-5 pb-4">
            <p className="text-slate-500 text-xs mb-2">הרכב מסלולים</p>
            <div className="flex flex-wrap gap-1.5">
              {trackStats.stable > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {trackStats.stable} יציבים
                </Badge>
              )}
              {trackStats.rate > 0 && (
                <Badge className="text-[10px] bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {trackStats.rate} ריבית
                </Badge>
              )}
              {trackStats.cpi > 0 && (
                <Badge className="text-[10px] bg-violet-100 text-violet-800 hover:bg-violet-100">
                  {trackStats.cpi} מדד
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">{baseMix.tracks.length} מסלולים בתמהיל</p>
          </CardContent>
        </Card>
      </div>

      {/* Scenario comparison strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            label: 'תרחיש אופטימי',
            calc: optimisticCalculation,
            icon: TrendingDown,
            color: 'emerald',
            desc: 'ריבית −1% · אינפלציה 1%',
          },
          {
            label: 'תרחיש נוכחי',
            calc: currentCalculation,
            icon: ArrowLeftRight,
            color: 'blue',
            desc: 'לפי הסליידרים שהגדרת',
          },
          {
            label: 'תרחיש פסימי',
            calc: pessimisticCalculation,
            icon: TrendingUp,
            color: 'red',
            desc: 'ריבית +2% · אינפלציה 5%',
          },
        ].map(({ label, calc, icon: Icon, color, desc }) => {
          const mDelta = calc.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment;
          const iDelta = calc.summary.totalInterest - baseCalculation.summary.totalInterest;
          const bg =
            color === 'emerald'
              ? 'from-emerald-50 to-white border-emerald-200'
              : color === 'red'
                ? 'from-red-50 to-white border-red-200'
                : 'from-blue-50 to-white border-blue-200';
          const iconColor =
            color === 'emerald' ? 'text-emerald-600' : color === 'red' ? 'text-red-600' : 'text-blue-600';

          return (
            <Card key={label} className={`border bg-gradient-to-b ${bg}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">{desc}</p>
                <p className="text-lg font-bold">{formatCurrency(calc.summary.totalMonthlyPayment)}</p>
                <p className="text-xs text-slate-500">לחודש · שינוי: <DeltaBadge value={mDelta} /></p>
                <p className="text-xs text-slate-500 mt-1">
                  סך ריבית: {formatCurrency(calc.summary.totalInterest)}{' '}
                  (<DeltaBadge value={iDelta} />)
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sensitivity bar */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">רגישות תשלום חודשי לתרחיש</span>
            <span className="text-xs text-slate-500">
              {monthlyDeltaPercent >= 0 ? '+' : ''}
              {monthlyDeltaPercent.toFixed(1)}% מהבסיס
            </span>
          </div>
          <Progress value={scenarioPositionOnScale} className="h-2" />
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>{formatCurrency(optimisticCalculation.summary.totalMonthlyPayment)}</span>
            <span>{formatCurrency(pessimisticCalculation.summary.totalMonthlyPayment)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-track cards */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          פרמטרים לפי מסלול
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {baseMix.tracks.map((track) => {
            const baseTrack = baseTrackCalcs[track.id];
            return (
              <TrackScenarioCard
                key={track.id}
                track={track}
                baseCalc={{
                  monthlyPayment: baseTrack?.monthlyPayment ?? 0,
                  totalInterest: baseTrack?.totalInterest ?? 0,
                }}
                scenario={trackScenarios[track.id] ?? getDefaultTrackScenario(track)}
                onScenarioChange={(values) => updateTrackScenario(track.id, values)}
              />
            );
          })}
        </div>
      </div>

      {/* Summary table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">סיכום השוואה</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="text-right p-2 font-medium">תרחיש</th>
                <th className="text-right p-2 font-medium">תשלום חודשי</th>
                <th className="text-right p-2 font-medium">שינוי מהבסיס</th>
                <th className="text-right p-2 font-medium">סך ריבית</th>
                <th className="text-right p-2 font-medium">שינוי ריבית</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'בסיס (נוכחי)', calc: baseCalculation, highlight: '' },
                { name: 'תרחיש מותאם', calc: currentCalculation, highlight: 'text-blue-700' },
                { name: 'אופטימי', calc: optimisticCalculation, highlight: 'text-emerald-700' },
                { name: 'פסימי', calc: pessimisticCalculation, highlight: 'text-red-700' },
              ].map(({ name, calc, highlight }) => {
                const mD =
                  calc.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment;
                const iD = calc.summary.totalInterest - baseCalculation.summary.totalInterest;
                return (
                  <tr key={name} className="border-b hover:bg-slate-50/80">
                    <td className={`p-2 font-medium ${highlight}`}>{name}</td>
                    <td className="p-2">{formatCurrency(calc.summary.totalMonthlyPayment)}</td>
                    <td className="p-2">
                      {name === 'בסיס (נוכחי)' ? '—' : <DeltaBadge value={mD} />}
                    </td>
                    <td className="p-2">{formatCurrency(calc.summary.totalInterest)}</td>
                    <td className="p-2">
                      {name === 'בסיס (נוכחי)' ? '—' : <DeltaBadge value={iD} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
