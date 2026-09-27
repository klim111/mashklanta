'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * ערכת ההדגמה של הפלטפורמה.
 *
 * המסכים שמוצגים בעמוד הבית הם שחזור נאמן של המסכים האמיתיים — אותו פריסה,
 * אותם צבעים, אותן כותרות ואותם מספרים שהלקוח רואה באזור האישי, בשלבים
 * ובכלים. הם נבנים מרכיבי ה-UI שכאן, מצוירים על קנבס ברוחב קבוע ומוקטנים
 * לרוחב המכל — כך הם נראים כמו צילום מסך חד בכל גודל מסך, בלי תמונות כבדות
 * שמתיישנות בכל שינוי בממשק.
 */

/** רוחב הקנבס שעליו כל המסכים מצוירים. ההקטנה נעשית מולו */
export const DEMO_CANVAS_WIDTH = 1180;
export const DEMO_CANVAS_HEIGHT = 720;

/**
 * מסגרת חלון דפדפן שמקטינה את הקנבס לרוחב המכל.
 * `chrome={false}` — בלי סרגל הדפדפן, כשצריך רק את המסך עצמו.
 */
export function DemoWindow({
  url = 'mashklanta.co.il/dashboard',
  children,
  className = '',
  chrome = true,
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
  chrome?: boolean;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;

    const measure = () => setScale(element.clientWidth / DEMO_CANVAS_WIDTH);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-300/70 bg-white shadow-2xl ${className}`}
    >
      {chrome && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span
            dir="ltr"
            className="mx-auto max-w-[70%] truncate rounded-md bg-white px-3 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200"
          >
            {url}
          </span>
        </div>
      )}

      <div ref={holder} className="relative w-full overflow-hidden">
        <div style={{ paddingTop: `${(DEMO_CANVAS_HEIGHT / DEMO_CANVAS_WIDTH) * 100}%` }} />
        <div
          className="absolute right-0 top-0 origin-top-right"
          style={{
            width: DEMO_CANVAS_WIDTH,
            height: DEMO_CANVAS_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* רכיבי בסיס — אותה שפה עיצובית של הממשק עצמו                         */
/* ------------------------------------------------------------------ */

/** כרטיס לבן עם כותרת ואייקון — `DashCard` של האזור האישי */
export function DemoCard({
  title,
  icon,
  action,
  children,
  className = '',
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <header className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-[13px] font-black text-slate-900">{title}</h3>
        {action && <div className="mr-auto">{action}</div>}
      </header>
      {children}
    </section>
  );
}

const TILE_TONES = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-white text-slate-700',
} as const;

export type DemoTone = keyof typeof TILE_TONES;

/** אריח מדד — `KpiTile` של הסקירה */
export function DemoKpi({
  icon,
  tone = 'slate',
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone?: DemoTone;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={`rounded-2xl border p-2.5 ${TILE_TONES[tone]}`}>
      <div className="flex items-center gap-1.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/70">{icon}</span>
        <span className="text-[11px] font-bold">{label}</span>
      </div>
      <p className="mt-1.5 text-[19px] font-black leading-none text-slate-900">{value}</p>
      <p className="mt-1 text-[10.5px] leading-tight text-slate-500">{hint}</p>
    </div>
  );
}

/** מדד קטן בשורת תוצאות — התא של הדאשבורדים בכלים */
export function DemoStat({
  label,
  value,
  delta,
  emphasized = false,
}: {
  label: string;
  value: string;
  delta?: { text: string; good: boolean };
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p
        className={`truncate font-black leading-tight ${
          emphasized ? 'text-[16px] text-blue-700' : 'text-[13px] text-slate-900'
        }`}
      >
        {value}
      </p>
      {delta && (
        <p className={`text-[10px] font-bold ${delta.good ? 'text-emerald-600' : 'text-rose-600'}`}>
          {delta.text}
        </p>
      )}
    </div>
  );
}

/** שורת מכוון — כמו בפאנלים של הכלים */
export function DemoSlider({
  label,
  value,
  fill,
  min,
  max,
  tone = 'blue',
}: {
  label: string;
  value: string;
  /** מיקום הידית באחוזים */
  fill: number;
  min?: string;
  max?: string;
  tone?: 'blue' | 'violet' | 'emerald' | 'amber';
}) {
  const tones = {
    blue: 'bg-blue-600',
    violet: 'bg-violet-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
  } as const;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-600">{label}</span>
        <span className="mr-auto text-[12px] font-black text-slate-900">{value}</span>
      </div>
      <div dir="ltr" className="relative h-2 rounded-full bg-slate-200">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${tones[tone]}`}
          style={{ width: `${fill}%` }}
        />
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-white shadow"
          style={{ left: `${fill}%` }}
        />
      </div>
      {(min || max) && (
        <div dir="ltr" className="mt-0.5 flex justify-between text-[9px] text-slate-400">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

/** פס הרכב — מקטעים צבעוניים עם מקרא, כמו בתמהיל ובתיק ההלוואות */
export function DemoComposition({
  segments,
  height = 22,
}: {
  segments: { label: string; share: number; color: string; note?: string }[];
  height?: number;
}) {
  return (
    <div>
      <div
        className="flex overflow-hidden rounded-lg border border-slate-200"
        style={{ height }}
      >
        {segments.map((segment) => (
          <span
            key={segment.label}
            style={{ width: `${segment.share}%`, backgroundColor: segment.color }}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map((segment) => (
          <span key={segment.label} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label} · {segment.share}%{segment.note ? ` · ${segment.note}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** שורת מסמך / משימה עם סימון */
export function DemoCheckRow({
  label,
  hint,
  state = 'done',
}: {
  label: string;
  hint?: string;
  state?: 'done' | 'open' | 'progress';
}) {
  const tones = {
    done: { box: 'bg-emerald-500 text-white', text: 'text-slate-700', mark: '✓' },
    progress: { box: 'bg-amber-400 text-white', text: 'text-slate-700', mark: '•' },
    open: { box: 'bg-slate-200 text-slate-400', text: 'text-slate-500', mark: '' },
  } as const;
  const tone = tones[state];

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${tone.box}`}
      >
        {tone.mark}
      </span>
      <span className={`text-[11.5px] font-bold ${tone.text}`}>{label}</span>
      {hint && <span className="mr-auto text-[10px] text-slate-400">{hint}</span>}
    </div>
  );
}

/** גרף עמודות קטן */
export function DemoBars({
  values,
  colors,
  height = 70,
  labels,
}: {
  values: number[];
  colors: string[];
  height?: number;
  labels?: string[];
}) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {values.map((value, index) => (
          <span
            key={index}
            className="flex-1 rounded-t"
            style={{
              height: `${(value / max) * 100}%`,
              backgroundColor: colors[index % colors.length],
            }}
          />
        ))}
      </div>
      {labels && (
        <div className="mt-1 flex gap-1.5">
          {labels.map((label) => (
            <span key={label} className="flex-1 text-center text-[9px] text-slate-400">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** עקומת ירידת יתרה — שני קווים להשוואה */
export function DemoCurve({
  height = 90,
  scenario = true,
}: {
  height?: number;
  scenario?: boolean;
}) {
  return (
    <svg viewBox="0 0 320 100" style={{ height }} className="w-full">
      <defs>
        <linearGradient id="demo-curve-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d="M8,14 C90,30 150,52 200,68 C245,82 285,90 312,94 L312,98 L8,98 Z" fill="url(#demo-curve-fill)" />
      <path
        d="M8,14 C90,30 150,52 200,68 C245,82 285,90 312,94"
        fill="none"
        stroke="#2563eb"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {scenario && (
        <path
          d="M8,14 C80,24 140,40 190,56 C235,70 280,80 312,84"
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
      )}
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="8" y1={y} x2="312" y2={y} stroke="#e2e8f0" strokeWidth="1" />
      ))}
    </svg>
  );
}

/** תגית קטנה */
export function DemoPill({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: DemoTone | 'dark';
}) {
  const tones: Record<string, string> = {
    ...TILE_TONES,
    dark: 'border-transparent bg-slate-900 text-white',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-black ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** טבלה קומפקטית */
export function DemoTable({
  head,
  rows,
  highlight,
}: {
  head: string[];
  rows: React.ReactNode[][];
  /** אינדקס השורה המודגשת */
  highlight?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-[11.5px]">
        <thead className="bg-slate-50 text-[10px] font-bold text-slate-500">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="p-1.5 text-right font-bold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-t border-slate-100 ${
                rowIndex === highlight ? 'bg-emerald-50/70' : 'bg-white'
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-1.5 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
