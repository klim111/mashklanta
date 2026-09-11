/**
 * ============================================================================
 *  מיחזור משכנתא — לוגיקה טהורה
 * ============================================================================
 *
 *  הקובץ מרכז את כל החישובים של כלי המיחזור שאינם תלויים ב-React: כמה תשלומים
 *  נותרו עד סוף המשכנתא לפי התאריך המדויק ויום החיוב בחודש, גזירת תקופת המסלול
 *  מהתאריכים האלה, השוואת הריבית שהלקוח הזין לריבית הממוצעת של בנק ישראל,
 *  והכללים של מטרת המיחזור (הקטנת ההחזר החודשי מול הקטנת סך הריבית).
 *
 *  הקובץ נטען גם בבדיקות (node) וגם בדפדפן, ולכן אינו מייבא React ואינו נוגע
 *  ב-DOM.
 * ============================================================================
 */

import type { MortgageMix, MortgageTrack } from '@/components/mortgage-advisor/types';

// ───────────────────────────── תקופה ויום חיוב ─────────────────────────────

/** במיחזור התקופה שנותרה עשויה להיות קצרה מאוד, ולכן המינימום הוא חודש אחד */
export const REFI_TERM_MONTHS_MIN = 1;
export const REFI_TERM_MONTHS_MAX = 360;

/** יום החיוב המקובל ברוב הבנקים */
export const DEFAULT_PAYMENT_DAY = 10;

/**
 * יום חיוב תקין. מוגבל ל-1..28 כדי שהתשלום יתקיים בכל חודש, כולל פברואר —
 * בדיוק כפי שהבנקים מגבילים את מועד החיוב.
 */
export function clampPaymentDay(day: unknown): number {
  const value = typeof day === 'number' ? day : Number(day);
  if (!Number.isFinite(value)) return DEFAULT_PAYMENT_DAY;
  return Math.min(28, Math.max(1, Math.round(value)));
}

export function clampRefiTermMonths(months: unknown): number {
  const value = typeof months === 'number' ? months : Number(months);
  if (!Number.isFinite(value)) return REFI_TERM_MONTHS_MIN;
  return Math.min(REFI_TERM_MONTHS_MAX, Math.max(REFI_TERM_MONTHS_MIN, Math.round(value)));
}

/** תאריך מ-ISO (או מ-YYYY-MM-DD) — null כשאין תאריך תקין */
export function parseIsoDate(value?: string | null): Date | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed.length <= 10 ? `${trimmed}T00:00:00` : trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** YYYY-MM-DD — הפורמט של <input type="date"> */
export function toDateInputValue(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface RemainingPayments {
  /** מספר התשלומים שנותרו, כולל התשלום הקרוב וכולל האחרון */
  months: number;
  /** מועד התשלום הבא בפועל */
  nextPaymentDate: Date | null;
  /** מועד התשלום האחרון בפועל */
  lastPaymentDate: Date | null;
}

/**
 * כמה תשלומים נותרו עד סוף המשכנתא.
 *
 * `endDate` הוא החודש שבו משולם התשלום האחרון, ו-`paymentDay` הוא יום החיוב
 * בחודש. יום החיוב קובע גם אם התשלום של החודש הנוכחי כבר ירד: אם היום בחודש
 * עבר את יום החיוב, התשלום הקרוב הוא של החודש הבא. שני התשלומים — הקרוב
 * והאחרון — נספרים.
 */
export function remainingPayments({
  endDate,
  paymentDay = DEFAULT_PAYMENT_DAY,
  from = new Date(),
}: {
  endDate?: string | null;
  paymentDay?: number;
  from?: Date;
}): RemainingPayments {
  const end = parseIsoDate(endDate);
  if (!end) return { months: 0, nextPaymentDate: null, lastPaymentDate: null };

  const day = clampPaymentDay(paymentDay);
  const lastPaymentDate = new Date(end.getFullYear(), end.getMonth(), day);

  // התשלום של החודש הנוכחי כבר ירד אם עבר יום החיוב
  const alreadyChargedThisMonth = from.getDate() > day;
  const nextPaymentDate = new Date(
    from.getFullYear(),
    from.getMonth() + (alreadyChargedThisMonth ? 1 : 0),
    day
  );

  const months =
    (lastPaymentDate.getFullYear() - nextPaymentDate.getFullYear()) * 12 +
    (lastPaymentDate.getMonth() - nextPaymentDate.getMonth()) +
    1;

  return { months: Math.max(0, months), nextPaymentDate, lastPaymentDate };
}

/**
 * התקופה שנותרה למסלול בחודשים. כשהלקוח הזין תאריך סיום — הוא הקובע, כי הוא
 * הנתון המדויק; אחרת נופלים לתקופה שהוזנה ידנית.
 */
export function trackRemainingMonths(
  track: Pick<MortgageTrack, 'years' | 'endDate' | 'paymentDay'>,
  from: Date = new Date()
): number {
  const byDate = remainingPayments({ endDate: track.endDate, paymentDay: track.paymentDay, from });
  if (byDate.months > 0) return byDate.months;
  return Math.max(0, Math.round((Number.isFinite(track.years) ? track.years : 0) * 12));
}

/**
 * מסלול שהתקופה שלו היא הזמן שנותר בפועל עד סוף המשכנתא. כל החישובים — החזר
 * חודשי, סך ריבית ולוח סילוקין — נגזרים מהתקופה הזו, כדי שמצב המוצא של המיחזור
 * יהיה מה שנשאר לשלם ולא המשכנתא המקורית.
 */
export function trackWithRemainingTerm(track: MortgageTrack, from: Date = new Date()): MortgageTrack {
  const months = trackRemainingMonths(track, from);
  if (months <= 0) return track;
  return { ...track, years: months / 12 };
}

/** אותו יישור, לכל מסלולי התמהיל */
export function mixWithRemainingTerms(mix: MortgageMix, from: Date = new Date()): MortgageMix {
  return { ...mix, tracks: mix.tracks.map((track) => trackWithRemainingTerm(track, from)) };
}

/** התאריך שבו נגמר מסלול שנותרו לו `months` תשלומים מהיום */
export function endDateFromMonths(
  months: number,
  paymentDay: number = DEFAULT_PAYMENT_DAY,
  from: Date = new Date()
): Date {
  const day = clampPaymentDay(paymentDay);
  const alreadyChargedThisMonth = from.getDate() > day;
  const offset = (alreadyChargedThisMonth ? 1 : 0) + Math.max(0, Math.round(months) - 1);
  return new Date(from.getFullYear(), from.getMonth() + offset, day);
}

const HEBREW_MONTH_YEAR = new Intl.DateTimeFormat('he-IL', { month: '2-digit', year: 'numeric' });

export function formatPaymentDate(date: Date | null): string {
  if (!date) return '—';
  return HEBREW_MONTH_YEAR.format(date);
}

// ───────────────────────────── חישובי אנונה ─────────────────────────────

/** החזר חודשי בשיטת שפיצר לפי מספר תשלומים (ולא לפי שנים) */
export function monthlyPaymentForMonths(principal: number, annualRate: number, months: number): number {
  const n = Math.max(1, Math.round(months));
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / n;
  const factor = Math.pow(1 + monthlyRate, n);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/** סך הריבית שתשולם על קרן לאורך מספר תשלומים */
export function totalInterestForMonths(principal: number, annualRate: number, months: number): number {
  const n = Math.max(1, Math.round(months));
  if (principal <= 0) return 0;
  return Math.max(0, monthlyPaymentForMonths(principal, annualRate, n) * n - principal);
}

// ───────────────────────── ריביות ממוצעות מבנק ישראל ─────────────────────────

export type MarketRateMap = Partial<Record<MortgageTrack['type'], number>>;

export interface MarketRates {
  rates: MarketRateMap;
  /** לאיזה תאריך הריביות */
  asOf?: string;
  /** 'boi' — נתוני בנק ישראל; 'fallback' — טבלת הריביות הפנימית */
  source?: string;
}

/** פער הריבית מול הממוצע בשוק. חיובי = הלקוח משלם מעל הממוצע */
export function rateGapVsMarket(
  track: Pick<MortgageTrack, 'type' | 'interestRate'>,
  market: MarketRates | null | undefined
): number | null {
  const average = market?.rates?.[track.type];
  if (typeof average !== 'number' || !Number.isFinite(average)) return null;
  if (!Number.isFinite(track.interestRate)) return null;
  return track.interestRate - average;
}

/** רגישות: פער של פחות מ-0.05% הוא רעש ולא הזדמנות */
export const MARKET_RATE_TOLERANCE = 0.05;

export interface MarketRateFinding {
  track: MortgageTrack;
  /** הריבית הממוצעת לאותו סוג מסלול */
  marketRate: number;
  /** בכמה נקודות אחוז הריבית גבוהה מהממוצע */
  gap: number;
  /** כמה ריבית אפשר לחסוך אם המסלול ימוחזר לריבית הממוצעת */
  potentialSaving: number;
}

/**
 * המסלולים שבהם הריבית שהלקוח הזין גבוהה מהריבית הממוצעת בשוק, יחד עם החיסכון
 * הפוטנציאלי אם אותו מסלול ימוחזר לריבית הממוצעת לאורך התקופה שנותרה לו.
 */
export function findAboveMarketTracks(
  tracks: MortgageTrack[],
  market: MarketRates | null | undefined,
  from: Date = new Date()
): MarketRateFinding[] {
  if (!market) return [];
  const findings: MarketRateFinding[] = [];

  tracks.forEach((track) => {
    const gap = rateGapVsMarket(track, market);
    const marketRate = market.rates?.[track.type];
    if (gap === null || gap <= MARKET_RATE_TOLERANCE || typeof marketRate !== 'number') return;

    const months = trackRemainingMonths(track, from);
    if (months <= 0) return;

    const potentialSaving = Math.max(
      0,
      totalInterestForMonths(track.amount, track.interestRate, months) -
        totalInterestForMonths(track.amount, marketRate, months)
    );

    findings.push({ track, marketRate, gap, potentialSaving });
  });

  return findings;
}

/** סך החיסכון הפוטנציאלי בכל המסלולים שמעל הממוצע */
export function totalPotentialSaving(findings: MarketRateFinding[]): number {
  return findings.reduce((sum, finding) => sum + finding.potentialSaving, 0);
}

// ───────────────────────────── מטרת המיחזור ─────────────────────────────

/**
 * מטרת המיחזור:
 * - `reduce_payment` — הקטנת ההחזר החודשי. מותר להאריך תקופה, במחיר ריבית.
 * - `reduce_interest` — הקטנת סך הריבית. התקופה יכולה רק להתקצר.
 */
export type RefinanceGoal = 'reduce_payment' | 'reduce_interest';

export const REFINANCE_GOAL_LABELS: Record<RefinanceGoal, string> = {
  reduce_payment: 'הקטנת ההחזר החודשי',
  reduce_interest: 'הקטנת סך הריבית',
};

/** גבולות סרגל התקופה לפי המטרה — במטרת הקטנת ריבית אי אפשר להאריך */
export function termBoundsForGoal(
  goal: RefinanceGoal,
  baseMonths: number
): { min: number; max: number } {
  const base = clampRefiTermMonths(baseMonths);
  if (goal === 'reduce_interest') {
    return { min: REFI_TERM_MONTHS_MIN, max: base };
  }
  return { min: REFI_TERM_MONTHS_MIN, max: REFI_TERM_MONTHS_MAX };
}

/**
 * המטרה שמתאימה לתקופה שנבחרה. הארכת תקופה סותרת את הקטנת סך הריבית, ולכן
 * הבחירה עוברת אוטומטית להקטנת ההחזר החודשי — במקום לחסום את הלקוח.
 */
export function goalForTermChange(
  goal: RefinanceGoal,
  nextMonths: number,
  baseMonths: number
): RefinanceGoal {
  if (goal === 'reduce_interest' && Math.round(nextMonths) > Math.round(baseMonths)) {
    return 'reduce_payment';
  }
  return goal;
}

/** גבולות סרגל הריבית: אפשר להוריד, ואפשר גם להעלות — עם התרעה */
export function rateBoundsForRefinance(
  baseRate: number,
  marketRate?: number
): { min: number; max: number } {
  const floorCandidates = [baseRate - 1.5];
  if (typeof marketRate === 'number' && Number.isFinite(marketRate)) {
    floorCandidates.push(marketRate - 0.5);
  }
  const min = Math.max(0.1, Math.min(...floorCandidates));
  const max = Math.max(baseRate + 2, min + 0.5);
  return { min, max };
}

/** הריבית שהוזנה גבוהה מהריבית המקורית — מחמירה את תנאי המשכנתא */
export function rateWorsensTerms(nextRate: number, baseRate: number): boolean {
  return nextRate > baseRate + 0.001;
}

// ───────────────────────── חלוקת הסכום בין המסלולים ─────────────────────────

/** הסכום המינימלי שאפשר להשאיר במסלול */
export const MIN_TRACK_AMOUNT = 10_000;

/**
 * הסכום שעדיין לא שובץ לאף מסלול. כל עוד הוא חיובי, אפשר להגדיל מסלול קיים
 * או להוסיף מסלול חדש — עד גובה המשכנתא כולה.
 */
export function unallocatedAmount(totalAmount: number, amounts: number[]): number {
  const allocated = amounts.reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0);
  const remaining = Math.round(totalAmount - allocated);
  return remaining > 0 ? remaining : 0;
}

/**
 * הסכום המרבי שמותר למסלול מסוים: מה שיש בו היום ועוד כל מה שלא שובץ. כך
 * שינוי בסכום של מסלול אחד לעולם לא מוציא את התמהיל מגובה המשכנתא.
 */
export function maxAmountForTrack(
  totalAmount: number,
  amounts: number[],
  trackIndex: number
): number {
  const others = amounts.filter((_, index) => index !== trackIndex);
  const othersSum = others.reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0);
  return Math.max(MIN_TRACK_AMOUNT, Math.round(totalAmount - othersSum));
}

/** מיישר סכום שהוזן למסלול לגבולות המותרים */
export function clampTrackAmount(
  amount: number,
  totalAmount: number,
  amounts: number[],
  trackIndex: number
): number {
  const max = maxAmountForTrack(totalAmount, amounts, trackIndex);
  if (!Number.isFinite(amount)) return max;
  return Math.min(max, Math.max(MIN_TRACK_AMOUNT, Math.round(amount)));
}
