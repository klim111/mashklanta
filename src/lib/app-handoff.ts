import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { generateToken, hashToken, sameHash } from '@/lib/registration';

/**
 * כניסה עם Google באפליקציה לנייד.
 *
 * גוגל חוסמת התחברות מתוך WebView, ולכן האפליקציה פותחת את ההתחברות בדפדפן
 * של המערכת. שם נוצר session רגיל, אבל הוא שייך לדפדפן ולא לאפליקציה. כדי
 * להעביר אותו, השרת מנפיק קוד חד-פעמי קצר-מועד ומחזיר אותו לאפליקציה בקישור
 * com.mashkalanta.app://, והאפליקציה מממשת אותו ונכנסת (ספק "app-handoff" ב-auth).
 *
 * כמו PKCE: האפליקציה שולחת מראש רק hash של סוד (challenge), ואת הסוד עצמו
 * (verifier) רק ברגע המימוש. אפליקציה אחרת שתיירט את הקישור לא תוכל לממש את
 * הקוד בלי הסוד, שלא יצא מהאפליקציה שלנו.
 *
 * הקוד נשמר בטבלת VerificationToken הקיימת, כמו "שכחתי סיסמה":
 *   identifier = "app-handoff:<userId>:<challenge>", token = SHA-256 של הקוד.
 */

export const APP_HANDOFF_TTL_MS = 2 * 60 * 1000;
const IDENTIFIER_PREFIX = 'app-handoff:';

/** challenge של PKCE בשיטת S256: SHA-256 של ה-verifier, ב-base64url (43 תווים) */
export function isValidChallenge(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function challengeFor(verifier: string): string {
  return crypto.createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

/** קוד חד-פעמי למשתמש שהתחבר בדפדפן, שהאפליקציה תממש תוך APP_HANDOFF_TTL_MS */
export async function issueAppHandoff(userId: string, challenge: string): Promise<string> {
  const code = generateToken();
  const now = Date.now();
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: IDENTIFIER_PREFIX }, expires: { lt: new Date(now) } },
    }),
    prisma.verificationToken.create({
      data: {
        identifier: `${IDENTIFIER_PREFIX}${userId}:${challenge}`,
        token: hashToken(code),
        expires: new Date(now + APP_HANDOFF_TTL_MS),
      },
    }),
  ]);
  return code;
}

/** מממש את הקוד: מחזיר את מזהה המשתמש, או null כשהקוד לא תקף, פג או כבר נוצל */
export async function consumeAppHandoff(code: string, verifier: string): Promise<string | null> {
  if (!code || !verifier) return null;
  const row = await prisma.verificationToken.findUnique({ where: { token: hashToken(code) } });
  if (!row || !row.identifier.startsWith(IDENTIFIER_PREFIX)) return null;

  // המחיקה מכריעה: הקוד מנוצל פעם אחת בלבד, גם כשהסוד שגוי
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: row.token } });
  if (count !== 1) return null;
  if (row.expires.getTime() < Date.now()) return null;

  const rest = row.identifier.slice(IDENTIFIER_PREFIX.length);
  const split = rest.lastIndexOf(':');
  if (split <= 0) return null;
  const userId = rest.slice(0, split);
  const challenge = rest.slice(split + 1);
  return sameHash(challengeFor(verifier), challenge) ? userId : null;
}
