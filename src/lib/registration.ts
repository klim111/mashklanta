import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { canonicalSiteOrigin } from '@/lib/auth-url';
import { normalizeEmail } from '@/lib/find-user-by-login';

/**
 * הרשמת לקוח חדש עם אימות מייל.
 *
 * ההרשמה אינה יוצרת משתמש. היא שומרת הרשמה ממתינה (PendingRegistration)
 * ושולחת למייל קישור חד-פעמי שפג תוקפו. רק אישור הקישור יוצר את המשתמש
 * בבסיס הנתונים ומחבר אותו — כך אף אחד לא יכול להיכנס בשם כתובת מייל שאינה
 * שלו, לא בטעות ולא בכוונה.
 *
 * עקרונות:
 *   • הטוקן אקראי (32 בתים) ונשמר רק כ-SHA-256, כך שדליפת הטבלה לא מדליפה קישורים.
 *   • הקישור חד-פעמי: הרשומה נמחקת באישור, והמחיקה היא שמכריעה מרוץ בין שני אישורים.
 *   • שליחה מחדש מחליפה את הטוקן — רק הקישור האחרון שנשלח תקף.
 *   • אישור מדפדפן אחר מזה שנרשמו ממנו דורש את הסיסמה שנבחרה בהרשמה. מי שנרשם
 *     עם מייל של אדם אחר לא יוכל לגרום לבעל המייל "לאשר" חשבון שהסיסמה שלו
 *     בידי התוקף.
 *   • הרשמה עם גוגל דורשת מייל שגוגל עצמה אימתה, ועדיין עוברת דרך הקישור.
 *   • ההרשמה פתוחה ללקוחות בלבד. יועצים נוספים למערכת רק על ידי הנהלת האתר.
 */

/** תוקף קישור האימות */
export const VERIFICATION_TTL_MINUTES = 60;
/** זמן מינימלי בין שתי שליחות לאותו מייל */
export const RESEND_COOLDOWN_SECONDS = 60;
/** מספר השליחות המרבי לאותו מייל בחלון של שעה */
export const MAX_SENDS_PER_HOUR = 5;

/** שם העוגייה שמזהה את הדפדפן שממנו נרשמו */
export const REGISTRATION_DEVICE_COOKIE = 'mk_reg_device';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/** השוואה בזמן קבוע של שני hash-ים */
export function sameHash(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** רק נתיב יחסי באתר — כדי שקישור האימות לא יוכל לשלוח את הלקוח החוצה */
export function safeCallbackUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (value.length > 500) return null;
  return value;
}

/** "is***@gmail.com" — לתצוגה בעמוד האישור בלי לחשוף את המייל למי שמחזיק רק בקישור */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

/** שם משתמש ראשוני מתוך המייל, להרשמות שלא בחרו אחד (גוגל) */
export function usernameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
}

export type SendDecision = 'send' | 'cooldown' | 'limit';

/** האם מותר לשלוח עוד מייל אימות, לפי ההיסטוריה של ההרשמה הממתינה */
export function sendDecision(
  pending: { sendCount: number; lastSentAt: Date; createdAt: Date } | null,
  now: Date = new Date()
): SendDecision {
  if (!pending) return 'send';
  const sinceLast = now.getTime() - pending.lastSentAt.getTime();
  if (sinceLast < RESEND_COOLDOWN_SECONDS * 1000) return 'cooldown';
  const withinHour = now.getTime() - pending.createdAt.getTime() < 60 * 60 * 1000;
  if (withinHour && pending.sendCount >= MAX_SENDS_PER_HOUR) return 'limit';
  return 'send';
}

function siteOrigin(requestOrigin?: string | null): string {
  return canonicalSiteOrigin() ?? requestOrigin ?? 'http://localhost:3000';
}

export function verificationUrl(token: string, requestOrigin?: string | null): string {
  return `${siteOrigin(requestOrigin)}/auth/verify?token=${encodeURIComponent(token)}`;
}

async function deliverVerification(
  email: string,
  name: string | null,
  username: string | null,
  token: string,
  requestOrigin?: string | null
) {
  const url = verificationUrl(token, requestOrigin);
  const template = emailTemplates.verificationEmail({
    name: name ?? '',
    email,
    username,
    verificationUrl: url,
    ttlMinutes: VERIFICATION_TTL_MINUTES,
  });
  const result = await sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
  if (!result.success && process.env.NODE_ENV !== 'production') {
    // בפיתוח מקומי, בלי שירות מייל, הקישור מודפס כדי שאפשר יהיה להשלים את ההרשמה
    console.info(`[registration] verification link for ${email}: ${url}`);
    return true;
  }
  return result.success;
}

/** פעם בדקה לכל מייל, בזיכרון התהליך — מונע הצפת מיילים "כבר יש לך חשבון" */
const accountNoticeSentAt = new Map<string, number>();

async function notifyExistingAccount(email: string, requestOrigin?: string | null) {
  const last = accountNoticeSentAt.get(email) ?? 0;
  if (Date.now() - last < RESEND_COOLDOWN_SECONDS * 1000) return;
  accountNoticeSentAt.set(email, Date.now());
  const template = emailTemplates.accountExistsEmail({ loginUrl: `${siteOrigin(requestOrigin)}/auth/login` });
  await sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text }).catch(() => {});
}

async function emailHasAccount(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
}

/** האם שם המשתמש תפוס — בידי משתמש קיים או בהרשמה ממתינה של מייל אחר */
export async function usernameTaken(username: string, email: string): Promise<boolean> {
  const [user, pending] = await Promise.all([
    prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    }),
    prisma.pendingRegistration.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        email: { not: email },
        expires: { gt: new Date() },
      },
      select: { id: true },
    }),
  ]);
  return Boolean(user || pending);
}

type PendingInput = {
  email: string;
  name?: string | null;
  username?: string | null;
  password?: string | null;
  image?: string | null;
  provider?: 'google' | null;
  providerAccountId?: string | null;
  callbackUrl?: string | null;
  /** העוגייה של הדפדפן שממנו נרשמו (להרשמה עם סיסמה) */
  deviceToken?: string | null;
  requestOrigin?: string | null;
};

export type StartResult =
  /** נשלח קישור (או שהמייל כבר רשום ונשלחה הודעה מתאימה) — התשובה ללקוח זהה בשני המקרים */
  | { status: 'sent' }
  | { status: 'cooldown' }
  | { status: 'limit' }
  | { status: 'email-failed' };

/**
 * פתיחת הרשמה ממתינה ושליחת קישור האימות.
 *
 * אם המייל כבר רשום, לא נוצרת הרשמה — בעל המייל מקבל הודעה שכבר יש לו חשבון,
 * והתשובה לדפדפן זהה להרשמה רגילה. כך אי אפשר לברר דרך טופס ההרשמה אילו
 * כתובות רשומות במערכת.
 */
export async function startRegistration(input: PendingInput): Promise<StartResult> {
  const email = normalizeEmail(input.email);
  const now = new Date();

  // ניקוי הרשמות שפג תוקפן מזמן — לא חוסם, ולא מוחק את מה שעדיין אפשר לשלוח מחדש
  void prisma.pendingRegistration
    .deleteMany({ where: { expires: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
    .catch(() => {});

  if (await emailHasAccount(email)) {
    await notifyExistingAccount(email, input.requestOrigin);
    return { status: 'sent' };
  }

  const existing = await prisma.pendingRegistration.findUnique({ where: { email } });
  const decision = sendDecision(existing, now);
  if (decision !== 'send') return { status: decision };

  const token = generateToken();
  const hashedPassword = input.password ? await bcrypt.hash(input.password, 12) : null;
  const withinHour = existing && now.getTime() - existing.createdAt.getTime() < 60 * 60 * 1000;

  const data = {
    email,
    name: input.name ?? null,
    username: input.username ?? null,
    hashedPassword,
    image: input.image ?? null,
    provider: input.provider ?? null,
    providerAccountId: input.providerAccountId ?? null,
    tokenHash: hashToken(token),
    deviceHash: input.deviceToken ? hashToken(input.deviceToken) : null,
    callbackUrl: safeCallbackUrl(input.callbackUrl),
    expires: new Date(now.getTime() + VERIFICATION_TTL_MINUTES * 60 * 1000),
    lastSentAt: now,
    // מונה השליחות נשמר בתוך שעה, כדי שהרשמה חוזרת לא תעקוף את המגבלה
    sendCount: withinHour ? existing.sendCount + 1 : 1,
    createdAt: withinHour ? existing.createdAt : now,
  };

  await prisma.pendingRegistration.upsert({ where: { email }, create: data, update: data });

  const sent = await deliverVerification(email, data.name, data.username, token, input.requestOrigin);
  return sent ? { status: 'sent' } : { status: 'email-failed' };
}

/**
 * שליחה מחדש של קישור האימות, לפי מייל או לפי קישור ישן (שפג תוקפו).
 * מחליפה את הטוקן, כך שהקישור הקודם מפסיק לעבוד.
 */
export async function resendVerification(
  by: { email?: string | null; token?: string | null },
  requestOrigin?: string | null
): Promise<StartResult> {
  const pending = by.token
    ? await prisma.pendingRegistration.findUnique({ where: { tokenHash: hashToken(by.token) } })
    : by.email
      ? await prisma.pendingRegistration.findUnique({ where: { email: normalizeEmail(by.email) } })
      : null;

  // אין הרשמה ממתינה — אותה תשובה כמו בהצלחה, בלי לחשוף אם המייל קיים
  if (!pending) return { status: 'sent' };

  const now = new Date();
  const decision = sendDecision(pending, now);
  if (decision !== 'send') return { status: decision };

  const token = generateToken();
  const withinHour = now.getTime() - pending.createdAt.getTime() < 60 * 60 * 1000;
  await prisma.pendingRegistration.update({
    where: { id: pending.id },
    data: {
      tokenHash: hashToken(token),
      expires: new Date(now.getTime() + VERIFICATION_TTL_MINUTES * 60 * 1000),
      lastSentAt: now,
      sendCount: withinHour ? pending.sendCount + 1 : 1,
      createdAt: withinHour ? pending.createdAt : now,
    },
  });

  const sent = await deliverVerification(pending.email, pending.name, pending.username, token, requestOrigin);
  return sent ? { status: 'sent' } : { status: 'email-failed' };
}

export type PendingSummary =
  | {
      status: 'ok';
      maskedEmail: string;
      name: string | null;
      username: string | null;
      via: 'google' | 'password';
      createdAt: string;
      expiresAt: string;
      /** אישור מדפדפן אחר מזה שנרשמו ממנו — צריך להקליד את הסיסמה */
      needsPassword: boolean;
      callbackUrl: string | null;
    }
  | { status: 'expired' }
  | { status: 'invalid' };

/** פרטי הקישור לתצוגה בעמוד האישור — בלי לצרוך אותו */
export async function inspectVerification(token: string, deviceToken?: string | null): Promise<PendingSummary> {
  if (!token) return { status: 'invalid' };
  const pending = await prisma.pendingRegistration.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!pending) return { status: 'invalid' };
  if (pending.expires < new Date()) return { status: 'expired' };
  const sameDevice = Boolean(deviceToken) && sameHash(pending.deviceHash, hashToken(deviceToken!));
  return {
    status: 'ok',
    maskedEmail: maskEmail(pending.email),
    name: pending.name,
    username: pending.username,
    via: pending.provider === 'google' ? 'google' : 'password',
    createdAt: pending.lastSentAt.toISOString(),
    expiresAt: pending.expires.toISOString(),
    needsPassword: pending.provider !== 'google' && !sameDevice,
    callbackUrl: pending.callbackUrl,
  };
}

/** "זה לא אני" — ביטול ההרשמה הממתינה מתוך הקישור */
export async function cancelVerification(token: string): Promise<boolean> {
  if (!token) return false;
  const { count } = await prisma.pendingRegistration.deleteMany({ where: { tokenHash: hashToken(token) } });
  return count > 0;
}

/** קודי השגיאה שמוחזרים ל-signIn ומתורגמים בעמוד האישור */
export const VerificationError = {
  Invalid: 'VerificationInvalid',
  Expired: 'VerificationExpired',
  PasswordRequired: 'VerificationPasswordRequired',
  AccountExists: 'VerificationAccountExists',
} as const;

/**
 * אישור הקישור: יצירת המשתמש (ולהרשמת גוגל — גם קישור חשבון הגוגל) ומחיקת
 * ההרשמה הממתינה. מחזיר את המשתמש שנוצר, או זורק אחד מקודי VerificationError.
 */
export async function confirmRegistration(input: {
  token: string;
  password?: string | null;
  deviceToken?: string | null;
}) {
  const tokenHash = hashToken(input.token || '');
  const pending = input.token
    ? await prisma.pendingRegistration.findUnique({ where: { tokenHash } })
    : null;
  if (!pending) throw new Error(VerificationError.Invalid);
  if (pending.expires < new Date()) throw new Error(VerificationError.Expired);

  if (pending.provider !== 'google') {
    const sameDevice =
      Boolean(input.deviceToken) && sameHash(pending.deviceHash, hashToken(input.deviceToken!));
    if (!sameDevice) {
      const ok =
        Boolean(input.password && pending.hashedPassword) &&
        (await bcrypt.compare(input.password!, pending.hashedPassword!));
      if (!ok) throw new Error(VerificationError.PasswordRequired);
    }
  }

  // המחיקה מכריעה: אם שני אישורים מקבילים, רק אחד מוחק את הרשומה וממשיך
  const { count } = await prisma.pendingRegistration.deleteMany({ where: { id: pending.id, tokenHash } });
  if (count !== 1) throw new Error(VerificationError.Invalid);

  if (await emailHasAccount(pending.email)) throw new Error(VerificationError.AccountExists);

  let username = pending.username ?? usernameFromEmail(pending.email);
  if (username.length < 3 || (await usernameTaken(username, pending.email))) {
    username = '';
  }

  try {
    return await prisma.user.create({
      data: {
        email: pending.email,
        name: pending.name,
        username: username || null,
        hashedPassword: pending.hashedPassword,
        image: pending.image,
        emailVerified: new Date(),
        role: 'CLIENT',
        ...(pending.provider && pending.providerAccountId
          ? {
              accounts: {
                create: {
                  type: 'oauth',
                  provider: pending.provider,
                  providerAccountId: pending.providerAccountId,
                },
              },
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(VerificationError.AccountExists);
    }
    throw error;
  }
}

/** האם יש הרשמה ממתינה עם הסיסמה הזו — כדי להגיד למי שמנסה להתחבר שעליו לאשר את המייל */
export async function pendingMatchesLogin(identifier: string, password: string): Promise<boolean> {
  const value = identifier.trim();
  if (!value || !password) return false;
  const pending = await prisma.pendingRegistration.findFirst({
    where: value.includes('@')
      ? { email: normalizeEmail(value) }
      : { username: { equals: value, mode: 'insensitive' } },
  });
  if (!pending?.hashedPassword) return false;
  return bcrypt.compare(password, pending.hashedPassword);
}
