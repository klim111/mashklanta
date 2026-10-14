import { passExpiresAt } from './process-access';

/**
 * מה הלקוח שילם, בעיני היועץ: אם הוא לקוח משלם, מתי שילם ועד מתי הגישה
 * בתשלום פתוחה. ארבעה סוגי תשלום נספרים:
 *  - חבילת גישה לחודש (PlatformPayment) — פותחת חודש קלנדרי מיום התשלום
 *  - קישור תשלום שהיועץ יצר (PaymentLink) — שירות חד־פעמי, בלי תאריך תפוגה
 *  - הזמנת ליווי לשלבים ששולמה (AdvisorServiceOrder)
 *  - מנוי חודשי מהמודל הקודם (User.platformAccessAt), כשאין תשלום אחר
 *
 * הקובץ טהור בכוונה, כדי שהחישוב ייבדק בבדיקות יחידה ויוצג זהה בשרת ובדפדפן.
 */

export type ClientPaymentKind = 'PLATFORM' | 'LINK' | 'ADVISORY' | 'LEGACY';

export const PAYMENT_KIND_LABELS: Record<ClientPaymentKind, string> = {
  PLATFORM: 'גישה לפלטפורמה לחודש',
  LINK: 'קישור תשלום',
  ADVISORY: 'ליווי יועץ לשלבים',
  LEGACY: 'מנוי חודשי (המודל הקודם)',
};

export interface ClientPayment {
  kind: ClientPaymentKind;
  paidAt: string;
  /** בשקלים. ריק במנוי מהמודל הקודם, שהסכום שלו לא נשמר */
  amount: number | null;
  title: string;
  /** עד מתי התשלום פותח את הפלטפורמה — רק בחבילת גישה */
  accessUntil: string | null;
}

export interface ClientBillingSummary {
  paid: boolean;
  firstPaidAt: string | null;
  lastPaidAt: string | null;
  /** סוף הגישה בתשלום: התפוגה המאוחרת מבין חבילות הגישה. ריק כשאין חבילה */
  accessEndsAt: string | null;
  accessActive: boolean;
  totalPaid: number;
  /** מהחדש לישן */
  payments: ClientPayment[];
}

export interface ClientBillingInput {
  platformPayments: ReadonlyArray<{ createdAt: Date | string; amountAgorot: number; status?: string | null }>;
  linkPayments: ReadonlyArray<{ paidAt: Date | string | null; amountAgorot: number; title: string }>;
  advisoryOrders: ReadonlyArray<{ paidAt: Date | string | null; amount: number }>;
  legacyAccessAt?: Date | string | null;
}

const iso = (at: Date | string) => new Date(at).toISOString();

export const EMPTY_BILLING: ClientBillingSummary = {
  paid: false,
  firstPaidAt: null,
  lastPaidAt: null,
  accessEndsAt: null,
  accessActive: false,
  totalPaid: 0,
  payments: [],
};

export function summarizeClientBilling(input: ClientBillingInput, now = new Date()): ClientBillingSummary {
  const payments: ClientPayment[] = [];

  for (const payment of input.platformPayments) {
    if (payment.status && payment.status !== 'PAID') continue;
    payments.push({
      kind: 'PLATFORM',
      paidAt: iso(payment.createdAt),
      amount: payment.amountAgorot / 100,
      title: PAYMENT_KIND_LABELS.PLATFORM,
      accessUntil: passExpiresAt(payment.createdAt).toISOString(),
    });
  }
  for (const link of input.linkPayments) {
    if (!link.paidAt) continue;
    payments.push({
      kind: 'LINK',
      paidAt: iso(link.paidAt),
      amount: link.amountAgorot / 100,
      title: link.title,
      accessUntil: null,
    });
  }
  for (const order of input.advisoryOrders) {
    if (!order.paidAt) continue;
    payments.push({
      kind: 'ADVISORY',
      paidAt: iso(order.paidAt),
      amount: order.amount,
      title: PAYMENT_KIND_LABELS.ADVISORY,
      accessUntil: null,
    });
  }
  // מנוי מהמודל הקודם — רק כשאין חבילה חדשה, כדי שאותו תשלום לא ייספר פעמיים
  if (input.legacyAccessAt && !payments.some((payment) => payment.kind === 'PLATFORM')) {
    payments.push({
      kind: 'LEGACY',
      paidAt: iso(input.legacyAccessAt),
      amount: null,
      title: PAYMENT_KIND_LABELS.LEGACY,
      accessUntil: passExpiresAt(input.legacyAccessAt).toISOString(),
    });
  }

  if (payments.length === 0) return { ...EMPTY_BILLING, payments: [] };

  payments.sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const expiries = payments
    .map((payment) => payment.accessUntil)
    .filter((at): at is string => Boolean(at))
    .sort();
  const accessEndsAt = expiries.length > 0 ? expiries[expiries.length - 1] : null;

  return {
    paid: true,
    firstPaidAt: payments[payments.length - 1].paidAt,
    lastPaidAt: payments[0].paidAt,
    accessEndsAt,
    accessActive: accessEndsAt !== null && new Date(accessEndsAt).getTime() > now.getTime(),
    totalPaid: payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0),
    payments,
  };
}
