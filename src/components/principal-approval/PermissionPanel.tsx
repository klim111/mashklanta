'use client';

import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, UserCog } from 'lucide-react';
import { useCase } from './CaseContext';

/**
 * Client-side control over who may edit the data they entered.
 * Without an explicit grant, an advisor sees client-entered fields read-only.
 */
export function PermissionPanel() {
  const { data, setAdvisorPermission } = useCase();
  const [busy, setBusy] = useState<string | null>(null);

  if (!data) return null;

  // The advisor's own view: show the state of their permission, not the controls.
  if (data.viewer.role === 'advisor') {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border p-4 ${
          data.viewer.canEditClientFields
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${
            data.viewer.canEditClientFields ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        >
          {data.viewer.canEditClientFields ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-[13px] font-bold text-slate-800">
            {data.viewer.canEditClientFields
              ? 'הלקוח העניק לך הרשאת עריכה לנתונים שהזין'
              : 'נתונים שהוזנו על ידי הלקוח מוצגים לקריאה בלבד'}
          </p>
          <p className="text-[12px] text-slate-500">
            {data.viewer.canEditClientFields
              ? 'ניתן לערוך כל שדה בתיק. כל שינוי נשמר עם סימון "הוזן על ידי היועץ".'
              : 'ניתן להזין שדות ריקים ולערוך שדות שהזנת בעצמך. לעריכת נתוני הלקוח נדרשת הרשאה מהלקוח.'}
          </p>
        </div>
      </div>
    );
  }

  const advisors = data.advisors;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
          <KeyRound className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">הרשאות עריכה ליועצים</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            נתונים שהזנת מוצגים ליועץ לקריאה בלבד. כאן ניתן לבחור יועץ ולתת לו הרשאה לערוך אותם.
          </p>
        </div>
      </div>

      {advisors.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
          טרם שויך יועץ לתיק זה
        </p>
      )}

      <div className="space-y-2">
        {advisors.map((advisor) => (
          <div
            key={advisor.advisorId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                <UserCog className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">
                  {advisor.advisorName ?? advisor.advisorEmail ?? 'יועץ'}
                  {advisor.isAssigned && (
                    <span className="mr-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                      היועץ המטפל
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">{advisor.advisorEmail}</p>
              </div>
            </div>

            <button
              type="button"
              disabled={busy === advisor.advisorId}
              onClick={async () => {
                setBusy(advisor.advisorId);
                try {
                  await setAdvisorPermission(advisor.advisorId, !advisor.canEdit);
                } finally {
                  setBusy(null);
                }
              }}
              className={`h-9 rounded-xl px-4 text-[12px] font-semibold transition-all disabled:opacity-50 ${
                advisor.canEdit
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-600'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {advisor.canEdit ? 'הרשאת עריכה פעילה — לביטול' : 'תן הרשאה ליועץ לערוך את הנתונים'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
