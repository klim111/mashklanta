'use client';

import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  CalendarClock,
  Coins,
  Info,
  Lightbulb,
  Percent,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { formatILS } from '@/lib/currency';
import type { Loan } from './types';
import {
  loanColor,
  loanInsights,
  paymentToIncome,
  portfolioYearlySeries,
  type PortfolioStats,
} from './loanInsights';

/**
 * דאשבורד התוצאות של תיק ההלוואות.
 *
 * בראשו שורת המצב הכוללת — אותה שורת בלוקים שמופיעה בכלי המיחזור — ומתחתיה
 * הרכב התיק, יחס ההחזר מההכנסה, התובנות והגרפים. כל מה שמוצג כאן נגזר ישירות
 * מהמכוונים שבפאנל, ומתעדכן בזמן שהלקוח מזיז אותם.
 */

export function LoanPortfolioDashboard({
  loans,
  stats,
  monthlyIncome,
  onMonthlyIncomeChange,
}: {
  /** רק הלוואות שכל השדות שלהן הוזנו */
  loans: Loan[];
  stats: PortfolioStats;
  monthlyIncome?: number;
  onMonthlyIncomeChange: (value: number) => void;
}) {
  const series = React.useMemo(() => portfolioYearlySeries(loans), [loans]);
  const insights = React.useMemo(() => loanInsights(stats, monthlyIncome), [stats, monthlyIncome]);
  const has = stats.count > 0;
  const ratio = has ? paymentToIncome(stats.monthlyPayment, monthlyIncome ?? 0) : null;
  // בלי הלוואה מלאה הגרף נשאר עם צירים ריקים — בלי קווים
  const chartData: Array<Record<string, number | null>> =
    series.length > 0 ? (series as unknown as Array<Record<string, number>>) : EMPTY_SERIES;

  return (
    <div className="space-y-2.5">
      {/* שורת המצב */}
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(130px,1fr)_repeat(5,1fr)] lg:items-center">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <p className="text-sm font-bold leading-tight text-slate-900">התיק שלכם היום</p>
            <p className="text-2xs text-slate-500">
              {has ? `${stats.count} הלוואות · מתעדכן עם כל תזוזה בפאנל` : 'יתמלא תוך כדי הזנת ההלוואות'}
            </p>
          </div>
          <Cell icon={Coins} label="סך חוב" value={has ? formatILS(stats.totalPrincipal) : '—'} />
          <Cell icon={Wallet} label="החזר חודשי" value={has ? formatILS(stats.monthlyPayment) : '—'} emphasized />
          <Cell icon={Banknote} label="סך ריבית" value={has ? formatILS(stats.totalInterest) : '—'} />
          <Cell icon={Percent} label="ריבית משוקללת" value={has ? `${stats.weightedApr.toFixed(2)}%` : '—'} />
          <Cell
            icon={CalendarClock}
            label="סיום התשלומים"
            value={
              has
                ? `${stats.payoffMonths} ח׳${
                    stats.payoffMonths >= 12 ? ` · ${(stats.payoffMonths / 12).toFixed(1)} ש׳` : ''
                  }`
                : '—'
            }
          />
        </div>

        {/* הרכב התיק */}
        {stats.totalPrincipal > 0 && (
          <div>
            <div className="flex h-6 overflow-hidden rounded-lg border border-slate-200">
              {loans.map((loan) => {
                const share = (loan.principal / stats.totalPrincipal) * 100;
                if (share <= 0) return null;
                return (
                  <span
                    key={loan.id}
                    title={`${loan.name} · ${formatILS(loan.principal)} · ${loan.apr.toFixed(2)}%`}
                    style={{ width: `${share}%`, backgroundColor: loanColor(loan) }}
                    className="min-w-[6px] opacity-80 transition-[width] duration-500"
                  />
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {loans.map((loan) => (
                <span key={loan.id} className="flex items-center gap-1 text-2xs text-slate-500">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: loanColor(loan) }}
                  />
                  {loan.name} · {Math.round((loan.principal / stats.totalPrincipal) * 100)}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* יחס ההחזר מההכנסה */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold text-slate-700">
            הכנסה חודשית פנויה של משק הבית
            <span className="font-normal text-slate-400"> (רשות)</span>
          </p>
          <FormattedNumberValueInput
            value={monthlyIncome ?? ''}
            onValueChange={onMonthlyIncomeChange}
            placeholder="0"
            aria-label="הכנסה חודשית פנויה"
            className="h-8 w-32 text-xs"
          />
          {ratio ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-black ${
                ratio.status === 'risk'
                  ? 'bg-rose-50 text-rose-700'
                  : ratio.status === 'watch'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              יחס החזר {Math.round(ratio.ratio * 100)}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-2xs text-slate-400">
              <Info className="h-3 w-3" />
              הזינו הכנסה כדי לראות את יחס ההחזר שהבנק בוחן
            </span>
          )}
        </div>

        {ratio && (
          <div className="mt-2">
            <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`absolute inset-y-0 right-0 rounded-full ${
                  ratio.status === 'risk'
                    ? 'bg-rose-500'
                    : ratio.status === 'watch'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, ratio.ratio * 100)}%` }}
              />
              {/* הרף שבנק ישראל מגביל בו את יחס ההחזר הכולל */}
              <span className="absolute inset-y-0 right-1/2 w-px bg-slate-400" />
            </div>
            <p className="mt-1 text-2xs text-slate-500">
              הקו באמצע הוא 50% — התקרה שבנק ישראל מגביל בה את יחס ההחזר הכולל, כולל המשכנתא
              העתידית שלכם.
            </p>
          </div>
        )}
      </div>

      {/* התובנות */}
      {insights.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {insights.map((insight) => {
            const tone =
              insight.tone === 'alert'
                ? {
                    wrap: 'border-rose-200 bg-rose-50',
                    icon: 'bg-rose-100 text-rose-600',
                    title: 'text-rose-900',
                    Icon: TriangleAlert,
                  }
                : insight.tone === 'opportunity'
                  ? {
                      wrap: 'border-emerald-200 bg-emerald-50',
                      icon: 'bg-emerald-100 text-emerald-600',
                      title: 'text-emerald-900',
                      Icon: Lightbulb,
                    }
                  : {
                      wrap: 'border-slate-200 bg-white',
                      icon: 'bg-slate-100 text-slate-500',
                      title: 'text-slate-900',
                      Icon: Info,
                    };
            const Icon = tone.Icon;
            return (
              <div key={insight.id} className={`flex gap-2 rounded-xl border p-2.5 ${tone.wrap}`}>
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-black leading-snug ${tone.title}`}>
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-slate-600">
                    {insight.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* הגרפים */}
      {stats.count >= 2 && <LoanBreakdownTable stats={stats} />}

      {/* הגרף מוצג תמיד — בלי הלוואות מלאות הוא צירים ריקים */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
          <p className="text-xs font-bold text-slate-800">החוב לאורך הזמן</p>
          <p className="text-2xs text-slate-500">
            יתרת החוב יורדת, הריבית המצטברת עולה — וההחזר החודשי קטן בכל פעם שהלוואה נגמרת
          </p>
        </div>
        <div className="h-52 w-full [&_svg]:[direction:ltr]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="loanBalanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(value: number) => `${value}`}
              />
              {/* שני סולמות: יתרות וריבית באלפים, וההחזר החודשי בסולם שלו */}
              <YAxis
                yAxisId="amount"
                domain={series.length > 0 ? [0, 'auto'] : [0, 100_000]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}K`}
              />
              <YAxis
                yAxisId="payment"
                domain={series.length > 0 ? [0, 'auto'] : [0, 5_000]}
                orientation="right"
                tick={{ fontSize: 10, fill: '#059669' }}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}K`}
              />
              <Tooltip content={<PortfolioTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                yAxisId="amount"
                type="monotone"
                dataKey="balance"
                name="יתרת חוב"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#loanBalanceFill)"
              />
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="cumulativeInterest"
                name="ריבית מצטברת"
                stroke="#e11d48"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="payment"
                type="stepAfter"
                dataKey="monthlyPayment"
                name="החזר חודשי"
                stroke="#059669"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-2xs text-slate-400">
          הציר האופקי: שנים מהיום · הסולם הימני: ההחזר החודשי
        </p>
      </div>
    </div>
  );
}

/** צירים ריקים לפני שהוזנה הלוואה מלאה — חמש שנים בלי ערכים */
const EMPTY_SERIES: Array<Record<string, number | null>> = [1, 2, 3, 4, 5].map((year) => ({
  year,
  balance: null,
  cumulativeInterest: null,
  monthlyPayment: null,
}));

/** ההלוואות זו מול זו — מוצג רק משתי הלוואות, כשיש מה להשוות */
function LoanBreakdownTable({ stats }: { stats: PortfolioStats }) {
  const rows = [...stats.loans].sort((a, b) => b.loan.apr - a.loan.apr);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-2.5 py-2 text-xs font-bold text-slate-800">
        ההלוואות זו מול זו
        <span className="mr-1.5 font-normal text-slate-400">מהריבית הגבוהה לנמוכה</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-2xs">
          <thead className="bg-slate-50 font-bold text-slate-500">
            <tr>
              <th className="p-2 text-right">הלוואה</th>
              <th className="p-2 text-right">ריבית</th>
              <th className="p-2 text-right">החזר חודשי</th>
              <th className="p-2 text-right">סך ריבית</th>
              <th className="p-2 text-right">תשלומים</th>
              <th className="p-2 text-right">חלק מהחוב</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.loan.id} className="border-t border-slate-100">
                <td className="p-2 font-bold text-slate-900">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: loanColor(item.loan) }} />
                    {item.loan.name}
                  </span>
                </td>
                <td className="p-2 text-slate-700">{item.loan.apr.toFixed(2)}%</td>
                <td className="p-2 font-bold text-blue-700">{formatILS(item.monthlyPayment)}</td>
                <td className="p-2 text-rose-600">{formatILS(item.totalInterest)}</td>
                <td className="p-2 text-slate-700">{item.monthsActual}</td>
                <td className="p-2 text-slate-700">
                  {stats.totalPrincipal > 0
                    ? Math.round((item.loan.principal / stats.totalPrincipal) * 100)
                    : 0}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
}

function PortfolioTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number | string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div dir="rtl" className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-2xs font-black text-slate-900">שנה {label}</p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-1.5 text-2xs">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600">
            {entry.name}: <strong className="text-slate-900">{formatILS(entry.value ?? 0)}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

function Cell({
  icon: Icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-2xs text-slate-500">
        <Icon className="h-3 w-3 text-slate-400" />
        {label}
      </p>
      <p
        className={`truncate font-bold leading-tight ${
          emphasized ? 'text-info text-blue-700' : 'text-sm text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
