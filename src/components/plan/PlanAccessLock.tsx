'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';
import type { ProcessAccess } from '@/lib/process-access';

/**
 * הכלים נעולים: עברו 35 יום מהתשלום על התהליך, או שהתהליך נפתח בלי תשלום
 * (למשל מכלי המיחזור). החלון יושב מעל שולחן העבודה ואינו נסגר — הדרך היחידה
 * להמשיך היא לחדש את הגישה. כל מה שהוזן שמור ומחכה.
 */
export function PlanAccessLock({ planId, access }: { planId: string; access: ProcessAccess }) {
  const expired = access.state === 'EXPIRED';

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-access-lock-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl"
      >
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900">
          <Lock className="h-7 w-7 text-white" />
        </span>
        <h2 id="plan-access-lock-title" className="text-2xl font-black text-slate-900">
          {expired ? `${PLATFORM_ACCESS_DAYS} ימי הגישה הסתיימו` : 'התהליך ממתין לתשלום'}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          {expired
            ? `כל מה שהזנתם שמור. חדשו את הגישה לעוד ${PLATFORM_ACCESS_DAYS} יום, והכלים ייפתחו בדיוק איפה שעצרתם.`
            : `כדי להמשיך בתהליך פותחים אותו במסלול העצמאי / ההיברידי: גישה מלאה לכל השלבים והכלים ל-${PLATFORM_ACCESS_DAYS} יום.`}
        </p>

        <div className="my-5 rounded-2xl bg-slate-50 py-4">
          <div className="text-4xl font-black text-slate-900">₪{PLATFORM_PROCESS_PRICE}</div>
          <div className="mt-0.5 text-[13px] font-bold text-slate-500">
            לעוד {PLATFORM_ACCESS_DAYS} יום · אין חיוב חוזר
          </div>
        </div>

        <Link
          href={`/dashboard/checkout?planId=${encodeURIComponent(planId)}`}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-violet-600 px-6 text-base font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          {expired ? 'חדשו את הגישה' : 'פתחו את התהליך'}
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900"
        >
          <ChevronRight className="h-4 w-4" />
          חזרה לאזור האישי
        </Link>
      </motion.div>
    </div>
  );
}
