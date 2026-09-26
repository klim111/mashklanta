/**
 * ============================================================================
 *  בדיקת מיחזור מהירה — לוגיקה טהורה
 * ============================================================================
 *
 *  הכלי הציבורי שמתחת לכפתור "בדיקת מיחזור" בדף הבית. הלקוח בוחר מטרה, מזין
 *  (בשתי המטרות האחרונות) הכנסה והלוואות, ואז את מסלולי המשכנתא. המערכת
 *  מחשבת בעצמה — לפי המטרה ולפי הריביות הממוצעות של בנק ישראל — אם יש מקום
 *  לשיפור, ובכמה בערך.
 *
 *  שלוש המטרות:
 *    • הקטנת ההחזר החודשי — ההחזר אם החוב נפרס ל-30 שנה בריביות הנוכחיות,
 *      והתמהיל ל-30 שנה בריביות הממוצעות. הנמוך מביניהם הוא ההערכה.
 *    • הקטנת סך הריביות — מסלולים שהריבית בהם מעל הממוצע מתומחרים לממוצע,
 *      והתקופה מתקצרת כל עוד ההחזר לא עולה על ההחזר היום ועל מגבלת יחס ההחזר.
 *    • סילוק מהיר — התקופה הקצרה ביותר שההחזר בה עומד במגבלת יחס ההחזר.
 *
 *  הריביות הממוצעות: בנק ישראל מפרסם ממוצע לקבועה לא צמודה, לקבועה צמודה
 *  ולמשתנה צמודה (עוגן + מרווח). לפריים, למשתנה לא צמודה ולזכאות אין ממוצע —
 *  במסלולים האלה נשארת הריבית של הלקוח. אין ערכי נפילה שנכתבו בקוד.
 *
 *  החישוב נומינלי (בלי תחזית מדד) ואינו כולל עמלות פירעון מוקדם — זו הערכה.
 * ============================================================================
 */

import type { MortgageMarketSnapshot } from './boi-mortgage-market';

// ───────────────────────────── קלט ─────────────────────────────

export type RefiCheckGoal = 'reduce-payment' | 'reduce-interest' | 'fast-payoff';

export const REFI_CHECK_GOALS: Record<RefiCheckGoal, { title: string; short: string; description: string }> = {
  'reduce-payment': {
    title: 'הקטנת ההחזר החודשי',
    short: 'החזר חודשי',
    description: 'להוריד את התשלום של כל חודש ולהשאיר יותר כסף פנוי',
  },
  'reduce-interest': {
    title: 'הקטנת סך הריביות',
    short: 'סך ריביות',
    description: 'לשלם פחות ריבית לבנק לאורך חיי המשכנתא, בלי להעמיס על ההחזר',
  },
  'fast-payoff': {
    title: 'להיפטר מהמשכנתא מהר',
    short: 'סילוק מהיר',
    description: 'לסיים את המשכנתא כמה שיותר מוקדם, במסגרת מה שההכנסה מאפשרת',
  },
};

/** המטרות שדורשות הכנסה והלוואות כדי לחשב את מגבלת יחס ההחזר */
export function goalNeedsIncome(goal: RefiCheckGoal): boolean {
  return goal !== 'reduce-payment';
}

export type RefiCheckTrackType =
  | 'prime'
  | 'fixed_unlinked'
  | 'fixed_linked'
  | 'variable_linked'
  | 'variable_unlinked'
  | 'eligibility';

export const TRACK_TYPE_LABELS: Record<RefiCheckTrackType, string> = {
  prime: 'פריים',
  fixed_unlinked: 'קבועה לא צמודה',
  fixed_linked: 'קבועה צמודה',
  variable_linked: 'משתנה צמודה',
  variable_unlinked: 'משתנה לא צמודה',
  eligibility: 'זכאות',
};

export const TRACK_TYPE_ORDER: RefiCheckTrackType[] = [
  'prime',
  'fixed_unlinked',
  'fixed_linked',
  'variable_linked',
  'variable_unlinked',
  'eligibility',
];

export interface RefiCheckTrack {
  id: string;
  type: RefiCheckTrackType;
  /** היתרה לסילוק, בש"ח */
  balance: number;
  /** הריבית השנתית היום, באחוזים */
  rate: number;
  /** כמה תשלומים נותרו */
  months: number;
}

export interface RefiCheckLoan {
  id: string;
  monthlyPayment: number;
  /** נותרו יותר מ-18 חודשים עד הפירעון — רק הלוואות כאלה נכנסות לחישוב */
  longTerm: boolean;
}

/** מגבלת יחס ההחזר — אותה מגבלה שבה משתמשים כלי התכנון של הפלטפורמה (40% מההכנסה הפנויה) */
export const PAYMENT_TO_INCOME_LIMIT = 0.4;

/** הלוואה שנותרו לה יותר מכך נחשבת התחייבות קבועה */
export const LONG_TERM_LOAN_MONTHS = 18;

export const MAX_TERM_MONTHS = 360;
export const MIN_TERM_MONTHS = 12;

// ───────────────────────────── ריביות ממוצעות ─────────────────────────────

export interface AverageRates {
  fixed_unlinked: number | null;
  fixed_linked: number | null;
  variable_linked: number | null;
  /** הפריים עצמו (העוגן), לא ממוצע למסלול */
  primeAnchor: number | null;
  /** החודש של נתוני הריביות */
  asOf: string;
}

/** הריביות הממוצעות מתוך נתוני שוק המשכנתאות של בנק ישראל */
export function averageRatesFromMarket(snapshot: MortgageMarketSnapshot): AverageRates {
  const byKey = new Map(snapshot.rates.map((rate) => [rate.key, rate]));
  const prime = byKey.get('variable_unlinked');
  return {
    fixed_unlinked: byKey.get('fixed_unlinked')?.rate ?? null,
    fixed_linked: byKey.get('fixed_linked')?.rate ?? null,
    variable_linked: byKey.get('variable_linked')?.rate ?? null,
    primeAnchor: prime?.anchor ?? null,
    asOf: byKey.get('fixed_unlinked')?.asOf || snapshot.latestMonth,
  };
}

/** הריבית הממוצעת לסוג המסלול, או null כשבנק ישראל אינו מפרסם כזו */
export function averageFor(type: RefiCheckTrackType, averages: AverageRates): number | null {
  if (type === 'fixed_unlinked') return averages.fixed_unlinked;
  if (type === 'fixed_linked') return averages.fixed_linked;
  if (type === 'variable_linked') return averages.variable_linked;
  return null;
}

/** ריבית מעל הממוצע — עם סבולת קטנה, כדי שעשירית האחוז לא תיחשב הזדמנות */
const ABOVE_AVERAGE_TOLERANCE = 0.1;

// ───────────────────────────── חישובי בסיס ─────────────────────────────

/** החזר חודשי בשפיצר */
export function monthlyPayment(balance: number, annualRate: number, months: number): number {
  if (balance <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return balance / months;
  return (balance * r) / (1 - Math.pow(1 + r, -months));
}

interface PricedTrack {
  balance: number;
  rate: number;
  months: number;
}

function totals(tracks: PricedTrack[]) {
  let payment = 0;
  let paid = 0;
  let balance = 0;
  for (const track of tracks) {
    const p = monthlyPayment(track.balance, track.rate, track.months);
    payment += p;
    paid += p * track.months;
    balance += track.balance;
  }
  return { payment, totalPaid: paid, totalInterest: paid - balance, months: Math.max(0, ...tracks.map((t) => t.months)) };
}

export interface MixSummary {
  /** ההחזר החודשי הכולל */
  payment: number;
  /** סך כל התשלומים עד סוף המשכנתא */
  totalPaid: number;
  /** סך הריבית עד סוף המשכנתא */
  totalInterest: number;
  /** המסלול הארוך ביותר, בחודשים */
  months: number;
}

export function disposableIncome(income: number, loans: RefiCheckLoan[]): number {
  const commitments = loans
    .filter((loan) => loan.longTerm)
    .reduce((sum, loan) => sum + Math.max(0, loan.monthlyPayment), 0);
  return Math.max(0, income - commitments);
}

/** התקופה האחידה הקצרה ביותר שבה ההחזר אינו עולה על התקרה, או null כשאין כזו */
function shortestTermWithin(tracks: { balance: number; rate: number }[], maxPayment: number): number | null {
  for (let months = MIN_TERM_MONTHS; months <= MAX_TERM_MONTHS; months += 1) {
    const payment = tracks.reduce((sum, t) => sum + monthlyPayment(t.balance, t.rate, months), 0);
    if (payment <= maxPayment + 0.5) return months;
  }
  return null;
}

// ───────────────────────────── התוצאה ─────────────────────────────

export interface TrackReview {
  id: string;
  type: RefiCheckTrackType;
  balance: number;
  rate: number;
  months: number;
  /** הריבית הממוצעת של בנק ישראל, או null כשאינה מתפרסמת */
  average: number | null;
  aboveAverage: boolean;
  /** הריבית בחישוב החדש */
  newRate: number;
  /** בפריים: המרווח של הלקוח מעל הפריים של היום */
  primeMargin: number | null;
}

export interface RefiScenario {
  label: string;
  summary: MixSummary;
}

export interface RefiCheckResult {
  goal: RefiCheckGoal;
  current: MixSummary;
  tracks: TrackReview[];
  /** יש מקום לשיפור */
  improvement: boolean;
  /** התרחיש שמוצע ללקוח */
  proposed: RefiScenario | null;
  /** תרחיש נוסף להשוואה (בהקטנת החזר: פריסה בריביות הנוכחיות) */
  alternative: RefiScenario | null;
  /** החיסכון המוערך */
  savings: {
    monthly: number;
    interest: number;
    months: number;
  };
  /** מגבלת יחס ההחזר, כשהמטרה דורשת אותה */
  affordability: {
    disposable: number;
    maxPayment: number;
    /** ההחזר היום כבר מעל המגבלה */
    currentOverLimit: boolean;
  } | null;
  /** הסבר קצר כשאין שיפור או כשאי אפשר לחשב */
  reason: string | null;
}

export interface RefiCheckInput {
  goal: RefiCheckGoal;
  tracks: RefiCheckTrack[];
  averages: AverageRates;
  income?: number;
  loans?: RefiCheckLoan[];
}

/** שיפור שמתחתיו לא ממליצים לפתוח תהליך מיחזור */
const MIN_MONTHLY_SAVING = 100;
const MIN_INTEREST_SAVING = 10_000;
const MIN_MONTHS_SAVED = 12;

export function validTracks(tracks: RefiCheckTrack[]): RefiCheckTrack[] {
  return tracks.filter(
    (t) => t.balance > 0 && t.rate >= 0 && t.rate < 20 && t.months >= 1 && t.months <= MAX_TERM_MONTHS
  );
}

export function reviewTracks(tracks: RefiCheckTrack[], averages: AverageRates): TrackReview[] {
  return tracks.map((track) => {
    const average = averageFor(track.type, averages);
    const aboveAverage = average !== null && track.rate > average + ABOVE_AVERAGE_TOLERANCE;
    return {
      id: track.id,
      type: track.type,
      balance: track.balance,
      rate: track.rate,
      months: track.months,
      average,
      aboveAverage,
      newRate: aboveAverage && average !== null ? average : track.rate,
      primeMargin:
        track.type === 'prime' && averages.primeAnchor !== null
          ? Math.round((track.rate - averages.primeAnchor) * 100) / 100
          : null,
    };
  });
}

export function analyzeRefinance(input: RefiCheckInput): RefiCheckResult {
  const tracks = validTracks(input.tracks);
  const reviews = reviewTracks(tracks, input.averages);
  const current = totals(tracks);

  const base: RefiCheckResult = {
    goal: input.goal,
    current,
    tracks: reviews,
    improvement: false,
    proposed: null,
    alternative: null,
    savings: { monthly: 0, interest: 0, months: 0 },
    affordability: null,
    reason: null,
  };

  if (tracks.length === 0) return { ...base, reason: 'לא הוזנו מסלולים לבדיקה' };

  if (input.goal === 'reduce-payment') {
    // פריסה ל-30 שנה בריביות הנוכחיות
    const spreadNow = totals(tracks.map((t) => ({ ...t, months: MAX_TERM_MONTHS })));
    // התמהיל ל-30 שנה בריביות הממוצעות: כל מסלול שבנק ישראל מפרסם לו ממוצע
    // מתומחר לפי הממוצע, והשאר נשארים בריבית שלהם
    const spreadAverage = totals(
      reviews.map((r) => ({ balance: r.balance, rate: r.average ?? r.rate, months: MAX_TERM_MONTHS }))
    );

    const atAverage = { label: 'תמהיל ל-30 שנה בריביות הממוצעות', summary: spreadAverage };
    const atCurrent = { label: 'פריסה ל-30 שנה בריביות הנוכחיות', summary: spreadNow };
    const [best, other] =
      spreadAverage.payment <= spreadNow.payment ? [atAverage, atCurrent] : [atCurrent, atAverage];

    const monthly = current.payment - best.summary.payment;
    const improvement = monthly >= Math.max(MIN_MONTHLY_SAVING, current.payment * 0.015);
    return {
      ...base,
      improvement,
      proposed: best,
      alternative: other,
      savings: { monthly: Math.max(0, monthly), interest: current.totalInterest - best.summary.totalInterest, months: 0 },
      reason: improvement
        ? null
        : 'המשכנתא כבר פרוסה לתקופה ארוכה בריביות סבירות, ולכן פריסה מחדש לא תוריד את ההחזר באופן משמעותי',
    };
  }

  // שתי המטרות האחרות — במגבלת יחס ההחזר
  const disposable = disposableIncome(input.income ?? 0, input.loans ?? []);
  const maxPayment = disposable * PAYMENT_TO_INCOME_LIMIT;
  const affordability = {
    disposable,
    maxPayment,
    currentOverLimit: current.payment > maxPayment + 0.5,
  };
  const repriced = reviews.map((r) => ({ balance: r.balance, rate: r.newRate }));

  if (disposable <= 0) {
    return { ...base, affordability, reason: 'כדי לחשב את יחס ההחזר צריך להזין את ההכנסה החודשית נטו' };
  }

  const cap = input.goal === 'fast-payoff' ? maxPayment : Math.min(maxPayment, current.payment);
  const term = shortestTermWithin(repriced, cap);

  if (term === null) {
    return {
      ...base,
      affordability,
      reason: affordability.currentOverLimit
        ? 'ההחזר היום כבר גבוה ממגבלת יחס ההחזר, ולכן אין מקום לקצר את המשכנתא. כדאי לבדוק עם יועץ איך להקל על ההחזר'
        : 'גם בתקופה של 30 שנה ההחזר חורג ממגבלת יחס ההחזר',
    };
  }

  const proposed = totals(repriced.map((t) => ({ ...t, months: term })));
  const interest = current.totalInterest - proposed.totalInterest;
  const monthsSaved = current.months - term;

  const improvement =
    input.goal === 'fast-payoff'
      ? monthsSaved >= MIN_MONTHS_SAVED && interest > 0
      : interest >= Math.max(MIN_INTEREST_SAVING, current.totalInterest * 0.03);

  return {
    ...base,
    affordability,
    improvement,
    proposed: {
      label:
        input.goal === 'fast-payoff'
          ? 'סילוק מהיר במגבלת יחס ההחזר'
          : 'ריביות ממוצעות ותקופה קצרה יותר, בלי להגדיל את ההחזר',
      summary: proposed,
    },
    savings: { monthly: current.payment - proposed.payment, interest: Math.max(0, interest), months: Math.max(0, monthsSaved) },
    reason: improvement
      ? null
      : input.goal === 'fast-payoff'
        ? 'במגבלת יחס ההחזר אי אפשר לקצר את המשכנתא באופן משמעותי מעבר למה שהיא היום'
        : 'הריביות שלכם קרובות לממוצע והתקופה כבר מותאמת להחזר, ולכן החיסכון בריבית קטן',
  };
}

// ───────────────────────────── עזרי תצוגה ─────────────────────────────

/** מספר התשלומים מהחודש הבא ועד חודש הסיום (כולל) */
export function monthsUntil(endYear: number, endMonth: number, from: Date = new Date()): number {
  return (endYear - from.getFullYear()) * 12 + (endMonth - (from.getMonth() + 1));
}

export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} חודשים`;
  if (rest === 0) return years === 1 ? 'שנה' : `${years} שנים`;
  return `${years === 1 ? 'שנה' : `${years} שנים`} ו-${rest} חודשים`;
}
