/**
 * ============================================================================
 *  קובץ ריביות מרכזי - Single Source of Truth for Interest Rates
 * ============================================================================
 *
 *  זהו הקובץ היחיד שמגדיר את הריביות המוגדרות כברירת מחדל בכל הפרויקט.
 *  כדי לעדכן ריבית - יש לשנות את הערך באובייקט `INTEREST_RATES` למטה בלבד.
 *  כל המקומות בפרוייקט שמשתמשים בריבית מייבאים מהקובץ הזה, ולכן השינוי
 *  יתעדכן באופן אוטומטי בכל החישובים והממשקים הרלוונטיים.
 *
 *  This is the ONLY file that defines default interest rates project-wide.
 *  To update a rate, change its value in the `INTEREST_RATES` object below.
 *  Every place in the project that needs an interest rate imports from here,
 *  so changes propagate automatically to all calculations and UI.
 *
 *  מקור הנתונים (לפי הטבלה שסופקה):
 *    מל"צ 2 (משתנה כל שנתיים, לא צמודה)        4.61%
 *    מל"צ 5 (משתנה כל 5 שנים, לא צמודה)         4.63%
 *    מ"צ 2  (משתנה כל שנתיים, צמודה למדד)       —     (לא סופק; נקבע באופן זמני)
 *    מ"צ 5  (משתנה כל 5 שנים, צמודה למדד)       3.03%
 *    מט"ח יורו                                  2.51%
 *    קל"צ   (קבועה לא צמודה)                    4.85%
 *    ק"צ    (קבועה צמודה)                       3.05%
 *    פריים  (Prime)                             5.00%
 *    מק"מ   (מלווה קצר מועד)                    4.20%
 *    זכאות  (משרד השיכון)                       2.67%
 *    דולר                                        3.66%
 * ============================================================================
 */

/**
 * אובייקט הריביות המרכזי - מקור האמת היחיד.
 * המפתחות הם סמנטיים (באנגלית) ותואמים לסוגי המסלולים בשאר הפרויקט.
 * כל הערכים נתונים באחוזים שנתיים.
 */
export const INTEREST_RATES = {
  // ---- ריבית קבועה (Fixed) ----
  /** קל"צ - ריבית קבועה לא צמודה */
  fixed_unlinked: 4.85,
  /** ק"צ - ריבית קבועה צמודה למדד */
  fixed_linked: 3.05,

  // ---- ריבית משתנה לא צמודה (מל"צ) ----
  /** מל"צ 2 - משתנה כל שנתיים, לא צמודה */
  variable_unlinked_2y: 4.61,
  /** מל"צ 5 - משתנה כל 5 שנים, לא צמודה */
  variable_unlinked_5y: 4.63,

  // ---- ריבית משתנה צמודה למדד (מ"צ) ----
  /**
   * מ"צ 2 - משתנה כל שנתיים, צמודה למדד.
   * NOTE: ערך זה לא סופק בטבלה המקורית. נקבע באופן זמני לפי מ"צ 5.
   * יש לעדכן ערך זה כאשר תהיה ריבית רשמית.
   */
  variable_linked_2y: 3.03,
  /** מ"צ 5 - משתנה כל 5 שנים, צמודה למדד */
  variable_linked_5y: 3.03,

  // ---- ריביות מיוחדות ----
  /** פריים (Prime) */
  prime: 5.0,
  /** מק"מ - מלווה קצר מועד */
  makam: 4.2,
  /** זכאות - משרד השיכון */
  eligibility: 2.67,

  // ---- מטח (Foreign Currency) ----
  /** דולר אמריקאי */
  dollar: 3.66,
  /** יורו */
  euro: 2.51,
} as const;

export type InterestRateKey = keyof typeof INTEREST_RATES;

/**
 * מטא-דאטה: תאריך עדכון אחרון של הריביות.
 * עדכן כאשר משנים ריבית כלשהי בטבלה למעלה.
 */
export const INTEREST_RATES_METADATA = {
  lastUpdated: "2026-05-26",
  source: "טבלת ריביות פנימית",
} as const;

// ---------------------------------------------------------------------------
//                       Track-type → Rate Mapping
// ---------------------------------------------------------------------------

/**
 * סוגי המסלולים המקובלים בפרוייקט.
 * תואם ל-`MortgageTrack['type']` ב-`src/components/mortgage-advisor/types.ts`.
 */
export type MortgageTrackType =
  | "fixed_unlinked"
  | "fixed_linked"
  | "prime"
  | "variable_unlinked"
  | "variable_linked"
  | "makam"
  | "dollar"
  | "euro"
  | "eligibility"
  | "five_year_plan"
  | "grant";

/**
 * מיפוי ריביות ברירת מחדל לפי סוג המסלול.
 * משמש לתאימות לאחור עם קוד קיים שמצפה למפה Flat לפי track type.
 *
 * למסלולים משתנים נבחרת כברירת מחדל גרסת 5 שנים (כי זו השכיחה ביותר בשוק
 * הישראלי וקיים לה ערך רשמי בטבלה).
 */
export const DEFAULT_INTEREST_RATES: Record<MortgageTrackType, number> = {
  fixed_unlinked: INTEREST_RATES.fixed_unlinked,
  fixed_linked: INTEREST_RATES.fixed_linked,
  prime: INTEREST_RATES.prime,
  variable_unlinked: INTEREST_RATES.variable_unlinked_5y,
  variable_linked: INTEREST_RATES.variable_linked_5y,
  makam: INTEREST_RATES.makam,
  dollar: INTEREST_RATES.dollar,
  euro: INTEREST_RATES.euro,
  eligibility: INTEREST_RATES.eligibility,
  // אין ערך ייחודי בטבלה ל"תוכנית חומש"; משתמש בקבועה לא-צמודה כקירוב סביר.
  five_year_plan: INTEREST_RATES.fixed_unlinked,
  // מענק אינו נושא ריבית.
  grant: 0,
};

/**
 * שליפת ריבית לפי סוג מסלול, עם תמיכה אופציונלית בתקופת השינוי
 * עבור מסלולים משתנים (2 או 5 שנים).
 *
 * @example
 *   getInterestRate("prime")                          // 5.0
 *   getInterestRate("variable_unlinked")              // 4.63 (5y default)
 *   getInterestRate("variable_unlinked", { variablePeriodYears: 2 }) // 4.61
 *   getInterestRate("variable_linked",   { variablePeriodYears: 2 }) // 3.03
 */
export function getInterestRate(
  trackType: MortgageTrackType,
  options?: { variablePeriodYears?: number }
): number {
  const period = options?.variablePeriodYears;

  if (trackType === "variable_unlinked") {
    return period !== undefined && period <= 2
      ? INTEREST_RATES.variable_unlinked_2y
      : INTEREST_RATES.variable_unlinked_5y;
  }

  if (trackType === "variable_linked") {
    return period !== undefined && period <= 2
      ? INTEREST_RATES.variable_linked_2y
      : INTEREST_RATES.variable_linked_5y;
  }

  return DEFAULT_INTEREST_RATES[trackType];
}

/**
 * נתונים נוחים לתצוגה - שמות תצוגה בעברית לפי המפתחות בטבלה.
 */
export const INTEREST_RATE_DISPLAY_NAMES: Record<InterestRateKey, string> = {
  fixed_unlinked: 'קל"צ (קבועה לא צמודה)',
  fixed_linked: 'ק"צ (קבועה צמודה)',
  variable_unlinked_2y: 'מל"צ 2 (משתנה כל שנתיים, לא צמודה)',
  variable_unlinked_5y: 'מל"צ 5 (משתנה כל 5 שנים, לא צמודה)',
  variable_linked_2y: 'מ"צ 2 (משתנה כל שנתיים, צמודה למדד)',
  variable_linked_5y: 'מ"צ 5 (משתנה כל 5 שנים, צמודה למדד)',
  prime: "פריים (Prime)",
  makam: 'מק"מ (מלווה קצר מועד)',
  eligibility: "זכאות (משרד השיכון)",
  dollar: "דולר",
  euro: 'מט"ח יורו',
};

/**
 * רשימה מסודרת של כל הריביות לצורך הצגה בטבלאות / dropdowns.
 */
export const INTEREST_RATES_LIST: ReadonlyArray<{
  key: InterestRateKey;
  label: string;
  rate: number;
}> = (Object.keys(INTEREST_RATES) as InterestRateKey[]).map((key) => ({
  key,
  label: INTEREST_RATE_DISPLAY_NAMES[key],
  rate: INTEREST_RATES[key],
}));
