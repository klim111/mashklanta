/**
 * "עריכה על הדף" נפתחת מלוח הבקרה באותה לשונית (לשונית חדשה או טעינה מלאה של
 * הדף מנתקות את היועץ — src/components/auth/AdvisorTabGuard.tsx), ונשארת
 * פעילה בלשונית הזו עד שיוצאים ממנה, גם במעבר בין עמודים.
 *
 * ה-sessionStorage נלכד כשהקובץ נטען, לפני שארגז החול של ההדגמה מחליף אותו,
 * כך שהעריכה נשארת פעילה גם במסכי ההדגמה של אזור הלקוח.
 */

export const SITE_EDIT_PARAM = 'site-edit';
const STORAGE_KEY = 'mashkalanta:site-edit';
/** האירוע שמודיע לסרגל העריכה שהמצב השתנה, בלי טעינה מחדש של הדף */
export const SITE_EDIT_EVENT = 'mashkalanta:site-edit-change';

const realSessionStorage: Storage | null = (() => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
})();

export function readEditFlag(): boolean {
  try {
    return realSessionStorage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeEditFlag(on: boolean) {
  try {
    if (on) realSessionStorage?.setItem(STORAGE_KEY, '1');
    else realSessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* אחסון חסום — העריכה פעילה עד הרענון הבא */
  }
  window.dispatchEvent(new CustomEvent(SITE_EDIT_EVENT, { detail: on }));
}
