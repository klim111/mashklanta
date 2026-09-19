'use client';

import React from 'react';
import { AlertCircle, Check, Loader2, Lock, ShieldCheck, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldMeta } from '@/lib/principal-approval/types';
import type { SaveState } from '../CaseContext';

interface FieldShellProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  saveState: SaveState;
  provenance?: string | null;
  meta?: FieldMeta;
  readOnly?: boolean;
  readOnlyReason?: string;
  span?: 1 | 2 | 3;
  htmlFor?: string;
  children: React.ReactNode;
}

const SPAN_CLASS: Record<1 | 2 | 3, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
};

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'pending')
    return <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" title="ממתין לשמירה" />;
  if (state === 'saving') return <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />;
  if (state === 'saved')
    return <Check className="h-3.5 w-3.5 text-emerald-500" aria-label="נשמר" />;
  if (state === 'error') return <AlertCircle className="h-3.5 w-3.5 text-rose-500" aria-label="שגיאה" />;
  return null;
}

/** Label + provenance badge + validation message wrapper shared by every input. */
export function FieldShell({
  label,
  required,
  help,
  error,
  saveState,
  provenance,
  readOnly,
  readOnlyReason,
  span = 1,
  htmlFor,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', SPAN_CLASS[span])}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-slate-700 flex items-center gap-1.5"
        >
          {label}
          {required && <span className="text-rose-500" aria-hidden>*</span>}
          {readOnly && (
            <Lock className="h-3 w-3 text-slate-400" aria-label={readOnlyReason ?? 'לקריאה בלבד'} />
          )}
        </label>
        <div className="flex items-center gap-1.5">
          {provenance && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                provenance.includes('יועץ')
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                  : provenance.includes('פרופיל')
                    ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
              )}
            >
              {provenance.includes('יועץ') ? (
                <UserCog className="h-2.5 w-2.5" />
              ) : (
                <ShieldCheck className="h-2.5 w-2.5" />
              )}
              {provenance}
            </span>
          )}
          <SaveIndicator state={saveState} />
        </div>
      </div>

      {children}

      {error ? (
        <p className="text-[11px] text-rose-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : help ? (
        <p className="text-[11px] text-slate-400">{help}</p>
      ) : null}

      {readOnly && readOnlyReason && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1">
          <Lock className="h-3 w-3 shrink-0" />
          {readOnlyReason}
        </p>
      )}
    </div>
  );
}

export const inputClass = (state: { error?: string; readOnly?: boolean }) =>
  cn(
    'h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 shadow-sm transition-all',
    'placeholder:text-slate-300 focus:outline-none focus:ring-4',
    state.error
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-50',
    state.readOnly && 'bg-slate-50 text-slate-500 cursor-not-allowed',
  );
