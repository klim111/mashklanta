'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Radio, Undo2 } from 'lucide-react';
import { getFieldDef } from '@/lib/principal-approval/schema';
import { useCase } from './CaseContext';
import type { HeldField } from './CaseContext';

const labelsOf = (fields: HeldField[]) =>
  Array.from(new Set(fields.map((field) => getFieldDef(field.entityType, field.fieldKey)?.label ?? 'שדה'))).join(
    ' · '
  );

/**
 * פס השידור של תיק האישור העקרוני אצל היועץ — כמו בכל שאר עמודי השלבים: מה
 * שהיועץ ממלא נשאר אצלו עד "שדר", ושדות שהלקוח שינה בינתיים מוצגים לו.
 */
export function CaseBroadcastBar({ clientName }: { clientName: string }) {
  const { held } = useCase();
  if (!held) return null;
  const hasPending = held.fields.length > 0;

  return (
    <div className="sticky top-2 z-20 space-y-2 p-3">
      <div
        className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-sm ${
          hasPending ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white'
        }`}
      >
        {hasPending ? (
          <Radio className="h-5 w-5 shrink-0 text-violet-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">
            {hasPending
              ? `${held.fields.length === 1 ? 'שדה אחד ממתין' : `${held.fields.length} שדות ממתינים`} לשידור בתיק האישור העקרוני`
              : `${clientName} רואה בתיק בדיוק מה שמוצג כאן`}
          </p>
          <p className="truncate text-[11px] text-slate-600">
            {hasPending
              ? `${labelsOf(held.fields)}. ${clientName} יראה אותם רק אחרי "שדר".`
              : 'מה שתמלאו כאן יישאר אצלכם עד שתלחצו "שדר".'}
          </p>
        </div>
        {hasPending && (
          <button
            type="button"
            disabled={held.busy}
            onClick={() => void held.discard()}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" />
            בטל שינויים
          </button>
        )}
        <button
          type="button"
          disabled={!hasPending || held.busy}
          onClick={() => void held.broadcast()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {held.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          שדר ללקוח
        </button>
      </div>
      {held.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{held.error}</p>}
      {held.clientChanged.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-black">{clientName} שינה בעצמו מאז שהתחלתם לערוך: </span>
            {labelsOf(held.clientChanged)}. השידור ידרוס את הערכים שלו בשדות האלה.
          </p>
        </div>
      )}
    </div>
  );
}
