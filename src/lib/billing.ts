import crypto from 'node:crypto';
import { prisma } from './db';
import { sendEmail } from './email';
import { canonicalSiteOrigin } from './auth-url';
import { safeCallbackUrl } from './safe-path';
import { createPaymentPage, hypConfig, parseReturn, verifyReturn, HYP_APPROVED } from './hyp';
import { daysUntil, passExpiresAt } from './process-access';
import { PLATFORM_PROCESS_PRICE } from './service-flow';
import { countOpenSelfServicePlans } from './mortgage-plans';
import { paymentConfirmationEmail, renewalReminderEmail } from './billing-emails';
import { RENEWAL_LINK_GRACE_DAYS, renewalToken } from './billing-links';

/**
 * החיוב על הגישה לפלטפורמה, מקצה לקצה: פתיחת עמוד התשלום של HYP, רישום
 * התשלום כשהלקוח חוזר ממנו (רק אחרי אימות מול HYP), מייל אישור, ותזכורת לקראת
 * סוף החודש עם קישור לחידוש. אין חיוב אוטומטי: כל חבילה נרכשת כשהלקוח מאשר
 * ומשלם בעצמו.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** כמה ימים לפני סוף החודש נשלחת התזכורת */
export const REMINDER_DAYS_BEFORE = 3;

function siteOrigin(): string {
  return (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
}

export function billingEnabled(): boolean {
  return hypConfig() !== null;
}

function newOrderRef(): string {
  return `MK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** פתיחת עמוד התשלום לחבילת גישה — מחזיר את הכתובת שאליה מעבירים את הלקוח */
export async function startCheckout(input: {
  userId: string;
  planId?: string | null;
  returnPath?: string | null;
}): Promise<string> {
  const config = hypConfig();
  if (!config) throw new CheckoutError('התשלום המקוון עוד לא הופעל. נסו שוב מאוחר יותר.', 503);

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new CheckoutError('Not found', 404);
  // לכתובת הזו נשלחים אישור התשלום והחשבונית
  if (!user.email) throw new CheckoutError('כדי לשלם צריך כתובת מייל בחשבון.', 400);
  const email = user.email;

  let planId: string | null = null;
  if (input.planId) {
    const plan = await prisma.mortgagePlan.findFirst({
      where: { id: input.planId, ownerId: user.id },
      select: { id: true },
    });
    // תהליך שנמחק בינתיים — החבילה תיקשר לתהליך הבא שייפתח
    planId = plan?.id ?? null;
  }

  const checkout = await prisma.paymentCheckout.create({
    data: {
      orderRef: newOrderRef(),
      userId: user.id,
      planId,
      amountAgorot: PLATFORM_PROCESS_PRICE * 100,
      returnPath: safeCallbackUrl(input.returnPath),
    },
    select: { orderRef: true },
  });

  try {
    return await createPaymentPage(config, {
      order: checkout.orderRef,
      amount: PLATFORM_PROCESS_PRICE,
      description: planId ? 'משכלנתא - חידוש גישה לחודש נוסף' : 'משכלנתא - גישה לפלטפורמה לחודש',
      clientName: user.name || email,
      email,
    });
  } catch (error) {
    console.error('HYP checkout failed:', error instanceof Error ? error.message : error);
    await prisma.paymentCheckout.update({
      where: { orderRef: checkout.orderRef },
      data: { status: 'FAILED', failureCode: 'SIGN' },
    });
    throw new CheckoutError('לא הצלחנו לפתוח את עמוד התשלום. נסו שוב בעוד כמה דקות.', 502);
  }
}

export type ReturnOutcome =
  | { outcome: 'paid'; orderRef: string; returnPath: string | null; renewal: boolean }
  | { outcome: 'failed'; orderRef: string | null; code: string }
  | { outcome: 'unverified'; orderRef: string | null };

/**
 * הלקוח חזר מעמוד התשלום. תשלום נרשם רק כש-HYP אישרה (`CCode=0`), הסכום תואם
 * את ההזמנה, ו-HYP אימתה שהתוצאה נחתמה על ידה. חזרה כפולה לאותה הזמנה (רענון
 * הדף) לא רושמת תשלום שני.
 */
export async function completeReturn(params: URLSearchParams): Promise<ReturnOutcome> {
  const result = parseReturn(params);
  const checkout = result.order
    ? await prisma.paymentCheckout.findUnique({ where: { orderRef: result.order } })
    : null;
  if (!checkout) return { outcome: 'unverified', orderRef: null };

  const paid = () =>
    ({
      outcome: 'paid',
      orderRef: checkout.orderRef,
      returnPath: checkout.returnPath,
      renewal: checkout.planId !== null,
    }) as const;
  if (checkout.status === 'PAID') return paid();

  if (result.code !== HYP_APPROVED) {
    await prisma.paymentCheckout.updateMany({
      where: { id: checkout.id, status: 'PENDING' },
      data: { status: 'FAILED', failureCode: result.code.slice(0, 20) || 'unknown' },
    });
    return { outcome: 'failed', orderRef: checkout.orderRef, code: result.code };
  }

  const config = hypConfig();
  if (!config || Math.round(result.amount * 100) !== checkout.amountAgorot || !result.transactionId) {
    return { outcome: 'unverified', orderRef: checkout.orderRef };
  }
  if (!(await verifyReturn(config, params).catch(() => false))) {
    return { outcome: 'unverified', orderRef: checkout.orderRef };
  }

  const user = await prisma.user.findUnique({
    where: { id: checkout.userId },
    select: { name: true, email: true },
  });

  const payment = await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentCheckout.updateMany({
      where: { id: checkout.id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PAID', failureCode: null },
    });
    if (claimed.count === 0) return null;
    const created = await tx.platformPayment.create({
      data: {
        userId: checkout.userId,
        planId: checkout.planId,
        amountAgorot: checkout.amountAgorot,
        holderName: user?.name || user?.email || '',
        cardBrand: result.brand,
        cardLast4: result.last4,
        provider: 'HYP',
        providerTransactionId: result.transactionId,
        invoiceNumber: result.invoiceNumber,
      },
    });
    await tx.paymentCheckout.update({ where: { id: checkout.id }, data: { paymentId: created.id } });
    return created;
  });

  if (payment && user?.email) {
    const email = paymentConfirmationEmail({
      name: user.name,
      amount: payment.amountAgorot / 100,
      paidAt: payment.createdAt,
      accessUntil: passExpiresAt(payment.createdAt),
      invoiceNumber: payment.invoiceNumber,
      last4: payment.cardLast4,
      renewal: checkout.planId !== null,
      dashboardUrl: `${siteOrigin()}/dashboard`,
    });
    await sendEmail({ to: user.email, ...email }).catch((error) =>
      console.error('Payment confirmation email failed:', error)
    );
  }
  return paid();
}

/** הקישור לחידוש שנכנס למייל התזכורת */
export function renewalUrl(userId: string, planId: string | null, accessUntil: Date): string {
  const token = renewalToken({
    userId,
    planId,
    expiresAt: new Date(accessUntil.getTime() + RENEWAL_LINK_GRACE_DAYS * DAY_MS),
  });
  return `${siteOrigin()}/billing/renew?token=${encodeURIComponent(token)}`;
}

/**
 * תזכורות לקראת סוף החודש: לכל לקוח שהחבילה האחרונה שלו (ששולמה ב-HYP)
 * מסתיימת בתוך שלושה ימים, ויש לו תהליך פתוח במסלול העצמאי. כל חבילה מקבלת
 * תזכורת אחת. רץ פעם ביום (vercel.json).
 */
export async function sendRenewalReminders(now = new Date()): Promise<{ sent: number; checked: number }> {
  // החודש הארוך ביותר הוא 31 יום — חבילה ישנה מזה כבר הסתיימה
  const candidates = await prisma.platformPayment.findMany({
    where: {
      provider: 'HYP',
      status: 'PAID',
      reminderSentAt: null,
      createdAt: { gte: new Date(now.getTime() - 31 * DAY_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, userId: true, planId: true, createdAt: true, user: { select: { name: true, email: true } } },
  });

  const seen = new Set<string>();
  let sent = 0;
  for (const payment of candidates) {
    if (seen.has(payment.userId)) continue;
    seen.add(payment.userId);

    const accessUntil = passExpiresAt(payment.createdAt);
    const left = accessUntil.getTime() - now.getTime();
    if (left <= 0 || left > REMINDER_DAYS_BEFORE * DAY_MS) continue;

    // חבילה חדשה יותר (גם כזו שכבר קיבלה תזכורת) — אין מה להזכיר
    const newer = await prisma.platformPayment.count({
      where: { userId: payment.userId, status: 'PAID', createdAt: { gt: payment.createdAt } },
    });
    if (newer > 0) continue;
    if ((await countOpenSelfServicePlans(payment.userId)) === 0) continue;
    if (!payment.user.email) continue;

    const email = renewalReminderEmail({
      name: payment.user.name,
      accessUntil,
      daysLeft: daysUntil(accessUntil, now),
      price: PLATFORM_PROCESS_PRICE,
      renewUrl: renewalUrl(payment.userId, payment.planId, accessUntil),
    });
    const result = await sendEmail({ to: payment.user.email, ...email }).catch(() => ({ success: false }));
    if (result.success) {
      await prisma.platformPayment.update({ where: { id: payment.id }, data: { reminderSentAt: now } });
      sent += 1;
    }
  }
  return { sent, checked: candidates.length };
}
