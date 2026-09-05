import type { DealType, MortgageBank, MortgageTrack } from '../types';
import type { InflationForecast } from '@/lib/inflation-forecast';
import type { PrimeForecast } from '@/lib/prime-forward-curve';
import { isIndexLinked, isRateVariable } from '../scenarioCalculations';

export type TrackType = MortgageTrack['type'];
export type AmortizationType = NonNullable<MortgageTrack['amortizationType']>;

/**
 * דרך ההשפעה של פרעון מוקדם:
 * - shorten_term: ההחזר החודשי נשמר והתקופה מתקצרת (חוסך הכי הרבה ריבית).
 * - reduce_payment: התקופה נשמרת וההחזר החודשי קטן.
 */
export type PrepaymentMode = 'shorten_term' | 'reduce_payment';

export interface PrepaymentEvent {
  id: string;
  kind: 'prepayment';
  /** חודש מתחילת המשכנתא (1 = ההחזר הראשון) */
  month: number;
  amount: number;
  mode: PrepaymentMode;
  /** מסלול ספציפי, או undefined לפיזור יחסי לפי יתרות פתוחות */
  trackId?: string;
  label?: string;
}

export interface RefinanceEvent {
  id: string;
  kind: 'refinance';
  month: number;
  trackId: string;
  newRate: number;
  /** תקופה בשנים מנקודת המחזור והלאה */
  newYears: number;
  newType?: TrackType;
  newAmortizationType?: AmortizationType;
  /** עמלות מחזור שמתגלגלות ליתרת החוב */
  fee?: number;
  label?: string;
}

export type MixEvent = PrepaymentEvent | RefinanceEvent;

/** הנחות מאקרו המוחלות על כל התמהיל */
export interface Assumptions {
  /** שינוי בנקודות אחוז לכל סוג מסלול רגיש-ריבית */
  rateDeltas: Partial<Record<TrackType, number>>;
  /**
   * אינפלציה שנתית קבועה. בערך הבסיס (2%) ובנוכחות תחזית בנק ישראל,
   * המנוע משתמש בנתיב התחזית ולא בקבוע הזה. הזזה בסרגל הסיכונים דורסת
   * את התחזית ומחילה אינפלציה אחידה.
   */
  annualInflation: number;
  /**
   * עקום האפס השקלי של בנק ישראל. כשהוא קיים, מסלול פריים מתומחר חודש-חודש
   * לפי הפורוורדים, ומסלול משתנה לא צמוד מתעדכן בתחנות לפי הפורוורד לתקופה.
   */
  primeForecast?: PrimeForecast;
  /**
   * ציפיות אינפלציה משוק ההון (ברק-איבן בין עקום נומינלי לצמוד). כשהן קיימות
   * והתרחיש לא דורס אותן, מסלולים צמודי מדד מוצמדים לפי הנתיב החודשי.
   */
  inflationForecast?: InflationForecast;
}

/**
 * הנחות הבסיס: ריביות כפי שהוזנו, ותחזית אינפלציה של בנק ישראל (או 2% כשאין
 * תחזית). כל השוואה בגרפים ובמדדים נמדדת מול ההנחות האלה.
 */
export const BASE_ASSUMPTIONS: Assumptions = {
  rateDeltas: {},
  annualInflation: 2,
};

/** שומר את צפי הפריים והמדד כשמאפסים תרחיש — זה בסיס השוק, לא תרחיש */
export function withBaseScenario(assumptions: Assumptions): Assumptions {
  return {
    ...BASE_ASSUMPTIONS,
    primeForecast: assumptions.primeForecast,
    inflationForecast: assumptions.inflationForecast,
  };
}

/** האם להחיל את נתיב תחזית האינפלציה במקום אינפלציה שנתית קבועה */
export function usesInflationForecast(assumptions: Assumptions): boolean {
  const spots = assumptions.inflationForecast?.spots;
  if (!spots || spots.length < 2) return false;
  return Math.abs(assumptions.annualInflation - BASE_ASSUMPTIONS.annualInflation) < 0.001;
}

/** יש הצמדה בפועל — תחזית או אינפלציה קבועה שונה מאפס */
export function inflationIsApplied(assumptions: Assumptions): boolean {
  if (usesInflationForecast(assumptions)) return true;
  return Math.abs(assumptions.annualInflation) > 0.001;
}

/** האם ההנחות שונות מהבסיס — כלומר יש תרחיש פעיל. */
export function isScenarioActive(assumptions: Assumptions): boolean {
  if (Math.abs(assumptions.annualInflation - BASE_ASSUMPTIONS.annualInflation) > 0.001) return true;
  return Object.values(assumptions.rateDeltas).some((delta) => Math.abs(delta ?? 0) > 0.001);
}

export const DEFAULT_ASSUMPTIONS = BASE_ASSUMPTIONS;

/** תמהיל עבודה — תמהיל רגיל בתוספת אירועים והנחות */
export interface WorkspaceMix {
  id: string;
  name: string;
  bank?: MortgageBank;
  totalAmount: number;
  tracks: MortgageTrack[];
  events: MixEvent[];
  assumptions: Assumptions;
  /** תאריך ההחזר הראשון (ISO) — בסיס לחישוב תאריכים בלוח ההחזרים */
  startDate: string;
  /** עלות הנכס. ההון העצמי הוא ההפרש בינה ובין סכום המשכנתא */
  propertyValue?: number;
  /** סוג העסקה — קובע את תקרת המימון המותרת */
  dealType?: DealType;
  /** כתובת הנכס. תמהילים לאותה כתובת מוצגים ומושווים יחד */
  propertyAddress?: string;
  /** תקרת ההחזר החודשי שנקבעה ללקוח */
  maxMonthlyPayment?: number;
  notes?: string;
  /** תמהיל שננעל אחרי בחירה כתמהיל סופי למכרז */
  locked?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** תמהיל שבו המדד קפוא — לוח וסיכום כאילו אין שינוי במדד */
export function withFrozenInflation(mix: WorkspaceMix): WorkspaceMix {
  return {
    ...mix,
    assumptions: {
      ...mix.assumptions,
      annualInflation: 0,
      inflationForecast: undefined,
    },
  };
}

/** תמהיל עם מסלול משתנה או צמוד — המספרים מבוססים על תחזיות */
export function mixHasForecastSensitiveTracks(mix: Pick<WorkspaceMix, 'tracks'>): boolean {
  return mix.tracks.some((track) => isRateVariable(track.type) || isIndexLinked(track.type));
}

/** שורה בלוח סילוקין של מסלול בודד */
export interface ScheduleRow {
  month: number;
  date: string;
  /** הריבית השנתית בפועל באותו חודש (אחרי תרחיש / איפוס / מחזור) */
  annualRate: number;
  /** תחנת יציאה במסלול משתנה לא צמוד — פטור מעמלת פירעון מוקדם */
  isRateStation?: boolean;
  /** יתרת החוב בתחילת החודש, כולל ריבית שנצברה ועוד לא שולמה */
  balanceStart: number;
  payment: number;
  /** הריבית שנצברה באותו חודש */
  interest: number;
  principal: number;
  /**
   * ריבית מחודשים קודמים שנצברה ולא שולמה, ומשולמת עכשיו. קיימת רק בגרייס מלא,
   * ומופרדת מ-interest כדי שהריבית לא תיספר פעמיים.
   */
  deferredInterest: number;
  /** פרעון מוקדם שבוצע באותו חודש */
  prepayment: number;
  /** תוספת קרן מהצמדה למדד באותו חודש */
  indexation: number;
  /** תשלום חד-פעמי בסוף התקופה (בלון) שאינו חלק מההחזר השוטף */
  balloon: number;
  balanceEnd: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
  cumulativePaid: number;
}

export interface TrackResult {
  track: MortgageTrack;
  schedule: ScheduleRow[];
  /** ההחזר החודשי השוטף הראשון. בגרייס מלא אין החזר שוטף ולכן 0 */
  monthlyPayment: number;
  /** ההחזר השוטף האחרון. בקרן שווה הוא הנמוך ביותר, ובשפיצר זהה לראשון */
  lastMonthlyPayment: number;
  /** תשלום הבלון בסוף התקופה — קרן, ובגרייס מלא גם הריבית שנצברה */
  balloonPayment: number;
  totalInterest: number;
  totalPaid: number;
  totalIndexation: number;
  /**
   * כמה יותר שולם בגלל האינפלציה לעומת מדד קפוא. כולל את תוספת הקרן
   * שנפרעת ואת הריבית הנוספת שנצברה עליה.
   */
  inflationCost: number;
  totalPrepaid: number;
  months: number;
}

/** שורה מאוחדת לכל התמהיל */
export interface MixScheduleRow {
  month: number;
  date: string;
  year: number;
  balanceStart: number;
  payment: number;
  interest: number;
  principal: number;
  /** ריבית שנצברה בגרייס מלא ומשולמת עכשיו */
  deferredInterest: number;
  prepayment: number;
  indexation: number;
  /** תשלומי בלון של מסלולים שנפרעים בסוף התקופה */
  balloon: number;
  balanceEnd: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
  cumulativePaid: number;
  /** ריבית משוקללת לפי יתרות באותו חודש */
  weightedRate: number;
  /** יש תחנת יציאה במסלול משתנה לא צמוד בחודש הזה */
  isRateStation?: boolean;
}

export interface MixSummary {
  /** ההחזר החודשי השוטף ההתחלתי, בלי תשלומי בלון */
  monthlyPayment: number;
  /** ההחזר השוטף האחרון — נמוך מהראשון כשיש מסלולי קרן שווה או תקופות שונות */
  lastMonthlyPayment: number;
  /** סך התשלומים החד-פעמיים בסוף התקופה של מסלולי גרייס */
  balloonPayment: number;
  /** ההחזר החודשי השוטף הגבוה ביותר לאורך התקופה */
  peakMonthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  totalIndexation: number;
  /** סך התשלום העודף מול מדד קפוא — הכסף שנשרף על אינפלציה */
  inflationCost: number;
  totalPrepaid: number;
  averageRate: number;
  weightedAverageYears: number;
  months: number;
  /** יחס סך התשלום לקרן — "כמה שקלים שולמו על כל שקל שהתקבל" */
  costPerShekel: number;
  /** אחוז מימון (LTV) אם הוזן שווי נכס */
  ltv?: number;
}

export interface MixResult {
  mix: WorkspaceMix;
  tracks: TrackResult[];
  schedule: MixScheduleRow[];
  summary: MixSummary;
}

/** מצב המשכנתא בנקודת זמן נתונה */
export interface MortgageSnapshot {
  month: number;
  date: string;
  year: number;
  paymentThisMonth: number;
  interestThisMonth: number;
  principalThisMonth: number;
  /** יתרת חוב בסוף החודש */
  remainingBalance: number;
  interestPaidToDate: number;
  principalPaidToDate: number;
  totalPaidToDate: number;
  interestRemaining: number;
  principalRemaining: number;
  totalRemaining: number;
  monthsRemaining: number;
  /** אחוז הקרן שנפרעה */
  principalProgress: number;
  /** אחוז מסך התשלומים ששולם */
  paymentProgress: number;
  tracks: Array<{
    trackId: string;
    name: string;
    type: TrackType;
    annualRate: number;
    paymentThisMonth: number;
    interestThisMonth: number;
    principalThisMonth: number;
    remainingBalance: number;
    interestPaidToDate: number;
    interestRemaining: number;
    monthsRemaining: number;
    closed: boolean;
  }>;
}

/** מטרת אופטימיזציה שהיועץ בוחר */
export type OptimizationGoal =
  | 'lower_monthly'
  | 'lower_total_interest'
  | 'faster_payoff'
  | 'faster_equity'
  | 'balanced';

export interface OptimizationConstraints {
  /** תקרת החזר חודשי בש"ח */
  maxMonthlyPayment?: number;
  /** תקופה מקסימלית בשנים */
  maxYears?: number;
  /** תקופה מינימלית בשנים */
  minYears?: number;
}

export interface OptimizationOutcome {
  goal: OptimizationGoal;
  mix: WorkspaceMix;
  before: MixSummary;
  after: MixSummary;
  /** הסברים בעברית על מה שהשתנה */
  changes: string[];
  feasible: boolean;
}
