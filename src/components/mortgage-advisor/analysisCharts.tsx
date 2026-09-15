'use client';

import React from 'react';
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
import type { MortgageCalculation, TrackCalculation } from './types';
import { formatCurrency } from './mortgageCalculations';

/**
 * ערכת גרפים משותפת לכלי הניתוח (ניתוח תרחישים / מיחזור), כדי שכל המסכים
 * יציגו את אותם הגרפים באותה לוגיקה ובאותו עיצוב.
 */

export const ANALYSIS_COLORS = {
  current: '#3b82f6',
  worse: '#ef4444',
  better: '#10b981',
  principal: '#3b82f6',
  interest: '#ef4444',
};

export const compactCurrency = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(v / 1000)}K`;
  return String(Math.round(v));
};

export const tooltipFormatter = (value: number | string) =>
  typeof value === 'number' ? formatCurrency(value) : value;
export const yearLabelFormatter = (label: number | string) => `שנה ${label}`;

export interface SeriesPoint {
  year: number;
  balance: number;
  payment: number;
}

/** סדרת נתונים שנתית עבור תמהיל שלם (יתרת קרן + החזר חודשי). */
export function mixYearlySeries(calc: MortgageCalculation): SeriesPoint[] {
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

/** סדרת נתונים שנתית עבור מסלול בודד. */
export function trackYearlySeries(tc: TrackCalculation): SeriesPoint[] {
  const sc = tc.amortSchedule;
  const points: SeriesPoint[] = [{ year: 0, balance: tc.track.amount, payment: sc[0]?.payment ?? 0 }];
  const maxYears = Math.ceil(sc.length / 12);
  for (let y = 1; y <= maxYears; y++) {
    const idx = Math.min(sc.length, y * 12) - 1;
    const row = idx >= 0 && idx < sc.length ? sc[idx] : undefined;
    points.push({ year: y, balance: row?.balanceEnd ?? 0, payment: row?.payment ?? 0 });
  }
  return points;
}

export interface LineRow {
  year: number;
  baseBalance: number | null;
  scenBalance: number | null;
  basePay: number | null;
  scenPay: number | null;
}

export function mergeSeries(base: SeriesPoint[], scen: SeriesPoint[]): LineRow[] {
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

export function DeltaBadge({ value }: { value: number }) {
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

export function ChartPanel({ title, hint, children }: { title: string; hint: string; children: React.ReactElement }) {
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

/**
 * שלושת הגרפים המוצגים בכלי הניתוח: יתרת קרן, החזר חודשי, וחלוקת קרן מול ריבית.
 * baseName הוא קו ההשוואה הקבוע, scenarioName הוא הקו המשתנה (מוצג רק כאשר changed=true).
 */
export function AnalysisCharts({
  lineData,
  changed,
  scenarioColor,
  scenarioName,
  baseName = 'מצב נוכחי',
  principal,
  interest,
}: {
  lineData: LineRow[];
  changed: boolean;
  scenarioColor: string;
  scenarioName: string;
  baseName?: string;
  principal: number;
  interest: number;
}) {
  const pieData = [
    { name: 'קרן', value: Math.max(0, principal), color: ANALYSIS_COLORS.principal },
    { name: 'ריבית', value: Math.max(0, interest), color: ANALYSIS_COLORS.interest },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <ChartPanel title="יתרת קרן" hint="התקדמות החזר הקרן לאורך זמן.">
        <LineChart data={lineData} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={40} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={yearLabelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="baseBalance" name={baseName} stroke={ANALYSIS_COLORS.current} strokeWidth={2.5} dot={false} connectNulls />
          {changed && (
            <Line type="monotone" dataKey="scenBalance" name={scenarioName} stroke={scenarioColor} strokeWidth={2.5} dot={false} connectNulls />
          )}
        </LineChart>
      </ChartPanel>

      <ChartPanel title="החזר חודשי" hint="ההחזר החודשי לאורך התקופה.">
        <LineChart data={lineData} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={40} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={yearLabelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="basePay" name={baseName} stroke={ANALYSIS_COLORS.current} strokeWidth={2.5} dot={false} connectNulls />
          {changed && (
            <Line type="monotone" dataKey="scenPay" name={scenarioName} stroke={scenarioColor} strokeWidth={2.5} dot={false} connectNulls />
          )}
        </LineChart>
      </ChartPanel>

      <ChartPanel title="קרן מול ריבית" hint="חלוקת סך התשלום בין הקרן לריבית לאורך התקופה.">
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
