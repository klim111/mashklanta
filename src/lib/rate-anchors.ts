/**
 * ============================================================================
 *  עוגן ומרווח — פירוק הריבית הסופית לשני מרכיבים
 * ============================================================================
 *
 *  ריבית סופית = עוגן + מרווח.
 *
 *  העוגן הוא נתון שוק שנמשך מבנק ישראל ואינו ניתן לעריכה ידנית; המרווח הוא מה
 *  שהבנק גובה מעל העוגן, והוא מה שהיועץ מזין. הפירוק הזה מאפשר שני דברים:
 *  להשוות הצעות של בנקים על בסיס המרווח בלבד, ולעדכן את הריבית הסופית אוטומטית
 *  בכל פעם שנתוני בנק ישראל מתעדכנים.
 *
 *  איזה עוגן לכל מסלול:
 *    פריים              — ריבית הפריים במשק (ריבית בנק ישראל + 1.5%).
 *    משתנה לא צמודה     — עקום האפס ה**נומינלי** של בנק ישראל לחודש הקודם,
 *                         לטווח שווה לתקופת השינוי של המסלול (מל"צ 2 → שנתיים).
 *    משתנה צמודה        — עקום האפס ה**ריאלי**, באותו היגיון.
 *    מק"מ               — עקום האפס הנומינלי לשנה, שזו תקופת המק"מ.
 *
 *  למסלול בריבית קבועה אין עוגן ואין מרווח: הריבית נסגרת מול הבנק ליום החתימה
 *  ואינה מתעדכנת אחר כך מול שום עקום, ולכן היא שדה ריבית אחד. אותו דבר בזכאות,
 *  במענק ובמט"ח, שנקבעים בתקנות או מול ריבית הבסיס במטבע הזר.
 * ============================================================================
 */

import {
  DEFAULT_INTEREST_RATES,
  INTEREST_RATE_DISPLAY_NAMES,
  INTEREST_RATE_KEYS,
  getStaticInterestRate,
  setLiveInterestRates,
  type InterestRateKey,
  type MortgageTrackType,
} from './interest-rates';
import { fallbackMarketRates, type CurveSnapshot, type MarketRatesSnapshot } from './market-rates';
import type { YieldSpot } from './prime-forward-curve';

export type AnchorCurve = 'prime' | 'nominal' | 'real';

export interface RateAnchor {
  /** ערך העוגן באחוזים שנתיים */
  rate: number;
  /** מאיזה עקום נלקח */
  curve: AnchorCurve;
  /** הטווח בשנים שהעוגן נלקח לפיו (לפריים — 0, אין טווח) */
  years: number;
  /** תיאור קצר בעברית לתצוגה ליד השדה */
  label: string;
  /** החודש/התאריך שהנתון מתייחס אליו */
  asOf: string;
  source: 'boi' | 'fallback';
}

export interface AnchorContext {
  /**
   * תקופת השינוי של המסלול המשתנה, בשנים — היא שקובעת לאיזה טווח בעקום האפס
   * העוגן מתייחס. אורך המשכנתא אינו רלוונטי לעוגן: מסלול שמתעדכן כל שנתיים
   * מתומחר מול העקום לשנתיים גם כשהוא נפרס ל-25 שנה.
   */
  variablePeriod?: number;
}

/**
 * תשואה מעקום האפס לטווח נתון, באינטרפולציה ליניארית בין הנקודות שפורסמו.
 * מחוץ לטווח שפורסם הערך מוצמד לקצה, ולא מוברר החוצה — עוגן צריך להיות נתון
 * שבנק ישראל באמת פרסם, לא הארכה מתמטית שלו.
 */
export function interpolateCurvePct(spots: YieldSpot[], years: number): number | null {
  const curve = [...spots]
    .filter((spot) => Number.isFinite(spot.years) && spot.years > 0 && Number.isFinite(spot.yieldPct))
    .sort((a, b) => a.years - b.years);
  if (curve.length === 0) return null;

  const target = Math.max(0, years);
  if (target <= curve[0].years) return curve[0].yieldPct;
  const last = curve[curve.length - 1];
  if (target >= last.years) return last.yieldPct;

  for (let i = 1; i < curve.length; i++) {
    const from = curve[i - 1];
    const to = curve[i];
    if (target <= to.years) {
      const span = to.years - from.years;
      const t = span <= 0 ? 1 : (target - from.years) / span;
      return from.yieldPct + (to.yieldPct - from.yieldPct) * t;
    }
  }
  return last.yieldPct;
}

/**
 * כמה שנים העוגן של המסלול צריך לכסות.
 *
 * במסלול משתנה זו תקופת השינוי ולא אורך המשכנתא: מל"צ שמשתנה כל שנתיים
 * מתומחר מול עקום האפס לשנתיים גם אם המשכנתא ל-25 שנה. במק"מ זו שנה אחת,
 * שהיא תקופת המק"מ.
 */
export function anchorYears(type: MortgageTrackType, context: AnchorContext = {}): number {
  if (type === 'makam') return 1;
  const period = context.variablePeriod;
  if (period && period > 0) return period;
  return 5;
}

/** איזה עקום מתאים למסלול, או null כשאין לו עוגן שוק */
export function anchorCurveFor(type: MortgageTrackType): AnchorCurve | null {
  switch (type) {
    case 'prime':
      return 'prime';
    case 'variable_unlinked':
    case 'makam':
      return 'nominal';
    case 'variable_linked':
      return 'real';
    // קבועה נסגרת מול הבנק ואינה מתעדכנת מול עקום; זכאות ומענק נקבעים בתקנות;
    // מט"ח נסמך על ריבית הבסיס במטבע הזר. לכולם הריבית מוזנת כשדה אחד.
    default:
      return null;
  }
}

function yearsLabel(years: number): string {
  if (years === 1) return 'שנה';
  if (Number.isInteger(years)) return `${years} שנים`;
  return `${years.toFixed(1)} שנים`;
}

/**
 * העוגן של מסלול לפי נתוני בנק ישראל העדכניים, או null כשאין עוגן שוק לסוג
 * המסלול הזה (ואז הריבית מוזנת ידנית במלואה).
 */
export function anchorForTrack(
  type: MortgageTrackType,
  snapshot: MarketRatesSnapshot,
  context: AnchorContext = {}
): RateAnchor | null {
  const curve = anchorCurveFor(type);
  if (!curve) return null;

  if (curve === 'prime') {
    return {
      rate: snapshot.primeRate,
      curve,
      years: 0,
      label: 'ריבית הפריים במשק (ריבית בנק ישראל + 1.5%)',
      asOf: snapshot.boiRateAsOf,
      source: snapshot.boiRateSource,
    };
  }

  const source: CurveSnapshot = curve === 'nominal' ? snapshot.nominalCurve : snapshot.realCurve;
  const years = anchorYears(type, context);
  const rate = interpolateCurvePct(source.spots, years);
  if (rate === null) return null;

  const curveName = curve === 'nominal' ? 'עקום אפס נומינלי' : 'עקום אפס ריאלי';
  return {
    rate,
    curve,
    years,
    label: `${curveName} של בנק ישראל ל${yearsLabel(years)} · ${source.month}`,
    asOf: source.asOf || source.month,
    source: source.source,
  };
}

/** עיגול ריבית לשתי ספרות — הדיוק שבו ריביות משכנתא מצוטטות */
export function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * הריבית הסופית של מסלול: עוגן חי + המרווח ששמור עליו.
 *
 * כשאין מרווח שמור — מסלול שנוצר לפני שהפירוק הזה היה קיים, או מסלול שהריבית
 * בו הוזנה ידנית — הריבית נשארת כפי שהיא, ורק המרווח המוצג נגזר ממנה.
 */
export function resolveRate(
  type: MortgageTrackType,
  snapshot: MarketRatesSnapshot,
  context: AnchorContext & { spread?: number; currentRate: number }
): { rate: number; spread: number | null; anchor: RateAnchor | null } {
  const anchor = anchorForTrack(type, snapshot, context);
  if (!anchor) return { rate: context.currentRate, spread: null, anchor: null };

  if (typeof context.spread === 'number' && Number.isFinite(context.spread)) {
    return {
      rate: roundRate(anchor.rate + context.spread),
      spread: context.spread,
      anchor,
    };
  }

  return {
    rate: context.currentRate,
    spread: roundRate(context.currentRate - anchor.rate),
    anchor,
  };
}

// ──────────────────── ריבית ברירת מחדל חיה לפי סוג מסלול ────────────────────

/**
 * טבלת הריביות הסטטית (`INTEREST_RATES`) היא ציטוט טיפוסי של בנק בנקודת זמן,
 * ולכן היא מכילה בתוכה גם את העוגן וגם את המרווח. כדי שהריביות שמוצגות כברירת
 * מחדל יזוזו עם השוק ולא יישארו תקועות על אותה נקודת זמן, המרווח מחולץ פעם אחת
 * מול העוגן של אותה נקודת זמן (תצלום הנפילה), ומוחל מחדש על העוגן החי.
 *
 * כך, למשל, מסלול מל"צ 5 שהוגדר כ-4.63% כשעקום האפס ל-5 שנים עמד על 3.53%
 * מתורגם למרווח של 1.10%, ואם עקום האפס עלה ל-4.00% ברירת המחדל תהיה 5.10%.
 */
export function defaultSpreadFor(type: MortgageTrackType, context: AnchorContext = {}): number {
  const quoted = getStaticInterestRate(type, { variablePeriodYears: context.variablePeriod });
  const anchor = anchorForTrack(type, fallbackMarketRates(), context);
  if (!anchor) return 0;
  return roundRate(quoted - anchor.rate);
}

/**
 * ריבית ברירת המחדל של סוג מסלול לפי נתוני בנק ישראל העדכניים.
 * למסלול שאין לו עוגן שוק (זכאות, מענק, מט"ח) מוחזר הערך מהטבלה הסטטית.
 */
export function defaultRateFor(
  type: MortgageTrackType,
  snapshot: MarketRatesSnapshot,
  context: AnchorContext = {}
): number {
  const anchor = anchorForTrack(type, snapshot, context);
  if (!anchor) return DEFAULT_INTEREST_RATES[type];
  return roundRate(anchor.rate + defaultSpreadFor(type, context));
}

// ──────────────────── טבלת הריביות העדכניות לתצוגה ────────────────────

/** צירוף של סוג מסלול והקשר, לכל מפתח בטבלת הריביות המוצגת */
const RATE_LIST_CONTEXT: Partial<
  Record<InterestRateKey, { type: MortgageTrackType; context: AnchorContext }>
> = {
  variable_unlinked_2y: { type: 'variable_unlinked', context: { variablePeriod: 2 } },
  variable_unlinked_5y: { type: 'variable_unlinked', context: { variablePeriod: 5 } },
  variable_linked_2y: { type: 'variable_linked', context: { variablePeriod: 2 } },
  variable_linked_5y: { type: 'variable_linked', context: { variablePeriod: 5 } },
  prime: { type: 'prime', context: {} },
  makam: { type: 'makam', context: {} },
};

export interface LiveRateListItem {
  key: InterestRateKey;
  label: string;
  /** הריבית הסופית — עוגן חי + מרווח */
  rate: number;
  /** ערך העוגן, או null למסלול שאין לו עוגן שוק */
  anchor: number | null;
  /** תיאור העוגן לתצוגה */
  anchorLabel: string | null;
  /** המרווח מעל העוגן */
  spread: number | null;
  /** הערך נמשך מבנק ישראל, ולא מטבלה סטטית */
  live: boolean;
}

/**
 * טבלת הריביות של הפלטפורמה לפי הנתונים החיים של בנק ישראל.
 *
 * זו הגרסה החיה של טבלת הריביות: אותם מפתחות ואותן תוויות, אבל הערכים
 * נגזרים מהעוגנים שנמשכו עכשיו. מסלול שאין לו עוגן שוק (זכאות, מט"ח) נשאר על
 * הערך מהטבלה הסטטית ומסומן כלא-חי.
 */
export function liveRatesList(snapshot: MarketRatesSnapshot): LiveRateListItem[] {
  return INTEREST_RATE_KEYS.map((key) => {
    const label = INTEREST_RATE_DISPLAY_NAMES[key];
    const mapping = RATE_LIST_CONTEXT[key];
    if (!mapping) {
      return {
        key,
        label,
        // מסלול בלי עוגן שוק — הערך נשאר זה שנכתב בטבלה
        rate: getStaticInterestRate(keyToTrackType(key)),
        anchor: null,
        anchorLabel: null,
        spread: null,
        live: false,
      };
    }

    const anchor = anchorForTrack(mapping.type, snapshot, mapping.context);
    const spread = defaultSpreadFor(mapping.type, mapping.context);
    const staticRate = getStaticInterestRate(mapping.type, {
      variablePeriodYears: mapping.context.variablePeriod,
    });
    return {
      key,
      label,
      rate: anchor ? roundRate(anchor.rate + spread) : staticRate,
      anchor: anchor ? roundRate(anchor.rate) : null,
      anchorLabel: anchor?.label ?? null,
      spread: anchor ? spread : null,
      live: anchor?.source === 'boi',
    };
  });
}

/** מפתחות שאין להם עוגן שוק מתמפים ישירות לסוג מסלול בעל אותו שם */
function keyToTrackType(key: InterestRateKey): MortgageTrackType {
  return key as MortgageTrackType;
}

/**
 * הזרמת הערכים שנמשכו מבנק ישראל לטבלת הריביות המרכזית.
 *
 * מרגע הקריאה הזו, כל קוד בפלטפורמה שקורא `INTEREST_RATES` או
 * `DEFAULT_INTEREST_RATES` — כולל מחשבונים ותצוגות שלא חוברו ישירות לשכבת
 * הנתונים — מקבל את הריבית שבתוקף עכשיו ולא את הערך שנכתב בקוד.
 */
export function applyLiveInterestRates(snapshot: MarketRatesSnapshot): void {
  const rates: Partial<Record<InterestRateKey, number>> = {};
  liveRatesList(snapshot).forEach((item) => {
    if (item.anchor !== null) rates[item.key] = item.rate;
  });

  const trackRates: Partial<Record<MortgageTrackType, number>> = {};
  (
    [
      ['prime', {}],
      ['variable_unlinked', { variablePeriod: 5 }],
      ['variable_linked', { variablePeriod: 5 }],
      ['makam', {}],
    ] as Array<[MortgageTrackType, AnchorContext]>
  ).forEach(([type, context]) => {
    if (anchorForTrack(type, snapshot, context)) {
      trackRates[type] = defaultRateFor(type, snapshot, context);
    }
  });

  setLiveInterestRates(rates, trackRates);
}
