/**
 * "כניסה לפלטפורמה כלקוח": היועץ רואה את הפלטפורמה כמו שלקוח רשום רואה אותה.
 *
 * היועץ נשאר מחובר כיועץ — אותה התחברות, באותה לשונית — ולכן הוא מזוהה כאדמין
 * בכל מקום: כל הכלים פתוחים בלי תשלום (התהליכים שלו נפתחים תמיד, ראו
 * `ownerIsAdvisor` ב-src/lib/process-access.ts), והגלישה לא נספרת כביקור.
 *
 * מה שמשתנה הוא רק מה שמוצג: עוגיית session (`mk_client_view`) פותחת לו את
 * האזור האישי של הלקוח (/dashboard), שבלעדיה מעביר אותו המידלוור לאזור היועץ,
 * וקישורי "האזור האישי" מובילים לשם. פס עליון בכל מסך מזכיר שזה מצב אדמין
 * ומחזיר לאזור היועץ. הכניסה לאזור היועץ מסיימת את המצב.
 *
 * הכניסה נעשית באותה לשונית: לשונית חדשה מנתקת את היועץ (AdvisorTabGuard).
 *
 * הקובץ נטען גם במידלוור (Edge), ולכן אין בו ייבוא של מסד הנתונים.
 */

export const CLIENT_VIEW_COOKIE = 'mk_client_view';
/** נשלח כשהמצב נפתח או נסגר, כדי שכל מה שמוצג יתעדכן בלי טעינה מחדש */
export const CLIENT_VIEW_EVENT = 'mk-client-view-change';

export function clientViewCookieOn(value: string | null | undefined): boolean {
  return value === '1';
}

/** האם מצב "כלקוח" פתוח בדפדפן הזה (בלי לבדוק שהמחובר הוא יועץ) */
export function clientViewActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => part.trim() === `${CLIENT_VIEW_COOKIE}=1`);
}

function writeCookie(on: boolean) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = on
    ? `${CLIENT_VIEW_COOKIE}=1; Path=/; SameSite=Lax${secure}`
    : `${CLIENT_VIEW_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CLIENT_VIEW_EVENT));
}

export function enterClientView() {
  writeCookie(true);
}

export function leaveClientView() {
  if (clientViewActive()) writeCookie(false);
}
