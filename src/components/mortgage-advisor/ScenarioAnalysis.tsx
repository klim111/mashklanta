'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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
  LineChart as LineChartIcon,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import type { MortgageMix, MortgageTrack } from './types';
import { TRACK_TYPES } from './types';
import { formatCurrency, formatPercentage } from './mortgageCalculations';
import {
  getTrackScenarioKind,
  isRateVariable,
  isIndexLinked,
  calculateTrackScenario,
  calculateMixScenario,
  buildScenarioSeries,
  buildTrackSeries,
  getRateVariableTypes,
  mixHasIndexLinked,
  makeBaseScenario,
  buildPresetScenario,
  effectiveRateForTrack,
  SCENARIO_RANGES,
  PRESET_SCENARIOS,
  type GlobalScenario,
  type ScenarioSeriesPoint,
  type TrackScenarioKind,
} from './scenarioCalculations';

interface ScenarioAnalysisProps {
  baseMix: MortgageMix;
  onClose?: () => void;
}

const COLORS = {
  current: '#3b82f6',
  worse: '#ef4444',
  better: '#10b981',
  principal: '#3b82f6',
  interest: '#ef4444',
};

function trackColor(type: MortgageTrack['type']): string {
  if (type === 'fixed_unlinked') return 'bg-blue-500';
  if (type === 'fixed_linked') return 'bg-blue-400';
  if (type === 'prime') return 'bg-orange-500';
  if (type === 'variable_unlinked') return 'bg-green-500';
  if (type === 'variable_linked') return 'bg-green-400';
  if (type === 'makam') return 'bg-purple-500';
  return 'bg-slate-500';
}

function DeltaBadge({ value }: { value: number }) {
  if (Math.abs(value) < 1) {
    return <span className="text-xs text-muted-foreground">ללא שינוי</span>;
  }
  const positive = value > 0;
  return (
    <span className={`text-xs font-semibold ${positive ? 'text-red-600' : 'text-emerald-600'}`}>
      {positive ? '+' : ''}
      {formatCurrency(value)}
    </span>
  );
}

const compactCurrency = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(v / 1000)}K`;
  return String(Math.round(v));
};

const tooltipFormatter = (value: number | string) =>
  typeof value === 'number' ? formatCurrency(value) : value;
const yearLabelFormatter = (label: number | string) => `שנה ${label}`;

interface LineRow {
  year: number;
  baseBalance: number | null;
  scenBalance: number | null;
  basePay: number | null;
  scenPay: number | null;
}

function mergeSeries(base: ScenarioSeriesPoint[], scen: ScenarioSeriesPoint[]): LineRow[] {
  const maxLen = Math.max(base.length, scen.length);
  const rows: LineRow[] = [];
  for (let y = 0; y < maxLen; y++) {
    rows.push({
      year: y,
      baseBalance: base[y]?.balance ?? null,
      scenBalance: scen[y]?.balance ?? null,
      basePay: base[y]?.payment ?? null,
      scenPay: scen[y]?.payment ?? null,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Reusable slider controls                                            */
/* ------------------------------------------------------------------ */

function RateSliderControl({
  type,
  value,
  onChange,
}: {
  type: MortgageTrack['type'];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
          <Percent className="h-3.5 w-3.5 text-blue-600" />
          {TRACK_TYPES[type]}
        </span>
        <span
          className={`text-sm font-bold ${
            value > 0 ? 'text-red-600' : value < 0 ? 'text-emerald-600' : 'text-slate-700'
          }`}
        >
          {value > 0 ? '+' : ''}
          {value.toFixed(2)}%
        </span>
      </div>
      <Slider
        dir="ltr"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={SCENARIO_RANGES.rateDelta.min}
        max={SCENARIO_RANGES.rateDelta.max}
        step={SCENARIO_RANGES.rateDelta.step}
      />
      <div dir="ltr" className="flex justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-emerald-500" />
          ירידה {SCENARIO_RANGES.rateDelta.min}%
        </span>
        <span className="flex items-center gap-1">
          עלייה +{SCENARIO_RANGES.rateDelta.max}%
          <TrendingUp className="h-3 w-3 text-red-500" />
        </span>
      </div>
    </div>
  );
}

function InflationSliderControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
          מדד / אינפלציה שנתית
        </span>
        <span className="text-sm font-bold text-slate-700">{formatPercentage(value)}</span>
      </div>
      <Slider
        dir="ltr"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={SCENARIO_RANGES.inflation.min}
        max={SCENARIO_RANGES.inflation.max}
        step={SCENARIO_RANGES.inflation.step}
      />
      <div dir="ltr" className="flex justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-emerald-500" />
          מדד יורד {SCENARIO_RANGES.inflation.min}%
        </span>
        <span className="flex items-center gap-1">
          מדד עולה +{SCENARIO_RANGES.inflation.max}%
          <TrendingUp className="h-3 w-3 text-red-500" />
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

function ChartPanel({ title, hint, children }: { title: string; hint: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 mb-2 leading-snug">{hint}</p>
      <ResponsiveContainer width="100%" height={230}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ScenarioCharts({
  lineData,
  scenarioChanged,
  scenarioColor,
  scenarioLineName,
  principal,
  interest,
}: {
  lineData: LineRow[];
  scenarioChanged: boolean;
  scenarioColor: string;
  scenarioLineName: string;
  principal: number;
  interest: number;
}) {
  const pieData = [
    { name: 'קרן', value: Math.max(0, principal), color: COLORS.principal },
    { name: 'ריבית', value: Math.max(0, interest), color: COLORS.interest },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <ChartPanel title="יתרת קרן" hint="התקדמות החזר הקרן. כשהמדד עולה הקרן גדלה וקצב הסילוק מואט.">
        <LineChart data={lineData} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={40} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={yearLabelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="baseBalance" name="מצב נוכחי" stroke={COLORS.current} strokeWidth={2.5} dot={false} connectNulls />
          {scenarioChanged && (
            <Line type="monotone" dataKey="scenBalance" name={scenarioLineName} stroke={scenarioColor} strokeWidth={2.5} dot={false} connectNulls />
          )}
        </LineChart>
      </ChartPanel>

      <ChartPanel title="החזר חודשי" hint="ההחזר החודשי לאורך התקופה. במסלולים צמודי מדד ההחזר עולה עם המדד.">
        <LineChart data={lineData} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={40} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={yearLabelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="basePay" name="מצב נוכחי" stroke={COLORS.current} strokeWidth={2.5} dot={false} connectNulls />
          {scenarioChanged && (
            <Line type="monotone" dataKey="scenPay" name={scenarioLineName} stroke={scenarioColor} strokeWidth={2.5} dot={false} connectNulls />
          )}
        </LineChart>
      </ChartPanel>

      <ChartPanel title="קרן מול ריבית" hint="חלוקת סך התשלום: כמה מהקרן הולך לתשלום ריבית לאורך התקופה.">
        <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            innerRadius={45}
            outerRadius={78}
            paddingAngle={2}
            label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            labelLine={false}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ChartPanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-track expandable row                                            */
/* ------------------------------------------------------------------ */

function TrackRow({
  track,
  scenario,
  baseScenario,
  onRateChange,
  onInflationChange,
}: {
  track: MortgageTrack;
  scenario: GlobalScenario;
  baseScenario: GlobalScenario;
  onRateChange: (type: string, v: number) => void;
  onInflationChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const rateVar = isRateVariable(track.type);
  const idx = isIndexLinked(track.type);
  const kind = getTrackScenarioKind(track.type);

  const baseCalc = useMemo(() => calculateTrackScenario(track, baseScenario), [track, baseScenario]);
  const curCalc = useMemo(() => calculateTrackScenario(track, scenario), [track, scenario]);

  const mDelta = curCalc.monthlyPayment - baseCalc.monthlyPayment;
  const iDelta = curCalc.totalInterest - baseCalc.totalInterest;

  const trackChanged =
    (rateVar && Math.abs((scenario.rateDeltas[track.type] ?? 0) - 0) > 0.001) ||
    (idx && Math.abs(scenario.annualInflation - baseScenario.annualInflation) > 0.001);
  const trackWorse = curCalc.totalInterest > baseCalc.totalInterest + 1;
  const scenarioColor = trackWorse ? COLORS.worse : COLORS.better;
  const scenarioLineName = trackWorse ? 'תרחיש (פסימי)' : 'תרחיש (אופטימי)';

  const baseTrackSeries = useMemo(() => (open ? buildTrackSeries(track, baseScenario) : []), [open, track, baseScenario]);
  const scenTrackSeries = useMemo(() => (open ? buildTrackSeries(track, scenario) : []), [open, track, scenario]);
  const lineData = useMemo(() => mergeSeries(baseTrackSeries, scenTrackSeries), [baseTrackSeries, scenTrackSeries]);

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
            {TRACK_TYPES[track.type]} · {formatCurrency(track.amount)} · {track.years} שנים
            {rateVar ? ` · ${formatPercentage(effectiveRateForTrack(track, scenario))}` : ''}
          </p>
        </div>

        <div className="text-center hidden sm:block min-w-[92px]">
          <p className="text-[10px] text-slate-400">החזר חודשי</p>
          <p className="text-sm font-bold text-slate-800">{formatCurrency(curCalc.monthlyPayment)}</p>
          <DeltaBadge value={mDelta} />
        </div>
        <div className="text-center hidden sm:block min-w-[92px]">
          <p className="text-[10px] text-slate-400">סך ריבית</p>
          <p className="text-sm font-bold text-slate-800">{formatCurrency(curCalc.totalInterest)}</p>
          <DeltaBadge value={iDelta} />
        </div>

        <Badge variant="outline" className="shrink-0 text-[10px]">
          {Math.round(track.percentage)}%
        </Badge>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 space-y-4">
          {/* mobile summary of the figures hidden in the header */}
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <div className="rounded-lg bg-white p-2.5 text-center border border-slate-200">
              <p className="text-[10px] text-slate-400">החזר חודשי</p>
              <p className="text-sm font-bold text-slate-800">{formatCurrency(curCalc.monthlyPayment)}</p>
              <DeltaBadge value={mDelta} />
            </div>
            <div className="rounded-lg bg-white p-2.5 text-center border border-slate-200">
              <p className="text-[10px] text-slate-400">סך ריבית</p>
              <p className="text-sm font-bold text-slate-800">{formatCurrency(curCalc.totalInterest)}</p>
              <DeltaBadge value={iDelta} />
            </div>
          </div>

          {kind === 'stable' ? (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 leading-relaxed">
                מסלול מוגן לחלוטין — ריבית קבועה לא צמודה שאינה מושפעת משינוי בריבית או במדד ואינה
                משתנה לאורך כל התקופה.
              </p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {rateVar && (
                <RateSliderControl
                  type={track.type}
                  value={scenario.rateDeltas[track.type] ?? 0}
                  onChange={(v) => onRateChange(track.type, v)}
                />
              )}
              {idx && (
                <InflationSliderControl value={scenario.annualInflation} onChange={onInflationChange} />
              )}
            </div>
          )}

          {idx && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
              <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                הגנת קרן: אם המדד יורד, ערך הקרן לא יקטן מתחת לערכה המקורי במועד נטילת ההלוואה.
              </p>
            </div>
          )}

          <ScenarioCharts
            lineData={lineData}
            scenarioChanged={trackChanged}
            scenarioColor={scenarioColor}
            scenarioLineName={scenarioLineName}
            principal={track.amount}
            interest={curCalc.totalInterest}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */

export function ScenarioAnalysis({ baseMix, onClose }: ScenarioAnalysisProps) {
  const rateTypes = useMemo(() => getRateVariableTypes(baseMix), [baseMix]);
  const hasIndex = useMemo(() => mixHasIndexLinked(baseMix), [baseMix]);
  const hasControls = rateTypes.length > 0 || hasIndex;

  const baseScenario = useMemo(() => makeBaseScenario(baseMix), [baseMix]);
  const [scenario, setScenario] = useState<GlobalScenario>(() => makeBaseScenario(baseMix));

  useEffect(() => {
    setScenario(makeBaseScenario(baseMix));
  }, [baseMix]);

  const trackStats = useMemo(() => {
    const counts: Record<TrackScenarioKind, number> = { stable: 0, rate: 0, cpi: 0 };
    baseMix.tracks.forEach((t) => {
      counts[getTrackScenarioKind(t.type)]++;
    });
    return counts;
  }, [baseMix.tracks]);

  const baseCalculation = useMemo(() => calculateMixScenario(baseMix, baseScenario), [baseMix, baseScenario]);
  const currentCalculation = useMemo(() => calculateMixScenario(baseMix, scenario), [baseMix, scenario]);

  const scenarioChanged = useMemo(() => {
    if (Math.abs(scenario.annualInflation - baseScenario.annualInflation) > 0.001) return true;
    return rateTypes.some((t) => Math.abs((scenario.rateDeltas[t] ?? 0) - 0) > 0.001);
  }, [scenario, baseScenario, rateTypes]);

  const scenarioWorse =
    currentCalculation.summary.totalInterest > baseCalculation.summary.totalInterest + 1;
  const scenarioColor = scenarioWorse ? COLORS.worse : COLORS.better;
  const scenarioLineName = scenarioWorse ? 'תרחיש (פסימי)' : 'תרחיש (אופטימי)';

  const monthlyDelta =
    currentCalculation.summary.totalMonthlyPayment - baseCalculation.summary.totalMonthlyPayment;
  const interestDelta =
    currentCalculation.summary.totalInterest - baseCalculation.summary.totalInterest;

  const baseSeries = useMemo(() => buildScenarioSeries(baseMix, baseScenario), [baseMix, baseScenario]);
  const scenarioSeries = useMemo(() => buildScenarioSeries(baseMix, scenario), [baseMix, scenario]);
  const lineData = useMemo(() => mergeSeries(baseSeries, scenarioSeries), [baseSeries, scenarioSeries]);

  const setRateDelta = useCallback((type: string, value: number) => {
    setScenario((prev) => ({ ...prev, rateDeltas: { ...prev.rateDeltas, [type]: value } }));
  }, []);
  const setInflation = useCallback((value: number) => {
    setScenario((prev) => ({ ...prev, annualInflation: value }));
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">ניתוח תרחישים</h2>
          </div>
          <p className="text-slate-600 text-sm">
            השוואת השפעת עליית וירידת הריבית והמדד על {baseMix.name}
          </p>
        </div>
        {onClose && (
          <Button variant="default" size="sm" onClick={onClose}>
            חזור
          </Button>
        )}
      </div>

      {/* ===== Scenario control box ===== */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-red-500" />
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                בקרת תרחישים
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                גררו את הסליידרים כדי לבחון טווח ריביות ומדדים. הערכים מוחלים על המסלולים הרלוונטיים בלבד.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setScenario(buildPresetScenario(baseMix, PRESET_SCENARIOS.optimistic))}
              >
                <Sparkles className="h-3.5 w-3.5 ml-1" />
                אופטימי
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScenario(makeBaseScenario(baseMix))}>
                <RotateCcw className="h-3.5 w-3.5 ml-1" />
                בסיס
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setScenario(buildPresetScenario(baseMix, PRESET_SCENARIOS.pessimistic))}
              >
                <AlertTriangle className="h-3.5 w-3.5 ml-1" />
                פסימי
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Composition row */}
          <div className="flex items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-medium text-slate-500">הרכב מסלולים:</span>
            {trackStats.stable > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {trackStats.stable} מוגנים
              </Badge>
            )}
            {trackStats.rate > 0 && (
              <Badge className="text-[10px] bg-blue-100 text-blue-800 hover:bg-blue-100">
                {trackStats.rate} ריבית
              </Badge>
            )}
            {trackStats.cpi > 0 && (
              <Badge className="text-[10px] bg-violet-100 text-violet-800 hover:bg-violet-100">
                {trackStats.cpi} צמודי מדד
              </Badge>
            )}
            <span className="text-[10px] text-slate-400 mr-auto">{baseMix.tracks.length} מסלולים בתמהיל</span>
          </div>

          {!hasControls ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <Shield className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800">
                כל המסלולים בתמהיל קבועים ולא צמודים — התמהיל מוגן לחלוטין מכל שינוי בריבית או במדד.
              </p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {rateTypes.map((type) => (
                <RateSliderControl
                  key={type}
                  type={type}
                  value={scenario.rateDeltas[type] ?? 0}
                  onChange={(v) => setRateDelta(type, v)}
                />
              ))}
              {hasIndex && <InflationSliderControl value={scenario.annualInflation} onChange={setInflation} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Graphs box (incl. per-track rows) ===== */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-blue-600" />
            השוואה גרפית בין המצב הנוכחי לתרחיש
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI boxes — both prominent, close shades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white p-4 shadow-md">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Wallet className="h-3.5 w-3.5" />
                החזר חודשי — תרחיש נבחר
              </div>
              <p className="text-2xl font-bold">{formatCurrency(currentCalculation.summary.totalMonthlyPayment)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400 text-[11px]">מצב נוכחי:</span>
                <span className="text-xs">{formatCurrency(baseCalculation.summary.totalMonthlyPayment)}</span>
                <DeltaBadge value={monthlyDelta} />
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-4 shadow-md">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Banknote className="h-3.5 w-3.5" />
                סך ריבית — תרחיש נבחר
              </div>
              <p className="text-2xl font-bold">{formatCurrency(currentCalculation.summary.totalInterest)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400 text-[11px]">מצב נוכחי:</span>
                <span className="text-xs">{formatCurrency(baseCalculation.summary.totalInterest)}</span>
                <DeltaBadge value={interestDelta} />
              </div>
            </div>
          </div>

          {/* Global charts */}
          <ScenarioCharts
            lineData={lineData}
            scenarioChanged={scenarioChanged}
            scenarioColor={scenarioColor}
            scenarioLineName={scenarioLineName}
            principal={baseMix.totalAmount}
            interest={currentCalculation.summary.totalInterest}
          />

          {/* Per-track rows */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              פירוט לפי מסלול
            </h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              {baseMix.tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  scenario={scenario}
                  baseScenario={baseScenario}
                  onRateChange={setRateDelta}
                  onInflationChange={setInflation}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
