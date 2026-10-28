import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateToken, hashToken } from '@/lib/registration';
import { mergeCarriedToolData } from '@/lib/tool-data';

/**
 * מה שאורח הזין בכלים החינמיים, בדרך להתחברות עם גוגל.
 *
 * בהרשמה עם סיסמה הנתונים נשלחים עם הטופס. בגוגל אין טופס: הדפדפן יוצא לגוגל
 * וחוזר, ובדרך הנתונים שבדפדפן עלולים להיעלם — כשהאתר מעביר לכתובת הרשמית
 * שלו (www מול בלי, או כתובת Preview), כל כתובת רואה אחסון משלה; וקישור
 * האימות של הרשמה חדשה עשוי להיפתח בטלפון או בדפדפן אחר. לכן הדפדפן שומר
 * אותם כאן לפני היציאה לגוגל, ומקבל עוגייה עם המזהה. כשגוגל מחזירה את
 * הגולש (src/lib/auth.ts), הנתונים עוברים להרשמה הממתינה — ומשם לחשבון
 * באישור המייל — או ישר לחשבון קיים.
 */

export const GUEST_CARRY_COOKIE = 'mk_guest_carry';

/** מספיק לסבב אחד של התחברות, כולל מעבר לכתובת הרשמית */
export const GUEST_CARRY_TTL_SECONDS = 60 * 60;

export async function saveGuestCarry(toolData: Record<string, unknown>): Promise<string> {
  const token = generateToken();
  const now = new Date();
  // ניקוי של מה שלא נאסף — בלי משימה מתוזמנת נפרדת
  await prisma.guestCarry.deleteMany({ where: { expires: { lt: now } } }).catch(() => {});
  await prisma.guestCarry.create({
    data: {
      id: hashToken(token),
      toolDataJson: toolData as Prisma.InputJsonValue,
      expires: new Date(now.getTime() + GUEST_CARRY_TTL_SECONDS * 1000),
    },
  });
  return token;
}

/** האם המזהה (למשל מהכתובת, אחרי מעבר לכתובת הרשמית) עדיין בתוקף */
export async function guestCarryExists(token: string): Promise<boolean> {
  const row = await prisma.guestCarry.findUnique({ where: { id: hashToken(token) }, select: { expires: true } });
  return !!row && row.expires > new Date();
}

/**
 * הנתונים שהדפדפן הזה שמר בדרך לגוגל, אם יש. נאספים פעם אחת: השורה נמחקת,
 * כדי שהתחברות נוספת מאותו דפדפן לא תעביר אותם שוב.
 */
export async function takeGuestCarry(): Promise<Record<string, unknown> | null> {
  try {
    const jar = await cookies();
    const token = jar.get(GUEST_CARRY_COOKIE)?.value;
    if (!token) return null;
    const id = hashToken(token);
    const row = await prisma.guestCarry.findUnique({ where: { id } });
    if (!row) return null;
    await prisma.guestCarry.delete({ where: { id } }).catch(() => {});
    try {
      jar.delete(GUEST_CARRY_COOKIE);
    } catch {
      // לא בכל הקשר אפשר לכתוב עוגיות; השורה כבר נמחקה, והעוגייה פגה מעצמה
    }
    if (row.expires <= new Date()) return null;
    const data = row.toolDataJson;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch (error) {
    console.error('[guest-carry] read failed', error);
    return null;
  }
}

/**
 * הנתונים עוברים לחשבון קיים — רק לכלים שאין להם עדיין נתונים בחשבון. כל
 * מפתח נכתב בנפרד, כמו בשמירה הרגילה (src/app/api/profile/tool-data).
 */
export async function carryIntoAccount(userId: string, carried: Record<string, unknown>): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { toolDataJson: true } });
    if (!user) return;
    const writes = mergeCarriedToolData(user.toolDataJson, carried);
    for (const [key, value] of Object.entries(writes)) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "toolDataJson" = jsonb_set(
          COALESCE("toolDataJson", '{}'::jsonb),
          ARRAY[${key}]::text[],
          ${JSON.stringify(value)}::jsonb
        )
        WHERE "id" = ${userId}`;
    }
  } catch (error) {
    console.error('[guest-carry] carry into account failed', error);
  }
}
