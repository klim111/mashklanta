import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * מסלולי ה-API שפתוחים גם בלי התחברות: נתוני שוק מבנק ישראל, שערי מטבע, חיפוש
 * כתובות, בדיקת חיים ושרת ה-TURN. הם מזינים את הכלים הציבוריים של האתר, שעובדים
 * גם למי שעדיין לא נרשם. גם `/api/auth-diagnostics` פתוח — הוא נדרש דווקא למי
 * שטרם התחבר, לפני שההתחברות עם גוגל מתחילה.
 */
const PUBLIC_API_PREFIXES = [
  '/api/auth',
  '/api/auth-diagnostics',
  '/api/health',
  '/api/addresses',
  '/api/boi',
  '/api/currency',
  '/api/turn',
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

export async function middleware(request: NextRequest) {
  const token = await readToken(request);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/auth');
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdvisorDashboard = pathname.startsWith('/advisor-dashboard');
  const isApi = pathname.startsWith('/api');

  if (!token) {
    /**
     * קריאת API שאינה מזוהה מקבלת 401 ולא הפניה למסך ההתחברות: הפניה הייתה
     * מחזירה דף HTML בקוד 200, וכל `fetch` באפליקציה היה נכשל בפרסינג במקום
     * לזהות שהמשתמש אינו מחובר.
     */
    if (isApi) {
      if (isPublicApi(pathname)) return NextResponse.next();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDashboard || isAdvisorDashboard) {
      const url = new URL('/auth/login', request.url);
      url.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const userRole = (token as { role?: string })?.role;

  // משתמש מחובר שמגיע למסכי ההתחברות נשלח ללוח שלו
  if (isAuthPage && !pathname.includes('verify')) {
    return NextResponse.redirect(
      new URL(userRole === 'ADVISOR' ? '/advisor-dashboard' : '/dashboard', request.url)
    );
  }

  // כל צד רואה את הלוח שלו בלבד
  if (userRole === 'ADVISOR' && isDashboard) {
    return NextResponse.redirect(new URL('/advisor-dashboard', request.url));
  }
  if (userRole === 'CLIENT' && isAdvisorDashboard) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/advisor-dashboard/:path*', '/auth/:path*', '/api/:path*'],
};
