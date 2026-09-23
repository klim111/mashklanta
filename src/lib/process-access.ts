/**
 * הגישה בתשלום לתהליך משכנתא — מסלול עצמאי / היברידי.
 *
 * כל תשלום הוא חבילת גישה ל-30 יום. בתוך החבילה אפשר לפתוח, למחוק ולפתוח
 * מחדש תהליכים בלי תשלום נוסף, עד שני תהליכים פתוחים במקביל, ומועד התפוגה
 * נשאר של התשלום — פתיחה מחדש אינה מאפסת את 30 הימים. תהליך שהסתיים סוגר את
 * החבילה לתהליכים חדשים: תהליך שנפתח אחרי סיום דורש תשלום חדש, גם בתוך 30
 * הימים. תהליך פתוח שעברו 30 יום מהתשלום האחרון ננעל עד לרכישת חבילה נוספת,
 * והחבילה הנוספת פותחת את כל התהליכים הפתוחים של הלקוח.
 *
 * התשלום נקשר לתהליך שנפתח ראשון אחריו (`PlatformPayment.planId`), אבל זה רק
 * לצורך הקיזוז אם יוזמן ליווי. הגישה עצמה נגזרת מכל התשלומים של הלקוח.
 *
 * הקובץ טהור בכוונה: הוא נבדק בבדיקות יחידה ונטען גם בשרת וגם בדפדפן.
 */

/** מחיר המסלול העצמאי / ההיברידי — לתהליך משכנתא אחד */
export const PROCESS_PRICE = 49;

/** כמה ימים הכלים פתוחים מכל תשלום */
export const PROCESS_ACCESS_DAYS = 30;

/** כמה תהליכים פתוחים (שלא הסתיימו) מותר לנהל במקביל במסלול העצמאי */
export const MAX_OPEN_PROCESSES = 2;

/** כמה זמן לוקח תהליך משכנתא בדרך כלל, בחודשים — לחישוב טווח העלות הכוללת */
export const TYPICAL_PROCESS_MONTHS = { min: 1, max: 3 } as const;

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
 * האם תשלום פותח את הכלים בתהליך שנפתח במועד `planCreatedAt`.
 *
 * תשלום שבוצע אחרי שהתהליך נפתח הוא חידוש, והוא פותח אותו. תשלום שבוצע לפני
 * כן פותח את התהליך רק אם התהליך נפתח בתוך 30 הימים של התשלום, ולא הסתיים
 * בינתיים אף תהליך של הלקוח — סיום תהליך סוגר את החבילה לתהליכים חדשים.
 */
export function paymentCovers(
  payment: PaymentLike,
  planCreatedAt: Date | string,
  completions: ReadonlyArray<Date | string>
): boolean {
  const paidAt = new Date(payment.createdAt);
  const openedAt = new Date(planCreatedAt);
  if (openedAt <= paidAt) return true;
  if (openedAt >= passExpiresAt(paidAt)) return false;
  return !completions.some((at) => {
    const completedAt = new Date(at);
    return completedAt > paidAt && completedAt <= openedAt;
  });
}

/**
 * החבילה שמאפשרת לפתוח עכשיו תהליך חדש בלי לשלם: תשלום שעוד לא עברו ממנו 30
 * יום, ושלא הסתיים אחריו אף תהליך. כשיש כמה, נבחר החדש ביותר. הגבלת שני
 * התהליכים הפתוחים נבדקת בנפרד, מול התהליכים עצמם.
 */
export function newProcessPass<T extends PaymentLike>(
  payments: readonly T[],
  completions: ReadonlyArray<Date | string>,
  now = new Date()
): T | null {
  return latest(payments.filter((payment) => paymentCovers(payment, now, completions)));
}

/**
 * כרטיס כניסה פנוי: תשלום שעדיין לא נקשר לתהליך ושעוד לא עברו 30 יום ממנו.
 * מקבלים רק תשלומים שאינם קשורים לתהליך. כשיש כמה, נבחר החדש ביותר.
 */
export function openPass<T extends PaymentLike>(unbound: readonly T[], now = new Date()): T | null {
  const valid = unbound.filter((payment) => passExpiresAt(payment.createdAt) > now);
  return latest(valid);
}

/**
 * - `ACTIVE` — הכלים פתוחים
 * - `EXPIRED` — עברו 30 יום מהתשלום האחרון, צריך לרכוש חבילה נוספת
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
  /** התשלומים שנקשרו לתהליך הזה — לחישוב מה ששולם עליו */
  payments: ReadonlyArray<PaymentLike & { amountAgorot?: number }>;
  /** כל התשלומים של בעל התהליך — מהם נגזרת הגישה. ברירת המחדל: `payments` */
  ownerPayments?: ReadonlyArray<PaymentLike>;
  /** מתי הסתיימו התהליכים של בעל התהליך */
  ownerCompletions?: ReadonlyArray<Date | string>;
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

  const covering = (input.ownerPayments ?? input.payments).filter((payment) =>
    paymentCovers(payment, input.planCreatedAt, input.ownerCompletions ?? [])
  );
  const last = latest(covering);
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
