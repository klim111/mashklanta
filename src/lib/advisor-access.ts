import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { canonicalSiteOrigin } from '@/lib/auth-url';
import { normalizeEmail } from '@/lib/find-user-by-login';
import { passwordProblem } from '@/lib/password-policy';
import { rateLimit } from '@/lib/rate-limit';
import { generateToken, hashToken, sameHash } from '@/lib/registration';
import { ADVISOR_EMAIL, ensureSingleAdvisor } from '@/lib/single-advisor';

/**
 * הכניסה הנסתרת של היועץ.
 *
 * אין קישור אליה מאף מקום באתר. מי שמקליד בה את מייל היועץ מקבל לתיבת
 * המייל של היועץ (ורק לשם) קישור חד-פעמי ל-15 דקות, ואחרי פתיחת הקישור נדרשת
 * גם סיסמת היועץ (בכניסה הראשונה היועץ בוחר אותה). הקישור עובד רק
 * באותו דפדפן שביקש אותו — הדפדפן מקבל עוגייה סודית, והקישור קשור אליה — כך
 * שמייל שהועבר הלאה, דלף או נפתח במכשיר אחר לא מכניס אף אחד.
 *
 * כל מה שמוקלד בעמוד מקבל אותה תשובה, כדי שהעמוד לא יגלה דבר למי שמצא אותו.
 *
 * הקישור נשמר בטבלת VerificationToken הקיימת (בלי שינוי במסד):
 *   identifier = "advisor-login:<SHA-256 של עוגיית הדפדפן>[:<ניסיונות סיסמה שגויים>]",
 *   token = SHA-256 של הטוקן שבמייל.
 * הסיסמה נשמרת ב-User.hashedPassword של היועץ. ההתחברות הרגילה בסיסמה עדיין
 * דוחה את היועץ — הסיסמה תקפה רק אחרי הקישור.
 */

export const ADVISOR_LINK_TTL_MINUTES = 15;
export const ADVISOR_DEVICE_COOKIE = 'mk_adv_device';
const IDENTIFIER_PREFIX = 'advisor-login:';

function confirmUrl(token: string, requestOrigin?: string | null): string {
  const origin = canonicalSiteOrigin() ?? requestOrigin ?? 'http://localhost:3000';
  return `${origin}/auth/advisor-verify?token=${encodeURIComponent(token)}`;
}

export type AdvisorLinkRequest = { result: 'sent' | 'limit'; deviceToken: string };

export async function requestAdvisorLink(
  typedEmail: string,
  deviceToken: string | null,
  requestOrigin?: string | null
): Promise<AdvisorLinkRequest> {
  const device = deviceToken || generateToken();

  // כל מייל אחר מקבל אותה תשובה — "אם הכתובת נכונה, נשלח קישור" — בלי לשלוח דבר
  if (normalizeEmail(typedEmail) !== ADVISOR_EMAIL) return { result: 'sent', deviceToken: device };

  const hourly = await rateLimit('advisor-login:hour', { limit: 20, windowSeconds: 3600 });
  if (!hourly.allowed) return { result: 'limit', deviceToken: device };

  const token = generateToken();
  const now = Date.now();
  await prisma.$transaction([
    // רק הקישור האחרון שנשלח תקף
    prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: IDENTIFIER_PREFIX } } }),
    prisma.verificationToken.create({
      data: {
        identifier: `${IDENTIFIER_PREFIX}${hashToken(device)}`,
        token: hashToken(token),
        expires: new Date(now + ADVISOR_LINK_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const url = confirmUrl(token, requestOrigin);
  const template = emailTemplates.advisorLoginEmail({ loginUrl: url, ttlMinutes: ADVISOR_LINK_TTL_MINUTES });
  const sent = await sendEmail({ to: ADVISOR_EMAIL, subject: template.subject, html: template.html, text: template.text });
  if (!sent.success && process.env.NODE_ENV !== 'production') {
    // בפיתוח מקומי, בלי שירות מייל, הקישור מודפס כדי שאפשר יהיה לבדוק את התהליך
    console.info(`[advisor-login] link: ${url}`);
  }
  return { result: 'sent', deviceToken: device };
}

export class AdvisorLinkError extends Error {}

/** ניסיונות סיסמה שגויים לכל קישור. אחריהם הקישור נמחק וצריך לבקש חדש */
export const ADVISOR_PASSWORD_ATTEMPTS = 5;

/**
 * מזהה הקישור: "advisor-login:<hash של עוגיית הדפדפן>", ואחרי ניסיון סיסמה
 * שגוי גם ":<מספר הניסיונות>".
 */
function parseIdentifier(identifier: string): { deviceHash: string; attempts: number } {
  const rest = identifier.slice(IDENTIFIER_PREFIX.length);
  const [deviceHash, attempts] = rest.split(':');
  return { deviceHash, attempts: Number(attempts) || 0 };
}

/** בודקת שהקישור תקף ושייך לדפדפן הזה, בלי להשתמש בו */
async function inspectAdvisorLink(token: string, deviceToken: string | null) {
  if (!token) throw new AdvisorLinkError('AdvisorLinkInvalid');
  const row = await prisma.verificationToken.findUnique({ where: { token: hashToken(token) } });
  if (!row || !row.identifier.startsWith(IDENTIFIER_PREFIX)) throw new AdvisorLinkError('AdvisorLinkInvalid');
  const { deviceHash, attempts } = parseIdentifier(row.identifier);
  if (!deviceToken || !sameHash(deviceHash, hashToken(deviceToken))) {
    throw new AdvisorLinkError('AdvisorLinkOtherBrowser');
  }
  if (row.expires.getTime() < Date.now()) throw new AdvisorLinkError('AdvisorLinkExpired');
  return { row, deviceHash, attempts };
}

async function advisorPasswordHash(): Promise<string | null> {
  const advisor = await prisma.user.findFirst({
    where: { email: { equals: ADVISOR_EMAIL, mode: 'insensitive' } },
    select: { hashedPassword: true },
  });
  return advisor?.hashedPassword ?? null;
}

/**
 * מה עמוד הכניסה מציג אחרי פתיחת הקישור: הקלדת הסיסמה, או — בכניסה הראשונה,
 * כשעוד לא נקבעה סיסמה — בחירת סיסמה.
 */
export async function advisorLinkStep(token: string, deviceToken: string | null): Promise<'password' | 'create'> {
  await inspectAdvisorLink(token, deviceToken);
  return (await advisorPasswordHash()) ? 'password' : 'create';
}

/**
 * מאשרת את הקישור ואת הסיסמה ומחזירה את היועץ להתחברות.
 *
 * סיסמה שגויה לא מבטלת את הקישור, אבל כל ניסיון נספר עליו, ואחרי
 * ADVISOR_PASSWORD_ATTEMPTS הקישור נמחק. רק כשהסיסמה נכונה הקישור נמחק
 * בשימוש — המחיקה היא שמכריעה מרוץ בין שני שימושים — ואז המסד מובא למצב של
 * יועץ יחיד.
 */
export async function confirmAdvisorLink(
  token: string,
  deviceToken: string | null,
  secret: { password?: string | null; newPassword?: string | null } = {}
) {
  const { row, deviceHash, attempts } = await inspectAdvisorLink(token, deviceToken);
  const stored = await advisorPasswordHash();

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
        data: { identifier: `${IDENTIFIER_PREFIX}${deviceHash}:${used}` },
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

  const { advisor } = await ensureSingleAdvisor();
  if (newHash) {
    // רק אם בינתיים לא נקבעה סיסמה אחרת
    await prisma.user.updateMany({ where: { id: advisor.id, hashedPassword: null }, data: { hashedPassword: newHash } });
  }
  return advisor;
}

/** מייל קצר אחרי כל כניסה, כדי שכניסה שלא אתה עשית לא תעבור בשקט */
export async function notifyAdvisorLogin(details: { ip: string; userAgent: string | null }) {
  const template = emailTemplates.advisorLoginNotice({ when: new Date(), ...details });
  await sendEmail({ to: ADVISOR_EMAIL, subject: template.subject, html: template.html, text: template.text }).catch(
    () => null
  );
}
