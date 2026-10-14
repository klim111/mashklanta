'use client';

import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

/**
 * תיק המסמכים נעול: התהליך לא שולם, או שהסתיים חודש הגישה. התיק פתוח רק
 * למנויי הפלטפורמה, והקבצים שכבר בו נשמרים ומחכים.
 */
export function DocumentsLockedNotice({ planId }: { planId: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900">
        <Lock className="h-6 w-6 text-white" />
      </span>
      <p className="text-lg font-black text-slate-900">תיק המסמכים זמין למנויי הפלטפורמה</p>
      <p className="mx-auto mt-2 max-w-md text-info leading-relaxed text-slate-600">
        העלאה, צפייה והורדה של מסמכים פתוחות בתהליך ששולם עליו. כל מה שכבר בתיק שמור, ונפתח מיד עם הרכישה.
      </p>
      <Link
        href={`/dashboard/checkout?planId=${encodeURIComponent(planId)}`}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-blue-700"
      >
        לרכישת גישה לתהליך
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
