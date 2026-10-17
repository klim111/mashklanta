import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { quoteOrder, parseStages } from './advisor-orders';
import { PLAN_STAGES } from './mortgage-plan';
import type { AdvisorOrder, AdvisorOrderStatus } from './advisor-orders';
import type { PlanStageId } from './mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { PLATFORM_PROCESS_PRICE, platformMonthsSince } from './service-flow';
import { ensureClientLinkSafely } from './advisor-link';
import { emailAdvisorAboutRequest } from './advisor-notify';
import { sendAdvisoryEndedOffer } from './billing';

/**
 * שכבת הגישה להזמנות הליווי.
 *
 * ההזמנה נוצרת כשהלקוח לוחץ "תן ליועץ משכלנתא לעשות לך את העבודה" ובוחר את
 * השלבים, ומקבלת סטטוס "שולם" רק כשהיועץ מאשר שהתשלום עליה סודר
 * (`markOrderInWork`). מאותו רגע הליווי פותח ללקוח את כל הכלים בתהליך, עד
 * שהיועץ מסמן שהליווי הסתיים (`setPlanAdvisoryEnded`).
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
  workStartedAt: true,
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
    workStartedAt: row.workStartedAt?.toISOString() ?? null,
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

  // מה ששולם על הגישה לתהליך הזה מקוזז ממחיר הליווי. מנוי חודשי מלפני
  // המעבר לתשלום לתהליך — לפי מספר החודשים ששולמו
  const payments = await prisma.platformPayment.aggregate({
    where: { planId, userId, status: 'PAID' },
    _sum: { amountAgorot: true },
  });
  let credit = (payments._sum.amountAgorot ?? 0) / 100;
  if (credit === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { platformAccessAt: true },
    });
    credit = platformMonthsSince(user?.platformAccessAt) * PLATFORM_PROCESS_PRICE;
  }
  const quote = quoteOrder(stages, credit);
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

/**
 * בקשת ליווי חינמית לשלב אחד.
 *
 * זו הדרך שבה "תנו ליועץ לעשות לכם את העבודה" עובד בכל השלבים: הבקשה נפתחת
 * מיד (בלי תשלום), השלב עובר לטיפול היועץ, והיועץ מקבל משימה ופנייה באזור
 * שלו. התשלום מסודר בהמשך מולו. בקשה קיימת לאותו שלב אינה משוכפלת.
 */
export async function requestStageHandoff(
  userId: string,
  planId: string,
  stage: PlanStageId
): Promise<AdvisorOrder | null> {
  if (!(await planForUser(userId, planId))) return null;
  // לקוח בלי יועץ משויך עכשיו ליועץ של הפלטפורמה, כדי שהבקשה תגיע אליו
  const link = await ensureClientLinkSafely(userId);
  const plan = await planForUser(userId, planId);
  if (!plan) return null;
  if (!plan.clientId && link) {
    await prisma.mortgagePlan.update({ where: { id: plan.id }, data: { clientId: link.clientId } });
  }
  const clientId = plan.clientId ?? link?.clientId ?? null;
  const advisorId = plan.client?.advisorId ?? link?.advisorId ?? null;

  const existing = await prisma.advisorServiceOrder.findFirst({
    where: {
      planId,
      ownerId: userId,
      status: { in: ['REQUESTED', 'PAID'] },
      stagesJson: { array_contains: stage },
    },
    select: orderSelect,
  });
  if (existing) return toView(existing);

  const row = await prisma.advisorServiceOrder.create({
    data: {
      planId,
      ownerId: userId,
      advisorId,
      clientId,
      stagesJson: [stage],
      amount: 0,
      status: 'REQUESTED',
    },
    select: orderSelect,
  });

  await notifyAdvisor(advisorId, clientId, [stage], {
    planName: plan.name,
    propertyAddress: plan.propertyAddress,
    paid: false,
  });

  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  await emailAdvisorAboutRequest({
    advisorId,
    what: `בקשת ליווי לשלב ${journeyStageFor(stage).title}`,
    details: [
      ['תהליך', plan.propertyAddress || plan.name],
      ['שלב', journeyStageFor(stage).title],
    ],
    from: { name: plan.client?.name || owner?.name, email: owner?.email },
    path: clientId ? `/advisor-dashboard/client/${clientId}` : undefined,
  });

  return toView(row);
}

/** ביטול בקשת ליווי חינמית לשלב — הלקוח בחר לחזור לעבוד עליו בעצמו */
export async function cancelStageHandoff(
  userId: string,
  planId: string,
  stage: PlanStageId
): Promise<boolean> {
  const result = await prisma.advisorServiceOrder.updateMany({
    where: {
      planId,
      ownerId: userId,
      status: 'REQUESTED',
      stagesJson: { array_contains: stage },
    },
    data: { status: 'CANCELLED' },
  });
  return result.count > 0;
}

/**
 * ההתראה ליועץ היא משימה פתוחה לכל שלב שהוזמן — כך הבקשה מופיעה ברשימת
 * המשימות שלו, משויכת ללקוח ולשלב הנכון, ולא כהודעה שנעלמת.
 */
async function notifyAdvisor(
  advisorId: string | null,
  clientId: string | null,
  stages: PlanStageId[],
  context: { planName: string; propertyAddress: string | null; paid: boolean }
): Promise<void> {
  if (!advisorId || stages.length === 0) return;

  const place = context.propertyAddress || context.planName;
  await prisma.advisorTask.createMany({
    data: stages.map((stage) => ({
      advisorId,
      clientId,
      stage,
      title: `בקשת ליווי חדשה — ${journeyStageFor(stage).title}`,
      details: context.paid
        ? `הלקוח ביקש שתבצעו עבורו את השלב בתהליך "${place}". התשלום התקבל.`
        : `הלקוח ביקש שתבצעו עבורו את השלב בתהליך "${place}". בקשה חינמית — קבעו פגישה, התשלום בהמשך.`,
    })),
  });
}

/** בקשת ליווי כפי שהיועץ רואה אותה — מי ביקש, על איזה נכס, ואילו שלבים */
export interface AdvisorOrderRequest extends AdvisorOrder {
  clientId: string | null;
  clientName: string;
  planName: string;
  propertyAddress: string | null;
  /** מתי היועץ סימן שהליווי בתהליך הסתיים */
  advisoryEndedAt: string | null;
}

/**
 * בקשות הליווי ששולמו ומופנות ליועץ.
 *
 * זו ההתראה שלו על לקוח חדש שביקש שיעשה עבורו שלב: הרשימה מסודרת מהחדשה
 * לישנה, כדי שבקשה שהגיעה עכשיו תהיה למעלה.
 */
export async function listAdvisorRequests(advisorId: string): Promise<AdvisorOrderRequest[]> {
  const rows = await prisma.advisorServiceOrder.findMany({
    // גם בקשות שעדיין לא שויכו לאף יועץ, כמו בפניות — כדי שלא ייעלמו
    where: { OR: [{ advisorId }, { advisorId: null }], status: { in: ['REQUESTED', 'PAID'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      ...orderSelect,
      clientId: true,
      client: { select: { name: true } },
      owner: { select: { name: true, email: true } },
      plan: { select: { name: true, propertyAddress: true, advisoryEndedAt: true } },
    },
  });

  return rows.map((row) => ({
    ...toView(row),
    clientId: row.clientId,
    clientName: row.client?.name ?? row.owner?.name ?? row.owner?.email ?? 'לקוח',
    planName: row.plan?.name ?? 'תהליך משכנתא',
    propertyAddress: row.plan?.propertyAddress ?? null,
    advisoryEndedAt: row.plan?.advisoryEndedAt?.toISOString() ?? null,
  }));
}

/**
 * היועץ מאשר שהתשלום על השלב סודר ושהוא עובד עליו.
 *
 * מרגע זה הבקשה נחשבת משולמת: ללקוח נפתחים כל הכלים בתהליך בלי הגבלת זמן,
 * והוא אינו יכול למחוק את התהליך. אישור של שלב בתהליך שהליווי בו כבר הסתיים
 * פותח את הליווי מחדש. `inWork: false` מבטל אישור שניתן בטעות ומחזיר את הבקשה
 * למצב חינמי; סיום הליווי עצמו הוא `setPlanAdvisoryEnded`, ששומר את התשלום.
 */
export async function markOrderInWork(
  advisorId: string,
  orderId: string,
  inWork: boolean
): Promise<AdvisorOrder | null> {
  const existing = await prisma.advisorServiceOrder.findFirst({
    where: { id: orderId, OR: [{ advisorId }, { advisorId: null }], status: { in: ['REQUESTED', 'PAID'] } },
    select: { id: true, planId: true, workStartedAt: true },
  });
  if (!existing) return null;

  const now = new Date();
  // אישור חדש — לא סימון חוזר של שלב שכבר אושר
  if (inWork && !existing.workStartedAt) {
    await prisma.mortgagePlan.updateMany({
      where: { id: existing.planId, advisoryEndedAt: { not: null } },
      data: { advisoryEndedAt: null },
    });
  }
  const row = await prisma.advisorServiceOrder.update({
    where: { id: orderId },
    // בקשה שלא שויכה עוברת ליועץ שהתחיל לעבוד עליה
    data: inWork
      ? { advisorId, workStartedAt: now, status: 'PAID', paidAt: now }
      : { advisorId, workStartedAt: null, status: 'REQUESTED', paidAt: null },
    select: orderSelect,
  });
  return toView(row);
}

/**
 * היועץ מסמן שהליווי בתהליך הסתיים, או מבטל את הסימון.
 *
 * הבקשות ששולמו נשארות משולמות — זה התיעוד של מה שהלקוח שילם. מה שמשתנה הוא
 * הגישה: הכלים בתהליך כבר לא פתוחים דרך הליווי, אלא לפי חבילות החודש
 * (src/lib/process-access.ts). בסימון נשלח ללקוח מייל עם הצעה להמשיך במחיר
 * החודשי, ואותה הצעה מוצגת לו בפלטפורמה כשהוא נכנס לתהליך.
 */
export async function setPlanAdvisoryEnded(
  advisorId: string,
  planId: string,
  ended: boolean
): Promise<{ advisoryEndedAt: string | null; emailed: boolean } | null> {
  const plan = await prisma.mortgagePlan.findFirst({
    where: {
      id: planId,
      OR: [{ client: { advisorId } }, { advisorOrders: { some: { advisorId } } }],
    },
    select: { id: true, advisoryEndedAt: true },
  });
  if (!plan) return null;

  if (!ended) {
    if (plan.advisoryEndedAt) {
      await prisma.mortgagePlan.update({ where: { id: planId }, data: { advisoryEndedAt: null } });
    }
    return { advisoryEndedAt: null, emailed: false };
  }

  // סימון חוזר אינו שולח את המייל שוב
  if (plan.advisoryEndedAt) return { advisoryEndedAt: plan.advisoryEndedAt.toISOString(), emailed: false };

  const now = new Date();
  await prisma.mortgagePlan.update({ where: { id: planId }, data: { advisoryEndedAt: now } });
  const emailed = await sendAdvisoryEndedOffer(planId, now).catch(() => false);
  return { advisoryEndedAt: now.toISOString(), emailed };
}

/**
 * השלבים בתהליך שהיועץ כבר עובד עליהם בתשלום — אלה שחוסמים מחיקה של התהליך.
 */
export async function lockedStagesForPlan(
  userId: string,
  planId: string
): Promise<PlanStageId[]> {
  const rows = await prisma.advisorServiceOrder.findMany({
    where: { planId, ownerId: userId, workStartedAt: { not: null } },
    select: { stagesJson: true },
  });
  const stages = new Set(rows.flatMap((row) => parseStages(row.stagesJson)));
  return PLAN_STAGES.filter((stage) => stages.has(stage));
}

export async function cancelOrder(userId: string, orderId: string): Promise<boolean> {
  const result = await prisma.advisorServiceOrder.updateMany({
    where: { id: orderId, ownerId: userId, status: 'PENDING_PAYMENT' },
    data: { status: 'CANCELLED' },
  });
  return result.count > 0;
}
