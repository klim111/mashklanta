'use client';

/**
 * התאמת הפלטפורמה לטלפון נייד.
 *
 * בטלפון מוצגים במלואם רק עמוד הבית והכלים החינמיים, שעוצבו גם למסך קטן.
 * שאר המסכים שלפני ההתחברות (הרשמה, התחברות, תמחור וכו׳) נשארים שמישים, עם
 * הודעה שלהצגה מיטבית יש לפתוח מטאבלט או ממחשב. מסכי הפלטפורמה שאחרי
 * ההתחברות — הלוח ושלבי המשכנתא — אינם נפתחים בטלפון: במקומם מוצגת ההודעה
 * עם דרך חזרה לעמוד הבית ולכלים. טאבלטים ומחשבים אינם מושפעים.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Check, Copy, Laptop, MonitorSmartphone, Tablet } from 'lucide-react';
import { useDemoRequest } from '@/demo/store';

/** מסכים שמותאמים לטלפון ומוצגים בו כרגיל */
const PHONE_READY_PATHS = [
  '/',
  '/mortgage-planning',
  '/mortgage-refinance',
  '/equity-planning',
  '/consumer-loans',
  '/learn',
];

/** מסכי הפלטפורמה שאחרי ההתחברות — חסומים בטלפון גם בלי לבדוק את ה-session */
const APP_PREFIXES = ['/dashboard', '/advisor-dashboard'];

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
  const { status } = useSession();
  const demo = useDemoRequest();

  // ההדגמה היא סיור מודרך; היא אינה נחסמת
  if (!isPhone || demo) return <>{children}</>;

  if (PHONE_READY_PATHS.some((path) => matches(pathname, path))) return <>{children}</>;

  const isAppScreen =
    APP_PREFIXES.some((path) => matches(pathname, path)) || status === 'authenticated';

  if (isAppScreen) return <PhoneBlockedScreen signedIn={status === 'authenticated'} />;

  return (
    <>
      <PhoneNoticeBanner />
      {children}
    </>
  );
}

/** הודעה בראש מסכים ציבוריים שאינם מותאמים לטלפון (הרשמה, התחברות, תמחור) */
function PhoneNoticeBanner() {
  return (
    <div
      role="note"
      dir="rtl"
      className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-right"
    >
      <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <p className="text-info leading-snug text-amber-900">
        <span className="font-bold">לתצוגה מיטבית של הפלטפורמה יש לפתוח אותה מטאבלט או ממחשב.</span>{' '}
        מהטלפון אפשר להירשם ולהשתמש בכלים החינמיים, ושלבי תכנון המשכנתא נפתחים בטאבלט או במחשב.
      </p>
    </div>
  );
}

/** המסך שמוצג בטלפון במקום הלוח ושלבי המשכנתא */
function PhoneBlockedScreen({ signedIn }: { signedIn: boolean }) {
  const [copied, setCopied] = useState(false);

  const shareLink = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'משכלנתא', text: 'להמשך תכנון המשכנתא במחשב', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // המשתמש סגר את חלון השיתוף
    }
  };

  return (
    <main dir="rtl" className="flex min-h-[100svh] flex-col items-center justify-center bg-slate-50 px-5 py-10 text-center">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto mb-5 flex items-end justify-center gap-2 text-blue-600" aria-hidden>
          <Tablet className="h-10 w-10" />
          <Laptop className="h-14 w-14" />
        </div>
        <h1 className="text-title font-extrabold leading-tight text-slate-900">
          פתחו את משכלנתא בטאבלט או במחשב
        </h1>
        <p className="mt-3 text-info leading-relaxed text-slate-600">
          לתצוגה מיטבית של הפלטפורמה יש לפתוח אותה מטאבלט או ממחשב. שלבי תכנון המשכנתא, בניית התמהיל
          והלוח האישי אינם זמינים מהטלפון.
          {signedIn && ' החשבון שלכם שמור, והכול ממתין לכם שם.'}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={shareLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-button font-bold text-white hover:bg-blue-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'הקישור הועתק' : 'שלחו לעצמכם את הקישור'}
          </button>
          <Link
            href="/#free-tools"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-button font-bold text-slate-800 hover:bg-slate-50"
          >
            לכלים החינמיים
          </Link>
          <Link href="/" className="text-button font-semibold text-blue-700 underline-offset-4 hover:underline">
            לעמוד הבית
          </Link>
          {signedIn && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-2xs font-semibold text-slate-500 underline-offset-4 hover:underline"
            >
              התנתקות
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
