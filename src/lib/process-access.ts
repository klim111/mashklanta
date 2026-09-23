/**
 * הגישה בתשלום לתהליך משכנתא — מסלול עצמאי / היברידי.
 *
 * כל תשלום פותח תהליך משכנתא אחד (משכנתא חדשה או מיחזור) ל-35 יום. התשלום
 * נרשם קודם כ"כרטיס כניסה" פנוי, ונקשר לתהליך ברגע שהתהליך נפתח. תהליך שעברו
 * 35 יום מהתשלום האחרון עליו ננעל עד לחידוש, ותהליך שהסתיים אינו פותח תהליך
 * נוסף — כל תהליך חדש דורש תשלום נפרד.
 *
 * הקובץ טהור בכוונה: הוא נבדק בבדיקות יחידה ונטען גם בשרת וגם בדפדפן.
 */

/** מחיר המסלול העצמאי / ההיברידי — לתהליך משכנתא אחד */
export const PROCESS_PRICE = 49;

/** כמה ימים הכלים פתוחים מכל תשלום */
export const PROCESS_ACCESS_DAYS = 35;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * תהליכים שנפתחו לפני שהגישה עברה לתשלום לתהליך. לקוח ששילם אז על מנוי
 * חודשי ממשיך בהם כרגיל, בלי נעילה.
 */
export const PROCESS_PRICING_SINCE = new Date('2026-09-23T00:00:00Z');

export interface PaymentLike {
  createdAt: Date | string;
}

export function passExpiresAt(paidAt: Date | string): Date {
  return new Date(new Date(paidAt).getTime() + PROCESS_ACCESS_DAYS * DAY_MS);
}

/** כמה ימים נשארו עד מועד — מעוגל למעלה, ואפס כשהמועד עבר */
export function daysUntil(at: Date | string, now = new Date()): number {
  const diff = new Date(at).getTime() - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

function latest<T extends PaymentLike>(payments: readonly T[]): T | null {
  let found: T | null = null;
  for (const payment of payments) {
    if (!found || new Date(payment.createdAt) > new Date(found.createdAt)) found = payment;
  }
  return found;
}

/**
 * כרטיס כניסה פנוי: תשלום שעדיין לא נקשר לתהליך ושעוד לא עברו 35 יום ממנו.
 * מקבלים רק תשלומים שאינם קשורים לתהליך. כשיש כמה, נבחר החדש ביותר.
 */
export function openPass<T extends PaymentLike>(unbound: readonly T[], now = new Date()): T | null {
  const valid = unbound.filter((payment) => passExpiresAt(payment.createdAt) > now);
  return latest(valid);
}

/**
 * - `ACTIVE` — הכלים פתוחים
 * - `EXPIRED` — עברו 35 יום מהתשלום האחרון, צריך לחדש
 * - `UNPAID` — תהליך שנפתח בלי תשלום (למשל מכלי המיחזור), צריך לשלם כדי להמשיך
 * - `COMPLETED` — התהליך הסתיים בחתימה; נשאר פתוח לצפייה
 */
export type ProcessAccessState = 'ACTIVE' | 'EXPIRED' | 'UNPAID' | 'COMPLETED';

export interface ProcessAccess {
  state: ProcessAccessState;
  /** עד מתי הכלים פתוחים — null כשהגישה אינה תלויה בתשלום (ליווי, יועץ) */
  expiresAt: string | null;
  daysLeft: number | null;
  /** סכום התשלומים על התהליך הזה, בשקלים — לקיזוז אם יוזמן ליווי */
  paid: number;
}

export interface ProcessAccessInput {
  planStatus: string;
  planCreatedAt: Date | string;
  /** התשלומים שנקשרו לתהליך הזה */
  payments: ReadonlyArray<PaymentLike & { amountAgorot?: number }>;
  /** ליווי ששולם (ליווי מלא או שלבים), או יועץ שמלווה את הלקוח — כולל גישה מלאה לכלים */
  hasPaidAdvisory: boolean;
  /** בעל התהליך הוא יועץ — אצלו הכלים פתוחים תמיד */
  ownerIsAdvisor: boolean;
  /** בעל התהליך שילם על מנוי חודשי לפני המעבר לתשלום לתהליך */
  ownerHadLegacyAccess: boolean;
}

export function processAccess(input: ProcessAccessInput, now = new Date()): ProcessAccess {
  const paid = input.payments.reduce((sum, payment) => sum + (payment.amountAgorot ?? 0), 0) / 100;
  const open = (state: ProcessAccessState): ProcessAccess => ({ state, expiresAt: null, daysLeft: null, paid });

  if (input.planStatus === 'COMPLETED') return open('COMPLETED');
  if (input.ownerIsAdvisor || input.hasPaidAdvisory) return open('ACTIVE');

  const last = latest(input.payments);
  if (last) {
    const expiresAt = passExpiresAt(last.createdAt);
    return {
      state: expiresAt > now ? 'ACTIVE' : 'EXPIRED',
      expiresAt: expiresAt.toISOString(),
      daysLeft: daysUntil(expiresAt, now),
      paid,
    };
  }

  if (input.ownerHadLegacyAccess && new Date(input.planCreatedAt) < PROCESS_PRICING_SINCE) {
    return open('ACTIVE');
  }
  return open('UNPAID');
}

/** האם הכלים נעולים בפני בעל התהליך */
export function processLocked(access: Pick<ProcessAccess, 'state'> | null | undefined): boolean {
  return access?.state === 'EXPIRED' || access?.state === 'UNPAID';
}
