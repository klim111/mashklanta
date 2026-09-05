'use client';

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { trackColor } from './primitives';
import type { TrackResult } from '../engine';
import type { TrackType } from '../engine';
import type { PrimeForecast } from '@/lib/prime-forward-curve';
import {
  expectedMarketPrimePath,
  primeRateAtMonth,
  variableUnlinkedRateAtMonth,
} from '@/lib/prime-forward-curve';

export interface PrimeForwardPoint {
  year: number;
  rate: number;
}

export const CURRENT_RATE_PAYMENT_NOTE =
  'ההחזר החודשי המוצג הוא לפי הריביות התקפות לרגע החישוב.';

export function usesForwardPricedRate(type: TrackType): boolean {
  return type === 'prime' || type === 'variable_unlinked';
}

export function yearlyPrimeRates(
  schedule: Array<{ month: number; annualRate: number }>
): PrimeForwardPoint[] {
  if (schedule.length === 0) return [];
  const points: PrimeForwardPoint[] = [];
  for (let i = 0; i < schedule.length; i += 12) {
    const row = schedule[i];
    points.push({ year: Math.floor((row.month - 1) / 12) + 1, rate: row.annualRate });
  }
  return points;
}

/** נקודות שנתיות לפי אותה ריבית שמוחלת על ההחזרים החזויים במסלול פריים */
export function previewPrimeForwardPoints(
  quotedRate: number,
  years: number,
  forecast: PrimeForecast
): PrimeForwardPoint[] {
  if (years <= 0) return [];
  const path = expectedMarketPrimePath(forecast.spots, forecast.boiRate);
  const months = Math.max(12, Math.round(years * 12));
  return yearlyPrimeRates(
    Array.from({ length: months }, (_, i) => ({
      month: i + 1,
      annualRate: primeRateAtMonth(quotedRate, i + 1, path),
    }))
  );
}

/** נקודות שנתיות למל"צ — הריבית קבועה בין תחנות ומתעדכנת לפי הפורוורד לתקופה */
export function previewVariableForwardPoints(
  quotedRate: number,
  years: number,
  periodYears: number,
  forecast: PrimeForecast
): PrimeForwardPoint[] {
  if (years <= 0) return [];
  const months = Math.max(12, Math.round(years * 12));
  const period = periodYears > 0 ? periodYears : 5;
  return yearlyPrimeRates(
    Array.from({ length: months }, (_, i) => ({
      month: i + 1,
      annualRate: variableUnlinkedRateAtMonth(quotedRate, i + 1, i + 1, period, forecast),
    }))
  );
}

interface Series {
  id: string;
  name: string;
  color: string;
  points: PrimeForwardPoint[];
}

function mergeSeries(series: Series[]): Array<Record<string, number>> {
  const years = new Set<number>();
  series.forEach((s) => s.points.forEach((p) => years.add(p.year)));
  return [...years]
    .sort((a, b) => a - b)
    .map((year) => {
      const row: Record<string, number> = { year };
      series.forEach((s) => {
        const match = s.points.find((p) => p.year === year);
        if (match) row[s.id] = match.rate;
      });
      return row;
    });
}

type ForwardKind = 'prime' | 'variable_unlinked';

interface ForwardRateChartProps {
  tracks?: TrackResult[];
  previewPoints?: PrimeForwardPoint[];
  quotedRate?: number;
  height?: number;
  kind?: ForwardKind;
}

const KIND_COPY: Record<
  ForwardKind,
  { title: string; seriesName: string; description: string; border: string; bg: string; titleText: string; body: string }
> = {
  prime: {
    title: 'ריבית פורוורד — פריים',
    seriesName: 'פריים צפוי (פורוורד)',
    description:
      'הריבית שלפיה מחושב כל החזר חודשי חזוי, לפי עקום התשואות השקלי של בנק ישראל והמרווח שצוטט מהבנק.',
    border: 'border-orange-200',
    bg: 'bg-orange-50/40',
    titleText: 'text-orange-950',
    body: 'text-orange-900/80',
  },
  variable_unlinked: {
    title: 'ריבית פורוורד — משתנה לא צמודה',
    seriesName: 'מל״צ צפוי (פורוורד)',
    description:
      'הריבית נשארת קבועה עד לתחנת היציאה, ומתעדכנת לפי הפורוורד לתקופת המסלול (2–5 שנים) מעקום התשואות השקלי של בנק ישראל והמרווח שצוטט מהבנק.',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/40',
    titleText: 'text-emerald-950',
    body: 'text-emerald-900/80',
  },
};

export function ForwardRateChart({
  tracks = [],
  previewPoints,
  quotedRate,
  height = 200,
  kind = 'prime',
}: ForwardRateChartProps) {
  const copy = KIND_COPY[kind];
  const matched = useMemo(
    () => tracks.filter((t) => t.track.type === kind && t.schedule.length > 0),
    [tracks, kind]
  );

  const series = useMemo<Series[]>(() => {
    if (previewPoints && previewPoints.length >= 2) {
      return [
        {
          id: 'preview',
          name: copy.seriesName,
          color: trackColor(kind),
          points: previewPoints,
        },
      ];
    }
    return matched.map((t) => ({
      id: t.track.id,
      name: matched.length > 1 ? t.track.name : copy.seriesName,
      color: trackColor(t.track.type as TrackType),
      points: yearlyPrimeRates(t.schedule),
    }));
  }, [previewPoints, matched, copy.seriesName, kind]);

  const data = useMemo(() => mergeSeries(series), [series]);

  if (series.length === 0 || data.length < 2) return null;

  const rates = data.flatMap((row) => series.map((s) => row[s.id]).filter((v) => typeof v === 'number'));
  const min = Math.min(...rates, quotedRate ?? Infinity);
  const max = Math.max(...rates, quotedRate ?? -Infinity);
  const pad = Math.max(0.15, (max - min) * 0.2);
  const tick = kind === 'prime' ? '#9a3412' : '#065f46';
  const grid = kind === 'prime' ? '#fed7aa' : '#a7f3d0';

  return (
    <div className={`rounded-xl border ${copy.border} ${copy.bg} p-3`}>
      <p className={`text-sm font-semibold ${copy.titleText} flex items-center gap-1.5`}>
        <TrendingUp className={`h-4 w-4 ${kind === 'prime' ? 'text-orange-600' : 'text-emerald-600'}`} />
        {copy.title}
      </p>
      <p className={`text-[11px] ${copy.body} mb-2 leading-snug`}>{copy.description}</p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: tick }} />
          <YAxis
            tick={{ fontSize: 10, fill: tick }}
            tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
            domain={[Math.floor((min - pad) * 20) / 20, Math.ceil((max + pad) * 20) / 20]}
            width={48}
          />
          <Tooltip
            formatter={(value) => `${Number(value).toFixed(2)}%`}
            labelFormatter={(label) => `שנה ${label}`}
            contentStyle={{ fontSize: 12, direction: 'rtl' }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {typeof quotedRate === 'number' && Number.isFinite(quotedRate) && (
            <ReferenceLine
              y={quotedRate}
              stroke={tick}
              strokeDasharray="5 4"
              label={{
                value: `צוטט ${quotedRate.toFixed(2)}%`,
                position: 'right',
                fontSize: 10,
                fill: tick,
              }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.id}
              type={kind === 'variable_unlinked' ? 'stepAfter' : 'monotone'}
              dataKey={s.id}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.5}
              dot={kind === 'variable_unlinked'}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PrimeForwardChart(props: Omit<ForwardRateChartProps, 'kind'>) {
  return <ForwardRateChart {...props} kind="prime" />;
}

export function VariableForwardChart(props: Omit<ForwardRateChartProps, 'kind'>) {
  return <ForwardRateChart {...props} kind="variable_unlinked" />;
}
