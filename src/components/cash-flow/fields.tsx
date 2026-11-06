'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { NumericInput } from '@/components/ui/numeric-input';

export const SHEKEL = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : `₪${Math.round(value).toLocaleString('he-IL')}`;

export const PERCENT = (ratio: number | null | undefined, digits = 1) =>
  ratio === null || ratio === undefined || !Number.isFinite(ratio) ? '—' : `${(ratio * 100).toFixed(digits)}%`;

/**
 * שדה מספר קומפקטי לשורות הכלי: תווית קטנה מעל, יחידה בתוך השדה. `tone`
 * מסמן את השדה שמחושב מהאחרים, כדי שיהיה ברור מה הלקוח קובע ומה יוצא.
 */
export function MiniNumber({
  label,
  value,
  onChange,
  suffix,
  integer = true,
  placeholder,
  tone = 'input',
  className = '',
}: {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix?: string;
  integer?: boolean;
  placeholder?: string;
  tone?: 'input' | 'result';
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`block min-w-0 ${className}`}>
      {label && <span className="mb-1 block truncate text-2xs font-bold text-slate-500">{label}</span>}
      <span className="relative block">
        <NumericInput
          id={id}
          integer={integer}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-xl border px-3 py-2 text-sm font-bold tabular-nums outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
            suffix ? 'pl-8' : ''
          } ${
            tone === 'result'
              ? 'border-blue-200 bg-blue-50 text-blue-800'
              : 'border-slate-200 bg-white text-slate-900'
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function ToolPanel({
  title,
  icon,
  action,
  children,
  className = '',
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
          {icon}
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}
