import type { MortgageBank } from '@/components/mortgage-advisor/types';

/**
 * הבנקים שאליהם מגישים בקשה לאישור עקרוני בהגשה עצמית.
 *
 * `applyUrl` הוא אזור המשכנתאות הדיגיטלי של הבנק — המקום שממנו מתחילים בקשה
 * מקוונת. הכתובות מרוכזות כאן בכוונה: כשבנק משנה את מבנה האתר שלו, זה הקובץ
 * היחיד שצריך לעדכן.
 *
 * `initials` הוא הסמל של הבנק בשורה — שתי אותיות בצבע המותג שלו. סמל מקומי
 * ולא קובץ לוגו חיצוני, כדי שהמסך לא יהיה תלוי בנכס שמתארח אצל הבנק ויכול
 * להיעלם או להשתנות.
 */
export interface PreApprovalBankInfo {
  bank: MortgageBank;
  /** מפתח יציב לשמות קבצים ולמזהי שדות */
  slug: string;
  /** השם המלא, כפי שהוא מופיע אצל הבנק */
  fullName: string;
  applyUrl: string;
  initials: string;
  /** צבע המותג — משמש לסמל ולמסגרת הכרטיס */
  color: string;
}

export const PRE_APPROVAL_BANKS: readonly PreApprovalBankInfo[] = [
  {
    bank: 'לאומי',
    slug: 'leumi',
    fullName: 'בנק לאומי לישראל',
    applyUrl: 'https://www.leumi.co.il/mashkanta/',
    initials: 'לא',
    color: '#4f46e5',
  },
  {
    bank: 'הפועלים',
    slug: 'hapoalim',
    fullName: 'בנק הפועלים',
    applyUrl: 'https://www.bankhapoalim.co.il/he/mortgage',
    initials: 'הפ',
    color: '#e11d48',
  },
  {
    bank: 'מזרחי',
    slug: 'mizrahi',
    fullName: 'בנק מזרחי טפחות',
    applyUrl: 'https://www.mizrahi-tefahot.co.il/mortgage/',
    initials: 'מז',
    color: '#d97706',
  },
  {
    bank: 'מרכנטיל',
    slug: 'mercantile',
    fullName: 'בנק מרכנתיל דיסקונט',
    applyUrl: 'https://www.mercantile.co.il/private/mortgage/',
    initials: 'מר',
    color: '#0284c7',
  },
  {
    bank: 'דיסקונט',
    slug: 'discount',
    fullName: 'בנק דיסקונט לישראל',
    applyUrl: 'https://www.discountbank.co.il/private/mortgage/',
    initials: 'די',
    color: '#059669',
  },
  {
    bank: 'הבינלאומי',
    slug: 'fibi',
    fullName: 'הבנק הבינלאומי הראשון',
    applyUrl: 'https://www.fibi.co.il/mortgage',
    initials: 'בי',
    color: '#7c3aed',
  },
];

/** מפתח המסמך בתיק התהליך, לאישור העקרוני שהתקבל מהבנק הזה */
export function preApprovalDocumentKey(slug: string): string {
  return `preapproval-${slug}`;
}
