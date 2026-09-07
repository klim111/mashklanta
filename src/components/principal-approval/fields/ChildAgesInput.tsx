'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChildAgesInputProps {
  /** Number of children declared — the number of age boxes rendered. */
  count: number;
  value: number[];
  onChange: (value: number[]) => void;
  readOnly?: boolean;
}

/** One small age box per child, kept in step with "מספר ילדים מתחת לגיל 21". */
export function ChildAgesInput({ count, value, onChange, readOnly }: ChildAgesInputProps) {
  const ages: (number | null)[] = Array.from({ length: Math.max(count, 0) }, (_, i) => value?.[i] ?? null);

  const setAge = (index: number, raw: string) => {
    const next: (number | null)[] = [...ages];
    const digits = raw.replace(/\D/g, '');
    next[index] = digits === '' ? null : Math.min(Math.max(Number(digits), 0), 20);
    onChange(next.filter((v): v is number => v !== null));
  };

  if (count <= 0) {
    return <p className="text-xs text-slate-400">לא הוזנו ילדים מתחת לגיל 21</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ages.map((age, index) => (
        <div key={index} className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400">ילד {index + 1}</span>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            readOnly={readOnly}
            disabled={readOnly}
            value={age ?? ''}
            onChange={(e) => setAge(index, e.target.value)}
            className={cn(
              'h-9 w-14 rounded-lg border border-slate-200 bg-white text-center text-sm shadow-sm',
              'focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-50',
              readOnly && 'bg-slate-50 text-slate-500',
            )}
            placeholder="גיל"
          />
        </div>
      ))}
    </div>
  );
}

/** Stepper used for the children count itself. */
export function CountStepper({
  value,
  onChange,
  readOnly,
  min = 0,
  max = 20,
}: {
  value: number | null;
  onChange: (value: number) => void;
  readOnly?: boolean;
  min?: number;
  max?: number;
}) {
  const current = value ?? 0;
  return (
    <div className="flex h-10 w-32 items-center justify-between rounded-xl border border-slate-200 bg-white px-1 shadow-sm">
      <button
        type="button"
        disabled={readOnly || current <= min}
        onClick={() => onChange(Math.max(min, current - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
        aria-label="הפחת"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="text-sm font-semibold text-slate-800">{current}</span>
      <button
        type="button"
        disabled={readOnly || current >= max}
        onClick={() => onChange(Math.min(max, current + 1))}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
        aria-label="הוסף"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
