import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { quoteOrder, parseStages } from './advisor-orders';
import type { AdvisorOrder, AdvisorOrderStatus } from './advisor-orders';
import type { PlanStageId } from './mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';

/**
 * שכבת הגישה להזמנות הליווי.
 *
 * ההזמנה נוצרת כשהלקוח לוחץ "תן ליועץ משכלנתא לעשות לך את העבודה" ובוחר את
 * השלבים, ומקבלת סטטוס "שולם" רק אחרי מסך התשלום ואישור התנאים. ברגע התשלום
 * נפתחת ליועץ משימה לכל שלב שהוזמן, כך שהבקשה מופיעה אצלו באזור שלו.
 */

const orderSelect = {
  id: true,
  planId: true,
  stagesJson: true,
  amount: true,
  status: true,
  createdAt: true,
  paidAt: true,
  termsAcceptedAt: true,
  advisor: { select: { name: true, email: true } },
} satisfies Prisma.AdvisorServiceOrderSelect;

type OrderRow = Prisma.AdvisorServiceOrderGetPayload<{ select: typeof orderSelect }>;

function toView(row: OrderRow): AdvisorOrder {
  return {
    id: row.id,
    planId: row.planId,
    stages: parseStages(row.stagesJson),
    amount: row.amount,
    status: row.status as AdvisorOrderStatus,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
    advisorName: row.advisor?.name ?? row.advisor?.email ?? null,
  };
}

/** התהליך, עם היועץ שמלווה את הלקוח בו — אם התהליך בכלל שייך למי ששואל */
async function planForUser(userId: string, planId: string) {
  return prisma.mortgagePlan.findFirst({
    where: { id: planId, ownerId: userId },
    select: {
      id: true,
      name: true,
      propertyAddress: true,
      clientId: true,
      client: { select: { id: true, advisorId: true, name: true } },
    },
  });
}

export async function listOrders(userId: string, planId: string): Promise<AdvisorOrder[]> {
  const plan = await prisma.mortgagePlan.findFirst({
    where: { id: planId, OR: [{ ownerId: userId }, { client: { advisorId: userId } }] },
    select: { id: true },
  });
  if (!plan) return [];

  const rows = await prisma.advisorServiceOrder.findMany({
    where: { planId },
    orderBy: { createdAt: 'desc' },
    select: orderSelect,
  });
  return rows.map(toView);
}

/**
 * פתיחת בקשה חדשה לליווי.
 *
 * בקשה קודמת שעדיין לא שולמה מוחלפת בחדשה: הלקוח שינה דעתו לגבי השלבים, ואין
 * טעם להשאיר שתי בקשות פתוחות על אותו תהליך.
 */
export async function createOrder(
  userId: string,
  planId: string,
  stages: PlanStageId[],
  note?: string
): Promise<AdvisorOrder | null> {
  const plan = await planForUser(userId, planId);
  if (!plan) return null;

  const quote = quoteOrder(stages);
  if (quote.stages.length === 0) return null;

  await prisma.advisorServiceOrder.updateMany({
    where: { planId, ownerId: userId, status: 'PENDING_PAYMENT' },
    data: { status: 'CANCELLED' },
  });

  const row = await prisma.advisorServiceOrder.create({
    data: {
      planId,
      ownerId: userId,
      advisorId: plan.client?.advisorId ?? null,
      clientId: plan.clientId,
      stagesJson: quote.stages,
      amount: quote.total,
      note: note?.trim() || null,
    },
    select: orderSelect,
  });

  return toView(row);
}

export interface PaymentInput {
  /** אישור התנאים — בלעדיו אין חיוב */
  termsAccepted: boolean;
  payerName?: string;
  /** ארבע ספרות אחרונות בלבד. פרטי הכרטיס עצמם אינם נשמרים */
  cardLast4?: string;
  paymentRef?: string;
}

/**
 * סימון ההזמנה כשולמה, ופתיחת המשימות אצל היועץ.
 *
 * החיוב עצמו נעשה מול ספק הסליקה; כאן נשמרת רק האסמכתה. בלי אישור תנאים אין
 * תשלום, ולכן הקריאה נדחית.
 */
export async function payOrder(
  userId: string,
  orderId: string,
  input: PaymentInput
): Promise<AdvisorOrder | null> {
  if (!input.termsAccepted) return null;

  const existing = await prisma.advisorServiceOrder.findFirst({
    where: { id: orderId, ownerId: userId, status: 'PENDING_PAYMENT' },
    select: {
      id: true,
      planId: true,
      advisorId: true,
      clientId: true,
      stagesJson: true,
      plan: { select: { name: true, propertyAddress: true } },
    },
  });
  if (!existing) return null;

  const now = new Date();
  const row = await prisma.advisorServiceOrder.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      paidAt: now,
      termsAcceptedAt: now,
      payerName: input.payerName?.trim() || null,
      cardLast4: input.cardLast4?.replace(/\D/g, '').slice(-4) || null,
      paymentRef: input.paymentRef?.trim() || `manual-${now.getTime().toString(36)}`,
    },
    select: orderSelect,
  });

  await notifyAdvisor(existing.advisorId, existing.clientId, parseStages(existing.stagesJson), {
    planName: existing.plan?.name ?? 'תהליך משכנתא',
    propertyAddress: existing.plan?.propertyAddress ?? null,
  });

  return toView(row);
}

/**
 * ההתראה ליועץ היא משימה פתוחה לכל שלב שהוזמן — כך הבקשה מופיעה ברשימת
 * המשימות שלו, משויכת ללקוח ולשלב הנכון, ולא כהודעה שנעלמת.
 */
async function notifyAdvisor(
  advisorId: string | null,
  clientId: string | null,
  stages: PlanStageId[],
  context: { planName: string; propertyAddress: string | null }
): Promise<void> {
  if (!advisorId || stages.length === 0) return;

  const place = context.propertyAddress || context.planName;
  await prisma.advisorTask.createMany({
    data: stages.map((stage) => ({
      advisorId,
      clientId,
      stage,
      title: `בקשת ליווי חדשה — ${journeyStageFor(stage).title}`,
      details: `הלקוח ביקש שתבצעו עבורו את השלב בתהליך "${place}". התשלום התקבל.`,
    })),
  });
}

export async function cancelOrder(userId: string, orderId: string): Promise<boolean> {
  const result = await prisma.advisorServiceOrder.updateMany({
    where: { id: orderId, ownerId: userId, status: 'PENDING_PAYMENT' },
    data: { status: 'CANCELLED' },
  });
  return result.count > 0;
}
