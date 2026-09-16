import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import type {
  GuidanceRequestView,
  GuidanceStatus,
  MortgageGoal,
  ServiceType,
} from './service-flow';

/**
 * שכבת הגישה לבקשות הליווי.
 *
 * בקשה נוצרת מהדאשבורד (משתמש רשום — הפרטים מהחשבון) או מעמוד הבית (אורח —
 * הפרטים מהטופס). כל היועצים רואים את כל הבקשות, כי עדיין אין שיוך: היועץ
 * שמסמן "יצרתי קשר" הוא שלוקח אותה.
 */

const requestSelect = {
  id: true,
  userId: true,
  name: true,
  email: true,
  phone: true,
  goal: true,
  serviceType: true,
  note: true,
  status: true,
  handledById: true,
  handledAt: true,
  createdAt: true,
  handledBy: { select: { name: true, email: true } },
} satisfies Prisma.GuidanceRequestSelect;

type RequestRow = Prisma.GuidanceRequestGetPayload<{ select: typeof requestSelect }>;

function toView(row: RequestRow, clientId: string | null): GuidanceRequestView {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    goal: row.goal as MortgageGoal,
    serviceType: row.serviceType as ServiceType,
    note: row.note,
    status: row.status as GuidanceStatus,
    clientId,
    handledByName: row.handledBy?.name ?? row.handledBy?.email ?? null,
    handledAt: row.handledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface CreateGuidanceInput {
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  goal: MortgageGoal;
  serviceType: ServiceType;
  note: string | null;
}

export async function createGuidanceRequest(input: CreateGuidanceInput): Promise<GuidanceRequestView> {
  const row = await prisma.guidanceRequest.create({
    data: {
      userId: input.userId,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      goal: input.goal,
      serviceType: input.serviceType,
      note: input.note,
    },
    select: requestSelect,
  });
  return toView(row, null);
}

/**
 * הבקשות כפי שהיועץ רואה אותן: הפתוחות קודם, החדשות למעלה. לכל בקשה ממשתמש
 * רשום מצורף מזהה הליווי אצל היועץ הזה, אם כבר פתח אחד — כדי שהכפתור יוביל
 * לדף הלקוח ולא יציע לצרף אותו שוב.
 */
export async function listGuidanceRequests(
  advisorId: string,
  { includeClosed = false }: { includeClosed?: boolean } = {}
): Promise<GuidanceRequestView[]> {
  const rows = await prisma.guidanceRequest.findMany({
    where: includeClosed ? {} : { status: { not: 'CLOSED' } },
    select: requestSelect,
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  const userIds = rows.flatMap((row) => (row.userId ? [row.userId] : []));
  const links = userIds.length
    ? await prisma.client.findMany({
        where: { advisorId, userId: { in: userIds } },
        select: { id: true, userId: true },
      })
    : [];
  const clientByUser = new Map(links.map((link) => [link.userId, link.id]));

  const order: Record<GuidanceStatus, number> = { NEW: 0, CONTACTED: 1, CLOSED: 2 };
  return rows
    .map((row) => toView(row, row.userId ? clientByUser.get(row.userId) ?? null : null))
    .sort((a, b) => order[a.status] - order[b.status]);
}

export async function countNewGuidanceRequests(): Promise<number> {
  return prisma.guidanceRequest.count({ where: { status: 'NEW' } });
}

/** עדכון סטטוס. היועץ שמסמן הופך לזה שמטפל בבקשה */
export async function setGuidanceStatus(
  advisorId: string,
  requestId: string,
  status: GuidanceStatus
): Promise<GuidanceRequestView | null> {
  const existing = await prisma.guidanceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true },
  });
  if (!existing) return null;

  const row = await prisma.guidanceRequest.update({
    where: { id: requestId },
    data: {
      status,
      handledById: status === 'NEW' ? null : advisorId,
      handledAt: status === 'NEW' ? null : new Date(),
    },
    select: requestSelect,
  });

  const link = existing.userId
    ? await prisma.client.findUnique({
        where: { advisorId_userId: { advisorId, userId: existing.userId } },
        select: { id: true },
      })
    : null;

  return toView(row, link?.id ?? null);
}
