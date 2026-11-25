import { prisma } from '@/lib/db';

/**
 * יועץ הפלטפורמה: איגור לבדינסקי, mashkalanta@gmail.com.
 *
 * עד עכשיו היה בפלטפורמה יועץ אחד, וכל כניסה שלו מיזגה אליו ומחקה כל חשבון
 * יועץ אחר. מעכשיו יש יועצים נוספים, כל אחד במשרד משלו
 * (src/lib/advisor-applications.ts), ולכן אין יותר מיזוג או מחיקה: הפונקציה
 * כאן רק מוודאת שחשבון יועץ הפלטפורמה קיים ושהתפקיד שלו נכון.
 *
 * יועץ הפלטפורמה הוא גם מנהל הפלטפורמה (src/lib/platform-admin-core.ts), ואליו
 * משויכים לקוחות שנרשמו באתר הראשי, בלי דף משרד (src/lib/advisor-link.ts).
 */

export const ADVISOR_EMAIL = 'mashkalanta@gmail.com';
export const ADVISOR_NAME = 'איגור לבדינסקי';

export type PlatformAdvisor = { id: string; email: string | null; name: string | null; role: 'ADVISOR' };

export async function ensurePlatformAdvisor(): Promise<PlatformAdvisor> {
  const select = { id: true, role: true, name: true, email: true } as const;
  let advisor = await prisma.user.findFirst({
    where: { email: { equals: ADVISOR_EMAIL, mode: 'insensitive' } },
    select,
  });

  if (!advisor) {
    try {
      advisor = await prisma.user.create({
        data: { email: ADVISOR_EMAIL, name: ADVISOR_NAME, role: 'ADVISOR', emailVerified: new Date() },
        select,
      });
    } catch {
      // נפתח במקביל בבקשה אחרת
      advisor = await prisma.user.findFirstOrThrow({
        where: { email: { equals: ADVISOR_EMAIL, mode: 'insensitive' } },
        select,
      });
    }
  } else if (advisor.role !== 'ADVISOR') {
    // הסיסמה נשארת: היא השלב השני של הכניסה, אחרי הקישור במייל (src/lib/advisor-access.ts)
    await prisma.user.update({ where: { id: advisor.id }, data: { role: 'ADVISOR' } });
  }

  return { id: advisor.id, email: advisor.email ?? ADVISOR_EMAIL, name: advisor.name ?? ADVISOR_NAME, role: 'ADVISOR' };
}
