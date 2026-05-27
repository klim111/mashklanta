'use client';

import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Loan } from './types';
import { buildAmortSchedule } from './loanMath';
import { formatILS } from '@/lib/currency';

interface AmortChartProps {
  loan: Loan;
  height?: number;
  showLegend?: boolean;
  colors?: {
    balance: string;
    principal: string;
    interest: string;
  };
}

const BALANCE_AREA_KEY = 'יתרת קרן';
const INTEREST_AREA_KEY = 'ריבית מצטברת ששולמה';
const BALANCE_LINE_KEY = 'קו ירידת הקרן';

interface TooltipPayloadEntry {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
}

interface AmortTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number | string;
}

function AmortTooltip({ active, payload, label }: AmortTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // הקו והאזור התחתון מציגים אותו ערך (יתרת קרן) - נציג רק את האזור.
  const visible = payload.filter((p) => p.dataKey !== BALANCE_LINE_KEY);
  if (visible.length === 0) return null;

  return (
    <div
      className="bg-white border border-gray-200 rounded-md shadow-md px-3 py-2 text-sm"
      dir="rtl"
    >
      <p className="font-semibold text-gray-900 mb-1">חודש {label}</p>
      {visible.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-2">
          <span
            className="w-3 h-3 inline-block rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-700">
            {entry.name}:{' '}
            <strong className="text-gray-900">{formatILS(entry.value ?? 0)}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

export function AmortChart({
  loan,
  height = 300,
  showLegend = true,
  colors = {
    balance: '#1d4ed8',
    principal: '#10b981',
    interest: '#ef4444',
  },
}: AmortChartProps) {
  const schedule = buildAmortSchedule({
    principal: loan.principal,
    apr: loan.apr,
    months: loan.months,
  });

  // נתוני הגרף:
  //   BALANCE_AREA_KEY = יתרת הקרן באותו חודש - מצויר כאזור ירוק תחת קו ירידת הקרן.
  //   INTEREST_AREA_KEY = ריבית מצטברת ששולמה עד אותו חודש - מוערם מעל היתרה כאזור אדום שמעל הקו.
  //   BALANCE_LINE_KEY = שכפול של היתרה לצורך ציור הקו היורד באופן בולט מעל הצביעה.
  let cumInterest = 0;
  const chartData = [
    {
      month: 0,
      [BALANCE_AREA_KEY]: Math.round(loan.principal),
      [INTEREST_AREA_KEY]: 0,
      [BALANCE_LINE_KEY]: Math.round(loan.principal),
    },
    ...schedule.rows.map((row) => {
      cumInterest += row.interest;
      const balEnd = Math.max(0, Math.round(row.balEnd));
      return {
        month: row.m,
        [BALANCE_AREA_KEY]: balEnd,
        [INTEREST_AREA_KEY]: Math.round(cumInterest),
        [BALANCE_LINE_KEY]: balEnd,
      };
    }),
  ];

  const originalPrincipal = Math.round(loan.principal);
  const totalInterest = Math.round(schedule.totalInterest);
  const totalPaid = originalPrincipal + totalInterest;

  return (
    <div className="w-full space-y-3" dir="rtl">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="amort-grad-balance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.principal} stopOpacity={0.75} />
                <stop offset="100%" stopColor={colors.principal} stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="amort-grad-interest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.interest} stopOpacity={0.75} />
                <stop offset="100%" stopColor={colors.interest} stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              label={{ value: 'חודש', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                value >= 1000 ? `₪${(value / 1000).toFixed(0)}K` : `₪${value}`
              }
              label={{ value: 'סכום (₪)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<AmortTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ direction: 'rtl' }}
                payload={[
                  {
                    value: BALANCE_LINE_KEY,
                    type: 'line',
                    color: colors.balance,
                    id: BALANCE_LINE_KEY,
                  },
                  {
                    value: `${BALANCE_AREA_KEY} (קרן שעדיין לא שולמה)`,
                    type: 'square',
                    color: colors.principal,
                    id: BALANCE_AREA_KEY,
                  },
                  {
                    value: `${INTEREST_AREA_KEY} (אבודה)`,
                    type: 'square',
                    color: colors.interest,
                    id: INTEREST_AREA_KEY,
                  },
                ]}
              />
            )}

            {/* אזור ירוק - יתרת הקרן הנותרת, ממלא את השטח מתחת לקו ירידת הקרן */}
            <Area
              type="monotone"
              dataKey={BALANCE_AREA_KEY}
              stackId="loan"
              stroke="none"
              fill="url(#amort-grad-balance)"
              isAnimationActive={false}
              legendType="none"
            />

            {/* אזור אדום - ריבית מצטברת ששולמה, ממלא את השטח מעל קו הקרן היורדת */}
            <Area
              type="monotone"
              dataKey={INTEREST_AREA_KEY}
              stackId="loan"
              stroke={colors.interest}
              strokeWidth={1.25}
              fill="url(#amort-grad-interest)"
              isAnimationActive={false}
              legendType="none"
            />

            {/* קו הקרן היורד - מצויר מעל הצביעה כדי שיהיה בולט */}
            <Line
              type="monotone"
              dataKey={BALANCE_LINE_KEY}
              stroke={colors.balance}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* סיכום: ניתן לראות את התקדמות סגירת הקרן ואת ה"מחיר" - הריבית המצטברת */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div
          className="rounded-md border px-3 py-2 text-center"
          style={{
            borderColor: `${colors.principal}55`,
            backgroundColor: `${colors.principal}12`,
          }}
        >
          <div className="text-xs text-gray-600">קרן מקורית (השטח הירוק המקסימלי)</div>
          <div className="font-bold" style={{ color: colors.principal }}>
            {formatILS(originalPrincipal)}
          </div>
        </div>
        <div
          className="rounded-md border px-3 py-2 text-center"
          style={{
            borderColor: `${colors.interest}55`,
            backgroundColor: `${colors.interest}12`,
          }}
        >
          <div className="text-xs text-gray-600">ריבית מצטברת (השטח האדום)</div>
          <div className="font-bold" style={{ color: colors.interest }}>
            {formatILS(totalInterest)}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <div className="text-xs text-slate-600">סה&quot;כ ששולם</div>
          <div className="font-bold text-slate-900">{formatILS(totalPaid)}</div>
        </div>
      </div>
    </div>
  );
}
