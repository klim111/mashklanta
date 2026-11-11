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
 * טבלת הבסיס. אלה הערכים שנכתבו בקוד, והם משמשים לשני דברים בלבד:
 * כרשת ביטחון כשאין נתונים חיים מבנק ישראל, וכבסיס לחילוץ המרווח הבנקאי
 * הטיפוסי של כל מסלול (ראו `defaultSpreadFor` ב-`rate-anchors.ts`).
 *
 * מה שמוצג ומחושב בפלטפורמה הוא `INTEREST_RATES` שמתחתיו — אותם מפתחות, אבל
 * עם הערכים שנמשכו מבנק ישראל בהרצה הנוכחית.
 */
export const STATIC_INTEREST_RATES = {
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

export type InterestRateKey = keyof typeof STATIC_INTEREST_RATES;

/**
 * הערכים החיים שנמשכו מבנק ישראל בהרצה הנוכחית.
 *
 * המפה הזו ממולאת על ידי `applyLiveInterestRates` בכל פעם שנתוני בנק ישראל
 * נמשכים — בשרת בעת בניית התשובה, ובדפדפן בכל טעינה של הדף. כל עוד היא ריקה
 * (אין רשת, בנק ישראל לא זמין) הפלטפורמה נופלת לטבלת הבסיס.
 */
const liveRates: Partial<Record<InterestRateKey, number>> = {};
const liveTrackRates: Partial<Record<MortgageTrackType, number>> = {};

/**
 * עדכון הערכים החיים. נקרא ממקום אחד בלבד (`rate-anchors.ts`), כדי שהטבלה
 * הזו לא תתמלא מחישובים מקומיים אלא רק ממה שבאמת נמשך מבנק ישראל.
 */
export function setLiveInterestRates(
  rates: Partial<Record<InterestRateKey, number>>,
  trackRates: Partial<Record<MortgageTrackType, number>>
): void {
  (Object.keys(rates) as InterestRateKey[]).forEach((key) => {
    const value = rates[key];
    if (typeof value === 'number' && Number.isFinite(value)) liveRates[key] = value;
  });
  (Object.keys(trackRates) as MortgageTrackType[]).forEach((key) => {
    const value = trackRates[key];
    if (typeof value === 'number' && Number.isFinite(value)) liveTrackRates[key] = value;
  });
}

/** ניקוי הערכים החיים — לשימוש בטסטים */
export function clearLiveInterestRates(): void {
  (Object.keys(liveRates) as InterestRateKey[]).forEach((key) => delete liveRates[key]);
  (Object.keys(liveTrackRates) as MortgageTrackType[]).forEach((key) => delete liveTrackRates[key]);
}

/**
 * אובייקט הריביות המרכזי — מקור האמת היחיד לכל מי שקורא ריבית בפלטפורמה.
 *
 * הקריאה עוברת דרך הערכים שנמשכו מבנק ישראל, ורק אם אין כאלה היא נופלת לטבלת
 * הבסיס. כך כל מקום בקוד שקורא `INTEREST_RATES.prime` מקבל את ריבית הפריים
 * שבתוקף עכשיו, בלי שצריך לחווט אליו את שכבת הנתונים.
 */
export const INTEREST_RATES: typeof STATIC_INTEREST_RATES = new Proxy(STATIC_INTEREST_RATES, {
  get(target, property: string | symbol) {
    if (typeof property === 'string' && property in liveRates) {
      return liveRates[property as InterestRateKey];
    }
    return target[property as keyof typeof target];
  },
});

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
const STATIC_DEFAULT_INTEREST_RATES: Record<MortgageTrackType, number> = {
  fixed_unlinked: STATIC_INTEREST_RATES.fixed_unlinked,
  fixed_linked: STATIC_INTEREST_RATES.fixed_linked,
  prime: STATIC_INTEREST_RATES.prime,
  variable_unlinked: STATIC_INTEREST_RATES.variable_unlinked_5y,
  variable_linked: STATIC_INTEREST_RATES.variable_linked_5y,
  makam: STATIC_INTEREST_RATES.makam,
  dollar: STATIC_INTEREST_RATES.dollar,
  euro: STATIC_INTEREST_RATES.euro,
  eligibility: STATIC_INTEREST_RATES.eligibility,
  // אין ערך ייחודי בטבלה ל"תוכנית חומש"; משתמש בקבועה לא-צמודה כקירוב סביר.
  five_year_plan: STATIC_INTEREST_RATES.fixed_unlinked,
  // מענק אינו נושא ריבית.
  grant: 0,
};

/**
 * ריבית ברירת המחדל לפי סוג מסלול — חיה, באותו עיקרון כמו `INTEREST_RATES`:
 * מה שנמשך מבנק ישראל, ורק בהיעדרו הערך מטבלת הבסיס.
 */
export const DEFAULT_INTEREST_RATES: Record<MortgageTrackType, number> = new Proxy(
  STATIC_DEFAULT_INTEREST_RATES,
  {
    get(target, property: string | symbol) {
      if (typeof property === 'string' && property in liveTrackRates) {
        return liveTrackRates[property as MortgageTrackType];
      }
      return target[property as keyof typeof target];
    },
  }
);

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
function rateFrom(
  table: typeof STATIC_INTEREST_RATES,
  defaults: Record<MortgageTrackType, number>,
  trackType: MortgageTrackType,
  period: number | undefined
): number {
  if (trackType === "variable_unlinked") {
    return period !== undefined && period <= 2
      ? table.variable_unlinked_2y
      : table.variable_unlinked_5y;
  }

  if (trackType === "variable_linked") {
    return period !== undefined && period <= 2
      ? table.variable_linked_2y
      : table.variable_linked_5y;
  }

  return defaults[trackType];
}

export function getInterestRate(
  trackType: MortgageTrackType,
  options?: { variablePeriodYears?: number }
): number {
  return rateFrom(INTEREST_RATES, DEFAULT_INTEREST_RATES, trackType, options?.variablePeriodYears);
}

/**
 * הריבית מטבלת הבסיס בלבד, בלי הערכים החיים.
 *
 * משמשת לחילוץ המרווח הבנקאי הטיפוסי: המרווח נגזר מהפער בין הציטוט שנכתב
 * בטבלה לבין העוגן של אותה נקודת זמן, ולכן הוא חייב להיגזר מערך קבוע. שימוש
 * בערך החי היה גורם למרווח לרדוף אחרי עצמו.
 */
export function getStaticInterestRate(
  trackType: MortgageTrackType,
  options?: { variablePeriodYears?: number }
): number {
  return rateFrom(
    STATIC_INTEREST_RATES,
    STATIC_DEFAULT_INTEREST_RATES,
    trackType,
    options?.variablePeriodYears
  );
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
export const INTEREST_RATE_KEYS = Object.keys(STATIC_INTEREST_RATES) as InterestRateKey[];

/**
 * רשימת הריביות לתצוגה. נבנית בכל קריאה, כדי שהיא תשקף את הערכים החיים ולא
 * את מה שהיה בזיכרון בזמן טעינת המודול.
 */
export function interestRatesList(): ReadonlyArray<{
  key: InterestRateKey;
  label: string;
  rate: number;
}> {
  return INTEREST_RATE_KEYS.map((key) => ({
    key,
    label: INTEREST_RATE_DISPLAY_NAMES[key],
    rate: INTEREST_RATES[key],
  }));
}
