'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as LineChartIcon, MousePointerClick } from 'lucide-react';
import { yearlySeries } from '../engine';
import type { MixResult } from '../engine';
import { CHART_COLORS, compactCurrency, formatShekel, trackColor } from './primitives';
import {
  CURRENT_RATE_PAYMENT_NOTE,
  PrimeForwardChart,
  VariableForwardChart,
  usesForwardPricedRate,
} from './PrimeForwardChart';
import { InflationForecastChart } from './InflationForecastChart';
import { isIndexLinked } from '../scenarioCalculations';

interface WorkspaceChartsProps {
  result: MixResult;
  baseResult: MixResult;
  scenarioActive: boolean;
  /** החודש שנבחר בלוח ההחזרים או בגרף — מסומן בקו אנכי */
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}

interface Row {
  year: number;
  month: number;
  balance: number | null;
  baseBalance: number | null;
  payment: number | null;
  basePayment: number | null;
  paidPrincipal: number;
  paidInterest: number;
}

/** Recharts מחזיר את השורה שנלחצה בתוך activePayload; משם נשלף החודש. */
function monthFromClick(event: unknown): number | null {
  const payload = (event as { activePayload?: Array<{ payload?: { month?: number } }> } | null)?.activePayload;
  const month = payload?.[0]?.payload?.month;
  return typeof month === 'number' && month > 0 ? month : null;
}

export function WorkspaceCharts({
  result,
  baseResult,
  scenarioActive,
  selectedMonth,
  onSelectMonth,
}: WorkspaceChartsProps) {
  const rows = useMemo<Row[]>(() => {
    const current = yearlySeries(result);
    const base = yearlySeries(baseResult);
    const length = Math.max(current.length, base.length);

    return Array.from({ length }, (_, i) => {
      const c = current[i];
      const b = base[i];
      return {
        year: c?.year ?? b?.year ?? i,
        month: c?.month ?? b?.month ?? i * 12,
        balance: c?.balance ?? null,
        baseBalance: b?.balance ?? null,
        payment: c?.payment ?? null,
        basePayment: b?.payment ?? null,
        paidPrincipal: c ? Math.max(0, result.mix.totalAmount - c.balance) : 0,
        paidInterest: c?.cumulativeInterest ?? 0,
      };
    });
  }, [result, baseResult]);

  /**
   * שני מסלולים עם אותם נתונים מקבלים את אותו שם אוטומטי. הצירוף של סוג הריבית,
   * התקופה והריבית אינו מזהה ייחודי, ולכן המקרא ממוספר והזיהוי נעשה לפי מזהה המסלול.
   */
  const composition = useMemo(() => {
    const nameCounts = new Map<string, number>();
    result.tracks.forEach((t) => {
      nameCounts.set(t.track.name, (nameCounts.get(t.track.name) ?? 0) + 1);
    });

    const seen = new Map<string, number>();
    return result.tracks.map((t) => {
      const name = t.track.name;
      const occurrence = (seen.get(name) ?? 0) + 1;
      seen.set(name, occurrence);

      return {
        id: t.track.id,
        name: (nameCounts.get(name) ?? 0) > 1 ? `${name} (${occurrence})` : name,
        value: t.track.amount,
        color: trackColor(t.track.type),
      };
    });
  }, [result.tracks]);

  const selectedYear = useMemo(() => {
    if (!selectedMonth) return null;
    const row = rows.find((r) => r.month >= selectedMonth);
    return row?.year ?? null;
  }, [rows, selectedMonth]);

  const hasPrime = result.tracks.some((t) => t.track.type === 'prime' && t.schedule.length > 1);
  const hasVariableUnlinked = result.tracks.some(
    (t) => t.track.type === 'variable_unlinked' && t.schedule.length > 1
  );
  const hasIndexed = result.tracks.some((t) => isIndexLinked(t.track.type) && t.schedule.length > 1);
  const hasForwardPriced = result.tracks.some((t) => usesForwardPricedRate(t.track.type));

  const handleClick = (event: unknown) => {
    const month = monthFromClick(event);
    if (month) onSelectMonth(month);
  };

  const tooltipFormatter = (value: number | string) =>
    typeof value === 'number' ? formatShekel(value) : value;
  const labelFormatter = (label: number | string) => `שנה ${label}`;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-blue-600" />
            ניתוח גרפי
          </CardTitle>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <MousePointerClick className="h-3.5 w-3.5" />
            לחיצה על נקודה בגרף מציגה את מצב המשכנתא באותו מועד
          </span>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="הרכב התמהיל" hint="חלוקת סכום המשכנתא בין המסלולים.">
          <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Pie
              data={composition}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
              labelLine={false}
            >
              {composition.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ChartPanel>

        <ChartPanel
          title="יתרת החוב"
          hint="קצב סילוק הקרן. במסלולים צמודי מדד היתרה גדלה עם המדד וקצב הסילוק מואט."
        >
          <LineChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedYear !== null && <ReferenceLine x={selectedYear} stroke="#0f172a" strokeDasharray="4 4" />}
            {scenarioActive && (
              <Line
                type="monotone"
                dataKey="baseBalance"
                name="בסיס"
                stroke={CHART_COLORS.base}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="balance"
              name={scenarioActive ? 'תרחיש נבחר' : 'יתרת חוב'}
              stroke={scenarioActive ? CHART_COLORS.scenario : CHART_COLORS.base}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ChartPanel>

        <ChartPanel
          title="החזר חודשי"
          hint={
            hasForwardPriced
              ? `${CURRENT_RATE_PAYMENT_NOTE} בהמשך התקופה ההחזר החזוי מתעדכן לפי עקום הפורוורד.`
              : 'ההחזר לאורך התקופה. בצמודי מדד ובמשתנות ההחזר משתנה בהתאם לתרחיש.'
          }
        >
          <LineChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedYear !== null && <ReferenceLine x={selectedYear} stroke="#0f172a" strokeDasharray="4 4" />}
            {scenarioActive && (
              <Line
                type="monotone"
                dataKey="basePayment"
                name="בסיס"
                stroke={CHART_COLORS.base}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="payment"
              name={scenarioActive ? 'תרחיש נבחר' : 'החזר חודשי'}
              stroke={scenarioActive ? CHART_COLORS.scenario : CHART_COLORS.base}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ChartPanel>

        <ChartPanel
          title="קרן מול ריבית מצטברת"
          hint="כמה מהקרן נפרעה וכמה ריבית שולמה בכל נקודת זמן."
        >
          <AreaChart data={rows} margin={{ top: 5, right: 8, left: 8, bottom: 5 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedYear !== null && <ReferenceLine x={selectedYear} stroke="#0f172a" strokeDasharray="4 4" />}
            <Area
              type="monotone"
              dataKey="paidPrincipal"
              name="קרן שנפרעה"
              stackId="1"
              stroke={CHART_COLORS.principal}
              fill={CHART_COLORS.principal}
              fillOpacity={0.35}
            />
            <Area
              type="monotone"
              dataKey="paidInterest"
              name="ריבית ששולמה"
              stackId="1"
              stroke={CHART_COLORS.interest}
              fill={CHART_COLORS.interest}
              fillOpacity={0.35}
            />
          </AreaChart>
        </ChartPanel>

        {hasPrime && (
          <div className="lg:col-span-2">
            <PrimeForwardChart
              tracks={result.tracks}
              quotedRate={
                result.tracks.filter((t) => t.track.type === 'prime').length === 1
                  ? result.tracks.find((t) => t.track.type === 'prime')?.track.interestRate
                  : undefined
              }
              height={230}
            />
          </div>
        )}
        {hasVariableUnlinked && (
          <div className="lg:col-span-2">
            <VariableForwardChart
              tracks={result.tracks}
              quotedRate={
                result.tracks.filter((t) => t.track.type === 'variable_unlinked').length === 1
                  ? result.tracks.find((t) => t.track.type === 'variable_unlinked')?.track.interestRate
                  : undefined
              }
              height={230}
            />
          </div>
        )}
        {hasIndexed && (
          <div className="lg:col-span-2">
            <InflationForecastChart
              assumptions={result.mix.assumptions}
              years={Math.max(
                ...result.tracks.filter((t) => isIndexLinked(t.track.type)).map((t) => t.track.years),
                1
              )}
              height={230}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactElement;
}) {
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
