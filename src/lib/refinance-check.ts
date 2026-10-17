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
 *    • הקטנת ההחזר החודשי — פריסה ל-30 שנה, כשהמסלולים שמעל הממוצע יורדים
 *      לממוצע. התוצאה מפרידה בין מה שנחסך מהריביות לבין מה שנחסך מהפריסה.
 *    • הקטנת סך הריביות — רק כשלפחות מסלול אחד מעל הממוצע: הוא מתומחר לממוצע,
 *      והתקופה מתקצרת כל עוד ההחזר לא עולה על ההחזר היום ועל מגבלת יחס ההחזר.
 *    • סילוק מהיר — התקופה הקצרה ביותר שההחזר בה עומד במגבלת יחס ההחזר.
 *
 *  מסלול נחשב מעל הממוצע רק בפער של 0.2% ומעלה. במשתנה צמודה שהוזנה כעוגן
 *  ומרווח משווים את המרווח למרווח הממוצע. במסלול קבוע שמתומחר מחדש מוצגת
 *  גם תקרה לעמלת ההיוון, כי היא עלולה לבטל חלק מהחיסכון.
 *
 *  הריביות הממוצעות: בנק ישראל מפרסם ממוצע לקבועה לא צמודה, לקבועה צמודה
 *  ולמשתנה צמודה (עוגן + מרווח). לפריים, למשתנה לא צמודה ולזכאות אין ממוצע —
 *  במסלולים האלה נשארת הריבית של הלקוח. אין ערכי נפילה שנכתבו בקוד.
 *
 *  החישוב נומינלי (בלי תחזית מדד), והחיסכון מוצג לפני עמלות — זו הערכה.
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
  /** המרווח מעל העוגן של בנק ישראל, כשהריבית הוזנה כעוגן ומרווח */
  spread?: number;
  /** עוגן שהוזן ידנית במקום הערך של בנק ישראל */
  anchorOverride?: number;
  /** תחנת היציאה של מסלול משתנה, בשנים — קובעת את העוגן */
  variablePeriod?: number;
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
  /** המרווח הממוצע מעל העוגן במשתנה צמודה */
  variable_linked_margin: number | null;
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
    variable_linked_margin: byKey.get('variable_linked')?.margin ?? null,
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

/** ריבית מעל הממוצע — רק פער של 0.2% ומעלה נחשב הזדמנות */
export const ABOVE_AVERAGE_TOLERANCE = 0.2;

/** מסלולים קבועים: פירעון לפני הסוף כרוך בעמלת היוון כשהריבית בשוק נמוכה מהריבית בחוזה */
export function hasPrepaymentFee(type: RefiCheckTrackType): boolean {
  return type === 'fixed_unlinked' || type === 'fixed_linked';
}

// ───────────────────────────── חישובי בסיס ─────────────────────────────

/** החזר חודשי בשפיצר */
export function monthlyPayment(balance: number, annualRate: number, months: number): number {
  if (balance <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return balance / months;
  return (balance * r) / (1 - Math.pow(1 + r, -months));
}

/**
 * תקרה להערכת עמלת ההיוון במסלול קבוע: הערך הנוכחי של התשלומים שנותרו, מהוון
 * בריבית הממוצעת של היום, פחות היתרה. העמלה בפועל נמדדת מול הריבית הממוצעת
 * ביום לקיחת ההלוואה (שהכלי לא יודע) ולפני הנחות ותק, ולכן היא לרוב נמוכה מזה.
 */
export function estimatePrepaymentFee(balance: number, rate: number, months: number, marketRate: number): number {
  if (balance <= 0 || months <= 0 || marketRate >= rate) return 0;
  const payment = monthlyPayment(balance, rate, months);
  const r = marketRate / 100 / 12;
  const presentValue = r === 0 ? payment * months : (payment * (1 - Math.pow(1 + r, -months))) / r;
  return Math.max(0, presentValue - balance);
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
  /**
   * הריבית הממוצעת להשוואה, או null כשבנק ישראל אינו מפרסם כזו. במשתנה צמודה
   * שהוזנה כעוגן ומרווח — העוגן של הלקוח ועוד המרווח הממוצע.
   */
  average: number | null;
  /** במשתנה צמודה עם מרווח: המרווח של הלקוח מול המרווח הממוצע */
  margin: { own: number; average: number } | null;
  aboveAverage: boolean;
  /** הריבית בחישוב החדש */
  newRate: number;
  /** בפריים: המרווח של הלקוח מעל הפריים של היום */
  primeMargin: number | null;
  /** תקרה לעמלת הפירעון המוקדם, כשמסלול קבוע מתומחר מחדש */
  prepaymentFee: number;
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
  /** החיסכון המוערך, לפני עמלות פירעון מוקדם */
  savings: {
    monthly: number;
    interest: number;
    months: number;
    /** תקרה לעמלות הפירעון המוקדם במסלולים הקבועים שמתומחרים מחדש */
    fees: number;
    /**
     * החלק מהחיסכון שמגיע מהוזלת ריביות (בהקטנת החזר — בש"ח לחודש, בשאר — בש"ח
     * לאורך המשכנתא). השאר מגיע משינוי התקופה בלבד.
     */
    fromRates: number;
  };
  /** כמה מסלולים הוזלו לממוצע */
  repricedCount: number;
  /** השיפור מגיע בעיקר משינוי התקופה או ההחזר, לא מריבית טובה יותר */
  mainlyFromTerm: boolean;
  /** סוגי מסלולים שאין להם ממוצע ולכן לא נבדקו */
  unchecked: RefiCheckTrackType[];
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
/** מתחת לחלק הזה מהחיסכון שמגיע מריביות — השיפור נחשב "בעיקר מהתקופה" */
const RATES_SHARE_FOR_REAL_GAIN = 0.25;

export function validTracks(tracks: RefiCheckTrack[]): RefiCheckTrack[] {
  return tracks.filter(
    (t) => t.balance > 0 && t.rate >= 0 && t.rate < 20 && t.months >= 1 && t.months <= MAX_TERM_MONTHS
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function reviewTracks(tracks: RefiCheckTrack[], averages: AverageRates): TrackReview[] {
  return tracks.map((track) => {
    let average = averageFor(track.type, averages);
    let margin: TrackReview['margin'] = null;
    let aboveAverage = average !== null && track.rate > average + ABOVE_AVERAGE_TOLERANCE;
    let newRate = aboveAverage && average !== null ? average : track.rate;

    // משתנה צמודה שהוזנה כעוגן ומרווח: העוגן נקבע לפי תחנת היציאה של הלקוח,
    // ולכן משווים מרווח למרווח — ולא את הריבית כולה לממוצע אחד לכל התחנות
    const spread = track.spread;
    if (
      track.type === 'variable_linked' &&
      typeof spread === 'number' &&
      Number.isFinite(spread) &&
      averages.variable_linked_margin !== null
    ) {
      const averageMargin = averages.variable_linked_margin;
      margin = { own: spread, average: averageMargin };
      average = round2(track.rate - spread + averageMargin);
      aboveAverage = spread > averageMargin + ABOVE_AVERAGE_TOLERANCE;
      newRate = aboveAverage ? average : track.rate;
    }

    const prepaymentFee =
      aboveAverage && hasPrepaymentFee(track.type)
        ? estimatePrepaymentFee(track.balance, track.rate, track.months, newRate)
        : 0;

    return {
      id: track.id,
      type: track.type,
      balance: track.balance,
      rate: track.rate,
      months: track.months,
      average,
      margin,
      aboveAverage,
      newRate,
      primeMargin:
        track.type === 'prime' && averages.primeAnchor !== null ? round2(track.rate - averages.primeAnchor) : null,
      prepaymentFee,
    };
  });
}

/** סוגי המסלולים שאין להם ממוצע להשוואה, לפי הסדר הקבוע */
function uncheckedTypes(reviews: TrackReview[]): RefiCheckTrackType[] {
  const types = new Set(reviews.filter((r) => r.average === null).map((r) => r.type));
  return TRACK_TYPE_ORDER.filter((type) => types.has(type));
}

function joinTypes(types: RefiCheckTrackType[]): string {
  const labels = types.map((type) => TRACK_TYPE_LABELS[type]);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} ו${labels.at(-1)}`;
}

/** ההסבר כשאף ריבית אינה מעל הממוצע */
function noRepricingReason(unchecked: RefiCheckTrackType[], allUnchecked: boolean): string {
  if (allUnchecked) {
    return `ל${joinTypes(unchecked)} בנק ישראל אינו מפרסם ריבית ממוצעת, ולכן הכלי לא יכול לבדוק אם הריבית שלכם גבוהה. כדאי שיועץ יבדוק את המרווח שקיבלתם`;
  }
  const base = `הריביות במסלולים שאפשר להשוות אינן גבוהות מהממוצע של בנק ישראל ביותר מ-${ABOVE_AVERAGE_TOLERANCE}%`;
  return unchecked.length > 0
    ? `${base}. ל${joinTypes(unchecked)} אין ממוצע להשוואה, ושם כדאי שיועץ יבדוק את המרווח`
    : base;
}

/** המסלולים בתמחור החדש: מסלול שמעל הממוצע יורד לממוצע, והשאר נשארים */
function repricedTracks(reviews: TrackReview[]) {
  return reviews.map((r) => ({ balance: r.balance, rate: r.newRate, months: r.months }));
}

export function analyzeRefinance(input: RefiCheckInput): RefiCheckResult {
  const tracks = validTracks(input.tracks);
  const reviews = reviewTracks(tracks, input.averages);
  const current = totals(tracks);
  const repricedCount = reviews.filter((r) => r.aboveAverage).length;
  const fees = reviews.reduce((sum, r) => sum + r.prepaymentFee, 0);
  const unchecked = uncheckedTypes(reviews);
  const allUnchecked = reviews.length > 0 && reviews.every((r) => r.average === null);

  const base: RefiCheckResult = {
    goal: input.goal,
    current,
    tracks: reviews,
    improvement: false,
    proposed: null,
    alternative: null,
    savings: { monthly: 0, interest: 0, months: 0, fees: 0, fromRates: 0 },
    repricedCount,
    mainlyFromTerm: false,
    unchecked,
    affordability: null,
    reason: null,
  };

  if (tracks.length === 0) return { ...base, reason: 'לא הוזנו מסלולים לבדיקה' };

  const repriced = repricedTracks(reviews);
  // אותן תקופות, ריביות חדשות: כמה נחסך רק מהוזלת הריביות
  const sameTerms = totals(repriced);

  if (input.goal === 'reduce-payment') {
    // פריסה ל-30 שנה: מסלולים שמעל הממוצע יורדים לממוצע, והשאר נשארים בריבית שלהם
    const spread = totals(repriced.map((t) => ({ ...t, months: MAX_TERM_MONTHS })));
    const spreadNow = totals(tracks.map((t) => ({ ...t, months: MAX_TERM_MONTHS })));

    const proposed =
      repricedCount > 0
        ? { label: 'פריסה ל-30 שנה, והריביות שמעל הממוצע יורדות לממוצע', summary: spread }
        : { label: 'פריסה ל-30 שנה בריביות הנוכחיות', summary: spreadNow };
    const alternative =
      repricedCount > 0 ? { label: 'פריסה ל-30 שנה בריביות הנוכחיות', summary: spreadNow } : null;

    const monthly = current.payment - proposed.summary.payment;
    const fromRates = Math.max(0, current.payment - sameTerms.payment);
    const improvement = monthly >= Math.max(MIN_MONTHLY_SAVING, current.payment * 0.015);
    return {
      ...base,
      improvement,
      proposed,
      alternative,
      savings: {
        monthly: Math.max(0, monthly),
        interest: current.totalPaid - proposed.summary.totalPaid,
        months: 0,
        fees: repricedCount > 0 ? fees : 0,
        fromRates: Math.min(fromRates, Math.max(0, monthly)),
      },
      mainlyFromTerm: improvement && fromRates < monthly * RATES_SHARE_FOR_REAL_GAIN,
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

  if (disposable <= 0) {
    return { ...base, affordability, reason: 'כדי לחשב את יחס ההחזר צריך להזין את ההכנסה החודשית נטו' };
  }

  const overLimitReason =
    'ההחזר היום כבר גבוה ממגבלת יחס ההחזר, ולכן אין מקום לקצר את המשכנתא. כדאי לבדוק עם יועץ איך להקל על ההחזר';

  if (input.goal === 'reduce-interest') {
    // בלי הוזלה של לפחות מסלול אחד אין כאן מיחזור — רק שינוי מבנה של אותה משכנתא
    if (repricedCount === 0) {
      return { ...base, affordability, reason: noRepricingReason(unchecked, allUnchecked) };
    }

    // לא מגדילים את ההחזר, ולא מאריכים את המשכנתא רק כי ההחזר היום מעל המגבלה
    const cap = affordability.currentOverLimit ? current.payment : Math.min(maxPayment, current.payment);
    const term = shortestTermWithin(repriced, cap);
    if (term === null) return { ...base, affordability, reason: overLimitReason };

    const proposed = totals(repriced.map((t) => ({ ...t, months: term })));
    const interest = current.totalPaid - proposed.totalPaid;
    const fromRates = current.totalPaid - sameTerms.totalPaid;
    const improvement = interest >= Math.max(MIN_INTEREST_SAVING, current.totalInterest * 0.03);

    return {
      ...base,
      affordability,
      improvement,
      proposed: { label: 'ריביות ממוצעות ותקופה קצרה יותר, בלי להגדיל את ההחזר', summary: proposed },
      savings: {
        monthly: current.payment - proposed.payment,
        interest: Math.max(0, interest),
        months: Math.max(0, current.months - term),
        fees,
        fromRates: Math.max(0, Math.min(fromRates, interest)),
      },
      mainlyFromTerm: improvement && fromRates < interest * RATES_SHARE_FOR_REAL_GAIN,
      reason: improvement ? null : 'הפער מהממוצע קטן, ולכן החיסכון בריבית קטן',
    };
  }

  // סילוק מהיר
  if (affordability.currentOverLimit) return { ...base, affordability, reason: overLimitReason };

  const term = shortestTermWithin(repriced, maxPayment);
  if (term === null) return { ...base, affordability, reason: overLimitReason };

  const proposed = totals(repriced.map((t) => ({ ...t, months: term })));
  const interest = current.totalPaid - proposed.totalPaid;
  const monthsSaved = current.months - term;

  // אותו קיצור בלי מיחזור: הריביות של היום, וההחזר עולה עד המגבלה
  const shortenTerm = shortestTermWithin(tracks, maxPayment);
  const shortenOnly = shortenTerm === null ? null : totals(tracks.map((t) => ({ ...t, months: shortenTerm })));
  const fromTerm = shortenOnly ? Math.max(0, current.totalPaid - shortenOnly.totalPaid) : 0;
  const fromRates = Math.max(0, interest - fromTerm);

  const improvement = monthsSaved >= MIN_MONTHS_SAVED && interest > 0;

  return {
    ...base,
    affordability,
    improvement,
    proposed: { label: 'סילוק מהיר במגבלת יחס ההחזר', summary: proposed },
    savings: {
      monthly: current.payment - proposed.payment,
      interest: Math.max(0, interest),
      months: Math.max(0, monthsSaved),
      fees: repricedCount > 0 ? fees : 0,
      fromRates,
    },
    mainlyFromTerm: improvement && fromRates < interest * RATES_SHARE_FOR_REAL_GAIN,
    reason: improvement ? null : 'במגבלת יחס ההחזר אי אפשר לקצר את המשכנתא באופן משמעותי מעבר למה שהיא היום',
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
