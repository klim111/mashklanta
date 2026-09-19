'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { AlertTriangle, Scale, Shield, Sparkles, TrendingUp } from 'lucide-react';
import type {
  CashFlowPoint,
  CashFlowStep,
  CheckStatus,
  MixTrackGuide,
  TimelineItem,
} from '@/lib/profile-report';
import { formatShekel } from '../../ui';

/**
 * הגרפים של דוח הפרופיל.
 *
 * צבעי הסדרות קבועים לפי מה שהם מייצגים, ולא לפי הסדר: כחול הוא תמיד הכסף
 * שנכנס, ענבר תמיד מה שיורד ממנו, ירוק-כחלחל תמיד מה שנשאר, וסגול תמיד אבן
 * דרך בתהליך. צבעי הסטטוס (ירוק / ענבר / אדום) שמורים למצב מול המגבלה בלבד.
 * הפלטה נבדקה לעיוורון צבעים, ולכל גרף יש גם טבלה או כיתוב שנותן את אותו
 * מידע בלי צבע.
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
  /*
    כל הקשתות כאן נמתחות על חצי מעגל לכל היותר, ולכן large-arc-flag הוא תמיד
    0. ערך 1 היה מצייר את הקשת המשלימה — על מעגל אחר — והיא נראית כקו מעוקם
    שאינו יושב על הטבעת.
  */
  const arc = (from: number, to: number) => {
    const a = point(from);
    const b = point(to);
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`;
  };

  const comfortFraction = Math.min(1, comfort / limit);
  const valueFraction = clamped / limit;
  const dot = point(valueFraction);
  const color = STATUS_COLOR[status];

  return (
    <figure
      className="m-0 flex flex-col items-center"
      aria-label={`${label}: ${value === null ? 'חסרים נתונים' : `${value.toFixed(1)}${unit}`} מתוך מגבלה של ${limit}${unit}`}
    >
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
          <text
            x={point(comfortFraction, radius + 30).x}
            y={point(comfortFraction, radius + 30).y}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#b45309"
          >
            {`${comfort}${unit}`}
          </text>
        )}
      </svg>
      {exceeds && (
        <figcaption className="-mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-700">
          <AlertTriangle className="h-3 w-3" />
          חורג מהמגבלה ב-{(value - limit).toFixed(1)}
          {unit}
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

// ───────────────────────── התזרים החודשי ─────────────────────────

interface FlowRow {
  key: CashFlowStep['key'];
  name: string;
  short: string;
  /** חיובי — הכנסה, סכום ביניים ומה שנשאר; שלילי — מה שיורד מההכנסה */
  amount: number;
  kind: CashFlowStep['kind'];
}

const FLOW_SHORT: Record<CashFlowStep['key'], string> = {
  income: 'הכנסה נטו',
  expenses: 'הוצאות',
  loans: 'הלוואות',
  disposable: 'פנוי לפני',
  mortgage: 'משכנתא',
  remaining: 'נשאר',
};

function flowColor(row: FlowRow): string {
  if (row.kind === 'deduction') return SERIES.deduction;
  if (row.kind === 'result') return row.amount < 0 ? STATUS_COLOR.fail : SERIES.remaining;
  return SERIES.income;
}

/**
 * סולם עגול לציר הערכים.
 *
 * מרווח מעל העמודה הגבוהה ומתחת לנמוכה, כדי שתווית לא תיפול על הציר, ואז
 * עיגול לצעד נוח (1 / 2 / 2.5 / 5 / 10 כפול חזקה של עשר) כדי שהסימונים יהיו
 * מספרים שאפשר לקרוא.
 */
function niceScale(min: number, max: number): { domain: [number, number]; ticks: number[] } {
  const top0 = Math.max(0, max) * 1.06;
  const bottom0 = Math.min(0, min) * 1.4;
  const span = top0 - bottom0;
  if (!Number.isFinite(span) || span < 1) return { domain: [0, 1000], ticks: [0, 500, 1000] };

  const magnitude = Math.pow(10, Math.floor(Math.log10(span / 5)));
  const step =
    [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => span / candidate <= 6) ??
    10 * magnitude;
  const top = Math.ceil(top0 / step) * step;
  const bottom = Math.floor(bottom0 / step) * step;

  const ticks: number[] = [];
  for (let value = bottom; value <= top + step / 2; value += step) ticks.push(Math.round(value));
  return { domain: [bottom, top], ticks };
}

/** מלבן עם עיגול בשני קודקודים בלבד — הקצה שבו נגמר הערך */
function roundedBar(x: number, y: number, width: number, height: number, roundTop: boolean): string {
  const r = Math.max(0, Math.min(4, width / 2, height));
  if (roundTop) {
    return `M${x},${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} H${x} Z`;
  }
  return `M${x},${y} H${x + width} V${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} H${x + r} Q${x},${y + height} ${x},${y + height - r} Z`;
}

/**
 * עמודה אחת בתזרים: עולה מעל קו האפס כשהיא מוסיפה, ויורדת מתחתיו כשהיא
 * מורידה. הקצה שבו נגמר הערך מעוגל, והקצה שיושב על קו האפס נשאר ישר.
 */
function FlowBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: FlowRow;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload || width <= 0) return null;
  // בערך שלילי ‎recharts‎ מחזיר גובה שלילי מנקודת הערך; מנרמלים לקצה העליון
  const top = Math.min(y, y + height);
  return (
    <path d={roundedBar(x, top, width, Math.abs(height), payload.amount >= 0)} fill={flowColor(payload)} />
  );
}

/**
 * תווית הערך של עמודה, ממוקמת מהמלבן עצמו.
 *
 * ‎recharts‎ מודד את המיקומים המובנים מקצה המלבן העליון, ולכן עמודה שיורדת
 * מתחת לקו האפס הייתה מקבלת את התווית שלה דווקא על הקו. כאן היא נגזרת מגובה
 * המלבן: מעליו לעמודה שעולה, מתחתיו לעמודה שיורדת.
 */
function FlowValueLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | string;
}) {
  const { x, y, width, height, value } = props;
  if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return null;
  const up = amount >= 0;
  const top = Math.min(y, y + height);
  return (
    <text
      x={x + width / 2}
      y={up ? top - 7 : top + Math.abs(height) + 14}
      textAnchor="middle"
      fontSize={11}
      fontWeight={800}
      fill={up ? '#0f172a' : '#b45309'}
    >
      {compactShekel(amount)}
    </text>
  );
}

/**
 * התזרים החודשי: מה נכנס מעל הקו, מה יורד מתחתיו.
 *
 * ההכנסה, ההכנסה הפנויה ומה שנשאר מוצגים כעמודות חיוביות; ההוצאות, ההלוואות
 * והחזר המשכנתא יורדים מתחת לציר, כי הם מקטינים את אותו סכום. שורה שערכה
 * אפס אינה מצוירת — עמודה בגובה אפס רק מבלבלת.
 */
export function CashFlowWaterfall({ steps }: { steps: CashFlowStep[] }) {
  const rows = useMemo<FlowRow[]>(
    () =>
      steps
        .filter((step) => step.kind !== 'deduction' || step.amount !== 0)
        .map((step) => ({
          key: step.key,
          name: step.label,
          short: FLOW_SHORT[step.key],
          amount: step.amount,
          kind: step.kind,
        })),
    [steps]
  );

  const scale = useMemo(
    () =>
      niceScale(
        Math.min(0, ...rows.map((row) => row.amount)),
        Math.max(0, ...rows.map((row) => row.amount))
      ),
    [rows]
  );

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 22, right: 8, left: 8, bottom: 16 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="short"
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={compactShekel}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={scale.domain}
            ticks={scale.ticks}
          />
          <ReferenceLine y={0} stroke="#0f172a" strokeWidth={1.5} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as FlowRow | undefined;
              if (!active || !row) return null;
              return (
                <TooltipCard
                  title={row.name}
                  rows={[
                    {
                      label: row.kind === 'deduction' ? 'יורד מההכנסה' : 'סכום',
                      value: formatShekel(Math.abs(row.amount)),
                      color: flowColor(row),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="amount" maxBarSize={44} shape={<FlowBar />} isAnimationActive={false}>
            <LabelList dataKey="amount" content={<FlowValueLabel />} />
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
 * שמלוות אותם בסגול, ואבן דרך שהפרופיל מדגיש (שמאות מוקדמת) מקבלת מסגרת.
 */
export function ProcessGantt({ items }: { items: TimelineItem[] }) {
  const totalWeeks = Math.max(1, ...items.map((item) => item.endWeek));
  const lastTick = Math.ceil(totalWeeks);
  // סימון כל שבועיים, והסוף — בלי שני סימונים צמודים כשהמספר אי-זוגי
  const ticks = Array.from({ length: lastTick + 1 }, (_, week) => week).filter(
    (week) => week === lastTick || (week % 2 === 0 && lastTick - week >= 2)
  );

  let stageNumber = 0;

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
                  : week === lastTick
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
        {items.map((item) => {
          const isStage = item.kind === 'stage';
          if (isStage) stageNumber += 1;
          const right = (item.startWeek / totalWeeks) * 100;
          // פריט של ימים בודדים עדיין צריך להיראות על הלוח
          const width = Math.max(((item.endWeek - item.startWeek) / totalWeeks) * 100, 2.5);
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
                  {isStage ? stageNumber : '•'}
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
                  title={`${item.label}: ${item.when}`}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: SERIES.income }} />
          שלב בפלטפורמה
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: SERIES.milestone }} />
          אבן דרך מחוץ לפלטפורמה
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          מודגש לפי הפרופיל שלכם
        </span>
      </div>
    </div>
  );
}

// ───────────────────────── מסלולי המשכנתא ─────────────────────────

const RATING_TEXT: Record<1 | 2 | 3, string> = { 1: 'נמוך', 2: 'בינוני', 3: 'גבוה' };

function RatingDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: step <= level ? SERIES.remaining : '#e2e8f0' }}
        />
      ))}
    </span>
  );
}

/**
 * מסלולי המשכנתא, כתיאור סכמטי.
 *
 * בלי סכומים ובלי אחוזים — הם ייקבעו בשלב התמהיל. לכל מסלול שלושת המדדים
 * שמאזנים זה את זה (סיכון, גמישות, עלות) והסבר מתי האיזון הזה מצדיק לכלול
 * אותו. מסלול צמוד מדד מסומן בנפרד, כי הסיכון שלו אינו בהחזר אלא בקרן.
 */
export function MixTracks({ tracks }: { tracks: MixTrackGuide[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tracks.map((track) => (
        <article key={track.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-[13px] font-black leading-snug text-slate-900">{track.label}</h5>
            {track.linked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                <TrendingUp className="h-3 w-3" />
                צמוד מדד
              </span>
            )}
          </div>

          <dl className="mt-3 space-y-1.5 text-[12px]">
            {(
              [
                ['סיכון', track.risk, Shield],
                ['גמישות', track.flexibility, Sparkles],
                ['עלות', track.cost, Scale],
              ] as const
            ).map(([name, level, Icon]) => (
              <div key={name} className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 font-bold text-slate-600">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  {name}
                </dt>
                <dd className="flex items-center gap-2 font-bold text-slate-700">
                  <span className="text-[11px] text-slate-500">{RATING_TEXT[level]}</span>
                  <RatingDots level={level} />
                </dd>
              </div>
            ))}
          </dl>

          <p className="mb-3 mt-3 text-[12px] leading-relaxed text-slate-600">{track.role}</p>

          {track.linked && (
            <p className="mt-auto rounded-xl bg-amber-50 px-3 py-2 pt-2 text-[11px] font-bold leading-relaxed text-amber-900">
              סיכון מיוחד למסלול צמוד: הקרן עצמה משתנה יחד עם האינפלציה במשק, ולא רק ההחזר החודשי —
              היתרה לתשלום יכולה לגדול גם אחרי שנים של תשלומים.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

export { STATUS_COLOR };
