'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';
import type { PlanView } from '@/components/plan/usePlan';

const SEEN_KEY = 'mashklanta:access-expired-seen';

/**
 * התראה בכניסה לאזור האישי: עברו 30 הימים של חבילת הגישה, ויש תהליך שעוד לא
 * הסתיים. ההתראה מופיעה פעם אחת בכל כניסה (לכל הלשונית), ומובילה לרכישת חבילה
 * נוספת. בתוך התהליך עצמו הכלים נעולים בחלון נפרד (PlanAccessLock).
 */
export function AccessExpiredNotice({ plans }: { plans: PlanView[] }) {
  const expired = plans.filter((plan) => plan.status === 'IN_PROGRESS' && plan.access?.state === 'EXPIRED');
  const key = expired.map((plan) => plan.id).join(',');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!key) return;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === key;
    } catch {
      // בלי אחסון ההתראה פשוט תופיע שוב
    }
    if (!seen) setOpen(true);
  }, [key]);

  const close = () => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(SEEN_KEY, key);
    } catch {
      // ראו למעלה
    }
  };

  if (expired.length === 0) return null;
  const first = expired[0];

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent dir="rtl" className="max-w-md rounded-3xl bg-white p-7 text-center">
        <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Clock className="h-7 w-7 text-amber-600" />
        </span>
        <DialogTitle className="text-subtitle font-black text-slate-900">תוקף הגישה לפלטפורמה פג</DialogTitle>
        <p className="text-info leading-relaxed text-slate-600">
          {expired.length === 1
            ? `עברו ${PLATFORM_ACCESS_DAYS} הימים של חבילת הגישה, והתהליך "${first.name}" עוד לא הסתיים.`
            : `עברו ${PLATFORM_ACCESS_DAYS} הימים של חבילת הגישה, ו-${expired.length} תהליכים שלכם עוד לא הסתיימו.`}{' '}
          כל מה שהזנתם שמור. כדי להמשיך בדיוק מאותה נקודה, רוכשים חבילת גישה נוספת.
        </p>

        <div className="rounded-2xl bg-slate-50 py-4">
          <div className="text-4xl font-black text-slate-900">₪{PLATFORM_PROCESS_PRICE}</div>
          <div className="mt-0.5 text-sm font-bold text-slate-500">
            לעוד {PLATFORM_ACCESS_DAYS} יום · אין חיוב בלי אישור שלכם
          </div>
        </div>

        <Link
          href={`/dashboard/checkout?planId=${encodeURIComponent(first.id)}`}
          onClick={close}
          className="text-cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700"
        >
          לרכישת חבילת גישה נוספת
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={close}
          className="text-button rounded-xl py-1.5 font-bold text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:bg-slate-100"
        >
          לא עכשיו
        </button>
      </DialogContent>
    </Dialog>
  );
}
