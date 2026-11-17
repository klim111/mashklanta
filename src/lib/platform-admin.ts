import { NextResponse } from 'next/server';
import { getServerAuth } from './auth';
import { isPlatformAdmin } from './platform-admin-core';

export { isPlatformAdmin, isPlatformAdminEmail, platformAdminEmails } from './platform-admin-core';

/**
 * שני תפקידים שונים באזור היועץ:
 *
 *   • יועץ — עובד עם הלקוחות שלו, בתוך המשרד שלו.
 *   • מנהל הפלטפורמה — מנהל את האתר כולו: תוכן האתר ודפי הנחיתה, הביקורים
 *     באתר, ההרשמות שלא הושלמו וניקוי נתוני בדיקה. אלה נתונים של כל האתר,
 *     ולא של יועץ אחד.
 *
 * בשלב הזה יש יועץ אחד, והוא גם מנהל הפלטפורמה (src/lib/single-advisor.ts).
 * ההפרדה כאן כבר עכשיו, כדי שכשיצטרף יועץ נוסף — הוא יקבל את המשרד שלו בלבד,
 * ולא יראה נתונים של האתר כולו או של יועצים אחרים.
 */

export type AdvisorAuth = { advisorId: string; platformAdmin: boolean };

/** יועץ מחובר. מחזיר את התשובה לשלוח כשאין הרשאה */
export async function requireAdvisor(): Promise<AdvisorAuth | NextResponse> {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return { advisorId, platformAdmin: await isPlatformAdmin(advisorId) };
}

/** מנהל הפלטפורמה בלבד — לנתונים ולהגדרות של האתר כולו */
export async function requirePlatformAdmin(): Promise<AdvisorAuth | NextResponse> {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  if (!auth.platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return auth;
}
