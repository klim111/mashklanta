import crypto from 'node:crypto';
import { prisma } from './db';
import { sendEmail } from './email';
import { canonicalSiteOrigin } from './auth-url';
import { safeCallbackUrl } from './safe-path';
import { createPaymentPage, hypConfig, parseReturn, verifyReturn, HYP_APPROVED, type HypReturn } from './hyp';
import { ONE_PROCESS_PER_PAYMENT_SINCE, daysUntil, passExpiresAt } from './process-access';
import { getPricingFresh } from './pricing-store';
import { countOpenSelfServicePlans, isOpenSelfServicePlan } from './mortgage-plans';
import {
  advisoryEndedEmail,
  linkPaidAdvisorEmail,
  linkPaidClientEmail,
  paymentConfirmationEmail,
  renewalReminderEmail,
} from './billing-emails';
import { RENEWAL_LINK_GRACE_DAYS, renewalToken, type RenewalReason } from './billing-links';

/**
 * החיוב מקצה לקצה: פתיחת עמוד התשלום של HYP, רישום התשלום כשהלקוח חוזר ממנו
 * (רק אחרי אימות מול HYP), מייל אישור, ותזכורת לקראת סוף החודש עם קישור
 * לחידוש. אין חיוב אוטומטי: כל תשלום מתבצע כשהלקוח מאשר ומשלם בעצמו.
 *
 * שני סוגי תשלום עוברים כאן:
 *  - גישה לפלטפורמה לחודש — במחיר העדכני מהגדרות התמחור (getPricingFresh)
 *  - קישור תשלום שהיועץ יצר (PaymentLink) — בסכום שנקבע בקישור
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

const NOT_ENABLED = 'התשלום המקוון עוד לא הופעל. נסו שוב מאוחר יותר.';
const SIGN_FAILED = 'לא הצלחנו לפתוח את עמוד התשלום. נסו שוב בעוד כמה דקות.';

/** בקשת עמוד תשלום מ-HYP. כשל מסמן את המעבר כנכשל ומחזיר הודעה ללקוח */
async function openPaymentPage(
  orderRef: string,
  request: { amount: number; description: string; clientName: string; email: string; phone?: string | null }
): Promise<string> {
  const config = hypConfig();
  if (!config) throw new CheckoutError(NOT_ENABLED, 503);
  try {
    return await createPaymentPage(config, { order: orderRef, ...request });
  } catch (error) {
    console.error('HYP checkout failed:', error instanceof Error ? error.message : error);
    await prisma.paymentCheckout.update({ where: { orderRef }, data: { status: 'FAILED', failureCode: 'SIGN' } });
    throw new CheckoutError(SIGN_FAILED, 502);
  }
}

/** פתיחת עמוד התשלום לחבילת גישה — מחזיר את הכתובת שאליה מעבירים את הלקוח */
export async function startCheckout(input: {
  userId: string;
  planId?: string | null;
  returnPath?: string | null;
}): Promise<string> {
  if (!hypConfig()) throw new CheckoutError(NOT_ENABLED, 503);

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

  // המחיר העדכני מהגדרות התמחור, לא ממטמון — זה הסכום שייגבה
  const { platformPrice } = await getPricingFresh();
  const checkout = await prisma.paymentCheckout.create({
    data: {
      orderRef: newOrderRef(),
      userId: user.id,
      planId,
      amountAgorot: platformPrice * 100,
      returnPath: safeCallbackUrl(input.returnPath),
    },
    select: { orderRef: true },
  });

  return openPaymentPage(checkout.orderRef, {
    amount: platformPrice,
    description: planId ? 'משכלנתא - חידוש גישה לחודש נוסף' : 'משכלנתא - גישה לפלטפורמה לחודש',
    clientName: user.name || email,
    email,
  });
}

/**
 * פתיחת עמוד התשלום לקישור תשלום של היועץ. כשבקישור אין שם או מייל, הלקוח
 * ממלא אותם בעמוד הקישור — המייל נדרש לאישור ולחשבונית.
 */
export async function startLinkCheckout(
  token: string,
  payer: { name?: string | null; email?: string | null; phone?: string | null }
): Promise<string> {
  if (!hypConfig()) throw new CheckoutError(NOT_ENABLED, 503);
  const link = await prisma.paymentLink.findUnique({ where: { token } });
  if (!link || link.status === 'CANCELLED') throw new CheckoutError('הקישור אינו פעיל.', 404);
  if (link.status === 'PAID') throw new CheckoutError('התשלום בקישור הזה כבר בוצע.', 409);

  const name = (link.clientName || payer.name || '').trim();
  const email = (link.clientEmail || payer.email || '').trim();
  if (name.length < 2) throw new CheckoutError('נדרש שם מלא.', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CheckoutError('כתובת המייל אינה תקינה.', 400);

  // פרטים שהלקוח מילא נשמרים על הקישור, כדי שיופיעו אצל היועץ ובחשבונית
  if (!link.clientName || !link.clientEmail || (!link.clientPhone && payer.phone)) {
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        clientName: link.clientName || name,
        clientEmail: link.clientEmail || email,
        clientPhone: link.clientPhone || payer.phone?.trim() || null,
      },
    });
  }

  const checkout = await prisma.paymentCheckout.create({
    data: { orderRef: newOrderRef(), paymentLinkId: link.id, amountAgorot: link.amountAgorot },
    select: { orderRef: true },
  });
  return openPaymentPage(checkout.orderRef, {
    amount: link.amountAgorot / 100,
    description: `משכלנתא - ${link.title}`,
    clientName: name,
    email,
    phone: link.clientPhone || payer.phone,
  });
}

export type ReturnOutcome =
  | { outcome: 'paid'; orderRef: string; returnPath: string | null; renewal: boolean; linkToken: string | null }
  | { outcome: 'failed'; orderRef: string | null; code: string; linkToken: string | null }
  | { outcome: 'unverified'; orderRef: string | null; linkToken: string | null };

/**
 * הלקוח חזר מעמוד התשלום. תשלום נרשם רק כש-HYP אישרה (`CCode=0`), הסכום תואם
 * את ההזמנה, ו-HYP אימתה שהתוצאה נחתמה על ידה. חזרה כפולה לאותה הזמנה (רענון
 * הדף) לא רושמת תשלום שני.
 */
export async function completeReturn(params: URLSearchParams): Promise<ReturnOutcome> {
  const result = parseReturn(params);
  const checkout = result.order
    ? await prisma.paymentCheckout.findUnique({
        where: { orderRef: result.order },
        include: { paymentLink: { select: { token: true } } },
      })
    : null;
  if (!checkout) return { outcome: 'unverified', orderRef: null, linkToken: null };
  const linkToken = checkout.paymentLink?.token ?? null;

  const paid = () =>
    ({
      outcome: 'paid',
      orderRef: checkout.orderRef,
      returnPath: checkout.returnPath,
      renewal: checkout.planId !== null,
      linkToken,
    }) as const;
  if (checkout.status === 'PAID') return paid();

  if (result.code !== HYP_APPROVED) {
    await prisma.paymentCheckout.updateMany({
      where: { id: checkout.id, status: 'PENDING' },
      data: { status: 'FAILED', failureCode: result.code.slice(0, 20) || 'unknown' },
    });
    return { outcome: 'failed', orderRef: checkout.orderRef, code: result.code, linkToken };
  }

  const config = hypConfig();
  if (!config || Math.round(result.amount * 100) !== checkout.amountAgorot || !result.transactionId) {
    return { outcome: 'unverified', orderRef: checkout.orderRef, linkToken };
  }
  if (!(await verifyReturn(config, params).catch(() => false))) {
    return { outcome: 'unverified', orderRef: checkout.orderRef, linkToken };
  }

  if (checkout.paymentLinkId) await recordLinkPayment(checkout.id, checkout.paymentLinkId, result);
  else if (checkout.userId) await recordPlatformPayment(checkout.id, checkout.userId, checkout, result);
  return paid();
}

/** תשלום על גישה לפלטפורמה שאומת: רשומת תשלום ומייל אישור */
async function recordPlatformPayment(
  checkoutId: string,
  userId: string,
  checkout: { planId: string | null; amountAgorot: number },
  result: HypReturn
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });

  const payment = await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentCheckout.updateMany({
      where: { id: checkoutId, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PAID', failureCode: null },
    });
    if (claimed.count === 0) return null;
    const created = await tx.platformPayment.create({
      data: {
        userId,
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
    await tx.paymentCheckout.update({ where: { id: checkoutId }, data: { paymentId: created.id } });
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
}

/** תשלום בקישור תשלום שאומת: הקישור מסומן כשולם, ומייל ללקוח וליועץ */
async function recordLinkPayment(checkoutId: string, linkId: string, result: HypReturn): Promise<void> {
  const now = new Date();
  const link = await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentCheckout.updateMany({
      where: { id: checkoutId, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PAID', failureCode: null },
    });
    if (claimed.count === 0) return null;
    const marked = await tx.paymentLink.updateMany({
      where: { id: linkId, status: 'OPEN' },
      data: {
        status: 'PAID',
        paidAt: now,
        providerTransactionId: result.transactionId,
        invoiceNumber: result.invoiceNumber,
        cardLast4: result.last4 || null,
      },
    });
    // הקישור כבר שולם בעסקה אחרת (או בוטל בינתיים) — העסקה הזו נשארת רשומה על המעבר
    if (marked.count === 0) return null;
    return tx.paymentLink.findUnique({ where: { id: linkId } });
  });
  if (!link) return;

  const amount = link.amountAgorot / 100;
  if (link.clientEmail) {
    const email = linkPaidClientEmail({
      name: link.clientName,
      title: link.title,
      amount,
      paidAt: now,
      invoiceNumber: link.invoiceNumber,
      last4: link.cardLast4,
    });
    await sendEmail({ to: link.clientEmail, ...email }).catch((error) =>
      console.error('Payment link confirmation email failed:', error)
    );
  }
  const advisor = await prisma.user.findUnique({ where: { id: link.createdById }, select: { email: true } });
  if (advisor?.email) {
    const email = linkPaidAdvisorEmail({
      clientName: link.clientName,
      clientEmail: link.clientEmail,
      title: link.title,
      amount,
      invoiceNumber: link.invoiceNumber,
      dashboardUrl: `${siteOrigin()}/advisor-dashboard`,
    });
    await sendEmail({ to: advisor.email, ...email, replyTo: link.clientEmail || undefined }).catch((error) =>
      console.error('Payment link advisor email failed:', error)
    );
  }
}

/** הקישור לחידוש שנכנס למייל התזכורת, או למייל על סיום הליווי */
export function renewalUrl(
  userId: string,
  planId: string | null,
  accessUntil: Date,
  reason: RenewalReason = 'renewal'
): string {
  const token = renewalToken({
    userId,
    planId,
    expiresAt: new Date(accessUntil.getTime() + RENEWAL_LINK_GRACE_DAYS * DAY_MS),
    reason,
  });
  return `${siteOrigin()}/billing/renew?token=${encodeURIComponent(token)}`;
}

/**
 * היועץ סימן שהליווי בתהליך הסתיים: מייל ללקוח עם הצעה להמשיך לבד במחיר
 * החודשי העדכני, וקישור שמוביל לעמוד התשלום בלי להתחבר. כישלון בשליחה לא
 * מבטל את הסימון — אותה הצעה מוצגת ללקוח גם בפלטפורמה.
 */
export async function sendAdvisoryEndedOffer(planId: string, endedAt: Date): Promise<boolean> {
  const plan = await prisma.mortgagePlan.findUnique({
    where: { id: planId },
    select: { name: true, ownerId: true, owner: { select: { name: true, email: true, role: true } } },
  });
  if (!plan?.owner.email || plan.owner.role === 'ADVISOR') return false;
  const { platformPrice } = await getPricingFresh();
  const email = advisoryEndedEmail({
    name: plan.owner.name,
    planName: plan.name,
    price: platformPrice,
    continueUrl: renewalUrl(plan.ownerId, planId, endedAt, 'advisory-ended'),
    dashboardUrl: `${siteOrigin()}/dashboard`,
  });
  const result = await sendEmail({ to: plan.owner.email, ...email }).catch(() => ({ success: false }));
  return result.success;
}

/**
 * תזכורות לקראת סוף החודש: לכל תהליך פתוח במסלול העצמאי שהחבילה האחרונה שלו
 * (ששולמה ב-HYP) מסתיימת בתוך שלושה ימים. כל תשלום הוא עבור תהליך אחד, ולכן
 * התזכורת היא לתהליך. כל חבילה מקבלת תזכורת אחת. רץ פעם ביום (vercel.json).
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
    select: {
      id: true,
      userId: true,
      planId: true,
      createdAt: true,
      plan: { select: { name: true, createdAt: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const { platformPrice } = await getPricingFresh();
  const seen = new Set<string>();
  let sent = 0;
  for (const payment of candidates) {
    // תשלום שאינו קשור לתהליך פותח רק תהליכים מהכלל הקודם — כל תשלום של הלקוח
    const key = payment.planId ?? `user:${payment.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const accessUntil = passExpiresAt(payment.createdAt);
    const left = accessUntil.getTime() - now.getTime();
    if (left <= 0 || left > REMINDER_DAYS_BEFORE * DAY_MS) continue;

    // חבילה חדשה יותר על אותו תהליך (גם כזו שכבר קיבלה תזכורת) — אין מה להזכיר.
    // בתהליך מהכלל הקודם כל חבילה של הלקוח פותחת אותו
    const legacy = !payment.plan || payment.plan.createdAt < ONE_PROCESS_PER_PAYMENT_SINCE;
    const newer = await prisma.platformPayment.count({
      where: {
        userId: payment.userId,
        status: 'PAID',
        createdAt: { gt: payment.createdAt },
        ...(legacy ? {} : { planId: payment.planId }),
      },
    });
    if (newer > 0) continue;
    const open = payment.planId
      ? await isOpenSelfServicePlan(payment.planId)
      : (await countOpenSelfServicePlans(payment.userId, ONE_PROCESS_PER_PAYMENT_SINCE)) > 0;
    if (!open) continue;
    if (!payment.user.email) continue;

    const email = renewalReminderEmail({
      name: payment.user.name,
      planName: payment.plan?.name ?? null,
      accessUntil,
      daysLeft: daysUntil(accessUntil, now),
      price: platformPrice,
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
