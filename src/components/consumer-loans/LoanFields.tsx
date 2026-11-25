'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { NumericInput } from '@/components/ui/numeric-input';

/**
 * שורת פרמטר אחת בכלי ההלוואות: תווית, שדה הזנה וסליידר — באותה שורה,
 * והשדה והסליידר בעמודות ברוחב שווה. כל השורות בכלי משתמשות באותה רשת, ולכן
 * השדות והסליידרים של כל הפרמטרים מיושרים זה מתחת לזה.
 *
 * ערך ריק (null) הוא מצב לגיטימי: הלוואה חדשה נפתחת בלי ערכים, השדה מוצג ריק
 * והסליידר עומד בתחילתו בצבע דהוי, עד שהלקוח מזין ערך או מזיז אותו.
 */
export function ParamRow({
  icon: Icon,
  label,
  info,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  integer = true,
  placeholder,
  disabled = false,
  clampInput = false,
}: {
  icon?: React.ElementType;
  label: string;
  /** כפתור הסבר שמוצג ליד התווית — סימן הקריאה של ריביות בנק ישראל */
  info?: React.ReactNode;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  integer?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** השדה לא מקבל ערך מעל max — מה שמוקלד מעליו מוחלף ב-max */
  clampInput?: boolean;
}) {
  const empty = value === null;
  const sliderValue = empty ? min : Math.min(Math.max(value, min), max);

  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
      <div className="flex min-w-0 items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <span className="truncate text-2xs font-bold text-slate-600">{label}</span>
        {info}
      </div>

      <label
        className={`flex h-8 min-w-0 items-center gap-1 rounded-lg border bg-white px-2 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 ${
          empty ? 'border-dashed border-slate-300' : 'border-slate-200'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <NumericInput
          integer={integer}
          value={value}
          disabled={disabled}
          {...(clampInput ? { max, clampDraftToMax: true } : {})}
          onChange={(next) => onChange(next === null ? null : Math.max(0, next))}
          placeholder={placeholder ?? 'הזינו'}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
        <span className="shrink-0 text-2xs text-slate-400">{suffix}</span>
      </label>

      <div dir="ltr" className={`min-w-0 px-1 ${empty ? 'opacity-40' : ''}`}>
        <Slider
          dir="ltr"
          value={[sliderValue]}
          disabled={disabled}
          onValueChange={([next]) => onChange(integer ? Math.round(next) : Math.round(next * 100) / 100)}
          min={min}
          max={max}
          step={step}
          aria-label={`${label} — סליידר`}
        />
      </div>
    </div>
  );
}

/** תאריך YYYY-MM-DD בתצוגה ישראלית: 15/03/2026 */
export function formatDateIL(value: string | undefined | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

/**
 * שורת התאריכים של ההלוואה — רשות: תאריך הלקיחה ויום התשלום בחודש, באותה
 * רשת של שורות הפרמטרים. כשהם מוזנים לכל תשלום יש תאריך, ואפשר לבחור פירעון
 * מוקדם לפי תאריך.
 */
export function LoanDatesRow({
  icon: Icon,
  startDate,
  paymentDay,
  onChange,
}: {
  icon?: React.ElementType;
  startDate?: string;
  paymentDay?: number;
  onChange: (next: { startDate?: string; paymentDay?: number }) => void;
}) {
  const fieldClass = (empty: boolean) =>
    `flex h-8 min-w-0 items-center gap-1 rounded-lg border bg-white px-2 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 ${
      empty ? 'border-dashed border-slate-300' : 'border-slate-200'
    }`;
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
      <div className="flex min-w-0 items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <span className="truncate text-2xs font-bold text-slate-600">
          תאריכים <span className="font-normal text-slate-400">(רשות)</span>
        </span>
      </div>
      <label className={fieldClass(!startDate)} title="תאריך לקיחת ההלוואה">
        <span className="shrink-0 text-2xs text-slate-400">לקיחה</span>
        <input
          type="date"
          value={startDate ?? ''}
          onChange={(event) => onChange({ startDate: event.target.value || undefined, paymentDay })}
          aria-label="תאריך לקיחת ההלוואה"
          className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none"
        />
      </label>
      <label className={fieldClass(!paymentDay)} title="היום בחודש שבו יורד התשלום">
        <span className="shrink-0 text-2xs text-slate-400">יום תשלום</span>
        <NumericInput
          integer
          value={paymentDay ?? null}
          max={31}
          clampDraftToMax
          onChange={(next) =>
            onChange({ startDate, paymentDay: next === null || next < 1 ? undefined : Math.min(next, 31) })
          }
          placeholder="1–31"
          aria-label="יום התשלום בחודש"
          className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
      </label>
    </div>
  );
}

/** ערך בתיבת תוצאה — מקף כשאין עדיין נתונים */
export function valueOrDash(ready: boolean, value: string): string {
  return ready ? value : '—';
}
