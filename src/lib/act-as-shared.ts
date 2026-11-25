/**
 * עבודה בשם לקוח מתעניין — הקבועים שמשותפים לדפדפן, למידלוור ולשרת
 * (ההסבר המלא ב-src/lib/act-as.ts).
 */

/** הכותרת שהחלון של התיק מוסיף לכל בקשה לאתר */
export const ACT_AS_HEADER = 'x-mk-act-as';

/** פרמטר הכתובת שפותח את החלון של התיק — לטעינה הראשונה, לפני שיש כותרת */
export const ACT_AS_PARAM = 'mkActAs';

/** מזהה כרטיס תקין (cuid) — כדי שערך זר לא יגיע לשאילתה */
export function validClientId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[a-z0-9]{8,40}$/i.test(value);
}
