/**
 * דפדפן של היועץ — כדי שהגלישה שלו לא תיספר כביקור באתר.
 *
 * כשהיועץ מחובר, ההתחברות עצמה כבר מסננת אותו. אבל הכניסה של היועץ לא נשמרת
 * (src/lib/advisor-session.ts): לשונית חדשה או דפדפן שנפתח מחדש מנתקים אותו,
 * ומאותו רגע הוא גולש באתר כמו כל אורח. לכן הדפדפן מסומן בפעם הראשונה שהיועץ
 * מחובר בו, והסימון נשאר גם אחרי הניתוק:
 *
 * - בדפדפן: localStorage ועוגייה ל-5 שנים. מונה הביקורים ו-Google Analytics
 *   לא נטענים בדפדפן מסומן, והשרת דוחה רישום ביקור שמגיע עם העוגייה.
 * - בשרת: מזהה המבקר של הדפדפן נשמר בטבלת StaffVisitor, ודאשבורד הביקורים
 *   מסנן את כל הביקורים שלו — גם את אלה שנרשמו לפני הסימון.
 *
 * הקובץ נטען גם במידלוור ובשרת, ולכן אין בו ייבוא של מסד הנתונים.
 */

export const STAFF_DEVICE_KEY = 'mk_staff';
export const STAFF_DEVICE_COOKIE = 'mk_staff';
const STAFF_DEVICE_MAX_AGE = 5 * 365 * 24 * 3600;

/** האם הדפדפן הזה מסומן כדפדפן של היועץ */
export function isStaffDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(STAFF_DEVICE_KEY) === '1') return true;
  } catch {
    // נופלים לעוגייה
  }
  return document.cookie.split(';').some((part) => part.trim() === `${STAFF_DEVICE_COOKIE}=1`);
}

/** מסמן את הדפדפן. מחזיר true כשזו הפעם הראשונה */
export function markStaffDevice(): boolean {
  const already = isStaffDevice();
  try {
    window.localStorage.setItem(STAFF_DEVICE_KEY, '1');
  } catch {
    // בלי localStorage — העוגייה מספיקה
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${STAFF_DEVICE_COOKIE}=1; Path=/; Max-Age=${STAFF_DEVICE_MAX_AGE}; SameSite=Lax${secure}`;
  return !already;
}
