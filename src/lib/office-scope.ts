import { prisma } from './db';

/**
 * האם לחשבון הלקוח כבר יש תיק במשרד אחר.
 *
 * יועץ לא מצרף לעצמו חשבון של לקוח שכבר משויך למשרד אחר (לפי מייל, מ"הוספת
 * לקוח" או מתיק מתעניין): הצירוף היה פותח לו את כל מה שהלקוח הזין — תהליכים,
 * מסמכים ותמהילים — בלי שהלקוח הסכים לכך.
 */
export async function linkedToAnotherAdvisor(userId: string, advisorId: string): Promise<boolean> {
  const other = await prisma.client.findFirst({
    where: { userId, NOT: { advisorId } },
    select: { id: true },
  });
  return other !== null;
}

export const OTHER_OFFICE_MESSAGE =
  'הלקוח הזה כבר משויך למשרד אחר בפלטפורמה, ולכן אי אפשר לצרף אותו מכאן. אפשר לפתוח לו תיק מתעניין בלי מייל, או לפנות לתמיכה';
