/**
 * טופס פרטי הלקוח — הצד של השרת.
 *
 * הטופס (/client-details-form) הוא תצוגה אחת, רציפה, של חמשת החלקים הראשונים
 * בתיק האישור העקרוני: לווים והכנסות, חשבונות בנק, הלוואה ונכס, מקורות מימון
 * וערבים. הוא כותב לאותו תיק (`MortgageCase`), ולכן מה שהלקוח ממלא בו מופיע
 * גם בשלב האישור העקרוני, ולהפך.
 *
 * היועץ מפיק ללקוח קישור לטופס מתוך דף הלקוח, והלקוח לוחץ בסופו "שדר ליועץ".
 * שני הרגעים נשמרים על התיק (`intakeRequestedAt`, `intakeSubmittedAt`).
 */

import { prisma } from '@/lib/db';
import { authEmailShell, escapeHtml, sendEmail } from '@/lib/email';
import { emailAdvisorAboutRequest } from '@/lib/advisor-notify';
import { ensureCaseForClient } from './server';

/** הנתיב של הטופס אצל הלקוח */
export const INTAKE_FORM_PATH = '/client-details-form';

/** הנתיב של הדוח המסכם באזור היועץ */
export function intakeReportPath(clientRecordId: string): string {
  return `/advisor-dashboard/client/${clientRecordId}/client-details`;
}

export function intakeFormUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}${INTAKE_FORM_PATH}`;
}

export interface IntakeStatus {
  caseId: string | null;
  requestedAt: string | null;
  submittedAt: string | null;
  /** הלקוח רשום לאתר ויכול לפתוח את הטופס */
  registered: boolean;
}

async function clientRecord(advisorId: string, clientRecordId: string) {
  return prisma.client.findFirst({
    where: { id: clientRecordId, advisorId },
    select: { id: true, userId: true, name: true, email: true, prospect: true },
  });
}

async function openCase(clientUserId: string) {
  return prisma.mortgageCase.findFirst({
    where: { clientId: clientUserId, status: { in: ['draft', 'submitted'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, intakeRequestedAt: true, intakeSubmittedAt: true },
  });
}

/** מצב הטופס של לקוח אחד, בלי לפתוח תיק אם אין */
export async function intakeStatus(advisorId: string, clientRecordId: string): Promise<IntakeStatus | null> {
  const record = await clientRecord(advisorId, clientRecordId);
  if (!record) return null;
  const found = await openCase(record.userId);
  return {
    caseId: found?.id ?? null,
    requestedAt: found?.intakeRequestedAt?.toISOString() ?? null,
    submittedAt: found?.intakeSubmittedAt?.toISOString() ?? null,
    registered: !record.prospect,
  };
}

export type RequestIntakeResult =
  | { ok: true; status: IntakeStatus; url: string; emailed: boolean }
  | { ok: false; status: number; error: string };

/**
 * היועץ מפיק ללקוח את הקישור לטופס: התיק נפתח (אם עוד לא קיים) ומסומן כ"נשלח".
 * עם `email` הקישור יוצא גם במייל לכתובת של הלקוח.
 */
export async function requestIntake(
  advisorId: string,
  clientRecordId: string,
  options: { origin: string; email?: boolean },
): Promise<RequestIntakeResult> {
  const record = await clientRecord(advisorId, clientRecordId);
  if (!record) return { ok: false, status: 404, error: 'הלקוח לא נמצא' };
  if (record.prospect) {
    return { ok: false, status: 400, error: 'הלקוח עוד לא נרשם לאתר — אפשר לשלוח לו את הטופס אחרי ההרשמה' };
  }

  const caseId = await ensureCaseForClient(record.userId, advisorId);
  const updated = await prisma.mortgageCase.update({
    where: { id: caseId },
    data: { intakeRequestedAt: new Date() },
    select: { intakeRequestedAt: true, intakeSubmittedAt: true },
  });

  const url = intakeFormUrl(options.origin);
  let emailed = false;
  if (options.email && record.email) {
    const result = await sendEmail({ to: record.email, ...intakeLinkEmail({ name: record.name, url }) }).catch(
      () => null,
    );
    emailed = Boolean(result && typeof result === 'object' && 'success' in result && result.success);
  }

  return {
    ok: true,
    url,
    emailed,
    status: {
      caseId,
      requestedAt: updated.intakeRequestedAt?.toISOString() ?? null,
      submittedAt: updated.intakeSubmittedAt?.toISOString() ?? null,
      registered: true,
    },
  };
}

/** המייל ללקוח עם הקישור לטופס */
export function intakeLinkEmail({ name, url }: { name: string | null; url: string }) {
  const hello = name?.trim() ? `שלום ${escapeHtml(name.trim())},` : 'שלום,';
  const body = `
    <p style="margin:0 0 12px;">${hello}</p>
    <p style="margin:0 0 12px;">כדי שנוכל להתקדם עם הבקשה למשכנתא, נשמח שתמלאו את טופס פרטי הלקוח: הלווים וההכנסות, ההלוואה והנכס, מקורות המימון, חשבונות הבנק והערבים.</p>
    <p style="margin:0 0 12px;">כל שדה נשמר מיד, כך שאפשר לצאת ולחזור. בסוף הטופס לוחצים "שדר ליועץ".</p>
    <div style="text-align:center;margin:24px 0;"><a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">למילוי הטופס</a></div>
    <p style="margin:0;color:#64748b;font-size:13px;">הקישור נפתח אחרי כניסה לחשבון שלכם באתר.</p>`;
  return {
    subject: 'טופס פרטי הלקוח למשכנתא',
    html: authEmailShell('טופס פרטי הלקוח', body),
    text: `${name?.trim() ? `שלום ${name.trim()},` : 'שלום,'}\n\nלמילוי טופס פרטי הלקוח: ${url}\nבסוף הטופס לוחצים "שדר ליועץ".`,
  };
}

export type SubmitIntakeResult =
  | { ok: true; submittedAt: string }
  | { ok: false; status: number; error: string };

/** הלקוח לוחץ "שדר ליועץ" בסוף הטופס */
export async function submitIntake(caseId: string, userId: string): Promise<SubmitIntakeResult> {
  const found = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: {
      clientId: true,
      advisorId: true,
      client: { select: { name: true, email: true } },
    },
  });
  if (!found) return { ok: false, status: 404, error: 'התיק לא נמצא' };
  if (found.clientId !== userId) return { ok: false, status: 403, error: 'רק הלקוח יכול לשדר את הטופס' };

  const submittedAt = new Date();
  await prisma.mortgageCase.update({ where: { id: caseId }, data: { intakeSubmittedAt: submittedAt } });

  const record = await prisma.client.findFirst({
    where: { userId, ...(found.advisorId ? { advisorId: found.advisorId } : {}) },
    select: { id: true, phone: true },
    orderBy: { createdAt: 'asc' },
  });
  await emailAdvisorAboutRequest({
    advisorId: found.advisorId,
    what: 'טופס פרטי לקוח מלא',
    details: [['מה התקבל', 'הלקוח מילא את טופס פרטי הלקוח ושידר אותו']],
    from: { name: found.client.name, email: found.client.email, phone: record?.phone ?? null },
    path: record ? intakeReportPath(record.id) : '/advisor-dashboard',
  });

  return { ok: true, submittedAt: submittedAt.toISOString() };
}
