'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Banknote, CalendarClock, CreditCard, Landmark, Percent, Wallet } from 'lucide-react';
import type { ConsumerCreditSnapshot } from '@/lib/boi-consumer-credit';
import { formatPeriod, useConsumerCredit } from './useConsumerCredit';
import { LenderRatesTable } from './RateInfoButton';

/**
 * אזור המידע הפיננסי בתחתית כלי ההלוואות — באותה שפה של דאשבורד שוק
 * המשכנתאות בדף הבית: מצב האשראי הצרכני בישראל לסוגיו (הלוואות מהבנקים,
 * מחברות כרטיסי האשראי, מהגופים המוסדיים, והמינוס בעו"ש), הריבית הממוצעת
 * לאורך זמן והריביות לפי מוסד מממן. הכול מבנק ישראל, דרך
 * `/api/boi/consumer-credit`; כשהנתונים אינם זמינים מוצגת הודעה.
 */

export const MARKET_SECTION_ID = 'consumer-credit-market';

const numberFormat = new Intl.NumberFormat('he-IL');
const AXIS_TICK = { fontSize: 12, fill: '#64748b' } as const;
const GRID_STROKE = '#e2e8f0';

const LENDER_SERIES = [
  { key: 'banks', label: 'בנקים', color: '#2563eb' },
  { key: 'creditCards', label: 'חברות כרטיסי אשראי', color: '#f59e0b' },
  { key: 'institutional', label: 'גופים מוסדיים', color: '#7c3aed' },
  { key: 'government', label: 'ממשלה', color: '#94a3b8' },
] as const;

function billions(value: number | null): string {
  return value === null ? '—' : `₪${value.toFixed(1)} מיליארד`;
}

function shortQuarter(period: string): string {
  const match = /^(\d{4})-Q(\d)$/.exec(period);
  return match ? `Q${match[2]}/${match[1].slice(2)}` : period;
}

function shortMonth(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? `${Number(match[2])}/${match[1].slice(2)}` : period;
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-black text-white tabular-nums">{value}</p>
      <p className="mt-1 text-2xs text-slate-400">{hint}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-4 text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.5)] md:p-6">
      <h3 className="text-info font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-4 h-[260px] w-full [&_svg]:[direction:ltr]" dir="ltr">
        {children}
      </div>
    </div>
  );
}

function DebtChart({ data }: { data: ConsumerCreditSnapshot }) {
  return (
    <ChartCard
      title="החוב של משקי הבית שלא לדיור — לפי מלווה"
      subtitle="יתרה בסוף כל רבעון, במיליארדי ש״ח · והמינוס בעו״ש בבנקים"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.debtHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="quarter"
            tick={AXIS_TICK}
            tickLine={false}
            tickFormatter={shortQuarter}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            formatter={(value: number, name: string) => [`₪${value.toFixed(1)} מיליארד`, name]}
            labelFormatter={(label: string) => formatPeriod(label)}
          />
          <Legend
            verticalAlign="top"
            height={32}
            formatter={(value: string) => <span className="text-sm text-slate-600">{value}</span>}
          />
          {LENDER_SERIES.map((series) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stackId="debt"
              stroke={series.color}
              fill={series.color}
              fillOpacity={0.55}
              connectNulls
            />
          ))}
          <Area
            type="monotone"
            dataKey="overdraft"
            name="מינוס בעו״ש (מתוך הבנקים)"
            stroke="#e11d48"
            fill="none"
            strokeWidth={2}
            strokeDasharray="4 3"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function RateChart({ data }: { data: ConsumerCreditSnapshot }) {
  return (
    <ChartCard
      title="הריבית הממוצעת על הלוואות צרכניות חדשות"
      subtitle="כל המערכת הבנקאית, משקי בית, ללא אוברדראפט וללא בטחון דירה"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.rateHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="month"
            tick={AXIS_TICK}
            tickLine={false}
            tickFormatter={shortMonth}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={['auto', 'auto']}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'ריבית ממוצעת']}
            labelFormatter={(label: string) => formatPeriod(label)}
          />
          <Line type="monotone" dataKey="rate" stroke="#ea580c" strokeWidth={2.5} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ConsumerCreditMarket() {
  const state = useConsumerCredit();
  const data = state.status === 'ready' ? state.data : null;

  const tiles = useMemo(() => {
    if (!data) return [];
    const debt = data.debt;
    const system = data.system;
    return [
      ...(debt
        ? [
            {
              icon: Wallet,
              label: 'חוב משקי הבית שלא לדיור',
              value: billions(debt.nonHousingTotal),
              hint: `הלוואות צרכניות, אשראי ומינוס · ${formatPeriod(debt.quarter)}`,
            },
            {
              icon: CreditCard,
              label: 'מחברות כרטיסי האשראי',
              value: billions(debt.creditCards),
              hint: `ומהגופים המוסדיים ${billions(debt.institutional)}`,
            },
            {
              icon: Banknote,
              label: 'מינוס בעו״ש בבנקים',
              value: billions(debt.overdraft),
              hint: `מתוך ${billions(debt.banks)} חוב לבנקים`,
            },
          ]
        : []),
      ...(system && system.rate !== null
        ? [
            {
              icon: Percent,
              label: 'ריבית ממוצעת להלוואה צרכנית',
              value: `${system.rate.toFixed(2)}%`,
              hint: `הלוואות חדשות בבנקים · ${formatPeriod(system.month)}`,
            },
          ]
        : []),
      ...(system && system.volume !== null
        ? [
            {
              icon: Landmark,
              label: 'הלוואות צרכניות חדשות בחודש',
              value: `₪${(system.volume / 1_000_000_000).toFixed(1)} מיליארד`,
              hint: `בכל המערכת הבנקאית · ${formatPeriod(system.month)}`,
            },
          ]
        : []),
      ...(system && system.termYears !== null
        ? [
            {
              icon: CalendarClock,
              label: 'תקופה ממוצעת להלוואה חדשה',
              value: `${system.termYears.toFixed(1)} שנים`,
              hint: data.prime ? `הפריים היום ${data.prime.value.toFixed(2)}%` : 'הלוואות חדשות בבנקים',
            },
          ]
        : []),
    ];
  }, [data]);

  return (
    <section
      id={MARKET_SECTION_ID}
      dir="rtl"
      className="relative scroll-mt-24 overflow-hidden bg-brand-dark px-4 py-12 text-white md:py-20"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[8%] h-[28rem] w-[28rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[6%] h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            <Landmark className="h-4 w-4 text-orange-200" />
            נתוני בנק ישראל
          </div>
          <h2 className="mb-3 text-title font-black text-white">מצב ההלוואות הצרכניות בישראל</h2>
          <p className="mx-auto max-w-2xl text-info leading-relaxed text-slate-200">
            כמה חייבים משקי הבית בישראל שלא לדיור ולמי — בנקים, חברות כרטיסי אשראי, גופים מוסדיים
            והמינוס בעו״ש — מה הריבית הממוצעת על הלוואה צרכנית, ומה גובה כל מוסד מממן
          </p>
        </div>

        {state.status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div className="mx-auto max-w-xl rounded-2xl border border-white/15 bg-white/5 p-6 text-center">
            <p className="text-info font-bold text-white">נתוני בנק ישראל אינם זמינים כרגע</p>
            <p className="mt-1 text-sm text-slate-300">נסו לרענן את הדף בעוד כמה דקות.</p>
          </div>
        )}

        {data && (
          <>
            <div className="mb-8 grid gap-4 text-center sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((tile) => (
                <KpiTile key={tile.label} {...tile} />
              ))}
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {data.debtHistory.length > 0 && <DebtChart data={data} />}
              {data.rateHistory.length > 0 && <RateChart data={data} />}
            </div>

            {data.lenders.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white p-4 text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.5)] md:p-6">
                <h3 className="text-info font-black text-slate-900">ריביות על הלוואות צרכניות לפי מוסד מממן</h3>
                <p className="mb-3 mt-1 text-sm text-slate-500">
                  הריבית הממוצעת בכל בנק, בכל חברת כרטיסי אשראי ובגופים החוץ-בנקאיים — ולצידה הריבית
                  שמתחתיה ניתנו 25% מההלוואות הזולות, ומעליה 25% מהיקרות
                </p>
                <div className="overflow-x-auto">
                  <LenderRatesTable compact={false} />
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-2xs leading-relaxed text-slate-400">
              מקור: בנק ישראל, מאגר הסדרות — &quot;ריביות וביצועים - לא לדיור&quot;, &quot;ריביות וביצועים -
              חברות כרטיסי אשראי&quot;, &quot;מצרפי החוב והאשראי&quot; ו&quot;ריבית בנק ישראל&quot;.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
