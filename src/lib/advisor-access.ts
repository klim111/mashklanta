import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { canonicalSiteOrigin } from '@/lib/auth-url';
import { normalizeEmail } from '@/lib/find-user-by-login';
import { rateLimit } from '@/lib/rate-limit';
import { generateToken, hashToken, sameHash } from '@/lib/registration';
import { ADVISOR_EMAIL, ensureSingleAdvisor } from '@/lib/single-advisor';

/**
 * הכניסה הנסתרת של היועץ.
 *
 * אין קישור אליה מאף מקום באתר, ואין בה סיסמה: מי שמקליד בה את מייל היועץ
 * מקבל לתיבת המייל של היועץ (ורק לשם) קישור חד-פעמי ל-15 דקות. הקישור עובד רק
 * באותו דפדפן שביקש אותו — הדפדפן מקבל עוגייה סודית, והקישור קשור אליה — כך
 * שמייל שהועבר הלאה, דלף או נפתח במכשיר אחר לא מכניס אף אחד.
 *
 * כל מה שמוקלד בעמוד מקבל אותה תשובה, כדי שהעמוד לא יגלה דבר למי שמצא אותו.
 *
 * הקישור נשמר בטבלת VerificationToken הקיימת (בלי שינוי במסד):
 *   identifier = "advisor-login:<SHA-256 של עוגיית הדפדפן>", token = SHA-256 של הטוקן שבמייל.
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

/**
 * מאשרת את הקישור ומחזירה את היועץ להתחברות. הקישור נמחק בשימוש — המחיקה היא
 * שמכריעה מרוץ בין שני שימושים — ורק אז המסד מובא למצב של יועץ יחיד.
 */
export async function confirmAdvisorLink(token: string, deviceToken: string | null) {
  if (!token) throw new AdvisorLinkError('AdvisorLinkInvalid');
  const row = await prisma.verificationToken.findUnique({ where: { token: hashToken(token) } });
  if (!row || !row.identifier.startsWith(IDENTIFIER_PREFIX)) throw new AdvisorLinkError('AdvisorLinkInvalid');
  if (!deviceToken || !sameHash(row.identifier.slice(IDENTIFIER_PREFIX.length), hashToken(deviceToken))) {
    throw new AdvisorLinkError('AdvisorLinkOtherBrowser');
  }
  if (row.expires.getTime() < Date.now()) throw new AdvisorLinkError('AdvisorLinkExpired');

  const { count } = await prisma.verificationToken.deleteMany({ where: { token: row.token } });
  if (count !== 1) throw new AdvisorLinkError('AdvisorLinkInvalid');

  const { advisor } = await ensureSingleAdvisor();
  return advisor;
}

/** מייל קצר אחרי כל כניסה, כדי שכניסה שלא אתה עשית לא תעבור בשקט */
export async function notifyAdvisorLogin(details: { ip: string; userAgent: string | null }) {
  const template = emailTemplates.advisorLoginNotice({ when: new Date(), ...details });
  await sendEmail({ to: ADVISOR_EMAIL, subject: template.subject, html: template.html, text: template.text }).catch(
    () => null
  );
}
