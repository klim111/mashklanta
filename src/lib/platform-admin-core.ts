import { prisma } from './db';
import { ADVISOR_EMAIL } from './single-advisor';

/**
 * מי מנהל הפלטפורמה (src/lib/platform-admin.ts) — בלי תלות בהתחברות, כדי
 * שגם שכבת הנתונים תוכל לשאול.
 */

function normalizedEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** כתובות המייל של מנהלי הפלטפורמה: מנהל ברירת המחדל, ועוד מי שמוגדר בסביבה */
export function platformAdminEmails(): string[] {
  const extra = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((item) => normalizedEmail(item))
    .filter(Boolean);
  return [normalizedEmail(ADVISOR_EMAIL), ...extra];
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  const value = normalizedEmail(email);
  return Boolean(value) && platformAdminEmails().includes(value);
}

/** לפי בסיס הנתונים, ולא לפי מה שנשמר בטוקן: רק חשבון יועץ שהמייל שלו מורשה */
export async function isPlatformAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  return user?.role === 'ADVISOR' && isPlatformAdminEmail(user.email);
}

/**
 * השורות שהיועץ רואה בטבלה עם `advisorId`: שלו בלבד. מנהל הפלטפורמה רואה גם
 * שורות שעוד לא שויכו לאף יועץ (פנייה או בקשה מלקוח בלי יועץ), כדי שלא
 * ייעלמו — אבל יועץ אחר לא יראה פניות שלא נשלחו אליו.
 */
export async function advisorRowScope(
  advisorId: string
): Promise<{ advisorId: string } | { OR: Array<{ advisorId: string | null }> }> {
  return (await isPlatformAdmin(advisorId)) ? { OR: [{ advisorId }, { advisorId: null }] } : { advisorId };
}
