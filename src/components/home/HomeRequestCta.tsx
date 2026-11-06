'use client';

import Link from 'next/link';
import { ArrowLeft, BadgeCheck, RefreshCw } from 'lucide-react';

/**
 * בראש העמוד הראשי, בלי לגלול: הגשת בקשות לכל הבנקים (מכרז ריביות למשכנתא
 * חדשה) ובדיקת מיחזור. שני הכפתורים פותחים את טופס פרטי הלקוח, ובשליחה נפתח
 * ללקוח תיק אצל היועץ (src/lib/principal-approval/intake-request.ts).
 */
export function HomeRequestCta() {
  return (
    <div
      dir="rtl"
      className="mt-4 w-full max-w-3xl rounded-3xl border border-blue-200 bg-white/95 p-4 text-center shadow-lg shadow-blue-100/60 backdrop-blur-sm md:mt-5 md:p-5"
    >
      <h2 className="text-center text-xl font-black leading-snug text-slate-900 md:text-2xl">
        הגישו בקשות לכל הבנקים עם משכלנתא
      </h2>
      <p className="mx-auto mt-1.5 max-w-2xl text-center text-sm leading-relaxed text-slate-600 md:text-base">
        ממלאים פעם אחת את הפרטים, ומשכלנתא עושה מכרז ריביות מול כל הבנקים ודואגת להשיג לכם את הריביות הטובות ביותר.
      </p>
      <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-center text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
        <BadgeCheck className="h-4 w-4" />
        הבדיקה בחינם! משלמים רק אחרי שהשגנו את הריביות
      </p>
      <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row">
        <Link
          href="/tender-request"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700"
        >
          הגשת בקשה לכל הבנקים
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link
          href="/refinance-request"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-5 py-3 text-base font-bold text-violet-800 hover:bg-violet-100"
        >
          <RefreshCw className="h-4 w-4" />
          בדיקת מיחזור משכנתא
        </Link>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        גם בבדיקת המיחזור הבדיקה בחינם, ומשלמים רק אם הושגו התנאים שביקשתם.
      </p>
    </div>
  );
}
