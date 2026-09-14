import type { Prisma } from '@prisma/client';
import { prisma } from './db';

/**
 * פניות ליווי כלליות מהאזור האישי.
 *
 * להבדיל מהזמנת ליווי לשלב, פנייה כזו נשלחת דרך טופס "אל דאגה — יועצי משכלנתא
 * כאן כדי לעזור", והיא מחזיקה את פרטי הקשר ואת נושא הפנייה כדי שהיועץ יחזור
 * ללקוח. הנושא הוא הכפתור שממנו נפתחה — כך היועץ יודע מיד במה מדובר.
 */
export type LeadTopic =
  | 'FOUND_PROPERTY_REJECTED'
  | 'FOUND_PROPERTY_DONT_KNOW'
  | 'FEASIBILITY'
  | 'EQUITY'
  | 'OTHER';

const LEAD_TOPICS: readonly LeadTopic[] = [
  'FOUND_PROPERTY_REJECTED',
  'FOUND_PROPERTY_DONT_KNOW',
  'FEASIBILITY',
  'EQUITY',
  'OTHER',
];

export const LEAD_TOPIC_LABELS: Record<LeadTopic, string> = {
  FOUND_PROPERTY_REJECTED: 'הבנק סירב לתת אישור עקרוני',
  FOUND_PROPERTY_DONT_KNOW: 'לא יודע/ת מהיכן להתחיל',
  FEASIBILITY: 'בדיקת היתכנות לרכישת נכס',
  EQUITY: 'עזרה בגיוס הון עצמי',
  OTHER: 'פנייה כללית',
};

export function parseLeadTopic(value: unknown): LeadTopic {
  return LEAD_TOPICS.includes(value as LeadTopic) ? (value as LeadTopic) : 'OTHER';
}

export interface AdvisorLeadView {
  id: string;
  topic: LeadTopic;
  topicLabel: string;
  name: string;
  phone: string;
  email: string;
  notes: string | null;
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
  status: true,
  clientId: true,
  createdAt: true,
} satisfies Prisma.AdvisorLeadSelect;

type LeadRow = Prisma.AdvisorLeadGetPayload<{ select: typeof leadSelect }>;

function toView(row: LeadRow): AdvisorLeadView {
  const topic = parseLeadTopic(row.topic);
  return {
    id: row.id,
    topic,
    topicLabel: LEAD_TOPIC_LABELS[topic],
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    status: row.status as AdvisorLeadView['status'],
    clientId: row.clientId,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface CreateLeadInput {
  topic: LeadTopic;
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

/**
 * פתיחת פנייה חדשה. אם למשתמש כבר יש כרטיס ליווי אצל יועץ, הפנייה משויכת
 * ליועץ ולכרטיס — כך היא מגיעה ישירות למי שמלווה אותו. אחרת היא נשארת ללא
 * שיוך, וכל יועץ יכול לראות אותה כפנייה חדשה שממתינה לטיפול.
 */
export async function createLead(
  userId: string,
  input: CreateLeadInput
): Promise<AdvisorLeadView | null> {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  if (!name || !phone || !email) return null;

  const client = await prisma.client.findFirst({
    where: { userId },
    select: { id: true, advisorId: true },
  });

  const row = await prisma.advisorLead.create({
    data: {
      ownerId: userId,
      advisorId: client?.advisorId ?? null,
      clientId: client?.id ?? null,
      topic: input.topic,
      name,
      phone,
      email,
      notes: input.notes?.trim() || null,
    },
    select: leadSelect,
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
