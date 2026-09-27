/**
 * תוקף הריביות באישורים העקרוניים.
 *
 * הריביות שבנק נוקב באישור עקרוני שמורות ללקוח 24 ימים מיום קבלת האישור. עד
 * אז צריך להשלים את המשכנתא — אחרי זה הבנק רשאי לתמחר מחדש. הקובץ גוזר, לכל
 * אישור עקרוני שהתקבל, את מועד פקיעת הריביות וכמה ימים נשארו עד אליו; ומזה
 * את ההתראות של 20, 15, 10 ו-5 ימים לבנק שההצעה שלו נבחרה כסופית במכרז.
 *
 * הקובץ טהור — בלי React ובלי Prisma — כדי שישמש את השלבים, את הדאשבורד ואת
 * לוח השנה באותה צורה, ושאפשר יהיה לבדוק אותו ישירות.
 */

import { winningOffer } from './mortgage-plan';
import type { PlanData } from './mortgage-plan';

/** כמה ימים הריביות באישור העקרוני שמורות — כמו בטופס האישור אצל היועץ */
export const RATE_VALIDITY_DAYS = 24;

/** הימים שנותרו שבהם קופצת התראה לבנק שנבחר סופית — מהמוקדמת למאוחרת */
export const RATE_ALERT_DAYS = [20, 15, 10, 5] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * תאריך מהטופס (YYYY-MM-DD) נקרא כיום מקומי, ולא כחצות UTC — אחרת בחלק
 * מאזורי הזמן הוא היה נופל ליום הקודם.
 */
export function parseDay(value: string): Date | null {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** YYYY-MM-DD מקומי — לשדה התאריך ולמפתחות יציבים */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** ימים שלמים בין היום למועד — שלילי כשהמועד עבר */
function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export interface RateValidityRow {
  bank: string;
  /** יום קבלת האישור העקרוני, כפי שהלקוח הזין (ISO או YYYY-MM-DD) */
  receivedAt: string;
  /** היום שבו הריביות פוקעות — YYYY-MM-DD */
  expiresOn: string;
  /** ימים שנותרו עד שהריביות פוקעות. 0 — היום האחרון, שלילי — פגו */
  daysLeft: number;
  /** זה הבנק שההצעה שלו נבחרה כסופית במכרז */
  final: boolean;
}

/**
 * הבנק שההצעה שלו נבחרה כסופית במכרז הריביות: התמהיל המתומחר שנבחר לחתימה,
 * ובתהליך ישן — ההצעה שסומנה כזוכה.
 */
export function finalAuctionBank(data: PlanData): string | null {
  return data.AUCTION.signedMix?.bank ?? winningOffer(data.AUCTION)?.bank ?? null;
}

/**
 * תוקף הריביות לכל אישור עקרוני שהתקבל ויש לו תאריך קבלה.
 *
 * האישורים לפי בנק הם של הלקוח שמגיש בעצמו. בתהליך שהיועץ מילא, התהליך נושא
 * בנק אחד — הבנק המוביל ותאריך האישור שלו — והוא מוצג כשורה אחת.
 */
export function rateValidity(data: PlanData, now = new Date()): RateValidityRow[] {
  const applications = data.APPLICATIONS;
  const finalBank = finalAuctionBank(data);

  const sources: Array<{ bank: string; receivedAt: string }> = applications.bankApprovals
    .filter((row) => row.approved && row.approvedAt)
    .map((row) => ({ bank: row.bank, receivedAt: row.approvedAt as string }));

  if (
    applications.approved &&
    applications.bank &&
    applications.approvedAt &&
    !sources.some((row) => row.bank === applications.bank)
  ) {
    sources.push({ bank: applications.bank, receivedAt: applications.approvedAt });
  }

  return sources.flatMap(({ bank, receivedAt }) => {
    const received = parseDay(receivedAt);
    if (!received) return [];
    const expires = startOfDay(received);
    expires.setDate(expires.getDate() + RATE_VALIDITY_DAYS);
    return [
      {
        bank,
        receivedAt,
        expiresOn: dayKey(expires),
        daysLeft: daysBetween(now, expires),
        final: bank === finalBank,
      },
    ];
  });
}

/**
 * ההתראה שפעילה עכשיו: הסף הנמוך ביותר מתוך 20/15/10/5 שכבר נחצה. כך, כשנשארו
 * 12 ימים, ההתראה הפעילה היא של 15 — וכשיישארו 10 תקפוץ התראה חדשה. `null`
 * — עוד לא הגענו ל-20 ימים, או שהריביות כבר פגו.
 */
export function rateAlertStep(daysLeft: number): number | null {
  if (daysLeft < 0) return null;
  const crossed = RATE_ALERT_DAYS.filter((threshold) => daysLeft <= threshold);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}

/** "נשארו 12 ימים" / "היום האחרון" / "פגו לפני 3 ימים" */
export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft > 1) return `נשארו ${daysLeft} ימים`;
  if (daysLeft === 1) return 'נשאר יום אחד';
  if (daysLeft === 0) return 'היום האחרון';
  if (daysLeft === -1) return 'פגו אתמול';
  return `פגו לפני ${Math.abs(daysLeft)} ימים`;
}

export type RateValidityTone = 'ok' | 'soon' | 'urgent' | 'expired';

/** צבע השעון: רגוע, מתקרב (עד 10 ימים), דחוף (עד 5) ופג */
export function rateValidityTone(daysLeft: number): RateValidityTone {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 5) return 'urgent';
  if (daysLeft <= 10) return 'soon';
  return 'ok';
}

/** מועד ההתראה של כל סף — לשיבוץ בלוח השנה */
export function rateAlertDates(row: RateValidityRow): Array<{ days: number; on: string }> {
  const expires = parseDay(row.expiresOn);
  if (!expires) return [];
  return RATE_ALERT_DAYS.map((days) => {
    const at = new Date(expires);
    at.setDate(at.getDate() - days);
    return { days, on: dayKey(at) };
  });
}

/** DD/MM/YYYY לפי היום המקומי — גם לתאריך מהטופס וגם למועד מלא */
export function formatDay(value: string): string {
  const date = parseDay(value);
  if (!date) return value;
  const [year, month, day] = dayKey(date).split('-');
  return `${day}/${month}/${year}`;
}
