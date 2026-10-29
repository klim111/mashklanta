'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSession, signOut, useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { ADVISOR_FRESH_KEY, ADVISOR_TAB_KEY } from '@/lib/advisor-session';

/** כל כמה זמן לשונית פתוחה של היועץ מאשרת לשרת שהאזור עדיין בשימוש */
const KEEPALIVE_MS = 5 * 60 * 1000;

/**
 * חלון שיחת הווידאו נפתח בלשונית חדשה, והוא אינו כניסה לאזור היועץ. בעמוד
 * אישור הקישור היועץ מתחבר בזה הרגע, והטעינה הבאה היא זו שאחרי הכניסה.
 */
const EXEMPT_PREFIXES = ['/meeting/', '/auth/advisor-verify'];

/** ההחלטה מתקבלת פעם אחת לכל טעינה של הדף, ומעבר בין עמודים באתר לא משנה אותה */
let loadVerdict: boolean | null = null;

/**
 * האם הטעינה הזו של הדף התחילה כשהיועץ כבר מחובר. null עד שה-session נטען
 * לראשונה. לשונית שנטענה בלי התחברות של יועץ, ורק אחר כך קיבלה אותה — זו
 * לשונית אחרת של האתר שהייתה פתוחה בזמן שהיועץ נכנס בלשונית שלידה. NextAuth
 * מעדכן את כל הלשוניות הפתוחות בכל שינוי של ה-session, ולכן היא רואה פתאום
 * יועץ מחובר. היא אינה "ביקור חדש": אם הייתה מנתקת, הניתוק היה מוחק את העוגייה
 * המשותפת ומפיל גם את הלשונית שבה היועץ נכנס זה עתה (כך קרה בכרום במחשב,
 * כשהקישור מהמייל נפתח בלשונית חדשה ולשונית הכניסה נשארה פתוחה).
 */
let loadStartedAsAdvisor: boolean | null = null;

/**
 * האם הטעינה הזו ממשיכה את הכניסה של היועץ: רק הטעינה שמיד אחרי הכניסה,
 * או רענון של אותה לשונית. הקלדת כתובת האתר, לשונית חדשה או דפדפן שנפתח
 * מחדש — כל אלה ביקור חדש.
 */
function thisLoadContinuesLogin(): boolean {
  if (loadVerdict !== null) return loadVerdict;
  try {
    const storage = window.sessionStorage;
    const sameTab = storage.getItem(ADVISOR_TAB_KEY) === '1';
    if (storage.getItem(ADVISOR_FRESH_KEY) === '1') {
      storage.removeItem(ADVISOR_FRESH_KEY);
      loadVerdict = sameTab;
    } else {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      loadVerdict = sameTab && navigation?.type === 'reload';
    }
    if (!loadVerdict) storage.removeItem(ADVISOR_TAB_KEY);
  } catch {
    loadVerdict = false;
  }
  return loadVerdict;
}

/**
 * הכניסה של היועץ לא נשמרת בין ביקורים (src/lib/advisor-session.ts). ביקור
 * חדש מנתק את היועץ מיד, לפני שמשהו מאזור היועץ מוצג, וכל כניסה מחדש עוברת
 * שוב את הקישור במייל והסיסמה.
 */
export function AdvisorTabGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname() ?? '';
  const isAdvisor = session?.user?.role === 'ADVISOR';
  if (loadStartedAsAdvisor === null && status !== 'loading') loadStartedAsAdvisor = isAdvisor;
  const exempt = EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  // הכניסה נעשתה בלשונית אחרת: הלשונית הזו לא מציגה את אזור היועץ, אבל גם לא מנתקת
  const otherTab = isAdvisor && !exempt && loadStartedAsAdvisor === false;
  const allowed = !isAdvisor || exempt || otherTab || thisLoadContinuesLogin();

  useEffect(() => {
    if (allowed) return;
    void signOut({ callbackUrl: pathname.startsWith('/advisor-dashboard') ? '/' : window.location.href });
  }, [allowed, pathname]);

  // בלי פעילות בלשונית פתוחה, ההתחברות הייתה פגה אחרי זמן ההמתנה המרבי
  useEffect(() => {
    if (!isAdvisor || !allowed || otherTab) return;
    const timer = window.setInterval(() => void getSession(), KEEPALIVE_MS);
    return () => window.clearInterval(timer);
  }, [isAdvisor, allowed, otherTab]);

  if (otherTab) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="max-w-sm text-center text-slate-600">
          נכנסת לאזור היועץ בלשונית אחרת. אפשר לסגור את הלשונית הזו.
        </p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }
  return <>{children}</>;
}
