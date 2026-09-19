'use client';

import React, { useMemo } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Scale, Shield, Sparkles } from 'lucide-react';
import type {
  CashFlowPoint,
  CashFlowStep,
  CheckStatus,
  CostPoint,
  MixSketchItem,
  TimelineItem,
} from '@/lib/profile-report';
import { formatShekel } from '../../ui';

/**
 * הגרפים של דוח הפרופיל.
 *
 * צבעי הסדרות קבועים לפי מה שהם מייצגים, ולא לפי הסדר: כחול הוא תמיד הכסף
 * שנכנס או הקרן, ענבר תמיד מה שיורד או הריבית, ירוק-כחלחל תמיד מה שנשאר,
 * וסגול תמיד אבן דרך בתהליך. צבעי הסטטוס (ירוק / ענבר / אדום) שמורים למצב מול
 * המגבלה בלבד. הפלטה נבדקה לעיוורון צבעים, ולכל גרף יש גם טבלה או כיתוב שנותן
 * את אותו מידע בלי צבע.
 */
export const SERIES = {
  income: '#2563eb',
  deduction: '#d97706',
  remaining: '#0d9488',
  milestone: '#7c3aed',
  neutral: '#94a3b8',
} as const;

const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: '#059669',
  near: '#d97706',
  fail: '#e11d48',
  unknown: '#94a3b8',
};

const STATUS_SOFT: Record<CheckStatus, string> = {
  pass: '#d1fae5',
  near: '#fef3c7',
  fail: '#ffe4e6',
  unknown: '#e2e8f0',
};

/** ‎₪1.2M / ‎₪85K — לצירים ולתוויות קצרות */
export function compactShekel(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}₪${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}₪${Math.round(abs / 1_000)}K`;
  return `${sign}₪${Math.round(abs)}`;
}

const AXIS_TICK = { fontSize: 11, fill: '#64748b' } as const;
const GRID_STROKE = '#e2e8f0';

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** הטולטיפ המשותף — כרטיס לבן מיושר לימין, שורה לכל סדרה */
function TooltipCard({ title, rows, note }: { title: string; rows: TooltipRow[]; note?: string }) {
  return (
    <div dir="rtl" className="min-w-[180px] rounded-xl border border-slate-200 bg-white p-3 text-right shadow-lg">
      <div className="text-[11px] font-black text-slate-500">{title}</div>
      <ul className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              {row.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />}
              {row.label}
            </span>
            <span className="font-black tabular-nums text-slate-900">{row.value}</span>
          </li>
        ))}
      </ul>
      {note && <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] leading-snug text-slate-500">{note}</div>}
    </div>
  );
}

// ───────────────────────── מד קשת מול מגבלה ─────────────────────────

/**
 * מד קשת: הקשת כולה היא הטווח המותר (0 עד המגבלה), האזור הנוח והאזור
 * שבו החיתום מחמיר צבועים בנפרד, והנקודה היא המקום שלכם. ערך שחורג מהמגבלה
 * מוצג בקצה הקשת עם סימון חריגה — כך גבול הרגולציה הוא תמיד הקצה של הגרף.
 */
export function LimitGauge({
  value,
  limit,
  comfort,
  status,
  label,
  unit = '%',
}: {
  value: number | null;
  limit: number;
  comfort: number;
  status: CheckStatus;
  label: string;
  unit?: string;
}) {
  const width = 330;
  const height = 152;
  const cx = width / 2;
  const cy = 132;
  const radius = 104;
  const stroke = 18;

  const clamped = value === null ? 0 : Math.max(0, Math.min(limit, value));
  const exceeds = value !== null && value > limit;

  const point = (fraction: number, r = radius) => {
    const angle = Math.PI * (1 - fraction);
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const arc = (from: number, to: number) => {
    const a = point(from);
    const b = point(to);
    const large = to - from > 0.5 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  const comfortFraction = Math.min(1, comfort / limit);
  const valueFraction = clamped / limit;
  const dot = point(valueFraction);
  const color = STATUS_COLOR[status];

  return (
    <figure className="m-0 flex flex-col items-center" aria-label={`${label}: ${value === null ? 'חסרים נתונים' : `${value.toFixed(1)}${unit}`} מתוך מגבלה של ${limit}${unit}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[330px]" role="img">
        {/* המסילה: האזור הנוח ואחריו האזור שבו החיתום מחמיר */}
        <path d={arc(0, comfortFraction)} stroke="#d1fae5" strokeWidth={stroke} fill="none" strokeLinecap="butt" />
        <path d={arc(comfortFraction, 1)} stroke="#fef3c7" strokeWidth={stroke} fill="none" strokeLinecap="butt" />
        {/* המילוי: עד הערך שלכם, בצבע הסטטוס */}
        {valueFraction > 0 && (
          <path d={arc(0, valueFraction)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="butt" />
        )}
        {/* סימון המגבלה בקצה */}
        <line
          x1={point(1, radius - stroke / 2 - 4).x}
          y1={point(1, radius - stroke / 2 - 4).y}
          x2={point(1, radius + stroke / 2 + 4).x}
          y2={point(1, radius + stroke / 2 + 4).y}
          stroke="#0f172a"
          strokeWidth={2.5}
        />
        <line
          x1={point(comfortFraction, radius - stroke / 2 - 3).x}
          y1={point(comfortFraction, radius - stroke / 2 - 3).y}
          x2={point(comfortFraction, radius + stroke / 2 + 3).x}
          y2={point(comfortFraction, radius + stroke / 2 + 3).y}
          stroke="#b45309"
          strokeWidth={2}
        />
        {value !== null && (
          <>
            <circle cx={dot.x} cy={dot.y} r={9} fill="#fff" />
            <circle cx={dot.x} cy={dot.y} r={6.5} fill={color} />
          </>
        )}
        <text x={cx} y={cy - 26} textAnchor="middle" fontSize={30} fontWeight={900} fill="#0f172a">
          {value === null ? '—' : `${value.toFixed(1)}${unit}`}
        </text>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#64748b">
          {label}
        </text>
        <text x={point(0).x} y={cy + 14} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#64748b">
          0{unit}
        </text>
        <text x={point(1).x} y={cy + 14} textAnchor="middle" fontSize={10.5} fontWeight={900} fill="#0f172a">
          {`${limit}${unit}`}
        </text>
        {comfortFraction < 0.9 && (
          <text x={point(comfortFraction, radius + 30).x} y={point(comfortFraction, radius + 30).y} textAnchor="middle" fontSize={10} fontWeight={700} fill="#b45309">
            {`${comfort}${unit}`}
          </text>
        )}
      </svg>
      {exceeds && (
        <figcaption className="-mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-700">
          <AlertTriangle className="h-3 w-3" />
          חורג מהמגבלה ב-{(value - limit).toFixed(1)}{unit}
        </figcaption>
      )}
    </figure>
  );
}

/** חלוקת מצב מול המגבלה בטקסט — המשפט שמלווה כל מד */
export function distanceToLimit(value: number | null, limit: number, unit = '%'): string {
  if (value === null || !Number.isFinite(value)) return 'חסרים נתונים לחישוב';
  const gap = limit - value;
  if (gap < 0) return `חריגה של ${Math.abs(gap).toFixed(1)}${unit} מעבר למגבלה`;
  return `נותרו ${gap.toFixed(1)}${unit} עד המגבלה`;
}

// ───────────────────────── המפל החודשי ─────────────────────────

interface WaterfallRow {
  key: CashFlowStep['key'];
  name: string;
  base: number;
  size: number;
  amount: number;
  kind: CashFlowStep['kind'];
  negative: boolean;
}

function waterfallRows(steps: CashFlowStep[]): WaterfallRow[] {
  let running = 0;
  return steps.map((step) => {
    if (step.kind === 'subtotal' || step.kind === 'result') {
      running = step.amount;
      return {
        key: step.key,
        name: step.label,
        base: Math.min(0, step.amount),
        size: Math.abs(step.amount),
        amount: step.amount,
        kind: step.kind,
        negative: step.amount < 0,
      };
    }
    const start = running;
    running += step.amount;
    return {
      key: step.key,
      name: step.label,
      base: Math.min(start, running),
      size: Math.abs(step.amount),
      amount: step.amount,
      kind: step.kind,
      negative: false,
    };
  });
}

const WATERFALL_SHORT: Record<CashFlowStep['key'], string> = {
  income: 'הכנסה נטו',
  expenses: 'הוצאות',
  loans: 'הלוואות',
  disposable: 'פנוי לפני',
  mortgage: 'משכנתא',
  remaining: 'נשאר',
};

function waterfallColor(row: WaterfallRow): string {
  if (row.kind === 'result') return row.negative ? STATUS_COLOR.fail : SERIES.remaining;
  if (row.kind === 'deduction') return SERIES.deduction;
  return SERIES.income;
}

/**
 * מפל התזרים: ההכנסה, מה שיורד ממנה, מה שנשאר לפני המשכנתא, ההחזר המשוער
 * ומה שנשאר אחריו. כל עמודה מסומנת בסכומה — כאן המספרים הם העניין.
 */
export function CashFlowWaterfall({ steps }: { steps: CashFlowStep[] }) {
  const rows = useMemo(() => waterfallRows(steps), [steps]);

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="key"
            tickFormatter={(key: CashFlowStep['key']) => WATERFALL_SHORT[key]}
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            interval={0}
          />
          <YAxis tickFormatter={compactShekel} tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as WaterfallRow | undefined;
              if (!active || !row) return null;
              return (
                <TooltipCard
                  title={row.name}
                  rows={[{ label: row.kind === 'deduction' ? 'יורד' : 'סכום', value: formatShekel(row.amount), color: waterfallColor(row) }]}
                />
              );
            }}
          />
          <Bar dataKey="base" stackId="flow" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="size" stackId="flow" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell key={row.key} fill={waterfallColor(row)} />
            ))}
            <LabelList
              dataKey="amount"
              position="top"
              formatter={(value: React.ReactNode) => compactShekel(Math.abs(Number(value)))}
              style={{ fontSize: 11, fontWeight: 800, fill: '#0f172a' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────────────────────── הכסף הפנוי לאורך השנים ─────────────────────────

interface TimelineRow extends CashFlowPoint {
  /** הרצפה של "נשאר אחרי המשכנתא" שמתחתיה יחס ההחזר חורג מהמגבלה */
  floor: number;
  hasEvent: boolean;
}

/**
 * הכסף הפנוי לאורך חיי המשכנתא: ההכנסה הפנויה לפני ההחזר ומה שנשאר אחריו,
 * עם הרצפה שנגזרת ממגבלת יחס ההחזר — הקו שמתחתיו הבנק לא היה מאשר. הלוואה
 * שמסתיימת והכנסה שגדלה מסומנות כנקודות על הקו.
 */
export function CashFlowTimeline({
  points,
  ratioLimit,
  ratioComfort,
}: {
  points: CashFlowPoint[];
  ratioLimit: number;
  ratioComfort: number;
}) {
  const rows = useMemo<TimelineRow[]>(
    () =>
      points.map((point) => ({
        ...point,
        floor: point.disposable - (ratioLimit / 100) * (point.income - point.loans),
        hasEvent: point.events.length > 0,
      })),
    [points, ratioLimit]
  );

  const eventDot = (props: { cx?: number; cy?: number; payload?: TimelineRow }) => {
    const { cx, cy, payload } = props;
    if (!payload?.hasEvent || cx === undefined || cy === undefined) return <g key={`d-${payload?.year}`} />;
    return (
      <g key={`d-${payload.year}`}>
        <circle cx={cx} cy={cy} r={7} fill="#fff" />
        <circle cx={cx} cy={cy} r={5} fill={SERIES.remaining} />
      </g>
    );
  };

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="year"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            tickFormatter={(year: number) => (year === 0 ? 'היום' : `שנה ${year}`)}
            minTickGap={24}
          />
          <YAxis tickFormatter={compactShekel} tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} />
          <ReferenceLine y={0} stroke="#0f172a" strokeWidth={1} />
          <Tooltip
            cursor={{ stroke: '#cbd5e1' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as TimelineRow | undefined;
              if (!active || !row) return null;
              const ratioText =
                row.ratio === null
                  ? 'חסרים נתונים'
                  : `${row.ratio.toFixed(1)}% מתוך ${ratioLimit}% (נוח עד ${ratioComfort}%)`;
              return (
                <TooltipCard
                  title={row.year === 0 ? 'היום' : `שנה ${row.year}`}
                  rows={[
                    { label: 'פנוי לפני המשכנתא', value: formatShekel(row.disposable), color: SERIES.income },
                    { label: 'נשאר אחרי המשכנתא', value: formatShekel(row.remaining), color: SERIES.remaining },
                    { label: 'רצפה לפי המגבלה', value: formatShekel(row.floor), color: SERIES.neutral },
                    { label: 'יחס החזר', value: ratioText },
                  ]}
                  note={row.events.length > 0 ? row.events.join(' · ') : undefined}
                />
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#475569', paddingBottom: 6 }}
          />
          <Line
            type="stepAfter"
            dataKey="disposable"
            name="פנוי לפני המשכנתא"
            stroke={SERIES.income}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="remaining"
            name="נשאר אחרי המשכנתא"
            stroke={SERIES.remaining}
            strokeWidth={2.5}
            dot={eventDot}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="floor"
            name={`הרצפה לפי מגבלת ${ratioLimit}%`}
            stroke={SERIES.neutral}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────────────────────── לוח הזמנים של התהליך ─────────────────────────

/**
 * לוח גאנט של התהליך, מימין לשמאל כמו הטקסט: כל שורה היא שלב או אבן דרך,
 * והפס מראה מתי היא מתרחשת ביחס לתחילת התהליך. השלבים בכחול, אבני הדרך
 * שבין השלבים בסגול, ואבן דרך שהפרופיל מדגיש (שמאות מוקדמת) מקבלת מסגרת.
 */
export function ProcessGantt({ items }: { items: TimelineItem[] }) {
  const totalWeeks = Math.max(1, ...items.map((item) => item.endWeek));
  // סימון כל שבועיים, והסוף — בלי שני סימונים צמודים כשמספר השבועות אי-זוגי
  const ticks = Array.from({ length: totalWeeks + 1 }, (_, week) => week).filter(
    (week) => week === totalWeeks || (week % 2 === 0 && totalWeeks - week >= 2)
  );

  return (
    <div className="w-full text-right">
      <div className="grid grid-cols-[minmax(150px,1fr)_minmax(0,2.2fr)] items-end gap-x-3 border-b border-slate-200 pb-1 text-[11px] font-bold text-slate-500 sm:grid-cols-[minmax(190px,1fr)_minmax(0,3fr)]">
        <span>שלב / אבן דרך</span>
        <div className="relative h-4">
          {ticks.map((week) => (
            <span
              key={week}
              className="absolute whitespace-nowrap tabular-nums"
              style={
                week === 0
                  ? { right: 0 }
                  : week === totalWeeks
                    ? { left: 0 }
                    : { right: `${(week / totalWeeks) * 100}%`, transform: 'translateX(50%)' }
              }
            >
              {week === 0 ? 'התחלה' : `שבוע ${week}`}
            </span>
          ))}
        </div>
      </div>
      <ol className="divide-y divide-slate-100">
        {items.map((item, index) => {
          const right = (item.startWeek / totalWeeks) * 100;
          const width = ((item.endWeek - item.startWeek) / totalWeeks) * 100;
          const isStage = item.kind === 'stage';
          const stageNumber = isStage ? items.filter((it, i) => it.kind === 'stage' && i <= index).length : null;
          return (
            <li
              key={item.id}
              className="grid grid-cols-[minmax(150px,1fr)_minmax(0,2.2fr)] items-center gap-x-3 py-2 sm:grid-cols-[minmax(190px,1fr)_minmax(0,3fr)]"
            >
              <span className="flex min-w-0 items-center gap-2 text-[12px] font-bold text-slate-800">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                  style={{ background: isStage ? SERIES.income : SERIES.milestone }}
                >
                  {stageNumber ?? '•'}
                </span>
                <span className="truncate">{item.label}</span>
                {item.emphasized && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
              </span>
              <div className="relative h-6">
                {ticks.map((week) => (
                  <span
                    key={week}
                    className="absolute inset-y-0 w-px bg-slate-100"
                    style={{ right: `${(week / totalWeeks) * 100}%` }}
                  />
                ))}
                <span
                  className={`absolute inset-y-0.5 rounded-md ${item.emphasized ? 'ring-2 ring-amber-500 ring-offset-1' : ''}`}
                  style={{
                    right: `${right}%`,
                    width: `calc(${width}% - 2px)`,
                    background: isStage ? SERIES.income : SERIES.milestone,
                    opacity: isStage ? 1 : 0.85,
                  }}
                  title={`${item.label}: ${item.duration}`}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: SERIES.income }} />שלב בפלטפורמה</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: SERIES.milestone }} />אבן דרך מחוץ לפלטפורמה</span>
        <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />מודגש לפי הפרופיל שלכם</span>
      </div>
    </div>
  );
}

// ───────────────────────── הרכב מסלולי המשכנתא ─────────────────────────

const TRACK_COLOR: Record<MixSketchItem['id'], string> = {
  fixed_unlinked: SERIES.income,
  prime: SERIES.milestone,
  variable_unlinked: SERIES.remaining,
};

function RatingDots({ level, color }: { level: 1 | 2 | 3; color: string }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: step <= level ? color : '#e2e8f0' }}
        />
      ))}
    </span>
  );
}

const RATING_TEXT: Record<1 | 2 | 3, string> = { 1: 'נמוך', 2: 'בינוני', 3: 'גבוה' };

/**
 * ההרכב הסכמטי: פס אחד שמראה את החלוקה, ולכל מסלול כרטיס עם שלושת המדדים —
 * סיכון, גמישות ועלות — כדי שהאיזון ביניהם ייקרא במבט, לא רק בטקסט.
 */
export function MixComposition({ items, mortgageAmount }: { items: MixSketchItem[]; mortgageAmount: number }) {
  return (
    <div className="space-y-4">
      <div className="flex h-9 w-full gap-0.5 overflow-hidden rounded-xl" role="img" aria-label={items.map((item) => `${item.short} ${item.share}%`).join(', ')}>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-center text-[12px] font-black text-white"
            style={{ width: `${item.share}%`, background: TRACK_COLOR[item.id] }}
          >
            {item.share >= 18 ? `${item.short} ${item.share}%` : `${item.share}%`}
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: TRACK_COLOR[item.id] }} />
              <div className="min-w-0">
                <div className="text-[13px] font-black leading-snug text-slate-900">{item.label}</div>
                <div className="text-[11px] font-bold text-slate-500">
                  כ-{item.share}% · {mortgageAmount > 0 ? formatShekel((mortgageAmount * item.share) / 100) : '—'} · ריבית להערכה {item.rate.toFixed(2)}%
                </div>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-[12px]">
              {(
                [
                  ['סיכון', item.risk, Shield],
                  ['גמישות', item.flexibility, Sparkles],
                  ['עלות', item.cost, Scale],
                ] as const
              ).map(([name, level, Icon]) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 font-bold text-slate-600">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    {name}
                  </dt>
                  <dd className="flex items-center gap-2 font-bold text-slate-700">
                    <span className="text-[11px] text-slate-500">{RATING_TEXT[level]}</span>
                    <RatingDots level={level} color={TRACK_COLOR[item.id]} />
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-600">{item.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── הסימולציה: קרן מול ריבית ─────────────────────────

/**
 * מה נלקח מול מה ישולם: שתי עמודות אופקיות — הקרן לבדה, ולצידה סך התשלומים
 * מפוצל לקרן ולריבית. הריבית היא ההפרש ביניהן, וזה המספר שהתמהיל ינסה להקטין.
 */
export function BorrowedVersusPaid({
  principal,
  interest,
}: {
  principal: number;
  interest: number;
}) {
  const rows = [
    { name: 'הסכום שנלקח', principal, interest: 0 },
    { name: 'הסכום שישולם', principal, interest },
  ];
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES.income }} />קרן — {formatShekel(principal)}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES.deduction }} />ריבית — {formatShekel(interest)}</span>
      </div>
    <div dir="ltr" className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barCategoryGap="30%">
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontWeight: 700 }} axisLine={false} tickLine={false} width={96} orientation="right" />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
              if (!active || !row) return null;
              return (
                <TooltipCard
                  title={row.name}
                  rows={[
                    { label: 'קרן', value: formatShekel(row.principal), color: SERIES.income },
                    ...(row.interest > 0 ? [{ label: 'ריבית', value: formatShekel(row.interest), color: SERIES.deduction }] : []),
                    { label: 'סך הכול', value: formatShekel(row.principal + row.interest) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="principal" name="קרן" stackId="paid" fill={SERIES.income} maxBarSize={26} isAnimationActive={false} />
          <Bar dataKey="interest" name="ריבית" stackId="paid" fill={SERIES.deduction} radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    </div>
  );
}

/** הקרן והריבית שהצטברו לאורך השנים — כמה מכל שקל ששולם הלך לאן */
export function CostOverTime({ points }: { points: CostPoint[] }) {
  return (
    <div dir="ltr" className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="year"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            tickFormatter={(year: number) => (year === 0 ? 'היום' : `שנה ${year}`)}
            minTickGap={24}
          />
          <YAxis tickFormatter={compactShekel} tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            cursor={{ stroke: '#cbd5e1' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as CostPoint | undefined;
              if (!active || !row) return null;
              return (
                <TooltipCard
                  title={row.year === 0 ? 'היום' : `אחרי ${row.year} שנים`}
                  rows={[
                    { label: 'קרן ששולמה', value: formatShekel(row.paidPrincipal), color: SERIES.income },
                    { label: 'ריבית ששולמה', value: formatShekel(row.paidInterest), color: SERIES.deduction },
                    { label: 'יתרת הקרן', value: formatShekel(row.balance), color: SERIES.neutral },
                  ]}
                />
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#475569', paddingBottom: 6 }}
          />
          <Area
            type="monotone"
            dataKey="paidPrincipal"
            name="קרן ששולמה"
            stackId="paid"
            stroke={SERIES.income}
            fill={SERIES.income}
            fillOpacity={0.14}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="paidInterest"
            name="ריבית ששולמה"
            stackId="paid"
            stroke={SERIES.deduction}
            fill={SERIES.deduction}
            fillOpacity={0.16}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line type="monotone" dataKey="balance" name="יתרת הקרן" stroke={SERIES.neutral} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export { STATUS_COLOR, STATUS_SOFT };
