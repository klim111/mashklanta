'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitCompareArrows } from 'lucide-react';
import { formatPercentage } from './mortgageCalculations';
import { computeMix, formatDuration, yearlySeries } from './engine';
import type { WorkspaceMix } from './engine';
import { compactCurrency, formatShekel } from './workspace/primitives';

const SERIES_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#0891b2'];

export interface ComparisonEntry {
  id: string;
  label: string;
  mix: WorkspaceMix;
  /** מסמן את התמהיל שנמצא כרגע בעריכה */
  current?: boolean;
}

interface MixComparisonProps {
  entries: ComparisonEntry[];
}

/** גרף השוואה בין תמהילים — יתרת חוב, החזר חודשי, וסיכומים זה מול זה. */
export function MixComparison({ entries }: MixComparisonProps) {
  const computed = useMemo(
    () =>
      entries.map((entry, index) => ({
        ...entry,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        result: computeMix(entry.mix),
      })),
    [entries]
  );

  const timeline = useMemo(() => {
    const series = computed.map((item) => ({ id: item.id, points: yearlySeries(item.result) }));
    const years = series.reduce((max, s) => Math.max(max, s.points.length), 0);

    return Array.from({ length: years }, (_, y) => {
      const row: Record<string, number | null> = { year: y };
      series.forEach(({ id, points }) => {
        row[`${id}-balance`] = points[y]?.balance ?? null;
        row[`${id}-payment`] = points[y]?.payment ?? null;
      });
      return row;
    });
  }, [computed]);

  const bars = useMemo(
    () =>
      computed.map((item) => ({
        name: item.label,
        'החזר חודשי': Math.round(item.result.summary.monthlyPayment),
        'סך ריבית': Math.round(item.result.summary.totalInterest),
        'סך תשלום': Math.round(item.result.summary.totalPaid),
      })),
    [computed]
  );

  const best = useMemo(() => {
    if (computed.length === 0) return null;
    const byMonthly = [...computed].sort((a, b) => a.result.summary.monthlyPayment - b.result.summary.monthlyPayment)[0];
    const byInterest = [...computed].sort((a, b) => a.result.summary.totalInterest - b.result.summary.totalInterest)[0];
    const byDuration = [...computed].sort((a, b) => a.result.summary.months - b.result.summary.months)[0];
    return { byMonthly, byInterest, byDuration };
  }, [computed]);

  if (entries.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-10 text-center">
          <GitCompareArrows className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            בחרו תמהילים מהרשימה מעלה להשוואה על ידי סימון בווי.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tooltipFormatter = (value: number | string) =>
    typeof value === 'number' ? formatShekel(value) : value;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-blue-600" />
          השוואה בין תמהילים
          <span className="text-xs font-normal text-slate-500">{entries.length} תמהילים</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-right font-medium p-2">תמהיל</th>
                <th className="text-left font-medium p-2">החזר חודשי</th>
                <th className="text-left font-medium p-2">סך ריבית</th>
                <th className="text-left font-medium p-2">סך תשלום</th>
                <th className="text-left font-medium p-2">ריבית ממוצעת</th>
                <th className="text-left font-medium p-2">משך</th>
              </tr>
            </thead>
            <tbody>
              {computed.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-800">{item.label}</span>
                      {item.current && (
                        <Badge variant="secondary" className="text-[9px]">בעבודה</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-left font-semibold">
                    {item.result.summary.monthlyPayment > 0.01
                      ? formatShekel(item.result.summary.monthlyPayment)
                      : 'אין החזר שוטף'}
                    {best?.byMonthly.id === item.id && (
                      <Badge className="ml-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px]">הזול</Badge>
                    )}
                    {item.result.summary.balloonPayment > 1 && (
                      <p className="text-[9px] font-normal text-amber-700">
                        + בלון {formatShekel(item.result.summary.balloonPayment)}
                      </p>
                    )}
                  </td>
                  <td className="p-2 text-left">
                    {formatShekel(item.result.summary.totalInterest)}
                    {best?.byInterest.id === item.id && (
                      <Badge className="ml-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px]">מינימלי</Badge>
                    )}
                  </td>
                  <td className="p-2 text-left">{formatShekel(item.result.summary.totalPaid)}</td>
                  <td className="p-2 text-left">{formatPercentage(item.result.summary.averageRate)}</td>
                  <td className="p-2 text-left">
                    {formatDuration(item.result.summary.months)}
                    {best?.byDuration.id === item.id && (
                      <Badge className="ml-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px]">הקצר</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="יתרת החוב לאורך הזמן">
            <LineChart data={timeline} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
              <Tooltip formatter={tooltipFormatter} labelFormatter={(l) => `שנה ${l}`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {computed.map((item) => (
                <Line
                  key={item.id}
                  type="monotone"
                  dataKey={`${item.id}-balance`}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={2.2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </Panel>

          <Panel title="החזר חודשי לאורך הזמן">
            <LineChart data={timeline} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
              <Tooltip formatter={tooltipFormatter} labelFormatter={(l) => `שנה ${l}`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {computed.map((item) => (
                <Line
                  key={item.id}
                  type="monotone"
                  dataKey={`${item.id}-payment`}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={2.2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </Panel>

          <Panel title="סיכומים זה מול זה" className="lg:col-span-2">
            <BarChart data={bars} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={compactCurrency} width={42} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="החזר חודשי" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="סך ריבית" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="סך תשלום" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </Panel>
        </div>
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactElement;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
      <p className="text-sm font-semibold text-slate-800 mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
