import { planLockedFor } from './mortgage-plans';

/**
 * הנעילה של תיק המסמכים — בקובץ נפרד מ-plan-documents, שגם רכיבי דפדפן
 * מייבאים ממנו קבועים, כדי שהבדיקה מול התשלומים תישאר בשרת בלבד.
 */

/** ההודעה למי שהתיק נעול בפניו — מוצגת בחלון התיק ובכל מסלול שנחסם */
export const DOCUMENTS_LOCKED_MESSAGE =
  'תיק המסמכים זמין למנויי הפלטפורמה. כדי לפתוח אותו רוכשים גישה לתהליך, וכל מה שכבר בתיק נשמר.';

/**
 * תיק המסמכים פתוח רק למי שמשלם: בעל תהליך שהכלים בו נעולים (לא שולם, או
 * שהסתיים חודש הגישה) אינו רואה, מעלה, משנה או מוריד מסמכים. היועץ המלווה אינו
 * ננעל לעולם, והקבצים עצמם נשמרים.
 */
export async function documentsLockedFor(userId: string, planId: string): Promise<boolean> {
  return planLockedFor(userId, planId);
}

