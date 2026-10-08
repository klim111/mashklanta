'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarRange, CheckCircle2 } from 'lucide-react';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { paymentScheduleHref } from '@/lib/payment-schedule';

/**
 * השורה שמזכירה להגדיר את פעימות התשלום מול החוזה — בשלבים 1–4 כל עוד הן לא
 * הוגדרו, ובשלב החתימה כסעיף חובה (וכשהוגדרו — שורה ירוקה עם קישור לדוח).
 */
export function PaymentScheduleReminder({
  planId,
  stage,
  defined,
  mandatory = false,
}: {
  planId: string;
  stage: PlanStageId;
  defined: boolean;
  /** בשלב החתימה: סעיף חובה לסגירת השלב */
  mandatory?: boolean;
}) {
  const href = paymentScheduleHref(planId, stage);

  if (defined) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <p dir="rtl" className="min-w-0 flex-1 text-right text-info font-black text-emerald-900">
          פעימות התשלום הוגדרו מול החוזה
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-sm font-black text-emerald-800 transition-colors hover:border-emerald-500"
        >
          לכלי ולדוחות
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${
        mandatory ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <CalendarRange className={`h-5 w-5 shrink-0 ${mandatory ? 'text-rose-600' : 'text-amber-600'}`} />
      <p dir="rtl" className={`min-w-0 flex-1 text-right text-info leading-relaxed ${mandatory ? 'text-rose-950' : 'text-amber-950'}`}>
        {mandatory && (
          <span dir="rtl" className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-2xs font-black text-white">חובה</span>
        )}
        <span dir="rtl" className="font-black">הגדירו את פעימות התשלום מול החוזה.</span>{' '}
        {mandatory
          ? 'בלי פעימות מוגדרות אי אפשר לסגור את שלב החתימה.'
          : 'כספי הבנק מועברים אחרונים, ולכן החוזה צריך לעמוד בדרישות הבנק עוד לפני החתימה עליו.'}
      </p>
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-black text-white transition-colors ${
          mandatory ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        לכלי תכנון הפעימות
        <ArrowLeft className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
