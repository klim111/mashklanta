'use client';

import React, { useState } from 'react';
import { ArrowLeftRight, Database, FileEdit, TriangleAlert } from 'lucide-react';
import { COUNTRIES } from '@/lib/principal-approval/countries';
import { getFieldDef } from '@/lib/principal-approval/schema';
import { formatCurrency, formatDate, formatNumber } from '@/lib/principal-approval/format';
import type { ConflictDTO } from '@/lib/principal-approval/types';
import { useCase } from './CaseContext';

/** Renders a stored value the way the user sees it in the form. */
export function displayValue(conflict: ConflictDTO, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '— ריק —';
  const def = getFieldDef(conflict.entityType, conflict.fieldKey);
  if (!def) return String(raw);

  if (def.kind === 'boolean') return raw === true || raw === 'true' ? 'כן' : 'לא';
  if (def.kind === 'money') return formatCurrency(Number(raw));
  if (def.kind === 'number' || def.kind === 'integer') return formatNumber(Number(raw));
  if (def.kind === 'date' || def.kind === 'pastDate' || def.kind === 'futureDate') {
    return formatDate(String(raw));
  }
  if (def.kind === 'select' && def.options) {
    return def.options.find((o) => o.value === raw)?.label ?? String(raw);
  }
  if (def.kind === 'multiselect') {
    const list = Array.isArray(raw) ? raw : [raw];
    if (def.optionsSource === 'countries') {
      return list.map((v) => COUNTRIES.find((c) => c.value === v)?.label ?? String(v)).join(', ');
    }
    return list.join(', ');
  }
  return String(raw);
}

/**
 * Presents every open conflict between the stored client profile and the value
 * entered in the approval flow, and lets the user pick the winning value.
 * The choice is written back to the profile, so all other screens follow.
 */
export function ConflictResolver() {
  const { openConflicts, resolveConflict } = useCase();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (openConflicts.length === 0) return null;

  const choose = async (conflict: ConflictDTO, choice: 'profile' | 'case') => {
    setBusyId(conflict.id);
    try {
      await resolveConflict(conflict.id, choice);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <TriangleAlert className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-amber-900">
            נמצאו סתירות בין הנתונים בפרופיל הלקוח לבין הנתונים שהוזנו כאן ({openConflicts.length})
          </h3>
          <p className="mt-0.5 text-[12px] text-amber-800">
            יש לבחור עבור כל שדה איזה ערך נכון. הערך שייבחר יעודכן בבסיס הנתונים ובכל המסכים שמושכים ממנו.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {openConflicts.map((conflict) => (
          <div key={conflict.id} className="rounded-xl border border-amber-200 bg-white p-4">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-800">
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-500" />
              {conflict.entityLabel} · {conflict.fieldLabel}
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                disabled={busyId === conflict.id}
                onClick={() => void choose(conflict, 'profile')}
                className="group rounded-xl border border-slate-200 p-3 text-right transition-all hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50"
              >
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <Database className="h-3 w-3" />
                  הערך מפרופיל הלקוח
                </span>
                <span className="block text-sm font-bold text-slate-800">
                  {displayValue(conflict, conflict.profileValue)}
                </span>
                <span className="mt-2 block text-[11px] font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                  בחר ערך זה
                </span>
              </button>

              <button
                type="button"
                disabled={busyId === conflict.id}
                onClick={() => void choose(conflict, 'case')}
                className="group rounded-xl border border-slate-200 p-3 text-right transition-all hover:border-emerald-300 hover:bg-emerald-50/50 disabled:opacity-50"
              >
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <FileEdit className="h-3 w-3" />
                  הערך שהוזן באישור העקרוני
                </span>
                <span className="block text-sm font-bold text-slate-800">
                  {displayValue(conflict, conflict.caseValue)}
                </span>
                <span className="mt-2 block text-[11px] font-semibold text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                  בחר ערך זה
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
