'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarClock, TrendingDown } from 'lucide-react';
import { MORTGAGE_RATIO_LIMIT, monthLabel, timeline } from '@/lib/cash-flow';
import type { CashFlowState } from '@/lib/cash-flow';
import { PERCENT, SHEKEL, ToolPanel } from './fields';
import { FREE_COLOR, MORTGAGE_COLOR, loanColor } from './palette';

/**
 * הכלל הגלובלי שמיישר כל div ל-RTL הופך גם את עטיפות הגרף, ואז תוויות הצירים
 * נכתבות לתוך שטח הגרף. בגרפים האלה הכיוון חוזר ל-LTR.
 */
const CHART_LTR = '[&_div]:![direction:ltr] [&_text]:![direction:ltr]';

const AXIS = { fontSize: 12, fill: '#64748b', fontFamily: 'inherit' };

/**
 * ההחזר החודשי לאורך זמן: משכנתא והלוואות, אחת מעל השנייה, ומעליהן מה שנשאר
 * מההכנסה. מתחת — יחס ההחזר בכל חודש מול תקרת ה-40%. הסליידר בוחר חודש,
 * והכרטיס שלידו מפרט מה משלמים בו ומה נשאר.
 */
export function CashFlowCharts({ state }: { state: CashFlowState }) {
  const points = useMemo(() => timeline(state), [state]);
  const [selected, setSelected] = useState(0);
  const month = Math.min(selected, points.length - 1);
  const point = points[month];

  const data = useMemo(
    () =>
      points.map((p) => ({
        month: p.month,
        label: monthLabel(p.month),
        mortgage: Math.round(p.mortgage),
        ...Object.fromEntries(state.loans.map((loan) => [loan.id, Math.round(p.loans[loan.id] ?? 0)])),
        free: Math.max(0, Math.round(p.free)),
        actual: p.actualRatio === null ? null : Math.round(p.actualRatio * 1000) / 10,
        forMortgage: p.mortgageRatio === null ? null : Math.round(p.mortgageRatio * 1000) / 10,
      })),
    [points, state.loans]
  );

  const series = [
    { key: 'mortgage', name: 'משכנתא', color: MORTGAGE_COLOR },
    ...state.loans.map((loan, index) => ({
      key: loan.id,
      name: loan.name || `הלוואה ${index + 1}`,
      color: loanColor(index),
    })),
  ];
  const hasIncome = points.some((p) => p.actualRatio !== null);

  /* מתי משהו משתנה — הלוואה שמסתיימת משחררת כסף */
  const milestones = state.loans
    .filter((loan) => loan.months && loan.months < points.length)
    .map((loan) => ({ loan, at: loan.months! }))
    .sort((a, b) => a.at - b.at);

  const tick = (value: number) => (value % 6 === 0 ? monthLabel(value) : '');

  return (
    <ToolPanel title="ההחזר החודשי על ציר הזמן" icon={<TrendingDown className="h-5 w-5 text-blue-600" />}>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-600" aria-label="מקרא">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
            {item.name}
          </li>
        ))}
        {hasIncome && (
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FREE_COLOR }} />
            נשאר פנוי
          </li>
        )}
      </ul>

      <div className={`h-64 ${CHART_LTR}`} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} onClick={(e) => {
            if (typeof e?.activeLabel === 'number') setSelected(e.activeLabel);
          }}>
            <CartesianGrid stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="month" reversed tick={AXIS} tickFormatter={tick} interval={0} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis orientation="right" tick={AXIS} tickFormatter={(v) => `₪${Math.round(v / 1000)}K`} width={52} tickLine={false} axisLine={false} />
            <Tooltip content={<PaymentsTooltip series={series} />} />
            {series.map((item) => (
              <Area
                key={item.key}
                dataKey={item.key}
                name={item.name}
                stackId="pay"
                type="stepAfter"
                stroke={item.color}
                strokeWidth={1.5}
                fill={item.color}
                fillOpacity={0.85}
                isAnimationActive={false}
              />
            ))}
            {hasIncome && (
              <Area dataKey="free" name="נשאר פנוי" stackId="pay" type="stepAfter" stroke="#94a3b8" strokeWidth={1} fill={FREE_COLOR} fillOpacity={0.6} isAnimationActive={false} />
            )}
            <ReferenceLine x={month} stroke="#0f172a" strokeDasharray="4 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {hasIncome && (
        <>
          <p className="mt-3 text-sm font-black text-slate-700">יחס ההחזר מההכנסה הפנויה</p>
          <div className={`h-36 ${CHART_LTR}`} dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} onClick={(e) => {
                if (typeof e?.activeLabel === 'number') setSelected(e.activeLabel);
              }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="month" reversed tick={AXIS} tickFormatter={tick} interval={0} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis orientation="right" tick={AXIS} tickFormatter={(v) => `${v}%`} width={52} tickLine={false} axisLine={false} domain={[0, (max: number) => Math.max(50, Math.ceil(max / 10) * 10)]} />
                <Tooltip content={<RatioTooltip />} />
                <ReferenceLine y={MORTGAGE_RATIO_LIMIT * 100} stroke="#e34948" strokeDasharray="5 4" label={{ value: '40%', position: 'insideTopLeft', fill: '#b91c1c', fontSize: 12 }} />
                <Line dataKey="actual" name="יחס בפועל" type="stepAfter" stroke="#0f172a" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="forMortgage" name="יחס למשכנתא" type="stepAfter" stroke={MORTGAGE_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceLine x={month} stroke="#0f172a" strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-wrap gap-x-4 text-sm font-semibold text-slate-600">
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-slate-900" />יחס בפועל (כל ההחזרים)</li>
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: MORTGAGE_COLOR }} />יחס למשכנתא (אחרי הלוואות ארוכות)</li>
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-rose-500" />תקרה 40%</li>
          </ul>
        </>
      )}

      {/* הסליידר: התקדמות על ציר הזמן */}
      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-black text-slate-800">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            {month === 0 ? 'החודש הנוכחי' : `בעוד ${month} חודשים · ${monthLabel(month)}`}
          </span>
          {milestones.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {milestones.slice(0, 4).map(({ loan, at }) => (
                <button
                  key={loan.id}
                  type="button"
                  onClick={() => setSelected(at)}
                  className="rounded-full bg-white px-2.5 py-0.5 text-2xs font-black text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
                >
                  {loan.name || 'הלוואה'} מסתיימת · {monthLabel(at)}
                </button>
              ))}
            </span>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={points.length - 1}
          value={month}
          onChange={(event) => setSelected(Number(event.target.value))}
          aria-label="חודש על ציר הזמן"
          className="mt-2 w-full accent-blue-600"
        />
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="החזר באותו חודש" value={SHEKEL(point.total)} />
          <Stat label="נשאר פנוי" value={SHEKEL(point.free)} tone={point.free < 0 ? 'bad' : 'good'} />
          <Stat label="יחס בפועל" value={PERCENT(point.actualRatio)} />
          <Stat
            label="יחס למשכנתא"
            value={PERCENT(point.mortgageRatio)}
            tone={point.mortgageRatio !== null && point.mortgageRatio > MORTGAGE_RATIO_LIMIT ? 'bad' : 'default'}
          />
        </div>
      </div>
    </ToolPanel>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'bad' }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <span className="block text-2xs font-bold text-slate-500">{label}</span>
      <span
        className={`block text-lg font-black tabular-nums ${
          tone === 'bad' ? 'text-rose-700' : tone === 'good' ? 'text-emerald-700' : 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: number;
  payload?: Array<{ dataKey: string; value: number; payload: Record<string, number> }>;
}

function PaymentsTooltip({ active, label, payload, series }: TooltipProps & { series: { key: string; name: string; color: string }[] }) {
  if (!active || !payload?.length || label === undefined) return null;
  const row = payload[0].payload;
  const total = series.reduce((sum, item) => sum + (row[item.key] ?? 0), 0);
  return (
    <div dir="rtl" className="min-w-[12rem] rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
      <p className="mb-1 font-black text-slate-900">{monthLabel(label)}</p>
      {series
        .filter((item) => (row[item.key] ?? 0) > 0)
        .map((item) => (
          <p key={item.key} className="flex items-center justify-between gap-3 text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-bold tabular-nums text-slate-900">{SHEKEL(row[item.key])}</span>
          </p>
        ))}
      <p className="mt-1 flex justify-between gap-3 border-t border-slate-100 pt-1 font-black text-slate-900">
        <span>סך הכול</span>
        <span className="tabular-nums">{SHEKEL(total)}</span>
      </p>
      {row.free !== undefined && (
        <p className="flex justify-between gap-3 text-slate-600">
          <span>נשאר פנוי</span>
          <span className="font-bold tabular-nums">{SHEKEL(row.free)}</span>
        </p>
      )}
    </div>
  );
}

function RatioTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length || label === undefined) return null;
  const row = payload[0].payload;
  return (
    <div dir="rtl" className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
      <p className="mb-1 font-black text-slate-900">{monthLabel(label)}</p>
      <p className="text-slate-600">
        יחס בפועל <b className="tabular-nums text-slate-900">{row.actual ?? '—'}%</b>
      </p>
      <p className="text-slate-600">
        יחס למשכנתא <b className="tabular-nums text-slate-900">{row.forMortgage ?? '—'}%</b>
      </p>
    </div>
  );
}
