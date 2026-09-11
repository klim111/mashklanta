/**
 * ============================================================================
 *  הכוונה למיחזור — מה לשנות בכל מסלול, ולאיזה כיוון
 * ============================================================================
 *
 *  אחרי שהלקוח בוחר מטרה (הקטנת ההחזר החודשי או הקטנת סך הריבית), הכלי צריך
 *  לומר לו בדיוק במה לגעת ולאן להזיז: איזה פרמטר בכל מסלול משרת את המטרה,
 *  לאיזה כיוון, והאם מה שכבר שינה עוזר או דווקא פוגע.
 *
 *  הקובץ טהור — נטען גם בבדיקות וגם בדפדפן, בלי React ובלי DOM.
 * ============================================================================
 */

import type { MortgageTrack } from '@/components/mortgage-advisor/types';
import type { MarketRates, RefinanceGoal } from './refinance';
import { MARKET_RATE_TOLERANCE, trackRemainingMonths } from './refinance';

/** הפרמטרים שאפשר לשנות למסלול בפאנל השליטה */
export type GuidedParam = 'rate' | 'term' | 'type' | 'amortization';

/** הכיוון שמשרת את המטרה: הקטנה, הגדלה, או מעבר לערך מסוים */
export type GuidedDirection = 'down' | 'up' | 'switch';

export interface ParamGuidance {
  param: GuidedParam;
  direction: GuidedDirection;
  /** `primary` — הפרמטר שמזיז את המחט; `secondary` — משפר בשוליים */
  weight: 'primary' | 'secondary';
  /** מה לעשות, במשפט אחד */
  label: string;
  /** למה זה עובד, ומה המחיר */
  hint: string;
  /** השינוי שכבר בוצע משרת את המטרה */
  satisfied: boolean;
  /** השינוי שכבר בוצע פועל נגד המטרה */
  conflicting: boolean;
}

/** הערכים שהלקוח מזיז בפאנל השליטה עבור מסלול אחד */
export interface TrackDraft {
  interestRate: number;
  months: number;
  type: MortgageTrack['type'];
  amortizationType: NonNullable<MortgageTrack['amortizationType']>;
}

/** לוחות סילוקין שמקטינים את ההחזר החודשי (דוחים קרן) */
const LOWER_PAYMENT_AMORTIZATIONS: TrackDraft['amortizationType'][] = ['partial_grace', 'full_grace'];
/** לוח סילוקין שמקטין את סך הריבית (מחזיר קרן מהר יותר) */
const LOWER_INTEREST_AMORTIZATION: TrackDraft['amortizationType'] = 'equal_principal';

const RATE_EPSILON = 0.001;

/**
 * ההכוונה למסלול אחד: אילו פרמטרים לשנות, לאיזה כיוון, ומה הסטטוס של מה
 * שכבר שונה. הסדר הוא סדר החשיבות — קודם מה שמזיז את המחט.
 */
export function trackGuidance({
  goal,
  track,
  draft,
  market,
}: {
  goal: RefinanceGoal;
  track: MortgageTrack;
  draft: TrackDraft;
  market?: MarketRates | null;
}): ParamGuidance[] {
  const baseMonths = trackRemainingMonths(track);
  const baseRate = track.interestRate;
  const baseAmort = track.amortizationType ?? 'spitzer';
  const marketRate = market?.rates?.[draft.type];

  const rateLowered = draft.interestRate < baseRate - RATE_EPSILON;
  const rateRaised = draft.interestRate > baseRate + RATE_EPSILON;
  const termExtended = Math.round(draft.months) > Math.round(baseMonths);
  const termShortened = Math.round(draft.months) < Math.round(baseMonths);

  const rateGuidance: ParamGuidance = {
    param: 'rate',
    direction: 'down',
    weight: 'primary',
    label: 'הורידו את הריבית',
    hint:
      typeof marketRate === 'number' && baseRate > marketRate + MARKET_RATE_TOLERANCE
        ? `הריבית כאן גבוהה מהממוצע במשק (${marketRate.toFixed(2)}%) — זו ההזדמנות הגדולה במסלול.`
        : 'הורדת ריבית משפרת גם את ההחזר החודשי וגם את סך הריבית, בלי מחיר נגדי.',
    satisfied: rateLowered,
    conflicting: rateRaised,
  };

  const typeGuidance: ParamGuidance = {
    param: 'type',
    direction: 'switch',
    weight: 'secondary',
    label: 'בדקו מעבר לסוג מסלול זול יותר',
    hint: 'סוג המסלול קובע את רמת הריבית ואת החשיפה לשינויי ריבית ומדד.',
    satisfied: draft.type !== track.type && rateLowered,
    conflicting: draft.type !== track.type && rateRaised,
  };

  if (goal === 'reduce_payment') {
    return [
      rateGuidance,
      {
        param: 'term',
        direction: 'up',
        weight: 'primary',
        label: 'האריכו את התקופה',
        hint: 'פריסה ארוכה יותר מקטינה את ההחזר החודשי — ומגדילה את סך הריבית שתשלמו.',
        satisfied: termExtended,
        conflicting: termShortened,
      },
      {
        param: 'amortization',
        direction: 'switch',
        weight: 'secondary',
        label: 'שקלו לוח סילוקין שדוחה קרן',
        hint: 'גרייס חלקי או מלא מקטין את ההחזר בטווח הקצר, במחיר ריבית גבוהה יותר בסוף.',
        satisfied:
          draft.amortizationType !== baseAmort &&
          LOWER_PAYMENT_AMORTIZATIONS.includes(draft.amortizationType),
        conflicting:
          draft.amortizationType !== baseAmort &&
          draft.amortizationType === LOWER_INTEREST_AMORTIZATION,
      },
      typeGuidance,
    ];
  }

  return [
    rateGuidance,
    {
      param: 'term',
      direction: 'down',
      weight: 'primary',
      label: 'קצרו את התקופה',
      hint: 'כל חודש שמתקצר חוסך ריבית — ההחזר החודשי יעלה בהתאם.',
      satisfied: termShortened,
      conflicting: termExtended,
    },
    {
      param: 'amortization',
      direction: 'switch',
      weight: 'secondary',
      label: 'שקלו לוח של קרן שווה',
      hint: 'קרן שווה מחזירה קרן מהר יותר ולכן חוסכת ריבית, במחיר החזר גבוה יותר בהתחלה.',
      satisfied:
        draft.amortizationType !== baseAmort &&
        draft.amortizationType === LOWER_INTEREST_AMORTIZATION,
      conflicting:
        draft.amortizationType !== baseAmort &&
        LOWER_PAYMENT_AMORTIZATIONS.includes(draft.amortizationType),
    },
    typeGuidance,
  ];
}

/** ההכוונה לפרמטר מסוים, אם הוא רלוונטי למטרה */
export function guidanceFor(
  guidance: ParamGuidance[],
  param: GuidedParam
): ParamGuidance | undefined {
  return guidance.find((item) => item.param === param);
}

export interface GoalProgress {
  /** המדד שהמטרה נמדדת בו */
  metric: 'monthlyPayment' | 'totalInterest';
  label: string;
  /** השינוי במדד: שלילי = שיפור */
  delta: number;
  /** המטרה הושגה (יש שיפור של ממש) */
  achieved: boolean;
  /** התוצאה גרועה מהמצב הנוכחי */
  regressed: boolean;
  /** המחיר הנגדי — מה שהורע בצד השני */
  tradeoff: number;
}

/** כמה התקדמנו לעבר המטרה, ומה המחיר בצד השני */
export function goalProgress({
  goal,
  baseMonthly,
  refinedMonthly,
  baseInterest,
  refinedInterest,
}: {
  goal: RefinanceGoal;
  baseMonthly: number;
  refinedMonthly: number;
  baseInterest: number;
  refinedInterest: number;
}): GoalProgress {
  const monthlyDelta = refinedMonthly - baseMonthly;
  const interestDelta = refinedInterest - baseInterest;

  if (goal === 'reduce_payment') {
    return {
      metric: 'monthlyPayment',
      label: 'ההחזר החודשי',
      delta: monthlyDelta,
      achieved: monthlyDelta < -1,
      regressed: monthlyDelta > 1,
      tradeoff: interestDelta,
    };
  }

  return {
    metric: 'totalInterest',
    label: 'סך הריבית',
    delta: interestDelta,
    achieved: interestDelta < -1,
    regressed: interestDelta > 1,
    tradeoff: monthlyDelta,
  };
}
