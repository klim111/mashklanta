/**
 * הכניסה של היועץ לא נשמרת.
 *
 * כל כניסה עוברת את התהליך מהתחלה: קישור במייל ואחריו סיסמה. אחרי הכניסה
 * ההתחברות של היועץ תקפה רק כל עוד שלושה תנאים מתקיימים:
 *
 * 1. עוגיית הדפדפן `mk_adv_session` עדיין קיימת. זו עוגיית session, בלי תאריך
 *    תפוגה, ולכן היא נמחקת כשהדפדפן נסגר. הערך שלה שמור גם בטוקן ההתחברות,
 *    והשניים חייבים להיות זהים.
 * 2. לא עברו יותר מ-ADVISOR_IDLE_MINUTES מאז שאזור היועץ היה פתוח בפעם האחרונה.
 * 3. לא עברו יותר מ-ADVISOR_MAX_HOURS מאז הכניסה.
 *
 * מעבר לזה, הדפדפן עצמו (AdvisorTabGuard) מנתק את היועץ בכל ביקור חדש: הקלדת
 * כתובת האתר, לשונית חדשה, או חלון שנפתח מחדש. רק רענון של אותה לשונית ומעבר
 * בין עמודים בתוך האתר ממשיכים את אותה כניסה.
 *
 * הקובץ הזה נטען גם במידלוור (Edge), ולכן אין בו ייבוא של מסד הנתונים.
 */

export const ADVISOR_SESSION_COOKIE = 'mk_adv_session';
export const ADVISOR_IDLE_MINUTES = 60;
export const ADVISOR_MAX_HOURS = 12;

/** בדפדפן (sessionStorage): הלשונית שבה היועץ נכנס */
export const ADVISOR_TAB_KEY = 'mk_adv_tab';
/** בדפדפן (sessionStorage): הטעינה הראשונה אחרי הכניסה, שעדיין אינה "ביקור חדש" */
export const ADVISOR_FRESH_KEY = 'mk_adv_fresh';

export type AdvisorTokenFields = {
  role?: unknown;
  advisorLink?: unknown;
  advisorSession?: unknown;
  advisorAt?: unknown;
  advisorSeen?: unknown;
};

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** האם התחברות של יועץ עדיין תקפה — לפי הטוקן ועוגיית הדפדפן */
export function advisorSessionValid(
  token: AdvisorTokenFields,
  cookieValue: string | null | undefined,
  now = Date.now()
): boolean {
  if (token.advisorLink !== true) return false;
  if (typeof token.advisorSession !== 'string' || !token.advisorSession) return false;
  if (!cookieValue || !sameString(token.advisorSession, cookieValue)) return false;
  if (typeof token.advisorAt !== 'number' || now - token.advisorAt > ADVISOR_MAX_HOURS * 3600 * 1000) return false;
  const seen = typeof token.advisorSeen === 'number' ? token.advisorSeen : token.advisorAt;
  return now - seen <= ADVISOR_IDLE_MINUTES * 60 * 1000;
}
