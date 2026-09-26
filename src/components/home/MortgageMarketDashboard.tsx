'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Home, Landmark, Percent } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MortgageMarketSnapshot, RateTrackKey, YearStat } from '@/lib/boi-mortgage-market';
import { TRACK_COLORS } from '@/components/mortgage-advisor/workspace/primitives';

/**
 * דאשבורד שוק המשכנתאות בדף הבית — כל נתון בו מבנק ישראל, דרך
 * `/api/boi/mortgage-market`. כשהנתונים אינם זמינים מוצגת הודעה, לא ערכים
 * ממקור אחר.
 */

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** YYYY-MM → "אוגוסט 2026"; YYYY-MM-DD → "26.9.2026" */
function formatPeriod(period: string): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
  if (day) return `${Number(day[3])}.${Number(day[2])}.${day[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(period);
  if (month) return `${HEBREW_MONTHS[Number(month[2]) - 1]} ${month[1]}`;
  return period;
}

function shortMonth(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? `${Number(match[2])}/${match[1].slice(2)}` : period;
}

const numberFormat = new Intl.NumberFormat('he-IL');

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatShekel(value: number): string {
  return `₪${numberFormat.format(Math.round(value))}`;
}

function formatBillions(value: number): string {
  return `₪${(value / 1_000_000_000).toFixed(1)} מיליארד`;
}

const RATE_COLORS: Record<RateTrackKey, string> = {
  fixed_unlinked: TRACK_COLORS.fixed_unlinked,
  fixed_linked: TRACK_COLORS.fixed_linked,
  variable_linked: TRACK_COLORS.variable_linked,
  variable_unlinked: TRACK_COLORS.prime,
};

const HISTORY_SERIES: { key: Exclude<RateTrackKey, 'variable_unlinked'>; label: string }[] = [
  { key: 'fixed_unlinked', label: 'קבועה לא צמודה' },
  { key: 'fixed_linked', label: 'קבועה צמודה' },
  { key: 'variable_linked', label: 'משתנה צמודה' },
];

const AXIS_TICK = { fontSize: 12, fill: '#64748b' } as const;
const GRID_STROKE = '#e2e8f0';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: MortgageMarketSnapshot }
  | { status: 'error' };

function useMortgageMarket(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/boi/mortgage-market')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as MortgageMarketSnapshot;
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div dir="rtl" className="min-w-[200px] rounded-xl border border-slate-200 bg-white p-3 text-right shadow-lg">
      <div className="text-2xs font-black text-slate-500">{title}</div>
      <ul className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-slate-600">
              {row.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />}
              {row.label}
            </span>
            <span className="font-bold tabular-nums text-slate-900">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RateCard({ item, index }: { item: MortgageMarketSnapshot['rates'][number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md"
    >
      <span className="absolute inset-y-0 right-0 w-1.5" style={{ backgroundColor: RATE_COLORS[item.key] }} />
      <p className="text-info font-bold text-slate-200">{item.label}</p>
      {item.rate !== null ? (
        <p className="mt-1 text-4xl font-black tracking-tight text-white tabular-nums">{formatPct(item.rate)}</p>
      ) : (
        <p className="mt-2 text-sm leading-snug text-slate-300">{item.note}</p>
      )}
      <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm text-slate-300">
        {item.anchor !== null ? (
          <p>
            <span className="text-slate-400">{item.anchorLabel}: </span>
            <span className="font-bold text-white tabular-nums">{formatPct(item.anchor)}</span>
            {item.margin !== null && (
              <>
                <span className="text-slate-400"> · מרווח ממוצע </span>
                <span className="font-bold text-white tabular-nums">{formatPct(item.margin)}</span>
              </>
            )}
          </p>
        ) : (
          <p className="text-slate-400">{item.note}</p>
        )}
        {item.anchorDetail && <p className="text-2xs text-slate-400">{item.anchorDetail}</p>}
        {item.asOf && <p className="text-2xs text-slate-400">{formatPeriod(item.asOf)}</p>}
      </div>
    </motion.div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Home;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-black text-white tabular-nums">{value}</p>
      <p className="mt-1 text-2xs text-slate-400">{hint}</p>
    </div>
  );
}

function YearsChart({ years, latestMonth }: { years: YearStat[]; latestMonth: string }) {
  const data = years.map((item) => ({
    ...item,
    label: item.months < 12 ? `${item.year}*` : String(item.year),
  }));
  const partial = years.find((item) => item.months < 12);

  return (
    <div className="rounded-3xl border border-white/10 bg-white p-4 text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.5)] md:p-6">
      <h3 className="text-info font-black text-slate-900">מספר המשכנתאות החדשות בכל שנה</h3>
      <p className="mt-1 text-sm text-slate-500">
        כל המערכת הבנקאית, הלוואות חדשות לדיור (ללא מחזורים)
        {partial && ` · *${partial.year}: ינואר עד ${formatPeriod(latestMonth).split(' ')[0]}`}
      </p>
      <div className="mt-4 h-[260px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}K`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(37,99,235,0.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as YearStat;
                return (
                  <TooltipCard
                    title={item.months < 12 ? `${item.year} (${item.months} חודשים)` : String(item.year)}
                    rows={[
                      { label: 'משכנתאות', value: numberFormat.format(item.count), color: '#2563eb' },
                      { label: 'משכנתא ממוצעת', value: formatShekel(item.average) },
                      { label: 'סכום כולל', value: formatBillions(item.volume) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {data.map((item) => (
                <Cell key={item.year} fill={item.months < 12 ? '#93c5fd' : '#2563eb'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-blue-700">הנתונים בטבלה</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 font-semibold">שנה</th>
                <th className="py-1 font-semibold">משכנתאות</th>
                <th className="py-1 font-semibold">משכנתא ממוצעת</th>
                <th className="py-1 font-semibold">סכום כולל</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...years].reverse().map((item) => (
                <tr key={item.year} className="border-t border-slate-100">
                  <td className="py-1">{item.months < 12 ? `${item.year} (${item.months} ח׳)` : item.year}</td>
                  <td className="py-1">{numberFormat.format(item.count)}</td>
                  <td className="py-1">{formatShekel(item.average)}</td>
                  <td className="py-1">{formatBillions(item.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function RatesTrendChart({ data }: { data: MortgageMarketSnapshot['rateHistory'] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-4 text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.5)] md:p-6">
      <h3 className="text-info font-black text-slate-900">ריבית ממוצעת לפי מסלול</h3>
      <p className="mt-1 text-sm text-slate-500">הלוואות חדשות לדיור, שלוש השנים האחרונות</p>
      <div className="mt-4 h-[260px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="month"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              tickFormatter={shortMonth}
              minTickGap={24}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <TooltipCard
                    title={formatPeriod(String(label))}
                    rows={HISTORY_SERIES.flatMap((series) => {
                      const entry = payload.find((item) => item.dataKey === series.key);
                      const value = entry?.value;
                      return typeof value === 'number'
                        ? [{ label: series.label, value: formatPct(value), color: RATE_COLORS[series.key] }]
                        : [];
                    })}
                  />
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={32}
              iconType="plainline"
              formatter={(value: string) => <span className="text-sm text-slate-600">{value}</span>}
            />
            {HISTORY_SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={RATE_COLORS[series.key]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function MortgageMarketDashboard() {
  const state = useMortgageMarket();
  const data = state.status === 'ready' ? state.data : null;

  const tiles = useMemo(() => {
    if (!data) return [];
    const ytd = data.yearToDate;
    const lastMonthName = formatPeriod(data.latestMonth);
    return [
      {
        icon: Home,
        label: `משכנתאות שנלקחו ב-${ytd.year}`,
        value: numberFormat.format(ytd.count),
        hint: `ינואר עד ${lastMonthName}`,
      },
      {
        icon: Banknote,
        label: 'משכנתא ממוצעת',
        value: formatShekel(data.latest.average),
        hint: `הלוואות חדשות ב${lastMonthName}`,
      },
      {
        icon: Landmark,
        label: `סכום המשכנתאות ב-${ytd.year}`,
        value: formatBillions(ytd.volume),
        hint: `ממוצע ${formatShekel(ytd.average)} למשכנתא מתחילת השנה`,
      },
      ...(data.latest.paymentToIncome !== null
        ? [
            {
              icon: Percent,
              label: 'החזר חודשי מההכנסה',
              value: `${data.latest.paymentToIncome.toFixed(1)}%`,
              hint: `שיעור ההחזר הממוצע ב${lastMonthName}`,
            },
          ]
        : []),
    ];
  }, [data]);

  return (
    <section id="stats" dir="rtl" className="relative overflow-hidden bg-brand-dark px-4 py-12 text-white md:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[6%] h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            <Landmark className="h-4 w-4 text-blue-200" />
            נתוני בנק ישראל
          </div>
          <h2 className="mb-3 text-title font-black text-white">שוק המשכנתאות בישראל</h2>
          <p className="mx-auto max-w-2xl text-info leading-relaxed text-slate-200">
            הריביות הממוצעות על משכנתאות חדשות לפי מסלול, העוגנים שלהן, והיקף המשכנתאות במשק
            {data ? ` · נכון ל${formatPeriod(data.latestMonth)}` : ''}
          </p>
        </motion.div>

        {state.status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => (
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
            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.rates.map((item, index) => (
                <RateCard key={item.key} item={item} index={index} />
              ))}
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((tile) => (
                <KpiTile key={tile.label} {...tile} />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <YearsChart years={data.years} latestMonth={data.latestMonth} />
              <RatesTrendChart data={data.rateHistory} />
            </div>

            <p className="mt-6 text-center text-2xs leading-relaxed text-slate-400">
              מקור: בנק ישראל, מאגר הסדרות — &quot;ריביות וביצועים לדיור&quot; (הלוואות חדשות בכל המערכת הבנקאית)
              ו&quot;ריבית בנק ישראל&quot;. ריבית המסלול המשתנה הצמוד היא העוגן הממוצע ועוד המרווח הממוצע.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
