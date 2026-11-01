import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { syncStageDocuments } from './clients';
import { PROSPECT_EMAIL_DOMAIN, isProspectEmail } from './prospect-email';

export { NOT_PROSPECT_USER, PROSPECT_EMAIL_DOMAIN, isProspectEmail } from './prospect-email';

/**
 * תיק לקוח מתעניין — לקוח שהיועץ פותח לו תיק בעצמו, בלי שנרשם.
 *
 * כל הנתונים בפלטפורמה שייכים לחשבון של לקוח (`ownerId`), ולכן מאחורי התיק
 * עומד חשבון זמני: בלי סיסמה ובלי דרך להתחבר אליו, עם כתובת מייל פנימית
 * שאינה כתובת אמיתית. היועץ עובד בכלים בשם החשבון הזה (src/lib/act-as.ts),
 * וכל מה שהוא מזין נשמר תחתיו, כמו אצל כל לקוח.
 *
 * כשהלקוח נרשם בעצמו עם המייל שהיועץ רשם בתיק, התיק עובר לחשבון החדש שלו
 * (`claimProspectFile`): התהליכים, התמהילים, נתוני הכלים, המסמכים והפגישות —
 * והוא רואה באזור האישי את מה שהיועץ הזין.
 *
 * תיק כזה נחשב ליווי (autoLinked=false), ולכן כל הכלים בו פתוחים בלי תשלום.
 */

export interface OpenProspectInput {
  advisorId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
}

export interface OpenProspectResult {
  clientId: string;
  /** false — נמצא תיק קיים של אותו לקוח, והוא זה שנפתח */
  created: boolean;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed : null;
}

function digits(value: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

/**
 * פתיחת תיק לקוח מתעניין אצל היועץ, או החזרת התיק הקיים.
 *
 * אם כבר יש ליועץ לקוח עם אותו מייל או אותו טלפון — נפתח התיק שלו ולא נוצר
 * כפול. אם יש חשבון רשום עם המייל הזה ואין לו עדיין תיק אצל היועץ — נפתח לו
 * תיק רגיל, כי הוא כבר לקוח רשום. אחרת נוצרים חשבון זמני ותיק מתעניין.
 */
export async function openProspectClientFile(input: OpenProspectInput): Promise<OpenProspectResult> {
  const name = clean(input.name);
  if (!name) throw new Error('נדרש שם ללקוח');
  const phone = clean(input.phone);
  const email = clean(input.email)?.toLowerCase() ?? null;
  const notes = clean(input.note);

  // תיק קיים של אותו לקוח אצל היועץ
  const candidates = await prisma.client.findMany({
    where: {
      advisorId: input.advisorId,
      OR: [...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []), ...(phone ? [{ phone: { not: null } }] : [])],
    },
    select: { id: true, email: true, phone: true },
  });
  const match = candidates.find(
    (row) =>
      (email && row.email.toLowerCase() === email) ||
      (phone && digits(row.phone).length >= 7 && digits(row.phone) === digits(phone))
  );
  if (match) return { clientId: match.id, created: false };

  // לקוח שכבר רשום בפלטפורמה — תיק רגיל על החשבון שלו
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (user && user.role === 'CLIENT' && user.id !== input.advisorId) {
      const existing = await prisma.client.findUnique({
        where: { advisorId_userId: { advisorId: input.advisorId, userId: user.id } },
        select: { id: true },
      });
      if (existing) return { clientId: existing.id, created: false };
      const client = await prisma.client.create({
        data: { advisorId: input.advisorId, userId: user.id, name, email, phone, notes },
        select: { id: true },
      });
      await syncStageDocuments(client.id, 'INTAKE');
      return { clientId: client.id, created: true };
    }
  }

  const placeholderEmail = `prospect-${randomBytes(9).toString('hex')}@${PROSPECT_EMAIL_DOMAIN}`;
  const client = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email: placeholderEmail, role: 'CLIENT' },
      select: { id: true },
    });
    return tx.client.create({
      data: {
        advisorId: input.advisorId,
        userId: user.id,
        name,
        // המייל האמיתי, אם נמסר, נשמר בתיק — לפיו התיק עובר ללקוח כשהוא נרשם
        email: email ?? '',
        phone,
        notes,
        prospect: true,
        status: 'POTENTIAL',
      },
      select: { id: true },
    });
  });
  await syncStageDocuments(client.id, 'INTAKE');
  return { clientId: client.id, created: true };
}

/** תיק מתעניין של היועץ — לעבודה בכלים בשם הלקוח */
export async function prospectFileFor(advisorId: string, clientId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, advisorId, prospect: true },
    select: { id: true, name: true, email: true, phone: true, userId: true, user: { select: { email: true } } },
  });
}

/**
 * הלקוח נרשם בעצמו: תיק מתעניין שנפתח עם המייל שלו עובר לחשבון החדש.
 *
 * כל מה שהיועץ הזין בשם החשבון הזמני עובר לחשבון של הלקוח, הכרטיס מצביע
 * עליו ומפסיק להיות "מתעניין", והחשבון הזמני נמחק. מחזיר את הכרטיס, או null
 * כשאין תיק כזה. הפעולה בטוחה לקריאה חוזרת.
 */
export async function claimProspectFile(userId: string): Promise<{ clientId: string; advisorId: string } | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true, toolDataJson: true } });
  const email = user?.email?.trim().toLowerCase();
  if (!user || user.role !== 'CLIENT' || !email || isProspectEmail(email)) return null;

  const file = await prisma.client.findFirst({
    where: { prospect: true, email: { equals: email, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, advisorId: true, userId: true, user: { select: { toolDataJson: true } } },
  });
  if (!file || file.userId === userId) return null;
  const from = file.userId;

  // לקוח שכבר יש לו תיק אצל אותו יועץ — לא נוגעים (אין שני תיקים לאותו ליווי)
  const clash = await prisma.client.findUnique({
    where: { advisorId_userId: { advisorId: file.advisorId, userId } },
    select: { id: true },
  });
  if (clash) return null;

  const owned = { where: { ownerId: from }, data: { ownerId: userId } };
  await prisma.$transaction(async (tx) => {
    await tx.mortgagePlan.updateMany(owned);
    await tx.planDocument.updateMany(owned);
    await tx.mortgageMix.updateMany(owned);
    await tx.bankRateRequest.updateMany(owned);
    await tx.advisorServiceOrder.updateMany(owned);
    await tx.advisorLead.updateMany(owned);
    await tx.clientTask.updateMany(owned);
    const equity = await tx.equityPlan.findUnique({ where: { ownerId: userId }, select: { id: true } });
    if (!equity) await tx.equityPlan.updateMany(owned);
    await tx.conversationMessage.updateMany({ where: { clientUserId: from }, data: { clientUserId: userId } });
    await tx.conversationEmail.updateMany({ where: { clientUserId: from }, data: { clientUserId: userId } });
    // נתוני הכלים — רק כשלחשבון החדש עדיין אין משלו
    const carried = file.user?.toolDataJson;
    if (carried && !user.toolDataJson) {
      await tx.user.update({ where: { id: userId }, data: { toolDataJson: carried as Prisma.InputJsonValue } });
    }
    await tx.conversationRecipient.updateMany({ where: { clientUserId: from }, data: { clientUserId: userId } });
    await tx.client.update({ where: { id: file.id }, data: { userId, prospect: false } });
    await tx.user.delete({ where: { id: from } });
  });
  return { clientId: file.id, advisorId: file.advisorId };
}
