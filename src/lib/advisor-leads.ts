import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { REQUEST_KIND_LABELS, parseRequestKind } from './advisor-requests';
import type { RequestKind } from './advisor-requests';
import { ensureClientLinkSafely } from './advisor-link';
import { emailAdvisorAboutRequest } from './advisor-notify';
import { pageLabel } from './page-labels';
import { recordRequestInChat } from './conversation-store';
import { PLAN_STAGES } from './mortgage-plan';
import type { PlanStageId } from './mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { LEAD_TOPIC_LABELS, parseLeadTopic } from './advisor-lead-topics';
import type { LeadTopic } from './advisor-lead-topics';
import type { StoredAttachment } from './conversation';
import { leadFileViews, storedLeadFiles } from './lead-files';
import type { LeadFileView } from './lead-file-paths';

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
  /** השלב בתהליך הפעיל של הלקוח כשפנה */
  stage: string | null;
  stageLabel: string | null;
  status: 'OPEN' | 'HANDLED' | 'CLOSED';
  clientId: string | null;
  /** קבצים שהלקוח צירף, למשל טופס הצעה מהבנק */
  files: LeadFileView[];
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
  stage: true,
  status: true,
  clientId: true,
  files: true,
  createdAt: true,
} satisfies Prisma.AdvisorLeadSelect;

type LeadRow = Prisma.AdvisorLeadGetPayload<{ select: typeof leadSelect }>;

function stageLabel(stage: string | null): string | null {
  if (!stage || !(PLAN_STAGES as readonly string[]).includes(stage)) return null;
  const index = PLAN_STAGES.indexOf(stage as PlanStageId);
  return `שלב ${index + 1} · ${journeyStageFor(stage as PlanStageId).title}`;
}

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
    stage: row.stage,
    stageLabel: stageLabel(row.stage),
    status: row.status as AdvisorLeadView['status'],
    clientId: row.clientId,
    files: leadFileViews(row.files),
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
  /**
   * לקוח רשום: הפנייה נכתבת גם בצ׳אט שלו עם היועץ, כהודעה ממנו. `false` —
   * כשהפנייה נשלחה מהצ׳אט עצמו, וההודעה כבר שם.
   */
  inChat?: boolean;
  /** קבצים שהלקוח צירף, אחרי בדיקה מול חנות הקבצים (resolveLeadFiles) */
  files?: StoredAttachment[];
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
  let phone = (input.phone ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name) return null;
  if (!emailValid && !hasUsablePhone(phone)) return null;

  // לקוח רשום בלי יועץ משויך עכשיו ליועץ של הפלטפורמה, כדי שהפנייה וכל מה
  // שעשה יופיעו אצלו
  const client = userId ? await ensureClientLinkSafely(userId) : null;
  // לקוח רשום לא נשאל שוב על מה שכבר ידוע — הטלפון מכרטיס הלקוח, אם יש
  if (client && !phone) {
    const card = await prisma.client.findUnique({ where: { id: client.clientId }, select: { phone: true } });
    phone = card?.phone?.trim() ?? '';
  }
  const requestKind = input.requestKind ?? null;
  // השלב שבו הלקוח נמצא בתהליך הפעיל — כדי שהיועץ יידע מאיפה הוא פנה
  const plan = userId
    ? await prisma.mortgagePlan.findFirst({
        where: { ownerId: userId, status: 'IN_PROGRESS' },
        orderBy: { updatedAt: 'desc' },
        select: { name: true, propertyAddress: true, currentStage: true },
      })
    : null;

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
      stage: plan?.currentStage ?? null,
      ...(input.files && input.files.length > 0 ? { files: input.files as unknown as Prisma.InputJsonValue } : {}),
    },
    select: leadSelect,
  });

  await emailAdvisorAboutRequest({
    advisorId: client?.advisorId ?? null,
    what: requestKind ? REQUEST_KIND_LABELS[requestKind] : 'פנייה חדשה',
    details: [
      ['נושא', LEAD_TOPIC_LABELS[input.topic]],
      ['נשלחה מהעמוד', pageLabel(input.sourcePath)],
      ['תהליך', plan ? plan.propertyAddress || plan.name : null],
      ['שלב בתהליך', stageLabel(plan?.currentStage ?? null)],
      ['חשבון', userId ? 'לקוח רשום' : 'אורח, בלי חשבון'],
      ['קבצים מצורפים', input.files?.length ? input.files.map((file) => file.fileName).join(', ') : null],
    ],
    from: { name, email: emailValid ? email : null, phone: phone || null },
    note: input.notes,
  });

  if (client && userId && input.inChat !== false) {
    const lines = [
      `${requestKind ? REQUEST_KIND_LABELS[requestKind] : 'פנייה ליועץ'} · ${LEAD_TOPIC_LABELS[input.topic]}`,
      pageLabel(input.sourcePath) ? `נשלחה מ: ${pageLabel(input.sourcePath)}` : null,
      input.notes?.trim() ? `\n${input.notes.trim()}` : null,
    ];
    await recordRequestInChat(userId, lines.filter(Boolean).join('\n'));
  }

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

/** מה שהלקוח עצמו רואה על פנייה שלו — בלי פרטי קשר והערות */
export interface OwnLeadView {
  id: string;
  requestKindLabel: string | null;
  topicLabel: string;
  createdAt: string;
}

/**
 * הפניות הפתוחות של הלקוח — לשורת "הבקשה הועברה ליועץ" בדאשבורד.
 * כוללות גם פנייה שנשלחה כאורח לפני ההרשמה, עם אותה כתובת מייל.
 */
export async function listOwnOpenLeads(userId: string, email: string | null): Promise<OwnLeadView[]> {
  const rows = await prisma.advisorLead.findMany({
    where: {
      status: 'OPEN',
      OR: [
        { ownerId: userId },
        ...(email ? [{ ownerId: null, email: { equals: email, mode: 'insensitive' as const } }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: leadSelect,
  });
  return rows.map((row) => {
    const view = toView(row);
    return {
      id: view.id,
      requestKindLabel: view.requestKindLabel,
      topicLabel: view.topicLabel,
      createdAt: view.createdAt,
    };
  });
}

/**
 * קובץ שצורף לפנייה, לצפייה אצל היועץ: הפנייה שויכה אליו או שעדיין לא שויכה
 * לאף יועץ (כמו ברשימת הפניות).
 */
export async function leadFileForAdvisor(
  advisorId: string,
  leadId: string,
  fileId: string
): Promise<StoredAttachment | null> {
  const lead = await prisma.advisorLead.findFirst({
    where: { id: leadId, OR: [{ advisorId }, { advisorId: null }] },
    select: { files: true },
  });
  if (!lead) return null;
  return storedLeadFiles(lead.files).find((file) => file.id === fileId) ?? null;
}

