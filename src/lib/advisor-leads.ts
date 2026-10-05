import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { REQUEST_KIND_LABELS, parseRequestKind } from './advisor-requests';
import type { RequestKind } from './advisor-requests';
import { ensureClientLinkSafely } from './advisor-link';
import { emailAdvisorAboutRequest } from './advisor-notify';
import { pageLabel } from './page-labels';
import { LEAD_TOPIC_LABELS, parseLeadTopic } from './advisor-lead-topics';
import type { LeadTopic } from './advisor-lead-topics';

/**
 * פניות ליווי כלליות מהאזור האישי.
 *
 * להבדיל מהזמנת ליווי לשלב, פנייה כזו נשלחת דרך טופס "אל דאגה — יועצי משכלנתא
 * כאן כדי לעזור", והיא מחזיקה את פרטי הקשר ואת נושא הפנייה כדי שהיועץ יחזור
 * ללקוח. הנושא הוא הכפתור שממנו נפתחה — כך היועץ יודע מיד במה מדובר.
 */
export { LEAD_TOPIC_LABELS, parseLeadTopic } from './advisor-lead-topics';
export type { LeadTopic } from './advisor-lead-topics';

export interface AdvisorLeadView {
  id: string;
  topic: LeadTopic;
  topicLabel: string;
  name: string;
  /** ריק כשלקוח רשום שלח בלי טלפון — פונים אליו במייל */
  phone: string | null;
  /** ריק כשהפנייה נשלחה עם טלפון בלבד — מכלי שבו המייל אינו חובה */
  email: string | null;
  notes: string | null;
  /** מה הלקוח ביקש — ריק בפניות ישנות */
  requestKind: RequestKind | null;
  requestKindLabel: string | null;
  /** העמוד שממנו נשלחה */
  sourcePath: string | null;
  status: 'OPEN' | 'HANDLED' | 'CLOSED';
  clientId: string | null;
  createdAt: string;
}

const leadSelect = {
  id: true,
  topic: true,
  name: true,
  phone: true,
  email: true,
  notes: true,
  requestKind: true,
  sourcePath: true,
  status: true,
  clientId: true,
  createdAt: true,
} satisfies Prisma.AdvisorLeadSelect;

type LeadRow = Prisma.AdvisorLeadGetPayload<{ select: typeof leadSelect }>;

function toView(row: LeadRow): AdvisorLeadView {
  const topic = parseLeadTopic(row.topic);
  const kind = parseRequestKind(row.requestKind);
  return {
    id: row.id,
    topic,
    topicLabel: LEAD_TOPIC_LABELS[topic],
    name: row.name,
    phone: row.phone,
    email: row.email || null,
    notes: row.notes,
    requestKind: kind,
    requestKindLabel: kind ? REQUEST_KIND_LABELS[kind] : null,
    sourcePath: row.sourcePath,
    status: row.status as AdvisorLeadView['status'],
    clientId: row.clientId,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface CreateLeadInput {
  topic: LeadTopic;
  name: string;
  /** רשות — לקוח רשום שולח עם פרטי החשבון, ואורח מעמוד הבית מזין מה שיש לו */
  phone?: string;
  /**
   * רשות. בכלים שבהם הטלפון הוא דרך הקשר העיקרית (למשל פנייה ליועץ כלכלת
   * המשפחה מכלי ההלוואות) המייל אינו נדרש, ודי בטלפון.
   */
  email?: string;
  notes?: string;
  /** מה הלקוח סימן — ליווי, פגישה, שאלה או הצעת מחיר */
  requestKind?: RequestKind | null;
  /** העמוד שממנו נשלחה הפנייה */
  sourcePath?: string | null;
}

/** טלפון ישראלי סביר — לפחות תשע ספרות, בלי תווי הפרדה */
function hasUsablePhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 9;
}

/**
 * פתיחת פנייה חדשה. נדרשים שם ודרך קשר אחת — מייל תקין או טלפון.
 *
 * אם למשתמש כבר יש כרטיס ליווי אצל יועץ, הפנייה משויכת
 * ליועץ ולכרטיס — כך היא מגיעה ישירות למי שמלווה אותו. אחרת היא נשארת ללא
 * שיוך, וכל יועץ יכול לראות אותה כפנייה חדשה שממתינה לטיפול.
 *
 * `userId` ריק לאורח מעמוד הבית: הפנייה נשמרת עם הפרטים שהזין, בלי חשבון.
 */
export async function createLead(
  userId: string | null,
  input: CreateLeadInput
): Promise<AdvisorLeadView | null> {
  const name = input.name.trim();
  const phone = (input.phone ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name) return null;
  if (!emailValid && !hasUsablePhone(phone)) return null;

  // לקוח רשום בלי יועץ משויך עכשיו ליועץ של הפלטפורמה, כדי שהפנייה וכל מה
  // שעשה יופיעו אצלו
  const client = userId ? await ensureClientLinkSafely(userId) : null;
  const requestKind = input.requestKind ?? null;

  const row = await prisma.advisorLead.create({
    data: {
      ownerId: userId,
      advisorId: client?.advisorId ?? null,
      clientId: client?.clientId ?? null,
      topic: input.topic,
      name,
      phone: phone || null,
      email: emailValid ? email : '',
      notes: input.notes?.trim() || null,
      requestKind,
      sourcePath: input.sourcePath ?? null,
    },
    select: leadSelect,
  });

  await emailAdvisorAboutRequest({
    advisorId: client?.advisorId ?? null,
    what: requestKind ? REQUEST_KIND_LABELS[requestKind] : 'פנייה חדשה',
    details: [
      ['נושא', LEAD_TOPIC_LABELS[input.topic]],
      ['נשלחה מהעמוד', pageLabel(input.sourcePath)],
      ['חשבון', userId ? 'לקוח רשום' : 'אורח, בלי חשבון'],
    ],
    from: { name, email: emailValid ? email : null, phone: phone || null },
    note: input.notes,
  });

  return toView(row);
}

/**
 * הפניות שמופנות ליועץ: אלה ששויכו אליו, ואלה שעדיין לא שויכו לאף יועץ —
 * כך פנייה מלקוח בלי יועץ אינה נעלמת.
 */
export async function listAdvisorLeads(advisorId: string): Promise<AdvisorLeadView[]> {
  const rows = await prisma.advisorLead.findMany({
    where: { status: { not: 'CLOSED' }, OR: [{ advisorId }, { advisorId: null }] },
    orderBy: { createdAt: 'desc' },
    select: leadSelect,
  });
  return rows.map(toView);
}
