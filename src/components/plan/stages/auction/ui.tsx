'use client';

import React from 'react';

/**
 * התצוגה של שלב התמחור.
 *
 * כל הכותרות, הכיתובים והכפתורים בשלב הזה ממורכזים ובפונט קריא ומודגש. הסיבה
 * מעשית: המסך הזה הוא רצף של אזורים שכל אחד מהם מציג מספרים, ובלי עיגון אחיד
 * במרכז ובלי ניגודיות ברורה העין לא מוצאת איפה אזור אחד נגמר והשני מתחיל.
 * הטקסטים הקטנים והאפורים שהיו כאן קודם היו קשים לקריאה בדיוק במקום שבו
 * מתקבלת ההחלטה היקרה ביותר בתהליך.
 */

export function StagePanel({
  title,
  description,
  badge,
  children,
  tone = 'default',
}: {
  title: string;
  description?: string;
  /** תג קצר מעל הכותרת — מספר השלב באזור, מצב, או ספירה */
  badge?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'locked' | 'accent';
}) {
  const border =
    tone === 'locked'
      ? 'border-slate-300'
      : tone === 'accent'
        ? 'border-emerald-300'
        : 'border-slate-200';

  return (
    <section className={`rounded-3xl border-2 bg-white p-5 shadow-sm md:p-6 ${border}`}>
      <header className="mb-5 text-center">
        {badge && <div className="mb-2 flex justify-center">{badge}</div>}
        <h3 className="text-xl font-black text-slate-900 md:text-2xl">{title}</h3>
        {description && (
          <p className="mx-auto mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

/** תג קצר מעל כותרת האזור */
export function PanelBadge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'violet' | 'amber';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-900 text-white',
    emerald: 'bg-emerald-600 text-white',
    violet: 'bg-violet-600 text-white',
    amber: 'bg-amber-500 text-white',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** מספר בודד עם תווית — ממורכז, בפונט גדול וברור */
export function StageStat({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const valueTone =
    tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-slate-900';
  const box =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50/70'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50/70'
        : 'border-slate-200 bg-slate-50/70';

  return (
    <div className={`rounded-2xl border p-3 text-center ${box}`}>
      <div className="text-xs font-bold text-slate-600">{label}</div>
      <div className={`mt-1 text-xl font-black tabular-nums ${valueTone}`}>{value}</div>
      {note && <div className="mt-1 text-xs font-medium leading-snug text-slate-600">{note}</div>}
    </div>
  );
}

/** הודעה כשאין עדיין מה להציג באזור */
export function StageEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center text-sm font-semibold leading-relaxed text-slate-600">
      {children}
    </div>
  );
}

/** כותרת משנה בתוך אזור */
export function StageSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-center text-base font-black text-slate-800 md:text-lg">{children}</h4>
  );
}
