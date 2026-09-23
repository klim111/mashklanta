/**
 * כתבי ההסמכה ליועץ חיצוני — המשימה שהיועץ שולח ללקוח.
 *
 * כדי שהיועץ יוכל לפנות לבנקים בשם הלקוח, כל בנק דורש כתב הסמכה חתום על הטופס
 * שלו. היועץ שולח ללקוח משימה אחת (ClientTask עם מפתח קבוע); המשימה פותחת
 * חלון עם הטפסים של כל הבנקים, והלקוח מוריד, חותם ומעלה כתב חתום לכל בנק
 * שבחר. הכתבים נשמרים בתיק המסמכים של התהליך עם מפתח לכל בנק, וכך היועץ רואה
 * אותם תחת הלקוח בלשונית נפרדת.
 *
 * הקובץ טהור — בלי React ובלי Prisma.
 */

import type { ClientTaskKind } from './client-tasks';
import type { PlanStageId } from './mortgage-plan';

/** מפתח התבנית של המשימה שהיועץ שולח */
export const AUTHORIZATION_TASK_KEY = 'advisor:authorization-letters';

const DOCUMENT_KEY_PREFIX = 'authorization-letter:';

/** מפתח המסמך בתיק, לכתב ההסמכה החתום של הבנק הזה */
export function authorizationDocumentKey(bankSlug: string): string {
  return `${DOCUMENT_KEY_PREFIX}${bankSlug}`;
}

export function isAuthorizationDocumentKey(key: string): boolean {
  return key.startsWith(DOCUMENT_KEY_PREFIX);
}

/** הבנק שכתב ההסמכה שייך לו, לפי מפתח המסמך */
export function authorizationBankSlug(key: string): string | null {
  return isAuthorizationDocumentKey(key) ? key.slice(DOCUMENT_KEY_PREFIX.length) || null : null;
}

/**
 * הטופס הריק של כל בנק, להורדה. הקבצים יושבים ב-public/forms/authorization,
 * וכל עוד טופס לא הוסף הכתובת ריקה והחלון אומר שהטופס יתווסף בקרוב.
 */
export const AUTHORIZATION_FORMS: Record<string, string | null> = {
  leumi: null,
  hapoalim: null,
  mizrahi: null,
  mercantile: null,
  discount: null,
  fibi: null,
};

export function authorizationFormUrl(bankSlug: string): string | null {
  return AUTHORIZATION_FORMS[bankSlug] ?? null;
}

/** שם המסמך בתיק */
export function authorizationDocumentName(bankName: string): string {
  return `כתב הסמכה חתום ליועץ · ${bankName}`;
}

/** הכתובת של החלון אצל הלקוח */
export function authorizationLettersHref(planId: string): string {
  return `/dashboard/plans/${planId}/authorization-letters`;
}

export interface AuthorizationTaskSpec {
  templateKey: string;
  kind: ClientTaskKind;
  stage: PlanStageId;
  title: string;
  details: string;
  dueAt: Date;
}

/** המשימה כפי שהיא נוצרת אצל הלקוח: בשלב האישור העקרוני, בעוד שלושה ימים בעשר */
export function authorizationTaskSpec(advisorName: string | null, now = new Date()): AuthorizationTaskSpec {
  const advisor = advisorName?.trim() ? `היועץ ${advisorName.trim()}` : 'היועץ שלכם';
  return {
    templateKey: AUTHORIZATION_TASK_KEY,
    kind: 'TASK',
    stage: 'APPLICATIONS',
    title: 'חתמו על כתבי הסמכה ליועץ והעלו אותם',
    details: `${advisor} צריך כתב הסמכה חתום לכל בנק שתרצו שיפנה אליו בשמכם. בחלון תמצאו את הטפסים של כל הבנקים להורדה, ושם גם מעלים את הכתבים החתומים.`,
    dueAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 10, 0, 0),
  };
}
