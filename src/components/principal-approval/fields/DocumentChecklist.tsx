'use client';

import React from 'react';
import { Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentGroup } from '@/lib/principal-approval/documents';

/** Tick-list of the documents the bank will ask for, grouped by who provides them. */
export function DocumentChecklist({
  groups,
  value,
  onChange,
  readOnly,
}: {
  groups: DocumentGroup[];
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  readOnly?: boolean;
}) {
  const collected = value ?? {};

  const toggle = (key: string) => {
    if (readOnly) return;
    const next = { ...collected };
    if (next[key]) delete next[key];
    else next[key] = true;
    onChange(next);
  };

  if (groups.length === 0) {
    return <p className="text-xs text-slate-400">יש להזין לווה כדי לבנות את רשימת המסמכים</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const done = group.documents.filter((doc) => collected[doc.key]).length;
        return (
          <div key={group.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                <h4 className="text-[13px] font-bold text-slate-800">{group.title}</h4>
                {group.subtitle && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {group.subtitle}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  done === group.documents.length
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700',
                )}
              >
                {done}/{group.documents.length}
              </span>
            </div>

            <ul className="space-y-1.5">
              {group.documents.map((doc) => {
                const checked = Boolean(collected[doc.key]);
                return (
                  <li key={doc.key}>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggle(doc.key)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-right text-[13px] transition-colors',
                        checked ? 'text-slate-500' : 'text-slate-700',
                        !readOnly && 'hover:bg-slate-50',
                        readOnly && 'cursor-not-allowed',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                          checked
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white',
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className={cn(checked && 'line-through')}>{doc.name}</span>
                      {doc.required === false && (
                        <span className="text-[10px] text-slate-400">(לא לכל לקוח)</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
