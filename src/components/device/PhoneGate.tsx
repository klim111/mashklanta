'use client';

/**
 * התאמת הפלטפורמה לטלפון נייד.
 *
 * כל האתר נפתח בטלפון במלואו, כולל הלוח, שלבי המשכנתא ואזור היועץ. בכל מסך
 * שאינו מהמסכים שעוצבו מלכתחילה לטלפון מוצגת בראש העמוד הודעה שלתצוגה
 * מיטבית מומלץ לפתוח מטאבלט או ממחשב. ההודעה אינה חוסמת דבר, ואפשר לסגור
 * אותה עד סוף הביקור. טאבלטים ומחשבים אינם מושפעים.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MonitorSmartphone, X } from 'lucide-react';
import { useDemoRequest } from '@/demo/store';

/** מסכים שעוצבו מלכתחילה לטלפון — בהם לא מוצגת ההודעה */
const PHONE_READY_PATHS = [
  '/',
  '/mortgage-planning',
  '/mortgage-refinance',
  '/equity-planning',
  '/consumer-loans',
  '/learn',
  // בקשת ליווי מ"היוועצו איתנו" בסרגל העליון
  '/consult',
  // מסמכים משפטיים — ההרשמה והתשלום מקשרים אליהם, והם חייבים להיפתח בכל מכשיר
  '/privacy',
  '/terms',
  '/accessibility',
];

/** סגירת ההודעה נזכרת עד סוף הביקור, כדי שלא תחזור בכל מעבר עמוד */
const NOTICE_DISMISSED_KEY = 'mashkalanta:phone-notice-dismissed';

function matches(pathname: string, path: string) {
  return pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
}

/**
 * טלפון ולא טאבלט. iPad, Tablet או Android בלי "Mobile" ב-User-Agent הם
 * טאבלטים; iPhone או Android עם "Mobile" הם טלפונים; אחריהם רמז הדפדפן
 * (Chromium), ולבסוף מסך מגע שהצלע הקצרה שלו קטנה מ-600px — טאבלטים מתחילים
 * בכ-744px.
 */
function detectPhone(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  const ua = nav.userAgent;
  if (/iPad|Tablet/i.test(ua)) return false;
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return false;
  if (/iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile|Opera Mini|BlackBerry/i.test(ua)) return true;
  if (nav.userAgentData?.mobile === true) return true;

  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return coarse && Math.min(window.screen.width, window.screen.height) < 600;
}

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => setIsPhone(detectPhone()), []);
  return isPhone;
}

export function PhoneGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const isPhone = useIsPhone();
  const demo = useDemoRequest();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(NOTICE_DISMISSED_KEY) === '1');
    } catch {
      // אחסון חסום — ההודעה פשוט תוצג
    }
  }, []);

  const showNotice =
    isPhone && !demo && !dismissed && !PHONE_READY_PATHS.some((path) => matches(pathname, path));

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(NOTICE_DISMISSED_KEY, '1');
    } catch {
      // אחסון חסום — ההודעה תחזור בעמוד הבא
    }
  };

  return (
    <>
      {showNotice && <PhoneNoticeBanner onDismiss={dismiss} />}
      {children}
    </>
  );
}

/** הודעה בראש המסכים שעוצבו קודם כול לטאבלט ולמחשב. אינה חוסמת דבר, ואפשר לסגור אותה */
function PhoneNoticeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="note"
      dir="rtl"
      className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-right"
    >
      <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <p className="min-w-0 flex-1 text-info leading-snug text-amber-900">
        <span className="font-bold">לתצוגה מיטבית של הפלטפורמה מומלץ לפתוח אותה מטאבלט או ממחשב.</span>{' '}
        אפשר להמשיך לעבוד גם מהטלפון, וכל מה שתעשו כאן נשמר בחשבון.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="סגירת ההודעה"
        className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-amber-800 hover:bg-amber-100"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
