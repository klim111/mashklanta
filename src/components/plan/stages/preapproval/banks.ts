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
    applyUrl: 'https://leumimortgage.formtitan.com/ftproject/mortgagerequest',
    initials: 'לא',
    color: '#4f46e5',
  },
  {
    bank: 'הפועלים',
    slug: 'hapoalim',
    fullName: 'בנק הפועלים',
    applyUrl: 'https://mortgage.bankhapoalim.co.il/ng-portals/dm/he/all-purposes',
    initials: 'הפ',
    color: '#e11d48',
  },
  {
    bank: 'מזרחי',
    slug: 'mizrahi',
    fullName: 'בנק מזרחי טפחות',
    applyUrl: 'https://sc.mizrahi-tefahot.co.il/TofesMashkantaClient/questionnaire/user-details/1',
    initials: 'מז',
    color: '#d97706',
  },
  {
    bank: 'מרכנטיל',
    slug: 'mercantile',
    fullName: 'בנק מרכנתיל דיסקונט',
    applyUrl: 'https://mortgage.mercantile.co.il/mortgage/public/new-transaction/welcome-page',
    initials: 'מר',
    color: '#0284c7',
  },
  {
    bank: 'דיסקונט',
    slug: 'discount',
    fullName: 'בנק דיסקונט לישראל',
    applyUrl: 'https://mortgage.discountbank.co.il/mortgage/public/new-transaction/welcome-page',
    initials: 'די',
    color: '#059669',
  },
  {
    bank: 'הבינלאומי',
    slug: 'fibi',
    fullName: 'הבנק הבינלאומי הראשון',
    applyUrl: 'https://mortgage.fibi.co.il/digmo/#/',
    initials: 'בי',
    color: '#7c3aed',
  },
];

/** מפתח המסמך בתיק התהליך, לאישור העקרוני שהתקבל מהבנק הזה */
export function preApprovalDocumentKey(slug: string): string {
  return `preapproval-${slug}`;
}
