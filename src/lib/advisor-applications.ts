import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { authEmailShell, escapeHtml, sendEmail } from './email';
import { canonicalSiteOrigin } from './auth-url';
import { advisorOrigin } from './advisor-host';
import { normalizeEmail } from './find-user-by-login';
import { ADVISOR_EMAIL } from './single-advisor';
import { platformAdminEmails } from './platform-admin-core';
import { getOrCreateAdvisorOffice } from './office-store';
import { DEFAULT_OFFICE_PROFILE, normalizeOfficeProfile } from './office';

/**
 * הצטרפות של יועצים לפלטפורמה.
 *
 * יועץ ממלא טופס בדף /join, והבקשה נשמרת כ"ממתינה". שום חשבון ושום משרד לא
 * נפתחים עד שמנהל הפלטפורמה מאשר אותה ידנית (כך נקבע במסמך האסטרטגיה, כדי שלא
 * ייפתחו משרדים מזויפים על המותג). באישור:
 *   • נפתח חשבון יועץ למייל שבבקשה (תפקיד ADVISOR, בלי סיסמה),
 *   • נפתח לו משרד משלו, לא פעיל, עם שם המשרד והטלפון מהבקשה,
 *   • נשלח אליו מייל עם הקישור לכניסת היועצים. בכניסה הראשונה הוא מקבל קישור
 *     למייל ובוחר סיסמה (src/lib/advisor-access.ts).
 *
 * כל יועץ עובד רק בתוך המשרד שלו: הלקוחות, הפניות, המשימות והתמהילים שלו
 * מסוננים לפי מזהה היועץ, ומנהל הפלטפורמה יכול להשעות משרד.
 */

export const APPLICATION_LIMITS = {
  name: 80,
  email: 120,
  phone: 20,
  officeName: 60,
  licenseNumber: 30,
  website: 200,
  message: 1000,
} as const;

export interface AdvisorApplicationInput {
  name: string;
  email: string;
  phone: string;
  officeName: string;
  licenseNumber: string | null;
  website: string | null;
  message: string | null;
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** בדיקת הטופס. מחזיר את הבקשה המנורמלת, או הודעת שגיאה בעברית */
export function parseAdvisorApplication(
  body: unknown
): { ok: true; input: AdvisorApplicationInput } | { ok: false; error: string } {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const name = text(raw.name, APPLICATION_LIMITS.name);
  const email = normalizeEmail(text(raw.email, APPLICATION_LIMITS.email));
  const phone = text(raw.phone, APPLICATION_LIMITS.phone);
  const officeName = text(raw.officeName, APPLICATION_LIMITS.officeName);
  const licenseNumber = text(raw.licenseNumber, APPLICATION_LIMITS.licenseNumber) || null;
  const website = text(raw.website, APPLICATION_LIMITS.website) || null;
  const message =
    typeof raw.message === 'string' ? raw.message.trim().slice(0, APPLICATION_LIMITS.message) || null : null;

  if (name.length < 2) return { ok: false, error: 'נא למלא שם מלא' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'כתובת המייל אינה תקינה' };
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 13) return { ok: false, error: 'מספר הטלפון אינו תקין' };
  if (officeName.length < 2) return { ok: false, error: 'נא למלא את שם המשרד' };
  if (website && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/i.test(website)) return { ok: false, error: 'כתובת האתר אינה תקינה' };

  return { ok: true, input: { name, email, phone, officeName, licenseNumber, website, message } };
}

function siteOrigin(): string {
  return (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** הכתובת שבה יועצים נכנסים: הכתובת הנפרדת ליועצים אם הוגדרה, אחרת האתר */
export function advisorEntryUrl(): string {
  return `${(advisorOrigin() ?? siteOrigin()).replace(/\/$/, '')}/auth/team-entry`;
}

export type SubmitResult = { status: 'received' } | { status: 'error'; error: string };

/**
 * שמירת בקשה חדשה. בקשה חוזרת מאותו מייל, כל עוד הקודמת ממתינה, מעדכנת אותה.
 * מייל של יועץ קיים מקבל אותה תשובה, בלי לחשוף שהוא כבר רשום.
 */
export async function submitAdvisorApplication(input: AdvisorApplicationInput): Promise<SubmitResult> {
  if (input.email === ADVISOR_EMAIL) return { status: 'received' };
  const existingAdvisor = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: 'insensitive' }, role: 'ADVISOR' },
    select: { id: true },
  });
  if (existingAdvisor) return { status: 'received' };

  const pending = await prisma.advisorApplication.findFirst({
    where: { email: input.email, status: 'PENDING' },
    select: { id: true },
  });
  if (pending) {
    await prisma.advisorApplication.update({ where: { id: pending.id }, data: { ...input } });
    return { status: 'received' };
  }

  const created = await prisma.advisorApplication.create({ data: { ...input }, select: { id: true } });
  await Promise.all([notifyAdminsAboutApplication(created.id, input), confirmToApplicant(input)]);
  return { status: 'received' };
}

async function notifyAdminsAboutApplication(id: string, input: AdvisorApplicationInput) {
  const rows: Array<[string, string | null]> = [
    ['שם', input.name],
    ['מייל', input.email],
    ['טלפון', input.phone],
    ['שם המשרד', input.officeName],
    ['מספר רישיון', input.licenseNumber],
    ['אתר', input.website],
  ];
  const table = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#64748b;width:110px;">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(value!)}</td></tr>`
    )
    .join('');
  const note = input.message
    ? `<div style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;white-space:pre-wrap;">${escapeHtml(input.message)}</div>`
    : '';
  const href = `${(advisorOrigin() ?? siteOrigin()).replace(/\/$/, '')}/advisor-dashboard?tab=platform-advisors&application=${encodeURIComponent(id)}`;
  const html = authEmailShell(
    'בקשת הצטרפות של יועץ',
    `<p style="margin:0 0 16px;">יועץ ביקש להצטרף לפלטפורמה. המשרד שלו ייפתח רק אחרי שתאשר את הבקשה.</p>
     <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">${table}</table>${note}
     <div style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">לבקשה</a></div>`
  );
  const textBody = [
    'בקשת הצטרפות של יועץ',
    '',
    ...rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    ...(input.message ? ['', input.message] : []),
    '',
    `לבקשה: ${href}`,
  ].join('\n');
  for (const to of new Set(platformAdminEmails())) {
    await sendEmail({ to, subject: `בקשת הצטרפות: ${input.name} (${input.officeName})`, html, text: textBody }).catch(
      (error) => console.error('[advisor-applications] admin email failed:', error)
    );
  }
}

async function confirmToApplicant(input: AdvisorApplicationInput) {
  const html = authEmailShell(
    'קיבלנו את הבקשה שלך',
    `<p style="margin:0 0 16px;">שלום ${escapeHtml(input.name)},</p>
     <p style="margin:0 0 16px;">קיבלנו את בקשת ההצטרפות של ${escapeHtml(input.officeName)}. אנחנו עוברים על כל בקשה בעצמנו, ונחזור אליך במייל ברגע שהמשרד שלך ייפתח.</p>`
  );
  await sendEmail({
    to: input.email,
    subject: 'קיבלנו את בקשת ההצטרפות שלך',
    html,
    text: `שלום ${input.name},\n\nקיבלנו את בקשת ההצטרפות של ${input.officeName}. נחזור אליך במייל ברגע שהמשרד שלך ייפתח.`,
  }).catch((error) => console.error('[advisor-applications] applicant email failed:', error));
}

// ───────────────────────────── ניהול (מנהל הפלטפורמה) ─────────────────────────────

export interface ApplicationView {
  id: string;
  name: string;
  email: string;
  phone: string;
  officeName: string;
  licenseNumber: string | null;
  website: string | null;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export async function listAdvisorApplications(): Promise<ApplicationView[]> {
  const rows = await prisma.advisorApplication.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
  const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      officeName: row.officeName,
      licenseNumber: row.licenseNumber,
      website: row.website,
      message: row.message,
      status: row.status,
      decisionNote: row.decisionNote,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }))
    .sort((a, b) => order[a.status] - order[b.status]);
}

export type DecisionResult = { ok: true } | { ok: false; status: number; error: string };

/** אישור בקשה: חשבון יועץ, משרד לא פעיל, ומייל עם הקישור לכניסה */
export async function approveAdvisorApplication(id: string, adminId: string): Promise<DecisionResult> {
  const application = await prisma.advisorApplication.findUnique({ where: { id } });
  if (!application) return { ok: false, status: 404, error: 'הבקשה לא נמצאה' };
  if (application.status !== 'PENDING') return { ok: false, status: 409, error: 'הבקשה כבר טופלה' };

  const email = normalizeEmail(application.email);
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, role: true },
  });
  if (existing && existing.role !== 'ADVISOR') {
    return {
      ok: false,
      status: 409,
      error: 'המייל הזה רשום כבר כחשבון לקוח. בקשו מהיועץ להגיש בקשה עם כתובת מייל אחרת, של המשרד',
    };
  }

  let advisorId: string;
  try {
    advisorId =
      existing?.id ??
      (
        await prisma.user.create({
          data: { email, name: application.name, role: 'ADVISOR' },
          select: { id: true },
        })
      ).id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, status: 409, error: 'המייל הזה כבר רשום במערכת' };
    }
    throw error;
  }

  const office = await getOrCreateAdvisorOffice(advisorId);
  const profile = normalizeOfficeProfile({
    ...DEFAULT_OFFICE_PROFILE,
    ...office.profile,
    advisorName: office.profile.advisorName || application.name,
    phone: office.profile.phone || application.phone,
    whatsapp: office.profile.whatsapp || application.phone,
    email: office.profile.email || email,
  });
  await prisma.office.update({
    where: { id: office.id },
    data: {
      name: application.officeName.slice(0, APPLICATION_LIMITS.officeName),
      profileJson: profile as unknown as Prisma.InputJsonValue,
    },
  });

  const { count } = await prisma.advisorApplication.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'APPROVED', decidedAt: new Date(), decidedById: adminId, userId: advisorId },
  });
  if (count !== 1) return { ok: false, status: 409, error: 'הבקשה כבר טופלה' };

  const entry = advisorEntryUrl();
  await sendEmail({
    to: email,
    subject: 'המשרד שלך במשכלנתא נפתח',
    html: authEmailShell(
      'המשרד שלך נפתח',
      `<p style="margin:0 0 16px;">שלום ${escapeHtml(application.name)},</p>
       <p style="margin:0 0 16px;">הבקשה של ${escapeHtml(application.officeName)} אושרה, והמשרד הדיגיטלי שלך מוכן. בכניסה הראשונה מקלידים את כתובת המייל הזו, מקבלים קישור למייל ובוחרים סיסמה.</p>
       <p style="margin:0 0 16px;">אחרי הכניסה, ב"המשרד שלי", אפשר לשנות את שם המשרד, להעלות לוגו, לבחור צבע וקישור, ולהפעיל את הדף שלך ללקוחות.</p>
       <div style="text-align:center;margin:24px 0;"><a href="${entry}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">כניסה לאזור היועץ</a></div>
       <p style="margin:0;color:#64748b;font-size:14px;">כדאי לשמור את הקישור הזה. הוא לא מופיע באתר.</p>`
    ),
    text: `שלום ${application.name},\n\nהבקשה של ${application.officeName} אושרה והמשרד שלך מוכן.\nכניסה לאזור היועץ (כדאי לשמור): ${entry}\nבכניסה הראשונה מקלידים את המייל הזה, מקבלים קישור ובוחרים סיסמה.`,
  }).catch((error) => console.error('[advisor-applications] welcome email failed:', error));

  return { ok: true };
}

export async function rejectAdvisorApplication(id: string, adminId: string, note: unknown): Promise<DecisionResult> {
  const reason = typeof note === 'string' ? note.trim().slice(0, 500) : '';
  const application = await prisma.advisorApplication.findUnique({ where: { id } });
  if (!application) return { ok: false, status: 404, error: 'הבקשה לא נמצאה' };
  const { count } = await prisma.advisorApplication.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'REJECTED', decidedAt: new Date(), decidedById: adminId, decisionNote: reason || null },
  });
  if (count !== 1) return { ok: false, status: 409, error: 'הבקשה כבר טופלה' };

  const reasonHtml = reason
    ? `<div style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;white-space:pre-wrap;">${escapeHtml(reason)}</div>`
    : '';
  await sendEmail({
    to: application.email,
    subject: 'עדכון על בקשת ההצטרפות שלך',
    html: authEmailShell(
      'עדכון על הבקשה שלך',
      `<p style="margin:0 0 16px;">שלום ${escapeHtml(application.name)},</p>
       <p style="margin:0 0 16px;">תודה על ההתעניינות. בשלב הזה לא נוכל לפתוח את המשרד של ${escapeHtml(application.officeName)}.</p>${reasonHtml}
       <p style="margin:0;">אפשר להשיב למייל הזה עם כל שאלה.</p>`
    ),
    text: `שלום ${application.name},\n\nתודה על ההתעניינות. בשלב הזה לא נוכל לפתוח את המשרד של ${application.officeName}.${reason ? `\n\n${reason}` : ''}`,
  }).catch((error) => console.error('[advisor-applications] rejection email failed:', error));
  return { ok: true };
}

export interface OfficeAdminView {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  suspended: boolean;
  platformOffice: boolean;
  ownerName: string | null;
  ownerEmail: string | null;
  clients: number;
  createdAt: string;
}

/** כל המשרדים — בלי שום נתון של לקוחות, רק מספר התיקים */
export async function listOfficesForAdmin(): Promise<OfficeAdminView[]> {
  const rows = await prisma.office.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      published: true,
      suspendedAt: true,
      createdAt: true,
      owner: { select: { name: true, email: true, _count: { select: { clients: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    published: row.published,
    suspended: row.suspendedAt !== null,
    platformOffice: normalizeEmail(row.owner.email ?? '') === ADVISOR_EMAIL,
    ownerName: row.owner.name,
    ownerEmail: row.owner.email,
    clients: row.owner._count.clients,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** השעיה או החזרה של משרד. המשרד של יועץ הפלטפורמה לא מושעה */
export async function setOfficeSuspended(officeId: string, suspended: boolean): Promise<DecisionResult> {
  const office = await prisma.office.findUnique({
    where: { id: officeId },
    select: { owner: { select: { email: true } } },
  });
  if (!office) return { ok: false, status: 404, error: 'המשרד לא נמצא' };
  if (normalizeEmail(office.owner.email ?? '') === ADVISOR_EMAIL) {
    return { ok: false, status: 400, error: 'אי אפשר להשעות את המשרד של הפלטפורמה' };
  }
  await prisma.office.update({ where: { id: officeId }, data: { suspendedAt: suspended ? new Date() : null } });
  return { ok: true };
}
