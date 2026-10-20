import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { safeCallbackPath } from '@/lib/auth-url';
import { ADVISOR_SESSION_COOKIE, advisorSessionValid } from '@/lib/advisor-session';

/**
 * מסלולי ה-API שפתוחים גם בלי התחברות: נתוני שוק מבנק ישראל, שערי מטבע, חיפוש
 * כתובות, בדיקת חיים ושרת ה-TURN. הם מזינים את הכלים הציבוריים של האתר, שעובדים
 * גם למי שעדיין לא נרשם. גם `/api/auth-diagnostics` פתוח — הוא נדרש דווקא למי
 * שטרם התחבר, לפני שההתחברות עם גוגל מתחילה.
 */
const PUBLIC_API_PREFIXES = [
  '/api/auth',
  // פנייה ליועץ נשלחת גם מעמוד הבית, בלי חשבון; הנתיב עצמו מגביל קצב ומאמת פרטים
  '/api/advisor-leads',
  '/api/auth-diagnostics',
  '/api/health',
  '/api/addresses',
  '/api/boi',
  '/api/market',
  '/api/currency',
  '/api/turn',
  // ה-webhook של Resend למיילים נכנסים. הנתיב עצמו מאמת את החתימה
  '/api/email/inbound',
  // רישום ביקורים ופרטי הרשמה שלא הושלמה — נשלחים גם מדפדפן של מי שלא מחובר
  '/api/track',
  // החזרה מעמוד התשלום של HYP — התוצאה מאומתת מול HYP לפני שנרשם תשלום
  '/api/payments/hyp',
  // אישור חידוש מהקישור החתום שבמייל התזכורת — הקישור עצמו מזהה את הלקוח
  '/api/billing/renew',
  // תשלום בקישור תשלום שהיועץ שלח — הקישור עצמו מזהה על מה משלמים
  '/api/pay',
  // תמונות הבאנרים שהיועץ העלה ("תוכן האתר") — מוצגות לכל גולש
  '/api/site-images',
  // משימות מתוזמנות של Vercel — הנתיב עצמו בודק את CRON_SECRET
  '/api/cron',
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * קריאת טוקן ההתחברות, בשני שמות העוגייה האפשריים.
 *
 * NextAuth בוחר את הקידומת `__Secure-` לפי כתובת הבסיס שהוא מזהה מהבקשה עצמה,
 * בעוד ש-`getToken` בוחר אותה לפי `NEXTAUTH_URL`. כשהשניים אינם מסכימים — למשל
 * כש-`NEXTAUTH_URL` מצביע ל-http בזמן שהאתר מוגש ב-https — הכתיבה והקריאה
 * מתפצלות לשתי עוגיות שונות, והמידלוור רואה כל משתמש מחובר כאנונימי ומגלגל
 * אותו חזרה למסך ההתחברות.
 *
 * לכן שם העוגייה נגזר מהפרוטוקול של הבקשה בפועל, ולא ממשתנה סביבה, ואם לא
 * נמצאה עוגייה מנסים גם את השם השני — כדי שתצורה שגויה של סביבה לא תוכל יותר
 * לנתק משתמשים מחוברים.
 */
async function readToken(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const secureCookie = request.nextUrl.protocol === 'https:';

  const token = await getToken({ req: request, secret, secureCookie });
  if (token) return token;
  return getToken({ req: request, secret, secureCookie: !secureCookie });
}

const SESSION_COOKIES = ['next-auth.session-token', '__Secure-next-auth.session-token', ADVISOR_SESSION_COOKIE];

type Token = Awaited<ReturnType<typeof readToken>>;

export async function middleware(request: NextRequest) {
  const token = await readToken(request);

  /**
   * התחברות של יועץ שאינה תקפה עוד — הדפדפן נסגר, האזור לא היה פתוח זמן רב,
   * או שעברו יותר מדי שעות מהכניסה (src/lib/advisor-session.ts) — נמחקת
   * מהדפדפן, והבקשה ממשיכה כאילו אין התחברות.
   */
  if (
    (token as { role?: string } | null)?.role === 'ADVISOR' &&
    !advisorSessionValid(token!, request.cookies.get(ADVISOR_SESSION_COOKIE)?.value)
  ) {
    // גם הדף או ה-API שמטפלים בבקשה הזו כבר לא רואים את ההתחברות
    SESSION_COOKIES.forEach((name) => request.cookies.delete(name));
    const response = routeRequest(request, null);
    SESSION_COOKIES.forEach((name) => response.cookies.delete(name));
    return response;
  }

  return routeRequest(request, token);
}

function routeRequest(request: NextRequest, token: Token): NextResponse {
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/auth');
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdvisorDashboard = pathname.startsWith('/advisor-dashboard');
  /** שיחת הווידאו של פגישה — פתוחה לשני הצדדים, אבל רק למי שמחובר */
  const isMeetingCall = pathname.startsWith('/meeting/');
  const isApi = pathname.startsWith('/api');

  if (!token) {
    /**
     * קריאת API שאינה מזוהה מקבלת 401 ולא הפניה למסך ההתחברות: הפניה הייתה
     * מחזירה דף HTML בקוד 200, וכל `fetch` באפליקציה היה נכשל בפרסינג במקום
     * לזהות שהמשתמש אינו מחובר.
     */
    if (isApi) {
      if (isPublicApi(pathname)) return NextResponse.next({ request: { headers: request.headers } });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDashboard || isAdvisorDashboard || isMeetingCall) {
      const url = new URL('/auth/login', request.url);
      url.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request: { headers: request.headers } });
  }

  const userRole = (token as { role?: string })?.role;

  /**
   * משתמש מחובר שמגיע למסכי ההתחברות וההרשמה ממשיך ליעד שביקש (`callbackUrl`),
   * ובלעדיו ללוח שלו. כמה מסכים פתוחים גם למי שמחובר: אישור ההרשמה מהמייל,
   * הכניסה הנסתרת של היועץ, ובחירת סיסמה חדשה — הקישור במייל "שכחתי סיסמה"
   * חייב לעבוד גם כשהלקוח כבר מחובר באותו דפדפן.
   */
  const authPageOpenWhenSignedIn =
    pathname.includes('verify') ||
    pathname === '/auth/team-entry' ||
    pathname.startsWith('/auth/reset-password') ||
    pathname.startsWith('/auth/forgot-password');
  if (isAuthPage && !authPageOpenWhenSignedIn) {
    const callback = safeCallbackPath(request.nextUrl.searchParams.get('callbackUrl'));
    const target =
      callback && !callback.startsWith('/auth')
        ? callback
        : userRole === 'ADVISOR'
          ? '/advisor-dashboard'
          : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // כל צד רואה את הלוח שלו בלבד
  if (userRole === 'ADVISOR' && isDashboard) {
    return NextResponse.redirect(new URL('/advisor-dashboard', request.url));
  }
  if (userRole === 'CLIENT' && isAdvisorDashboard) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
  matcher: ['/dashboard/:path*', '/advisor-dashboard/:path*', '/meeting/:path*', '/auth/:path*', '/api/:path*'],
};
