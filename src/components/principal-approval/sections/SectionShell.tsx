'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  progress,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  progress?: { filled: number; total: number };
  action?: React.ReactNode;
}) {
  const ratio = progress && progress.total > 0 ? progress.filled / progress.total : null;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {ratio !== null && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  ratio === 1 ? 'bg-emerald-500' : 'bg-indigo-500',
                )}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {progress!.filled}/{progress!.total}
            </span>
          </div>
        )}
        {action}
      </div>
    </div>
  );
}

/** Card wrapper for one repeatable row (a borrower, an account, a funding source). */
export function EntityCard({
  title,
  badge,
  onRemove,
  removeLabel = 'הסרה',
  children,
  tone = 'default',
}: {
  title: string;
  badge?: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  children: React.ReactNode;
  tone?: 'default' | 'muted';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-shadow',
        tone === 'muted'
          ? 'border-slate-150 bg-slate-50/60'
          : 'border-slate-200 bg-white shadow-sm hover:shadow-md hover:shadow-slate-100',
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {badge}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" />
            {removeLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function AddButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-3 py-2',
        'text-[13px] font-semibold text-indigo-600 transition-all hover:border-indigo-300 hover:bg-indigo-50',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
