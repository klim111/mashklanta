import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { canonicalSiteOrigin } from '@/lib/auth-url';
import { normalizeEmail } from '@/lib/find-user-by-login';
import { rateLimit } from '@/lib/rate-limit';
import { generateToken, hashToken } from '@/lib/registration';

/**
 * "שכחתי סיסמה": קישור חד-פעמי במייל שמאפשר לבחור סיסמה חדשה.
 *
 * הקישור נשמר בטבלת VerificationToken הקיימת (בלי שינוי במסד הנתונים):
 *   identifier = "password-reset:<userId>", token = SHA-256 של הטוקן שבמייל.
 * כך דליפת הטבלה לא מדליפה קישורים. בקשה חדשה מבטלת את הקישורים הקודמים,
 * והשימוש מוחק את הרשומה — המחיקה היא שמכריעה מרוץ בין שני שימושים.
 */

export const RESET_TTL_MINUTES = 60;
const IDENTIFIER_PREFIX = 'password-reset:';

function resetUrl(token: string, requestOrigin?: string | null): string {
  const origin = canonicalSiteOrigin() ?? requestOrigin ?? 'http://localhost:3000';
  return `${origin}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export type ResetRequestResult = 'sent' | 'cooldown' | 'limit' | 'email-failed';

/**
 * שולחת קישור לבחירת סיסמה חדשה, אם יש חשבון עם המייל הזה.
 * כשאין חשבון התשובה זהה ('sent'), כדי שהעמוד לא ישמש לבירור אילו מיילים רשומים.
 */
export async function requestPasswordReset(
  rawEmail: string,
  requestOrigin?: string | null
): Promise<ResetRequestResult> {
  const email = normalizeEmail(rawEmail);

  const cooldown = await rateLimit(`password-reset:cooldown:${email}`, { limit: 1, windowSeconds: 60 });
  if (!cooldown.allowed) return 'cooldown';
  const hourly = await rateLimit(`password-reset:hour:${email}`, { limit: 5, windowSeconds: 3600 });
  if (!hourly.allowed) return 'limit';

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, name: true, email: true, role: true },
  });
  // ליועץ אין סיסמה: הוא נכנס רק בקישור של הכניסה הנסתרת
  if (!user?.email || user.role === 'ADVISOR') return 'sent';

  const identifier = `${IDENTIFIER_PREFIX}${user.id}`;
  const token = generateToken();
  const now = Date.now();

  await prisma.$transaction([
    // רק הקישור האחרון שנשלח תקף; מנקים גם קישורים ישנים של משתמשים אחרים
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: IDENTIFIER_PREFIX }, expires: { lt: new Date(now) } },
    }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: hashToken(token),
        expires: new Date(now + RESET_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const url = resetUrl(token, requestOrigin);
  const template = emailTemplates.passwordResetEmail({
    name: user.name,
    resetUrl: url,
    ttlMinutes: RESET_TTL_MINUTES,
  });
  const result = await sendEmail({ to: user.email, subject: template.subject, html: template.html, text: template.text });
  if (!result.success && process.env.NODE_ENV !== 'production') {
    // בפיתוח מקומי, בלי שירות מייל, הקישור מודפס כדי שאפשר יהיה לבדוק את התהליך
    console.info(`[password-reset] link for ${user.email}: ${url}`);
    return 'sent';
  }
  return result.success ? 'sent' : 'email-failed';
}

async function findValidToken(token: string) {
  if (!token) return null;
  const row = await prisma.verificationToken.findUnique({ where: { token: hashToken(token) } });
  if (!row || !row.identifier.startsWith(IDENTIFIER_PREFIX)) return null;
  if (row.expires.getTime() < Date.now()) return null;
  return row;
}

/** האם הקישור עדיין תקף — כדי שהעמוד יגיד מיד שפג תוקפו, לפני שמקלידים סיסמה */
export async function resetTokenIsValid(token: string): Promise<boolean> {
  return Boolean(await findValidToken(token));
}

export type ResetResult = 'done' | 'invalid';

/** מחליפה את הסיסמה של בעל הקישור. הסיסמה כבר נבדקה מול כללי הסיסמה */
export async function resetPassword(token: string, password: string): Promise<ResetResult> {
  const row = await findValidToken(token);
  if (!row) return 'invalid';

  // המחיקה מכריעה: רק מי שמחק את הרשומה בפועל מחליף את הסיסמה
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: row.token } });
  if (count !== 1) return 'invalid';

  const userId = row.identifier.slice(IDENTIFIER_PREFIX.length);
  const hashedPassword = await bcrypt.hash(password, 12);
  const updated = await prisma.user.updateMany({
    where: { id: userId, role: { not: 'ADVISOR' } },
    // מי שפתח את הקישור הוכיח שהמייל שלו
    data: { hashedPassword, emailVerified: new Date() },
  });
  return updated.count === 1 ? 'done' : 'invalid';
}
