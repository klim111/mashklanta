import { normalizeAuthUrl } from './auth-url';

/**
 * כתובת נפרדת לאזור היועצים — למשל https://pro.mashkalanta.com — כדי שהכניסה
 * של יועצים ושל לקוחות תהיה בשתי כתובות שונות:
 *
 *   • עוגיות ההתחברות נשמרות לכל כתובת בנפרד, ולכן התחברות של יועץ לא קיימת
 *     באתר של הלקוחות, והתחברות של לקוח לא קיימת באזור היועצים.
 *   • באתר הראשי, אזור היועץ והכניסה הנסתרת מפנים לכתובת היועצים; בכתובת
 *     היועצים, הכניסה וההרשמה של לקוחות מפנות לאתר הראשי, ודף הבית — ללוח היועץ.
 *   • כל שאר העמודים (הכלים, דפי המשרדים, האזור האישי בתצוגה כלקוח) עובדים
 *     בשתי הכתובות, כדי שהיועץ יעבוד עם כל הכלים בלי לצאת מהאזור שלו.
 *
 * ההפרדה פעילה רק כשמוגדר ADVISOR_ORIGIN (ולצידו הכתובת הראשית, NEXTAUTH_URL).
 * בלי המשתנה — הכול עובד כמו היום, בכתובת אחת. הקובץ טהור ונטען גם במידלוור.
 */

export function advisorOrigin(): string | null {
  return normalizeAuthUrl(process.env.ADVISOR_ORIGIN);
}

/** אזור היועץ והכניסה הנסתרת שלו */
export function isAdvisorRealmPath(pathname: string): boolean {
  return (
    pathname === '/advisor-dashboard' ||
    pathname.startsWith('/advisor-dashboard/') ||
    pathname === '/auth/team-entry' ||
    pathname.startsWith('/auth/advisor-verify')
  );
}

const CLIENT_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/check-email',
  '/auth/verify',
  '/auth/forgot-password',
  '/auth/reset-password',
];

/** הכניסה, ההרשמה ושחזור הסיסמה של לקוחות */
export function isClientAuthPath(pathname: string): boolean {
  return CLIENT_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export interface HostSplitInput {
  /** הכותרת Host של הבקשה, עם הפורט אם יש */
  host: string;
  pathname: string;
  search: string;
  advisorOrigin: string | null;
  mainOrigin: string | null;
}

export interface HostSplitDecision {
  /** הבקשה הגיעה לכתובת היועצים */
  onAdvisorHost: boolean;
  /** לאן להפנות, או null כשהעמוד מוגש בכתובת הזו */
  redirect: string | null;
}

/** null — ההפרדה לא מוגדרת, או ששתי הכתובות זהות */
export function hostSplit(input: HostSplitInput): HostSplitDecision | null {
  const { advisorOrigin: advisor, mainOrigin: main } = input;
  if (!advisor || !main || advisor === main) return null;
  const advisorHost = new URL(advisor).host.toLowerCase();
  const onAdvisorHost = input.host.toLowerCase() === advisorHost;
  const { pathname, search } = input;

  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) return { onAdvisorHost, redirect: null };

  if (onAdvisorHost) {
    if (pathname === '/') return { onAdvisorHost, redirect: `${advisor}/advisor-dashboard` };
    if (isClientAuthPath(pathname)) return { onAdvisorHost, redirect: `${main}${pathname}${search}` };
    return { onAdvisorHost, redirect: null };
  }
  if (isAdvisorRealmPath(pathname)) return { onAdvisorHost, redirect: `${advisor}${pathname}${search}` };
  return { onAdvisorHost, redirect: null };
}
