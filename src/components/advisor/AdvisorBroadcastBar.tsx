'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Radio, RefreshCw, Undo2, X } from 'lucide-react';
import { formatTime } from '@/lib/advisor-crm';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { fieldLabels } from './draftLabels';
import type { AdvisorPlanDraft } from './useAdvisorPlanDraft';

/**
 * פס השידור שבראש כל עמוד של שלב אצל היועץ.
 *
 * מה שהיועץ משנה בעמוד נשאר אצלו עד שהוא לוחץ "שדר". הפס אומר כמה שינויים
 * ממתינים ובאילו שדות, מראה ליועץ מה הלקוח שינה בעמוד בזמן שהוא עובד עליו,
 * ומזהיר כשהשידור ידרוס שדה שהלקוח שינה אחרי שהיועץ התחיל לערוך אותו.
 */
export function AdvisorBroadcastBar({
  draft,
  stage,
  clientName,
}: {
  draft: AdvisorPlanDraft;
  stage: PlanStageId;
  clientName: string;
}) {
  const { pending, clientChanged, clientUpdate } = draft.stageState(stage);
  const busy = draft.broadcasting === stage;
  const hasPending = pending.length > 0;

  return (
    <div className="sticky top-2 z-20 space-y-2">
      <div
        className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-sm backdrop-blur ${
          hasPending ? 'border-violet-300 bg-violet-50/95' : 'border-slate-200 bg-white/95'
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
              ? `${pending.length === 1 ? 'שינוי אחד ממתין' : `${pending.length} שינויים ממתינים`} לשידור`
              : `${clientName} רואה בעמוד הזה בדיוק מה שמוצג כאן`}
          </p>
          <p className="truncate text-[11px] text-slate-600">
            {hasPending
              ? `${fieldLabels(stage, pending).join(' · ')}. ${clientName} יראה אותם רק אחרי "שדר".`
              : 'מה שתשנו כאן יישאר אצלכם עד שתלחצו "שדר".'}
          </p>
        </div>
        {hasPending && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void draft.discard(stage)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-white disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" />
            בטל שינויים
          </button>
        )}
        <button
          type="button"
          disabled={!hasPending || busy}
          onClick={() => void draft.broadcast(stage)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          שדר ללקוח
        </button>
      </div>

      {draft.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{draft.error}</p>
      )}

      {clientChanged.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-black">{clientName} שינה בעצמו מאז שהתחלתם לערוך: </span>
            {fieldLabels(stage, clientChanged).join(' · ')}. השידור ידרוס את הערכים שלו בשדות האלה.
          </p>
        </div>
      )}

      {clientUpdate && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">
            <span className="font-black">
              {clientName} עדכן את העמוד ב-{formatTime(clientUpdate.at)}:{' '}
            </span>
            {fieldLabels(stage, clientUpdate.paths).join(' · ')}. הערכים החדשים כבר מוצגים כאן.
          </p>
          <button
            type="button"
            aria-label="סגירה"
            onClick={() => draft.dismissClientUpdate(stage)}
            className="rounded-lg p-0.5 text-sky-700 hover:bg-sky-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
