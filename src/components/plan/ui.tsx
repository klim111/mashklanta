'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

export function formatShekel(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

const fieldShell =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
        {label}
        {hint && (
          <span className="group/hint relative inline-flex">
            <Info className="h-3.5 w-3.5 text-slate-300" />
            <span className="pointer-events-none absolute bottom-full right-1/2 z-20 mb-1.5 w-56 translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-medium leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover/hint:opacity-100">
              {hint}
            </span>
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/**
 * שדה מספרי עם פסיקי אלפים. הערך נשמר כמספר או כ-null, כדי ששדה ריק יישאר ריק
 * ולא ייחשב אפס — ההבדל חשוב, כי אפס הכנסה ואי-הזנת הכנסה הם דברים שונים.
 */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  suffix,
  placeholder,
  max,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix?: string;
  placeholder?: string;
  max?: number;
}) {
  const id = useId();
  const display = value === null ? '' : value.toLocaleString('he-IL');

  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          dir="ltr"
          className={`${fieldShell} text-right ${suffix ? 'pl-10' : ''}`}
          value={display}
          placeholder={placeholder}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d.]/g, '');
            if (digits === '') return onChange(null);
            const parsed = Number(digits);
            if (!Number.isFinite(parsed)) return;
            onChange(max !== undefined ? Math.min(parsed, max) : parsed);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        className={fieldShell}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T | null;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        className={`${fieldShell} cursor-pointer`}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value as T)}
      >
        <option value="" disabled>
          בחרו…
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        type="date"
        className={`${fieldShell} cursor-pointer`}
        value={value ? value.slice(0, 10) : ''}
        onChange={(event) => onChange(event.target.value || null)}
      />
    </Field>
  );
}

/** בורר בין שתי אפשרויות או יותר, עם גלולה נעה שמסמנת את הבחירה */
export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <Field label={label}>
      <div className="flex rounded-xl bg-slate-100 p-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`relative z-0 flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                selected ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {selected && (
                <motion.span
                  layoutId={`segment-${name}`}
                  className="absolute inset-0 -z-10 rounded-lg bg-slate-900"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export type MetricTone = 'default' | 'good' | 'warn' | 'bad';

const metricTone: Record<MetricTone, string> = {
  default: 'border-slate-200 bg-white',
  good: 'border-emerald-200 bg-emerald-50/70',
  warn: 'border-amber-200 bg-amber-50/70',
  bad: 'border-rose-200 bg-rose-50/70',
};

const metricValueTone: Record<MetricTone, string> = {
  default: 'text-slate-900',
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  bad: 'text-rose-700',
};

export function Metric({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string;
  value: string;
  note?: string;
  tone?: MetricTone;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${metricTone[tone]}`}>
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-black tabular-nums ${metricValueTone[tone]}`}>{value}</div>
      {note && <div className="mt-1 text-[11px] leading-snug text-slate-500">{note}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
