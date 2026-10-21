import { prisma } from './db';
import { advisorOwnsClient } from './advisor';
import { clientBillingSummaries } from './clients';
import { EMPTY_BILLING } from './client-billing';
import type { ClientBillingSummary } from './client-billing';
import type { PlanStageId } from './mortgage-plan';

/**
 * סיכום הפעילות של לקוח, בעיני היועץ: מתי נרשם, מתי שילם ועד מתי הגישה
 * בתשלום, מתי נראה לאחרונה באתר, התהליכים שפתח וההודעות שכתב.
 */

export interface ClientActivityMessage {
  id: string;
  /** צ'אט — הודעה בשיחה; מייל — מייל שהלקוח שלח מהשיחה */
  kind: 'CHAT' | 'EMAIL';
  at: string;
  subject: string | null;
  body: string;
  /** היועץ כבר קרא */
  read: boolean;
}

export interface ClientActivityPlan {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentStage: PlanStageId;
  progress: number;
  status: string;
}

export interface ClientActivity {
  clientId: string;
  userId: string;
  name: string;
  email: string;
  /** המייל של החשבון — אליו נשלח מייל מהשיחה */
  accountEmail: string | null;
  phone: string | null;
  /** מתי נפתח החשבון */
  registeredAt: string;
  /** מתי נפתח הכרטיס אצל היועץ */
  linkedAt: string;
  emailVerifiedAt: string | null;
  /** נרשם לבד — עדיין לא לקוח בליווי */
  selfRegistered: boolean;
  lastSeenAt: string | null;
  /** מאיזו כתובת ומאיזה מכשיר נכנס לאחרונה, כשנשמר */
  lastLogin: { ip: string | null; device: string | null; browser: string | null; os: string | null; location: string | null } | null;
  visitDays: number;
  billing: ClientBillingSummary;
  plans: ClientActivityPlan[];
  messages: ClientActivityMessage[];
  counts: {
    chatFromClient: number;
    emailsFromClient: number;
    unread: number;
  };
}

const MESSAGE_LIMIT = 30;
const BODY_PREVIEW = 400;

export async function getClientActivity(advisorId: string, clientId: string): Promise<ClientActivity | null> {
  if (!(await advisorOwnsClient(advisorId, clientId))) return null;
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      phone: true,
      autoLinked: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          createdAt: true,
          emailVerified: true,
          platformAccessAt: true,
          paidAccessFrom: true,
          paidAccessUntil: true,
          paidAccessNote: true,
        },
      },
    },
  });
  if (!client) return null;

  const [billing, plans, chats, emails, chatCount, emailCount, lastVisit, visitDays] = await Promise.all([
    clientBillingSummaries([client]),
    prisma.mortgagePlan.findMany({
      where: { OR: [{ clientId }, { ownerId: client.userId }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        currentStage: true,
        progress: true,
        status: true,
      },
    }),
    prisma.conversationMessage.findMany({
      where: { clientUserId: client.userId, authorRole: 'CLIENT' },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_LIMIT,
      select: { id: true, body: true, createdAt: true, readAt: true },
    }),
    prisma.conversationEmail.findMany({
      where: { clientUserId: client.userId, senderRole: 'CLIENT', held: false, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_LIMIT,
      select: { id: true, subject: true, text: true, createdAt: true, readByAdvisorAt: true },
    }),
    prisma.conversationMessage.count({ where: { clientUserId: client.userId, authorRole: 'CLIENT' } }),
    prisma.conversationEmail.count({
      where: { clientUserId: client.userId, senderRole: 'CLIENT', held: false },
    }),
    prisma.siteVisit
      .findFirst({
        where: { userId: client.userId },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, ip: true, device: true, browser: true, os: true, location: true },
      })
      .catch(() => null),
    prisma.siteVisit
      .findMany({
        where: { userId: client.userId },
        orderBy: { startedAt: 'desc' },
        take: 2000,
        select: { startedAt: true },
      })
      .then((rows) => new Set(rows.map((row) => row.startedAt.toISOString().slice(0, 10))).size)
      .catch(() => 0),
  ]);

  const messages: ClientActivityMessage[] = [
    ...chats.map(
      (row): ClientActivityMessage => ({
        id: row.id,
        kind: 'CHAT',
        at: row.createdAt.toISOString(),
        subject: null,
        body: row.body.slice(0, BODY_PREVIEW),
        read: row.readAt !== null,
      })
    ),
    ...emails.map(
      (row): ClientActivityMessage => ({
        id: row.id,
        kind: 'EMAIL',
        at: row.createdAt.toISOString(),
        subject: row.subject,
        body: row.text.slice(0, BODY_PREVIEW),
        read: row.readByAdvisorAt !== null,
      })
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MESSAGE_LIMIT);

  return {
    clientId: client.id,
    userId: client.userId,
    name: client.name,
    email: client.email,
    accountEmail: client.user?.email ?? null,
    phone: client.phone,
    registeredAt: (client.user?.createdAt ?? client.createdAt).toISOString(),
    linkedAt: client.createdAt.toISOString(),
    emailVerifiedAt: client.user?.emailVerified?.toISOString() ?? null,
    selfRegistered: client.autoLinked,
    lastSeenAt: lastVisit?.startedAt.toISOString() ?? null,
    lastLogin: lastVisit
      ? {
          ip: lastVisit.ip,
          device: lastVisit.device,
          browser: lastVisit.browser,
          os: lastVisit.os,
          location: lastVisit.location,
        }
      : null,
    visitDays,
    billing: billing.get(client.id) ?? EMPTY_BILLING,
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      currentStage: plan.currentStage as PlanStageId,
      progress: plan.progress,
      status: plan.status,
    })),
    messages,
    counts: {
      chatFromClient: chatCount,
      emailsFromClient: emailCount,
      unread: messages.filter((message) => !message.read).length,
    },
  };
}
