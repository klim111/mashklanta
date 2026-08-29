'use client';

import React, { useMemo, useState } from 'react';
import {
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowDownRight,
  Banknote,
  GitCompareArrows,
  Percent,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { formatPercentage } from './mortgageCalculations';
import { computeMix, formatDuration, mixHasForecastSensitiveTracks, yearlySeries } from './engine';
import type { MixResult, SeriesPoint, WorkspaceMix } from './engine';
import { compactCurrency, formatShekel } from './workspace/primitives';
import { ForecastDisclaimer } from './workspace/ForecastDisclaimer';

const SERIES_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#0891b2'];

export interface ComparisonEntry {
  id: string;
  label: string;
  mix: WorkspaceMix;
  /** מסמן את התמהיל שנמצא כרגע בעריכה */
  current?: boolean;
  recordId?: string;
  isFinal?: boolean;
  locked?: boolean;
}

interface MixComparisonProps {
  entries: ComparisonEntry[];
  allowSelectFinal?: boolean;
  onSelectFinal?: (entryId: string) => void;
}

type ComputedMix = ComparisonEntry & {
  color: string;
  result: MixResult;
  series: SeriesPoint[];
  principal: number;
  repaidBy10: number;
};

const EPS = 1;

function balanceAtYear(series: SeriesPoint[], year: number): number {
  if (series.length === 0) return 0;
  const exact = series.find((p) => p.year === year);
  if (exact) return exact.balance;
  const last = series[series.length - 1];
  if (year >= last.year) return last.balance;
  const prev = [...series].reverse().find((p) => p.year < year);
  return prev?.balance ?? series[0].balance;
}

function repaidShare(item: ComputedMix, year: number): number {
  if (item.principal <= 0) return 0;
  const remaining = Math.max(0, balanceAtYear(item.series, year));
  return Math.min(1, Math.max(0, (item.principal - remaining) / item.principal));
}

/** גרף השוואה בין תמהילים — יתרת חוב, החזר חודשי, וסיכום חזותי זה מול זה. */
export function MixComparison({ entries, allowSelectFinal = false, onSelectFinal }: MixComparisonProps) {
  const [paydownOpen, setPaydownOpen] = useState(false);

  const computed = useMemo<ComputedMix[]>(
    () =>
      entries.map((entry, index) => {
        const result = computeMix(entry.mix);
        const series = yearlySeries(result);
        const principal = result.mix.totalAmount || 1;
        const horizon = Math.min(10, series[series.length - 1]?.year ?? 10);
        const remaining = balanceAtYear(series, horizon);
        return {
          ...entry,
          color: SERIES_COLORS[index % SERIES_COLORS.length],
          result,
          series,
          principal,
          repaidBy10: principal > 0 ? Math.max(0, (principal - remaining) / principal) : 0,
        };
      }),
    [entries]
  );

  const timeline = useMemo(() => {
    const years = computed.reduce((max, item) => Math.max(max, item.series.length), 0);

    return Array.from({ length: years }, (_, y) => {
      const row: Record<string, number | null> = { year: y };
      computed.forEach((item) => {
        row[`${item.id}-balance`] = item.series[y]?.balance ?? null;
        row[`${item.id}-payment`] = item.series[y]?.payment ?? null;
      });
      return row;
    });
  }, [computed]);

  const best = useMemo(() => {
    if (computed.length === 0) return null;
    const byMonthly = [...computed].sort(
      (a, b) => a.result.summary.monthlyPayment - b.result.summary.monthlyPayment
    )[0];
    const byInterest = [...computed].sort(
      (a, b) => a.result.summary.totalInterest - b.result.summary.totalInterest
    )[0];
    const byDuration = [...computed].sort((a, b) => a.result.summary.months - b.result.summary.months)[0];
    const byPaydown = [...computed].sort((a, b) => b.repaidBy10 - a.repaidBy10)[0];
    return { byMonthly, byInterest, byDuration, byPaydown };
  }, [computed]);

  const maxPaid = useMemo(
    () => Math.max(...computed.map((item) => item.result.summary.totalPaid), 1),
    [computed]
  );

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
        {entries.some((entry) => mixHasForecastSensitiveTracks(entry.mix)) && (
          <ForecastDisclaimer
            mix={entries.find((entry) => mixHasForecastSensitiveTracks(entry.mix))?.mix ?? entries[0].mix}
          />
        )}
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
                        <Badge variant="secondary" className="text-[9px]">
                          בעבודה
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-left font-semibold">
                    {item.result.summary.monthlyPayment > 0.01
                      ? formatShekel(item.result.summary.monthlyPayment)
                      : 'אין החזר שוטף'}
                    {best?.byMonthly.id === item.id && (
                      <Badge className="ml-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px]">
                        הזול
                      </Badge>
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
                      <Badge className="ml-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px]">
                        מינימלי
                      </Badge>
                    )}
                  </td>
                  <td className="p-2 text-left">{formatShekel(item.result.summary.totalPaid)}</td>
                  <td className="p-2 text-left">{formatPercentage(item.result.summary.averageRate)}</td>
                  <td className="p-2 text-left">
                    {formatDuration(item.result.summary.months)}
                    {best?.byDuration.id === item.id && (
                      <Badge className="ml-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px]">
                        הקצר
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="יתרת החוב לאורך הזמן"
            hint="לחצו להשוואת קצב החזר החוב"
            onClick={() => setPaydownOpen(true)}
          >
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
        </div>

        <HeadToHead
          mixes={computed}
          best={best}
          maxPaid={maxPaid}
          allowSelectFinal={allowSelectFinal}
          onSelectFinal={onSelectFinal}
          entries={entries}
        />
      </CardContent>

      <PaydownPaceDialog open={paydownOpen} onOpenChange={setPaydownOpen} mixes={computed} />
    </Card>
  );
}

function HeadToHead({
  mixes,
  best,
  maxPaid,
  allowSelectFinal,
  onSelectFinal,
  entries,
}: {
  mixes: ComputedMix[];
  best: {
    byMonthly: ComputedMix;
    byInterest: ComputedMix;
    byDuration: ComputedMix;
    byPaydown: ComputedMix;
  } | null;
  maxPaid: number;
  allowSelectFinal?: boolean;
  onSelectFinal?: (entryId: string) => void;
  entries: ComparisonEntry[];
}) {
  if (mixes.length === 0 || !best) return null;

  const pair = mixes.length === 2 ? ([mixes[0], mixes[1]] as const) : null;
  const metrics = pair
    ? pairMetrics(pair[0], pair[1])
    : globalMetrics(mixes, best);

  const renderCard = (item: ComputedMix) => {
    const entry = entries.find((row) => row.id === item.id);
    return (
      <MixFaceCard
        item={item}
        best={best}
        maxPaid={maxPaid}
        isFinal={Boolean(entry?.isFinal)}
        allowSelectFinal={allowSelectFinal}
        onSelectFinal={onSelectFinal ? () => onSelectFinal(item.id) : undefined}
      />
    );
  };

  return (
    <div dir="rtl" className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:p-5">
      <p className="mb-4 text-sm font-black text-slate-800">השוואה זה מול זה</p>

      {pair ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          {renderCard(pair[0])}
          <div className="flex flex-col justify-center gap-3 lg:w-56">
            {metrics.map((metric) => (
              <GapCard key={metric.id} metric={metric} />
            ))}
          </div>
          {renderCard(pair[1])}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mixes.map((item) => (
              <div key={item.id}>{renderCard(item)}</div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {metrics.map((metric) => (
              <GapCard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type GapTone = 'better' | 'worse' | 'mixed' | 'even';

interface GapMetric {
  id: string;
  title: string;
  value: string;
  footnote: string;
  tone: GapTone;
  icon: React.ReactNode;
}

function pairMetrics(a: ComputedMix, b: ComputedMix): GapMetric[] {
  const interestDelta = a.result.summary.totalInterest - b.result.summary.totalInterest;
  const monthlyDelta = a.result.summary.monthlyPayment - b.result.summary.monthlyPayment;
  const paydownDelta = b.repaidBy10 - a.repaidBy10;

  return [
    moneyGap('interest', 'החיסכון בריבית הכוללת', interestDelta, a, b, <Percent className="h-5 w-5" />),
    moneyGap(
      'monthly',
      'ההפרש בתשלום החודשי',
      monthlyDelta,
      a,
      b,
      <Banknote className="h-5 w-5" />,
      'לחודש'
    ),
    paceGap(a, b, paydownDelta),
  ];
}

function moneyGap(
  id: string,
  title: string,
  deltaAMinusB: number,
  a: ComputedMix,
  b: ComputedMix,
  icon: React.ReactNode,
  suffix = ''
): GapMetric {
  if (Math.abs(deltaAMinusB) < EPS) {
    return {
      id,
      title,
      value: 'זהה',
      footnote: 'אין פער מהותי בין התמהילים',
      tone: 'even',
      icon,
    };
  }
  const winner = deltaAMinusB > 0 ? b : a;
  const loser = deltaAMinusB > 0 ? a : b;
  return {
    id,
    title,
    value: `${formatShekel(Math.abs(deltaAMinusB))}${suffix ? ` ${suffix}` : ''}`,
    footnote: `לטובת ${winner.label} · ${loser.label} יקר יותר`,
    tone: 'better',
    icon,
  };
}

function paceGap(a: ComputedMix, b: ComputedMix, paydownDeltaBMinusA: number): GapMetric {
  const icon = <TrendingDown className="h-5 w-5" />;
  if (Math.abs(paydownDeltaBMinusA) < 0.005) {
    return {
      id: 'pace',
      title: 'קצב החזרת הקרן',
      value: 'קצב דומה',
      footnote: 'שני התמהילים פורעים את הקרן בקצב קרוב',
      tone: 'even',
      icon,
    };
  }
  const faster = paydownDeltaBMinusA > 0 ? b : a;
  const slower = paydownDeltaBMinusA > 0 ? a : b;
  const pts = Math.abs(paydownDeltaBMinusA) * 100;
  return {
    id: 'pace',
    title: 'קצב החזרת הקרן',
    value: `${pts.toFixed(1)} נק׳ יתרון`,
    footnote: `${faster.label} פורע מהר יותר מ-${slower.label}`,
    tone: 'better',
    icon,
  };
}

function globalMetrics(
  mixes: ComputedMix[],
  best: { byMonthly: ComputedMix; byInterest: ComputedMix; byPaydown: ComputedMix }
): GapMetric[] {
  const worstInterest = [...mixes].sort(
    (a, b) => b.result.summary.totalInterest - a.result.summary.totalInterest
  )[0];
  const worstMonthly = [...mixes].sort(
    (a, b) => b.result.summary.monthlyPayment - a.result.summary.monthlyPayment
  )[0];
  const worstPaydown = [...mixes].sort((a, b) => a.repaidBy10 - b.repaidBy10)[0];

  const interestSave = worstInterest.result.summary.totalInterest - best.byInterest.result.summary.totalInterest;
  const monthlySave = worstMonthly.result.summary.monthlyPayment - best.byMonthly.result.summary.monthlyPayment;
  const pacePts = (best.byPaydown.repaidBy10 - worstPaydown.repaidBy10) * 100;

  const mixedWinners =
    new Set([best.byInterest.id, best.byMonthly.id, best.byPaydown.id]).size > 1;

  return [
    {
      id: 'interest',
      title: 'החיסכון בריבית הכוללת',
      value: formatShekel(Math.max(0, interestSave)),
      footnote: `הכי זול בריבית: ${best.byInterest.label}`,
      tone: mixedWinners ? 'mixed' : 'better',
      icon: <Percent className="h-5 w-5" />,
    },
    {
      id: 'monthly',
      title: 'ההפרש בתשלום החודשי',
      value: formatShekel(Math.max(0, monthlySave)),
      footnote: `ההחזר הנמוך ביותר: ${best.byMonthly.label}`,
      tone: mixedWinners ? 'mixed' : 'better',
      icon: <Banknote className="h-5 w-5" />,
    },
    {
      id: 'pace',
      title: 'קצב החזרת הקרן',
      value: `${Math.max(0, pacePts).toFixed(1)} נק׳`,
      footnote: `הקצב הגבוה ביותר: ${best.byPaydown.label}`,
      tone: mixedWinners ? 'mixed' : 'better',
      icon: <TrendingDown className="h-5 w-5" />,
    },
  ];
}

function GapCard({ metric }: { metric: GapMetric }) {
  const palette: Record<GapTone, string> = {
    better: 'from-emerald-500 to-teal-600 text-white shadow-lg',
    worse: 'from-rose-500 to-red-600 text-white shadow-lg',
    mixed: 'from-amber-500 to-orange-600 text-white shadow-lg',
    even: 'from-slate-400 to-slate-500 text-white shadow-md',
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br px-4 py-4 text-center ${palette[metric.tone]}`}>
      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
        {metric.icon}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-white">{metric.title}</div>
      <div className="my-1 text-xl font-black leading-tight text-white md:text-2xl">{metric.value}</div>
      <div className="text-[11px] leading-snug text-white/90">{metric.footnote}</div>
    </div>
  );
}

function MixFaceCard({
  item,
  best,
  maxPaid,
  isFinal,
  allowSelectFinal,
  onSelectFinal,
}: {
  item: ComputedMix;
  best: {
    byMonthly: ComputedMix;
    byInterest: ComputedMix;
    byDuration: ComputedMix;
    byPaydown: ComputedMix;
  };
  maxPaid: number;
  isFinal?: boolean;
  allowSelectFinal?: boolean;
  onSelectFinal?: () => void;
}) {
  const wins = {
    interest: best.byInterest.id === item.id,
    monthly: best.byMonthly.id === item.id,
    paydown: best.byPaydown.id === item.id,
  };
  const winCount = Number(wins.interest) + Number(wins.monthly) + Number(wins.paydown);
  const allWin = winCount === 3;
  const allLose = winCount === 0;
  const barRatio = Math.max(0.18, item.result.summary.totalPaid / maxPaid);

  const wrap = allWin
    ? 'border-2 border-emerald-300 bg-emerald-50/70 shadow-lg'
    : allLose
      ? 'border-2 border-gray-200 bg-gray-50'
      : 'border-2 border-amber-300 bg-amber-50/50 shadow-md';

  const titleColor = allWin ? 'text-emerald-900' : allLose ? 'text-gray-900' : 'text-amber-950';
  const valueWin = 'font-black text-emerald-700';
  const valueLose = 'font-black text-rose-700';
  const valueNeutral = 'font-black text-slate-800';

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${wrap}`}>
      {allWin && <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-emerald-200/50 blur-2xl" />}
      <div className="relative mb-4 flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-md ${
            allWin
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : allLose
                ? 'bg-gray-300'
                : 'bg-gradient-to-br from-amber-400 to-orange-500'
          }`}
        >
          {allWin ? (
            <TrendingDown className="h-5 w-5 text-white" />
          ) : allLose ? (
            <TrendingUp className="h-5 w-5 text-gray-700" />
          ) : (
            <ArrowDownRight className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="min-w-0">
          <div className={`truncate font-black ${titleColor}`}>{item.label}</div>
          <div className={`text-xs ${allWin ? 'text-emerald-700' : allLose ? 'text-gray-600' : 'text-amber-800'}`}>
            {allWin ? 'מוביל בכל הפרמטרים' : allLose ? 'חלש יותר בכל הפרמטרים' : 'תוצאה מעורבת — יתרון בחלק מהמדדים'}
          </div>
        </div>
      </div>

      <div
        className={`relative mb-5 h-3.5 w-full overflow-hidden rounded-full ${
          allWin ? 'bg-emerald-100' : allLose ? 'bg-gray-200' : 'bg-amber-100'
        }`}
      >
        <div
          className={`h-full ${
            allWin
              ? 'bg-gradient-to-l from-emerald-500 to-teal-500'
              : allLose
                ? 'bg-gradient-to-l from-gray-400 to-gray-500'
                : 'bg-gradient-to-l from-amber-400 to-orange-500'
          }`}
          style={{ width: `${barRatio * 100}%` }}
        />
      </div>

      <dl className="relative space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-sm text-slate-600">ריבית משוקללת</dt>
          <dd className={wins.interest ? valueWin : allLose ? valueLose : valueNeutral}>
            {formatPercentage(item.result.summary.averageRate)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-sm text-slate-600">החזר חודשי</dt>
          <dd className={`text-lg ${wins.monthly ? valueWin : winCount === 0 ? valueLose : valueNeutral}`}>
            {formatShekel(item.result.summary.monthlyPayment)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-sm text-slate-600">קצב החזרת קרן (10 שנים)</dt>
          <dd className={wins.paydown ? valueWin : winCount === 0 ? valueLose : valueNeutral}>
            {(item.repaidBy10 * 100).toFixed(0)}%
          </dd>
        </div>
        <div
          className={`flex items-baseline justify-between gap-2 border-t pt-3 ${
            allWin ? 'border-emerald-200' : allLose ? 'border-gray-200' : 'border-amber-200'
          }`}
        >
          <dt className="text-sm text-slate-600">עלות כוללת</dt>
          <dd className={`text-lg ${wins.interest ? valueWin : winCount === 0 ? valueLose : valueNeutral}`}>
            {formatShekel(item.result.summary.totalPaid)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-sm text-slate-600">סך ריבית</dt>
          <dd className={wins.interest ? valueWin : winCount === 0 ? valueLose : valueNeutral}>
            {formatShekel(item.result.summary.totalInterest)}
          </dd>
        </div>
      </dl>

      {allowSelectFinal && (
        <div className="relative mt-5">
          {isFinal ? (
            <div className="rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-xs font-black text-white">
              זה התמהיל הסופי שנבחר למכרז
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'לבחור תמהיל זה כתמהיל הסופי? הוא יינעל לשינויים, יישמר בחשבון, והנתונים שלו ייטענו בשלבי המיקוח מול הבנקים והחתימה.'
                  )
                ) {
                  onSelectFinal?.();
                }
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-slate-700"
            >
              בחר תמהיל זה כתמהיל סופי
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PaydownPaceDialog({
  open,
  onOpenChange,
  mixes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mixes: ComputedMix[];
}) {
  const ranked = useMemo(
    () => [...mixes].sort((a, b) => b.repaidBy10 - a.repaidBy10),
    [mixes]
  );

  const years = useMemo(() => {
    const maxYear = mixes.reduce((max, item) => {
      const last = item.series[item.series.length - 1]?.year ?? 0;
      return Math.max(max, last);
    }, 0);
    const ticks: number[] = [];
    for (let y = 0; y <= maxYear; y += 5) ticks.push(y);
    if (ticks[ticks.length - 1] !== maxYear && maxYear > 0) ticks.push(maxYear);
    return ticks;
  }, [mixes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] max-w-6xl overflow-y-auto sm:max-w-6xl [&>button]:left-4 [&>button]:right-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-right text-xl font-black text-slate-900">
            קצב החזר החוב
          </DialogTitle>
          <DialogDescription className="text-right text-slate-600">
            יתרת הקרן בכל חמש שנים, מסודרת מימין לשמאל מהקצב הגבוה לנמוך. עמודות ירוקות פורעות מהר יותר,
            עמודות אפורות־אדמדמות משאירות יותר חוב לאורך זמן.
          </DialogDescription>
        </DialogHeader>

        {ranked.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">אין תמהילים להשוואה</p>
        ) : (
          <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${ranked.length}, minmax(220px, 1fr))` }}>
            {ranked.map((item, rank) => {
              const fastest = rank === 0;
              const slowest = rank === ranked.length - 1 && ranked.length > 1;
              const wrap = fastest
                ? 'border-2 border-emerald-300 bg-emerald-50/70'
                : slowest
                  ? 'border-2 border-rose-200 bg-rose-50/60'
                  : 'border-2 border-slate-200 bg-slate-50';
              const barFill = fastest
                ? 'bg-emerald-500'
                : slowest
                  ? 'bg-rose-400'
                  : 'bg-slate-400';

              return (
                <div key={item.id} className={`rounded-2xl p-4 ${wrap}`}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{item.label}</p>
                      <p
                        className={`text-[11px] font-bold ${
                          fastest ? 'text-emerald-700' : slowest ? 'text-rose-700' : 'text-slate-600'
                        }`}
                      >
                        {fastest
                          ? 'הקצב הגבוה ביותר'
                          : slowest
                            ? 'הקצב הנמוך ביותר'
                            : `קצב #${rank + 1}`}
                      </p>
                    </div>
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>

                  <div className="mb-4 flex h-16 items-end gap-1">
                    {years.map((year) => {
                      const remainingPct = 1 - repaidShare(item, year);
                      return (
                        <div key={year} className="flex flex-1 flex-col items-center justify-end gap-1">
                          <div
                            className={`w-full rounded-t ${barFill}`}
                            style={{ height: `${Math.max(6, remainingPct * 100)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <p className="mb-3 text-center text-lg font-black text-slate-900">
                    {(item.repaidBy10 * 100).toFixed(0)}%
                    <span className="mr-1 text-[11px] font-semibold text-slate-500">מהקרן ב־10 שנים</span>
                  </p>

                  <ul className="space-y-2">
                    {years.map((year) => {
                      const remaining = balanceAtYear(item.series, year);
                      const remainingPct = item.principal > 0 ? remaining / item.principal : 0;
                      return (
                        <li key={year}>
                          <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
                            <span className="font-semibold text-slate-500">שנה {year}</span>
                            <span className="font-bold text-slate-800">{formatShekel(remaining)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/80">
                            <div
                              className={`h-full rounded-full ${barFill}`}
                              style={{ width: `${Math.max(2, remainingPct * 100)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Panel({
  title,
  children,
  className = '',
  hint,
  onClick,
}: {
  title: string;
  children: React.ReactElement;
  className?: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3 ${className} ${
        onClick ? 'cursor-pointer transition-shadow hover:border-blue-300 hover:shadow-md' : ''
      }`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {hint && <p className="text-[10px] font-medium text-blue-600">{hint}</p>}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
