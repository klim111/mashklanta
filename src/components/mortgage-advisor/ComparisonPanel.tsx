'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  BarChart3,
  Layers,
  LineChart as LineChartIcon,
  Award,
  ChevronDown,
  RotateCcw,
  X,
  Percent,
  Calendar,
  Clock,
} from 'lucide-react';
import type { MortgageMix, MortgageCalculation } from './types';
import { TRACK_TYPES } from './types';
import { formatCurrency, formatPercentage, calculateMortgageMix } from './mortgageCalculations';
import { formatDuration } from './engine';
import {
  PLAN_TERM_MONTHS_MAX,
  PLAN_TERM_MONTHS_MIN,
  clampTermMonths,
  monthsToYears,
  yearsToMonths,
} from '@/lib/mortgage-plan';

interface ComparisonPanelProps {
  mixes: MortgageMix[];
  selectedIds: string[];
  onClearSelection: () => void;
}

const MIX_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const PIE_COLORS = { principal: '#3b82f6', interest: '#ef4444', paid: '#10b981', remaining: '#e2e8f0' };

const compactCurrency = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(v / 1000)}K`;
  return String(Math.round(v));
};
const tooltipFormatter = (value: number | string) =>
  typeof value === 'number' ? formatCurrency(value) : value;
const yearLabelFormatter = (label: number | string) => `שנה ${label}`;

interface SeriesPoint {
  year: number;
  balance: number;
  payment: number;
}

function buildMixSeries(calc: MortgageCalculation): SeriesPoint[] {
  const schedules = calc.trackCalculations.map((c) => c.amortSchedule);
  const maxLen = schedules.reduce((m, s) => Math.max(m, s.length), 0);
  const totalPrincipal = calc.trackCalculations.reduce((s, c) => s + c.track.amount, 0);

  const points: SeriesPoint[] = [
    {
      year: 0,
      balance: totalPrincipal,
      payment: schedules.reduce((s, sc) => s + (sc[0]?.payment ?? 0), 0),
    },
  ];

  const maxYears = Math.ceil(maxLen / 12);
  for (let y = 1; y <= maxYears; y++) {
    const idx = Math.min(maxLen, y * 12) - 1;
    let balance = 0;
    let payment = 0;
    schedules.forEach((sc) => {
      if (idx >= sc.length) return;
      const row = sc[idx];
      if (row) {
        balance += row.balanceEnd;
        payment += row.payment;
      }
    });
    points.push({ year: y, balance, payment });
  }
  return points;
}

/** סכומים מצטברים עד תום שנה נתונה: ששולם, מתוכו ריבית. */
function cumulativeThrough(calc: MortgageCalculation, year: number): { paid: number; interest: number } {
  const months = year * 12;
  let paid = 0;
  let interest = 0;
  calc.trackCalculations.forEach((c) => {
    const len = Math.min(months, c.amortSchedule.length);
    for (let i = 0; i < len; i++) {
      paid += c.amortSchedule[i].payment;
      interest += c.amortSchedule[i].interest;
    }
  });
  return { paid, interest };
}

function cloneSelected(mixes: MortgageMix[], selectedIds: string[]): MortgageMix[] {
  return mixes
    .filter((m) => selectedIds.includes(m.id))
    .map((m) => ({
      ...m,
      tracks: m.tracks.map((t) => ({
        ...t,
        percentage: t.percentage ?? (m.totalAmount > 0 ? (t.amount / m.totalAmount) * 100 : 0),
      })),
    }));
}

function minIdBy(
  arr: Array<{ mix: MortgageMix; calc: MortgageCalculation }>,
  sel: (c: { calc: MortgageCalculation }) => number
): string | null {
  if (arr.length === 0) return null;
  return arr.reduce((b, c) => (sel(c) < sel(b) ? c : b)).mix.id;
}

/* ------------------------------------------------------------------ */
/* Reusable chart panel                                                */
/* ------------------------------------------------------------------ */

function ChartPanel({ title, hint, children }: { title: string; hint: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 mb-2 leading-snug">{hint}</p>
      <ResponsiveContainer width="100%" height={250}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A single stat cell with a "preferred" marker                        */
/* ------------------------------------------------------------------ */

function Stat({ label, value, best }: { label: string; value: string; best?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${best ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50'}`}>
      <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
        {best && <Award className="h-2.5 w-2.5 text-emerald-600" />}
        {label}
      </p>
      <p className={`text-sm font-bold ${best ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-mix expandable row (full details + per-track sliders)           */
/* ------------------------------------------------------------------ */

function MixRow({
  mix,
  calc,
  color,
  best,
  onTrackChange,
}: {
  mix: MortgageMix;
  calc: MortgageCalculation;
  color: string;
  best: { monthly: boolean; interest: boolean; totalPaid: boolean; rate: boolean };
  onTrackChange: (trackId: string, patch: { percentage?: number; years?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const allocationSum = mix.tracks.reduce((s, t) => s + (t.percentage ?? 0), 0);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-right hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 px-3 pt-3">
          <span className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-900 truncate">{mix.name}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {mix.tracks.length} מסלולים · {formatCurrency(mix.totalAmount)}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 px-3 py-3">
          <Stat label="החזר חודשי" value={formatCurrency(calc.summary.totalMonthlyPayment)} best={best.monthly} />
          <Stat label="סך ריבית" value={formatCurrency(calc.summary.totalInterest)} best={best.interest} />
          <Stat label="סך תשלום" value={formatCurrency(calc.summary.totalPaid)} best={best.totalPaid} />
          <Stat label="ריבית ממוצעת" value={formatPercentage(calc.summary.averageRate)} best={best.rate} />
          <Stat label="תקופה" value={formatDuration(clampTermMonths(yearsToMonths(calc.summary.weightedAverageYears)))} />
        </div>
      </button>

      {open && (
        <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 space-y-3">
          {mix.tracks.map((track) => {
            const pct = track.percentage ?? 0;
            return (
              <div key={track.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-slate-800 truncate">{track.name}</span>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {TRACK_TYPES[track.type]} · {formatPercentage(track.interestRate)}
                  </span>
                </div>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-blue-600" />
                        אחוז מימון
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {pct.toFixed(0)}% · {formatCurrency(track.amount)}
                      </span>
                    </div>
                    <Slider
                      dir="ltr"
                      value={[pct]}
                      onValueChange={([v]) => onTrackChange(track.id, { percentage: v })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-violet-600" />
                        תקופה
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {formatDuration(clampTermMonths(yearsToMonths(track.years)))}
                      </span>
                    </div>
                    <Slider
                      dir="ltr"
                      value={[clampTermMonths(yearsToMonths(track.years))]}
                      onValueChange={([v]) => onTrackChange(track.id, { years: monthsToYears(v) })}
                      min={PLAN_TERM_MONTHS_MIN}
                      max={PLAN_TERM_MONTHS_MAX}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between text-[11px] px-1">
            <span className="text-slate-500">סך הקצאה</span>
            <span className={`font-bold ${Math.abs(allocationSum - 100) < 0.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {allocationSum.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A single mix pie with repayment-progress ring + caption             */
/* ------------------------------------------------------------------ */

function MixPie({
  mix,
  calc,
  color,
  year,
}: {
  mix: MortgageMix;
  calc: MortgageCalculation;
  color: string;
  year: number;
}) {
  const principal = mix.tracks.reduce((s, t) => s + t.amount, 0);
  const interest = calc.summary.totalInterest;
  const totalDebt = calc.summary.totalPaid; // principal + total interest
  const { paid, interest: interestPaid } = cumulativeThrough(calc, year);
  const paidClamped = Math.min(paid, totalDebt);

  const innerData = [
    { name: 'קרן', value: Math.max(0, principal), color: PIE_COLORS.principal },
    { name: 'ריבית', value: Math.max(0, interest), color: PIE_COLORS.interest },
  ];
  const ringData = [
    { name: 'הוחזר', value: paidClamped, color: PIE_COLORS.paid },
    { name: 'נותר', value: Math.max(0, totalDebt - paidClamped), color: PIE_COLORS.remaining },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 w-full max-w-[18rem]">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-sm font-semibold text-slate-800 truncate">{mix.name}</p>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            {/* green repayment-progress ring (frame of the circle) */}
            <Pie
              data={ringData}
              dataKey="value"
              nameKey="name"
              innerRadius={76}
              outerRadius={84}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {ringData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            {/* principal vs interest */}
            <Pie
              data={innerData}
              dataKey="value"
              nameKey="name"
              innerRadius={46}
              outerRadius={70}
              paddingAngle={2}
            >
              {innerData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
          </PieChart>
        </ResponsiveContainer>
        {/* center total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-slate-400">סך החוב</span>
          <span className="text-base font-bold text-slate-900">{formatCurrency(totalDebt)}</span>
        </div>
      </div>

      {/* mini legend */}
      <div className="flex items-center justify-center gap-3 mt-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS.principal }} /> קרן
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS.interest }} /> ריבית
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS.paid }} /> הוחזר
        </span>
      </div>

      {/* dynamic caption */}
      <p className="text-[11px] text-slate-600 text-center mt-2 leading-relaxed">
        שולם <span className="font-bold text-emerald-700">{formatCurrency(paidClamped)}</span> מתוך חוב של{' '}
        <span className="font-bold text-slate-800">{formatCurrency(totalDebt)}</span>, מתוכם עבור ריבית{' '}
        <span className="font-bold text-red-600">{formatCurrency(interestPaid)}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main panel                                                          */
/* ------------------------------------------------------------------ */

export function ComparisonPanel({ mixes, selectedIds, onClearSelection }: ComparisonPanelProps) {
  const selectedKey = selectedIds.join(',');

  const [editMixes, setEditMixes] = useState<MortgageMix[]>(() => cloneSelected(mixes, selectedIds));
  const [selectedYear, setSelectedYear] = useState(0);

  useEffect(() => {
    setEditMixes(cloneSelected(mixes, selectedIds));
    setSelectedYear(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const resetEdits = useCallback(() => {
    setEditMixes(cloneSelected(mixes, selectedIds));
    setSelectedYear(0);
  }, [mixes, selectedIds]);

  const updateTrack = useCallback(
    (mixId: string, trackId: string, patch: { percentage?: number; years?: number }) => {
      setEditMixes((prev) =>
        prev.map((m) => {
          if (m.id !== mixId) return m;
          const tracks = m.tracks.map((t) => {
            if (t.id !== trackId) return t;
            const next = { ...t, ...patch };
            if (patch.percentage !== undefined) {
              next.percentage = patch.percentage;
              next.amount = Math.round((m.totalAmount * patch.percentage) / 100);
            }
            return next;
          });
          return { ...m, tracks };
        })
      );
    },
    []
  );

  const calcs = useMemo(
    () => editMixes.map((m, i) => ({ mix: m, calc: calculateMortgageMix(m), color: MIX_COLORS[i % MIX_COLORS.length] })),
    [editMixes]
  );

  const bestMonthlyId = useMemo(() => minIdBy(calcs, (c) => c.calc.summary.totalMonthlyPayment), [calcs]);
  const bestInterestId = useMemo(() => minIdBy(calcs, (c) => c.calc.summary.totalInterest), [calcs]);
  const bestTotalPaidId = useMemo(() => minIdBy(calcs, (c) => c.calc.summary.totalPaid), [calcs]);
  const bestRateId = useMemo(() => minIdBy(calcs, (c) => c.calc.summary.averageRate), [calcs]);

  const seriesList = useMemo(() => calcs.map((c) => buildMixSeries(c.calc)), [calcs]);
  const maxYears = useMemo(() => seriesList.reduce((m, s) => Math.max(m, s.length - 1), 0), [seriesList]);

  const lineData = useMemo(() => {
    const maxLen = seriesList.reduce((m, s) => Math.max(m, s.length), 0);
    const rows: Array<Record<string, number | null>> = [];
    for (let y = 0; y < maxLen; y++) {
      const row: Record<string, number | null> = { year: y };
      seriesList.forEach((s, i) => {
        row[`m${i}_bal`] = s[y]?.balance ?? null;
        row[`m${i}_pay`] = s[y]?.payment ?? null;
      });
      rows.push(row);
    }
    return rows;
  }, [seriesList]);

  // הגרפים מציגים את התקופה הנותרת מהשנה שנבחרה בציר הזמן
  const displayLineData = useMemo(
    () => lineData.filter((r) => (r.year as number) >= selectedYear),
    [lineData, selectedYear]
  );

  if (selectedIds.length === 0) {
    return (
      <div className="text-center py-12" dir="rtl">
        <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-600 mb-2">לא נבחרו תמהילים להשוואה</h3>
        <p className="text-slate-500">בחרו לפחות 2 תמהילים כדי לראות השוואה גרפית מפורטת</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">השוואת תמהילים ({calcs.length})</h2>
          </div>
          <p className="text-slate-600 text-sm">השוואה גרפית בין התמהילים שנבחרו — כל קו מייצג תמהיל.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetEdits}>
            <RotateCcw className="h-3.5 w-3.5 ml-1" />
            איפוס
          </Button>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            <X className="h-3.5 w-3.5 ml-1" />
            נקה בחירה
          </Button>
        </div>
      </div>

      {/* ===== Comparison box ===== */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-blue-600" />
            השוואה גרפית בין התמהילים
          </CardTitle>
          <CardDescription className="text-xs">
            פתחו תמהיל כדי לשנות את אחוז המימון והתקופה של כל מסלול — הגרפים יתעדכנו בהתאם.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mix rows at the top — full details + preferred markers */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            {calcs.map((c) => (
              <MixRow
                key={c.mix.id}
                mix={c.mix}
                calc={c.calc}
                color={c.color}
                best={{
                  monthly: c.mix.id === bestMonthlyId,
                  interest: c.mix.id === bestInterestId,
                  totalPaid: c.mix.id === bestTotalPaidId,
                  rate: c.mix.id === bestRateId,
                }}
                onTrackChange={(trackId, patch) => updateTrack(c.mix.id, trackId, patch)}
              />
            ))}
          </div>

          {/* Line charts on shared axes (one line per mix) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartPanel title="יתרת קרן" hint="התקדמות החזר הקרן לאורך זמן — קו לכל תמהיל.">
              <LineChart data={displayLineData} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
                <Tooltip formatter={tooltipFormatter} labelFormatter={yearLabelFormatter} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {calcs.map((c, i) => (
                  <Line
                    key={c.mix.id}
                    type="monotone"
                    dataKey={`m${i}_bal`}
                    name={c.mix.name}
                    stroke={c.color}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ChartPanel>

            <ChartPanel title="החזר חודשי" hint="ההחזר החודשי לאורך התקופה — קו לכל תמהיל.">
              <LineChart data={displayLineData} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
                <Tooltip formatter={tooltipFormatter} labelFormatter={yearLabelFormatter} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {calcs.map((c, i) => (
                  <Line
                    key={c.mix.id}
                    type="monotone"
                    dataKey={`m${i}_pay`}
                    name={c.mix.name}
                    stroke={c.color}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ChartPanel>
          </div>

          {/* Pies — centered row, principal vs interest + repayment ring */}
          <div>
            <p className="text-sm font-semibold text-slate-800">קרן מול ריבית</p>
            <p className="text-[11px] text-slate-500 mb-2 leading-snug">
              חלוקת החוב בין קרן לריבית, וטבעת ירוקה לחלק שהוחזר עד השנה שנבחרה.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {calcs.map((c) => (
              <MixPie key={c.mix.id} mix={c.mix} calc={c.calc} color={c.color} year={selectedYear} />
            ))}
          </div>

          {/* Time axis below the pies */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                ציר זמן — מצב כעבור {selectedYear} שנים
              </span>
              <span className="text-xs text-slate-500">תקופה נותרת: {Math.max(0, maxYears - selectedYear)} שנים</span>
            </div>
            <Slider
              dir="ltr"
              value={[selectedYear]}
              onValueChange={([v]) => setSelectedYear(v)}
              min={0}
              max={Math.max(1, maxYears)}
              step={1}
            />
            <div dir="ltr" className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>תחילת התקופה</span>
              <span>{maxYears} שנים</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
