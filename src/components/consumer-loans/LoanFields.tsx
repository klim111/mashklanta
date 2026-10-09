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

/** ערך בתיבת תוצאה — מקף כשאין עדיין נתונים */
export function valueOrDash(ready: boolean, value: string): string {
  return ready ? value : '—';
}
