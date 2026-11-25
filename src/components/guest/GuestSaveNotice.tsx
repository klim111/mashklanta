'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, X } from 'lucide-react';

const DISMISSED_PREFIX = 'mashklanta:guest-save-notice-dismissed:';

/**
 * ההתראה שמופיעה בכל כלי חינמי ברגע שאורח הזין בו נתונים: הרשמה חינמית שומרת
 * את הנתונים בכל הכלים, ובלעדיה הם לא יישמרו לכניסה הבאה לאתר
 * (src/components/guest/guestData.ts). אפשר לסגור אותה, והיא נשארת סגורה
 * בלשונית הזו עבור הכלי הזה.
 */
export function GuestSaveNotice({ hasData, tool }: { hasData: boolean; tool: string }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISSED_PREFIX + tool) === '1');
    } catch {
      setDismissed(false);
    }
  }, [tool]);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_PREFIX + tool, '1');
    } catch {
      // אחסון חסום — נסגר רק עד הרענון
    }
  };

  const show = status === 'unauthenticated' && hasData && !dismissed;
  // חזרה לאותו כלי אחרי ההרשמה, שם הנתונים כבר מחכים מהחשבון
  const back = encodeURIComponent(
    typeof window === 'undefined' ? pathname : `${pathname}${window.location.search}`
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          dir="rtl"
          role="status"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-lg rounded-2xl border border-blue-200 bg-white p-4 text-right shadow-2xl shadow-blue-900/15 print:hidden lg:bottom-5"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="סגירת ההתראה"
            className="absolute left-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pl-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Save className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-info font-black leading-snug text-slate-900">
                הרשמו למשכלנתא בחינם, והנתונים שלכם יישמרו בכל הכלים
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                בלי הרשמה, מה שהזנתם לא יישמר לכניסה הבאה לאתר. לשימוש מלא ונוח במשכלנתא עדיף להירשם.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/auth/register?callbackUrl=${back}`}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
            >
              הרשמה חינם
            </Link>
            <Link
              href={`/auth/login?callbackUrl=${back}`}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              כבר יש לי חשבון
            </Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
