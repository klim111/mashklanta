import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { canonicalSiteOrigin } from '@/lib/auth-url';
import { advisorOrigin } from '@/lib/advisor-host';
import { normalizeEmail } from '@/lib/find-user-by-login';
import { passwordProblem } from '@/lib/password-policy';
import { rateLimit } from '@/lib/rate-limit';
import { generateToken, hashToken, sameHash } from '@/lib/registration';
import { ADVISOR_EMAIL, ensurePlatformAdvisor } from '@/lib/single-advisor';

/**
 * הכניסה הנסתרת של היועץ.
 *
 * אין קישור אליה מאף מקום באתר. מי שמקליד בה מייל של יועץ מורשה — יועץ
 * הפלטפורמה, או יועץ שבקשת ההצטרפות שלו אושרה והמשרד שלו לא הושעה — מקבל
 * לתיבת המייל של אותו יועץ (ורק לשם) קישור חד-פעמי ל-15 דקות, ואחרי פתיחת הקישור נדרשת
 * גם סיסמת היועץ (בכניסה הראשונה היועץ בוחר אותה). הקישור עובד רק
 * באותו דפדפן שביקש אותו — הדפדפן מקבל עוגייה סודית, והקישור קשור אליה — כך
 * שמייל שהועבר הלאה, דלף או נפתח במכשיר אחר לא מכניס אף אחד.
 *
 * כל מה שמוקלד בעמוד מקבל אותה תשובה, כדי שהעמוד לא יגלה דבר למי שמצא אותו.
 *
 * הקישור נשמר בטבלת VerificationToken הקיימת (בלי שינוי במסד):
 *   identifier = "advisor-login:<מזהה היועץ>:<SHA-256 של עוגיית הדפדפן>[:<ניסיונות סיסמה שגויים>]",
 *   token = SHA-256 של הטוקן שבמייל.
 * לכל יועץ קישור תקף אחד בכל רגע, והסיסמה נשמרת ב-User.hashedPassword שלו. ההתחברות הרגילה בסיסמה עדיין
 * דוחה את היועץ — הסיסמה תקפה רק אחרי הקישור.
 */

export const ADVISOR_LINK_TTL_MINUTES = 15;
export const ADVISOR_DEVICE_COOKIE = 'mk_adv_device';
const IDENTIFIER_PREFIX = 'advisor-login:';

function confirmUrl(token: string, requestOrigin?: string | null): string {
  // כשיש כתובת נפרדת ליועצים, הכניסה נשמרת שם (src/lib/advisor-host.ts)
  const origin = advisorOrigin() ?? canonicalSiteOrigin() ?? requestOrigin ?? 'http://localhost:3000';
  return `${origin}/auth/advisor-verify?token=${encodeURIComponent(token)}`;
}

export type AdvisorLinkRequest = { result: 'sent' | 'limit'; deviceToken: string };

type LoginAdvisor = { id: string; email: string; name: string | null };

/**
 * היועץ שהמייל הזה מכניס, או null. יועץ הפלטפורמה תמיד; כל יועץ אחר רק אם
 * החשבון שלו הוא חשבון יועץ (נפתח באישור בקשת ההצטרפות) והמשרד שלו לא הושעה.
 */
export async function advisorForLogin(typedEmail: string): Promise<LoginAdvisor | null> {
  const email = normalizeEmail(typedEmail);
  if (!email) return null;
  if (email === ADVISOR_EMAIL) {
    const advisor = await ensurePlatformAdvisor();
    return { id: advisor.id, email: ADVISOR_EMAIL, name: advisor.name };
  }
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, role: 'ADVISOR' },
    select: { id: true, email: true, name: true, office: { select: { suspendedAt: true } } },
  });
  if (!user?.email || !user.office || user.office.suspendedAt) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/** האם החשבון עדיין רשאי להיות מחובר כיועץ (השעיה מנתקת גם כניסה פתוחה) */
export async function advisorStillAllowed(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true, office: { select: { suspendedAt: true } } },
  });
  if (!user || user.role !== 'ADVISOR') return false;
  if (normalizeEmail(user.email ?? '') === ADVISOR_EMAIL) return true;
  return Boolean(user.office && !user.office.suspendedAt);
}

const prefixFor = (advisorId: string) => `${IDENTIFIER_PREFIX}${advisorId}:`;

export async function requestAdvisorLink(
  typedEmail: string,
  deviceToken: string | null,
  requestOrigin?: string | null
): Promise<AdvisorLinkRequest> {
  const device = deviceToken || generateToken();

  // כל מייל אחר מקבל אותה תשובה — "אם הכתובת נכונה, נשלח קישור" — בלי לשלוח דבר
  const advisor = await advisorForLogin(typedEmail);
  if (!advisor) return { result: 'sent', deviceToken: device };

  const hourly = await rateLimit(`advisor-login:hour:${advisor.id}`, { limit: 20, windowSeconds: 3600 });
  if (!hourly.allowed) return { result: 'limit', deviceToken: device };

  const token = generateToken();
  const now = Date.now();
  await prisma.$transaction([
    // רק הקישור האחרון שנשלח ליועץ הזה תקף
    prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: prefixFor(advisor.id) } } }),
    prisma.verificationToken.create({
      data: {
        identifier: `${prefixFor(advisor.id)}${hashToken(device)}`,
        token: hashToken(token),
        expires: new Date(now + ADVISOR_LINK_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const url = confirmUrl(token, requestOrigin);
  const template = emailTemplates.advisorLoginEmail({ loginUrl: url, ttlMinutes: ADVISOR_LINK_TTL_MINUTES });
  const sent = await sendEmail({ to: advisor.email, subject: template.subject, html: template.html, text: template.text });
  if (!sent.success && process.env.NODE_ENV !== 'production') {
    // בפיתוח מקומי, בלי שירות מייל, הקישור מודפס כדי שאפשר יהיה לבדוק את התהליך
    console.info(`[advisor-login] link for ${advisor.email}: ${url}`);
  }
  return { result: 'sent', deviceToken: device };
}

export class AdvisorLinkError extends Error {}

/** ניסיונות סיסמה שגויים לכל קישור. אחריהם הקישור נמחק וצריך לבקש חדש */
export const ADVISOR_PASSWORD_ATTEMPTS = 5;

/**
 * מזהה הקישור: "advisor-login:<מזהה היועץ>:<hash של עוגיית הדפדפן>", ואחרי
 * ניסיון סיסמה שגוי גם ":<מספר הניסיונות>".
 */
export function parseIdentifier(identifier: string): { advisorId: string; deviceHash: string; attempts: number } {
  const rest = identifier.slice(IDENTIFIER_PREFIX.length);
  const [advisorId, deviceHash, attempts] = rest.split(':');
  return { advisorId: advisorId ?? '', deviceHash: deviceHash ?? '', attempts: Number(attempts) || 0 };
}

/** בודקת שהקישור תקף ושייך לדפדפן הזה, בלי להשתמש בו */
async function inspectAdvisorLink(token: string, deviceToken: string | null) {
  if (!token) throw new AdvisorLinkError('AdvisorLinkInvalid');
  const row = await prisma.verificationToken.findUnique({ where: { token: hashToken(token) } });
  if (!row || !row.identifier.startsWith(IDENTIFIER_PREFIX)) throw new AdvisorLinkError('AdvisorLinkInvalid');
  const { advisorId, deviceHash, attempts } = parseIdentifier(row.identifier);
  if (!advisorId || !deviceHash) throw new AdvisorLinkError('AdvisorLinkInvalid');
  if (!deviceToken || !sameHash(deviceHash, hashToken(deviceToken))) {
    throw new AdvisorLinkError('AdvisorLinkOtherBrowser');
  }
  if (row.expires.getTime() < Date.now()) throw new AdvisorLinkError('AdvisorLinkExpired');
  // יועץ שהמשרד שלו הושעה אחרי שהקישור נשלח — הקישור כבר לא מכניס
  if (!(await advisorStillAllowed(advisorId))) throw new AdvisorLinkError('AdvisorLinkInvalid');
  return { row, advisorId, deviceHash, attempts };
}

async function advisorAccount(advisorId: string) {
  return prisma.user.findUnique({
    where: { id: advisorId },
    select: { id: true, email: true, name: true, hashedPassword: true },
  });
}

/**
 * מה עמוד הכניסה מציג אחרי פתיחת הקישור: הקלדת הסיסמה, או — בכניסה הראשונה,
 * כשעוד לא נקבעה סיסמה — בחירת סיסמה.
 */
export async function advisorLinkStep(token: string, deviceToken: string | null): Promise<'password' | 'create'> {
  const { advisorId } = await inspectAdvisorLink(token, deviceToken);
  return (await advisorAccount(advisorId))?.hashedPassword ? 'password' : 'create';
}

/**
 * מאשרת את הקישור ואת הסיסמה ומחזירה את היועץ להתחברות.
 *
 * סיסמה שגויה לא מבטלת את הקישור, אבל כל ניסיון נספר עליו, ואחרי
 * ADVISOR_PASSWORD_ATTEMPTS הקישור נמחק. רק כשהסיסמה נכונה הקישור נמחק
 * בשימוש — המחיקה היא שמכריעה מרוץ בין שני שימושים.
 */
export async function confirmAdvisorLink(
  token: string,
  deviceToken: string | null,
  secret: { password?: string | null; newPassword?: string | null } = {}
) {
  const { row, advisorId, deviceHash, attempts } = await inspectAdvisorLink(token, deviceToken);
  const account = await advisorAccount(advisorId);
  if (!account) throw new AdvisorLinkError('AdvisorLinkInvalid');
  const stored = account.hashedPassword;

  let newHash: string | null = null;
  if (stored) {
    const ok = Boolean(secret.password) && (await bcrypt.compare(String(secret.password), stored));
    if (!ok) {
      const used = attempts + 1;
      if (used >= ADVISOR_PASSWORD_ATTEMPTS) {
        await prisma.verificationToken.deleteMany({ where: { token: row.token } });
        throw new AdvisorLinkError('AdvisorPasswordLocked');
      }
      await prisma.verificationToken.updateMany({
        where: { token: row.token },
        data: { identifier: `${prefixFor(advisorId)}${deviceHash}:${used}` },
      });
      throw new AdvisorLinkError('AdvisorPasswordWrong');
    }
  } else {
    // הכניסה הראשונה: היועץ בוחר עכשיו את הסיסמה
    const chosen = String(secret.newPassword ?? '');
    if (!chosen || passwordProblem(chosen)) throw new AdvisorLinkError('AdvisorPasswordWeak');
    newHash = await bcrypt.hash(chosen, 12);
  }

  const { count } = await prisma.verificationToken.deleteMany({ where: { token: row.token } });
  if (count !== 1) throw new AdvisorLinkError('AdvisorLinkInvalid');

  if (newHash) {
    // רק אם בינתיים לא נקבעה סיסמה אחרת
    await prisma.user.updateMany({ where: { id: account.id, hashedPassword: null }, data: { hashedPassword: newHash } });
  }
  return { id: account.id, email: account.email, name: account.name, role: 'ADVISOR' as const };
}

/** מייל קצר אחרי כל כניסה, כדי שכניסה שלא אתה עשית לא תעבור בשקט */
export async function notifyAdvisorLogin(
  advisorEmail: string | null | undefined,
  details: { ip: string; userAgent: string | null }
) {
  const to = advisorEmail || ADVISOR_EMAIL;
  const template = emailTemplates.advisorLoginNotice({ when: new Date(), ...details });
  await sendEmail({ to, subject: template.subject, html: template.html, text: template.text }).catch(
    () => null
  );
}
