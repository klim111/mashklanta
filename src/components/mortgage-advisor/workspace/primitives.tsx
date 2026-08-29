'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { NumericInput } from '@/components/ui/numeric-input';
import { formatCurrency } from '../mortgageCalculations';
import type { TrackType } from '../engine';
import { formatDuration } from '../engine';
import { PLAN_TERM_MONTHS_MAX, monthsToYears, yearsToMonths } from '@/lib/mortgage-plan';

/** תקופת מסלול בעריכה וביצירת תמהיל: שנה עד 30 שנים, כל חודש ביניים */
export const TRACK_TERM_MONTHS_MIN = 12;
export const TRACK_TERM_MONTHS_MAX = PLAN_TERM_MONTHS_MAX;

function clampTrackTermMonths(months: number): number {
  if (!Number.isFinite(months) || months <= 0) return TRACK_TERM_MONTHS_MIN;
  return Math.min(TRACK_TERM_MONTHS_MAX, Math.max(TRACK_TERM_MONTHS_MIN, Math.round(months)));
}

export const TRACK_COLORS: Record<string, string> = {
  fixed_unlinked: '#2563eb',
  fixed_linked: '#60a5fa',
  prime: '#f97316',
  variable_unlinked: '#10b981',
  variable_linked: '#34d399',
  makam: '#8b5cf6',
  dollar: '#eab308',
  euro: '#64748b',
  eligibility: '#ec4899',
  five_year_plan: '#6366f1',
  grant: '#14b8a6',
};

export function trackColor(type: TrackType): string {
  return TRACK_COLORS[type] ?? '#94a3b8';
}

export const CHART_COLORS = {
  base: '#3b82f6',
  scenario: '#f59e0b',
  worse: '#ef4444',
  better: '#10b981',
  principal: '#3b82f6',
  interest: '#ef4444',
  indexation: '#8b5cf6',
};

export function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
}

export function formatShekel(value: number): string {
  return formatCurrency(Math.round(value));
}

/** מדד יחיד בשורת ה-KPI, עם הפרש אופציונלי מול מצב הבסיס. */
export function Metric({
  label,
  value,
  delta,
  hint,
  tone = 'default',
  icon,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  tone?: 'default' | 'dark' | 'warning';
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === 'dark'
      ? 'bg-gradient-to-br from-slate-900 to-indigo-900 text-white border-transparent'
      : tone === 'warning'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-white border-slate-200';
  const labelClass = tone === 'dark' ? 'text-slate-300' : 'text-slate-500';
  const valueClass = tone === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${toneClass}`}>
      <div className={`flex items-center gap-1.5 text-[11px] ${labelClass}`}>
        {icon}
        {label}
      </div>
      <p className={`text-lg font-bold leading-tight mt-0.5 ${valueClass}`}>{value}</p>
      {delta !== undefined && <DeltaTag value={delta} />}
      {hint && <p className={`text-[10px] mt-0.5 ${labelClass}`}>{hint}</p>}
    </div>
  );
}

/** הפרש כספי מול הבסיס: אדום ביוקר, ירוק בחיסכון. */
export function DeltaTag({ value, invert = false }: { value: number; invert?: boolean }) {
  if (Math.abs(value) < 1) {
    return <span className="text-[10px] text-slate-400">ללא שינוי</span>;
  }
  const bad = invert ? value < 0 : value > 0;
  return (
    <span className={`text-[11px] font-semibold ${bad ? 'text-red-500' : 'text-emerald-500'}`}>
      {value > 0 ? '+' : '−'}
      {formatCurrency(Math.abs(Math.round(value)))}
    </span>
  );
}

/** סליידר עם תווית, ערך נוכחי וקצוות מוסברים. הסליידר תמיד LTR כדי שהכיוון יהיה אינטואיטיבי. */
export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
  minLabel,
  maxLabel,
  icon,
  valueClassName,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
  minLabel?: string;
  maxLabel?: string;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className={`text-sm font-bold ${valueClassName ?? 'text-slate-800'}`}>{display}</span>
      </div>
      <Slider
        dir="ltr"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
      {(minLabel || maxLabel) && (
        <div dir="ltr" className="flex justify-between text-[10px] text-slate-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

/** סליידר תקופה רציף בחודשים — משנה אחת עד 30, כל חודש ביניים */
export function TermMonthsSlider({
  years,
  onChange,
  label = 'תקופה',
  icon,
}: {
  years: number;
  onChange: (years: number) => void;
  label?: string;
  icon?: React.ReactNode;
}) {
  const months = clampTrackTermMonths(yearsToMonths(years));
  return (
    <SliderField
      label={label}
      icon={icon}
      value={months}
      onChange={(next) => onChange(monthsToYears(next))}
      min={TRACK_TERM_MONTHS_MIN}
      max={TRACK_TERM_MONTHS_MAX}
      step={1}
      display={formatDuration(months)}
      minLabel="שנה"
      maxLabel="30 שנים"
    />
  );
}

/**
 * הסכום במסלול בשני תת-שדות: שקלים ואחוז מסכום המשכנתא. הזנה באחד מעדכנת את
 * השני, כך שהיועץ יכול לעבוד בשפה שנוחה לו באותו רגע.
 */
export function AmountAndPercent({
  amount,
  totalAmount,
  onChange,
  disabled = false,
}: {
  amount: number;
  totalAmount: number;
  onChange: (amount: number) => void;
  disabled?: boolean;
}) {
  const percent = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-0.5">
        <FormattedNumberValueInput
          className="h-9"
          disabled={disabled}
          value={Math.round(amount)}
          onValueChange={onChange}
        />
        <p className="text-[10px] text-slate-400">סכום (₪)</p>
      </div>
      <div className="space-y-0.5">
        <NumericInput
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          value={Number(percent.toFixed(1))}
          onChange={(next) => {
            if (next === null) return;
            onChange((Math.min(100, Math.max(0, next)) / 100) * totalAmount);
          }}
          disabled={disabled}
        />
        <p className="text-[10px] text-slate-400">אחוז מהמשכנתא (%)</p>
      </div>
    </div>
  );
}

/** פס הרכב התמהיל — רצועה אחת שמראה את חלוקת הסכומים לפי מסלול. */
export function CompositionBar({
  tracks,
  height = 8,
}: {
  tracks: Array<{ id: string; type: TrackType; percentage: number; name?: string }>;
  height?: number;
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-full bg-slate-100" style={{ height }}>
      {tracks.map((track) => (
        <div
          key={track.id}
          style={{ width: `${Math.max(0, track.percentage)}%`, backgroundColor: trackColor(track.type) }}
          title={`${track.name ?? ''} ${track.percentage.toFixed(1)}%`}
        />
      ))}
    </div>
  );
}
