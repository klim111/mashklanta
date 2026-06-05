import type { MortgageTrack, MortgageMix, MortgageCalculation, TrackCalculation, AmortRow } from './types';
import { calculateTrack, calculateMonthlyPayment } from './mortgageCalculations';

export type TrackScenarioKind = 'stable' | 'rate' | 'cpi';

/** מסלולים שהריבית בהם משתנה לאורך זמן (ולכן רגישים לשינוי בריבית). */
export function isRateVariable(type: MortgageTrack['type']): boolean {
  return (
    type === 'prime' ||
    type === 'variable_unlinked' ||
    type === 'variable_linked' ||
    type === 'makam' ||
    type === 'dollar' ||
    type === 'euro'
  );
}

/** מסלולים שהקרן בהם צמודה למדד המחירים לצרכן. */
export function isIndexLinked(type: MortgageTrack['type']): boolean {
  return type === 'fixed_linked' || type === 'variable_linked';
}

/**
 * סיווג מסלול לפי רגישותו לתרחישים:
 * - stable: קבוע לא צמוד / מענק וכו' — מוגן מכל שינוי, אינו עתיד להשתנות לאורך התקופה.
 * - cpi:   מסלול צמוד מדד — רגיש לשינוי במדד (ואם גם הריבית משתנה — גם לריבית).
 * - rate:  מסלולים רגישי-ריבית שאינם צמודי מדד (פריים, משתנה לא צמודה וכו').
 */
export function getTrackScenarioKind(type: MortgageTrack['type']): TrackScenarioKind {
  if (!isRateVariable(type) && !isIndexLinked(type)) return 'stable';
  if (isIndexLinked(type)) return 'cpi';
  return 'rate';
}

/**
 * תרחיש גלובלי המוחל על התמהיל:
 * - rateDeltas: שינוי (בנקודות אחוז) לכל סוג מסלול רגיש-ריבית, לפי מפתח סוג המסלול.
 * - annualInflation: אינפלציה שנתית משוערת המוחלת על מסלולים צמודי מדד.
 */
export interface GlobalScenario {
  rateDeltas: Record<string, number>;
  annualInflation: number;
}

/** טווחי ברירת מחדל לסליידרים — מוגדרים סימטרית למעלה ולמטה ביחס לערך הראשוני. */
export const SCENARIO_RANGES = {
  rateDelta: { min: -3, max: 3, step: 0.25, default: 0 },
  inflation: { base: 2, min: -2, max: 6, step: 0.25, default: 2 },
} as const;

/** תרחישי קצה אחידים (אופטימי / בסיס / פסימי) מנקודת מבט הלווה. */
export const PRESET_SCENARIOS: Record<'optimistic' | 'base' | 'pessimistic', { rateDelta: number; annualInflation: number }> = {
  optimistic: { rateDelta: -1.5, annualInflation: 0 },
  base: { rateDelta: 0, annualInflation: SCENARIO_RANGES.inflation.base },
  pessimistic: { rateDelta: 2, annualInflation: 5 },
};

/** סוגי המסלולים רגישי-הריבית הקיימים בתמהיל (ייחודיים, לפי סדר הופעה). */
export function getRateVariableTypes(mix: MortgageMix): MortgageTrack['type'][] {
  const seen: MortgageTrack['type'][] = [];
  mix.tracks.forEach((t) => {
    if (isRateVariable(t.type) && !seen.includes(t.type)) seen.push(t.type);
  });
  return seen;
}

export function mixHasIndexLinked(mix: MortgageMix): boolean {
  return mix.tracks.some((t) => isIndexLinked(t.type));
}

/** תרחיש הבסיס (מצב נוכחי): ללא שינוי בריבית, אינפלציה לפי ברירת המחדל. */
export function makeBaseScenario(mix: MortgageMix): GlobalScenario {
  const rateDeltas: Record<string, number> = {};
  getRateVariableTypes(mix).forEach((type) => {
    rateDeltas[type] = 0;
  });
  return { rateDeltas, annualInflation: SCENARIO_RANGES.inflation.base };
}

/** בניית תרחיש מתוך פריסט אחיד (מוחל על כל סוגי המסלולים הרלוונטיים). */
export function buildPresetScenario(
  mix: MortgageMix,
  preset: { rateDelta: number; annualInflation: number }
): GlobalScenario {
  const rateDeltas: Record<string, number> = {};
  getRateVariableTypes(mix).forEach((type) => {
    rateDeltas[type] = preset.rateDelta;
  });
  return { rateDeltas, annualInflation: preset.annualInflation };
}

/**
 * לוח סילוקין למסלול צמוד מדד עם הנחת אינפלציה שנתית.
 *
 * כלל חשוב (הגנת קרן): הצמדת הקרן נמדדת ביחס למדד הבסיס שבו נלקחה ההלוואה.
 * אם המדד יורד מתחת לבסיס, ערך הקרן לא קטן מתחת לערך המקורי — מקדם ההצמדה
 * המצטבר "ננעל" על 1 כל עוד המדד נמוך מהבסיס.
 */
function generateIndexedAmortizationSchedule(
  principal: number,
  annualRate: number,
  years: number,
  annualInflationPercent: number,
  amortizationType: MortgageTrack['amortizationType'] = 'spitzer'
): AmortRow[] {
  const monthlyInflation = annualInflationPercent / 100 / 12;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = Math.round(years * 12);
  const schedule: AmortRow[] = [];

  let balance = principal;
  let indexLevel = 1;
  let effectivePrev = 1;

  const isEqualPrincipal = amortizationType === 'equal_principal';

  for (let month = 1; month <= numPayments; month++) {
    indexLevel *= 1 + monthlyInflation;
    const effective = Math.max(indexLevel, 1);
    const linkageFactor = effectivePrev > 0 ? effective / effectivePrev : 1;
    balance = balance * linkageFactor;
    effectivePrev = effective;

    const interestPayment = balance * monthlyRate;
    const remainingMonths = numPayments - month + 1;

    let principalPayment: number;
    let actualPayment: number;

    if (isEqualPrincipal) {
      principalPayment = Math.min(balance, remainingMonths > 0 ? balance / remainingMonths : balance);
      actualPayment = principalPayment + interestPayment;
    } else {
      const remainingYears = remainingMonths / 12;
      const monthlyPayment =
        remainingMonths > 0
          ? calculateMonthlyPayment(balance, annualRate, remainingYears)
          : balance + interestPayment;
      principalPayment = Math.min(balance, monthlyPayment - interestPayment);
      actualPayment = principalPayment + interestPayment;
    }

    const newBalance = Math.max(0, balance - principalPayment);
    schedule.push({
      month,
      balanceStart: balance,
      payment: actualPayment,
      interest: interestPayment,
      principal: principalPayment,
      balanceEnd: newBalance,
    });
    balance = newBalance;
    if (balance <= 0.01) break;
  }

  return schedule;
}

/** חישוב מסלול צמוד מדד עם הנחת אינפלציה שנתית. */
export function calculateTrackWithInflation(
  track: MortgageTrack,
  annualInflationPercent: number
): TrackCalculation {
  const amortSchedule = generateIndexedAmortizationSchedule(
    track.amount,
    track.interestRate,
    track.years,
    annualInflationPercent,
    track.amortizationType || 'spitzer'
  );

  const monthlyPayment = amortSchedule[0]?.payment ?? 0;
  const totalPaid = amortSchedule.reduce((sum, row) => sum + row.payment, 0);
  const totalInterest = totalPaid - track.amount;
  const indexedPrincipalEnd = amortSchedule[amortSchedule.length - 1]?.balanceStart ?? track.amount;

  return {
    track: {
      ...track,
      monthlyPayment,
      totalInterest,
      totalPaid,
      cpiIndex: indexedPrincipalEnd,
    },
    monthlyPayment,
    totalInterest,
    totalPaid,
    amortSchedule,
  };
}

/** הריבית האפקטיבית של מסלול תחת תרחיש (לאחר הוספת השינוי לסוג המסלול). */
export function effectiveRateForTrack(track: MortgageTrack, scenario: GlobalScenario): number {
  if (!isRateVariable(track.type)) return track.interestRate;
  const delta = scenario.rateDeltas[track.type] ?? 0;
  return Math.max(0.1, track.interestRate + delta);
}

/** חישוב מסלול בודד תחת תרחיש גלובלי. */
export function calculateTrackScenario(track: MortgageTrack, scenario: GlobalScenario): TrackCalculation {
  const rateVar = isRateVariable(track.type);
  const idx = isIndexLinked(track.type);

  if (!rateVar && !idx) return calculateTrack(track);

  const effectiveRate = effectiveRateForTrack(track, scenario);

  if (idx) {
    return calculateTrackWithInflation({ ...track, interestRate: effectiveRate }, scenario.annualInflation);
  }
  return calculateTrack({ ...track, interestRate: effectiveRate });
}

/** חישוב התמהיל כולו תחת תרחיש גלובלי. */
export function calculateMixScenario(mix: MortgageMix, scenario: GlobalScenario): MortgageCalculation {
  const trackCalculations = mix.tracks.map((track) => calculateTrackScenario(track, scenario));

  const totalMonthlyPayment = trackCalculations.reduce((sum, c) => sum + c.monthlyPayment, 0);
  const totalInterest = trackCalculations.reduce((sum, c) => sum + c.totalInterest, 0);
  const totalPaid = trackCalculations.reduce((sum, c) => sum + c.totalPaid, 0);

  const weightedRateSum = mix.tracks.reduce((sum, track) => sum + track.interestRate * track.amount, 0);
  const averageRate = mix.totalAmount > 0 ? weightedRateSum / mix.totalAmount : 0;
  const weightedYearsSum = mix.tracks.reduce((sum, track) => sum + track.years * track.amount, 0);
  const weightedAverageYears = mix.totalAmount > 0 ? weightedYearsSum / mix.totalAmount : 0;

  return {
    mix: {
      ...mix,
      totalMonthlyPayment,
      totalInterest,
      totalPaid,
      averageRate,
      tracks: trackCalculations.map((c) => c.track),
    },
    trackCalculations,
    summary: {
      totalMonthlyPayment,
      totalInterest,
      totalPaid,
      averageRate,
      weightedAverageYears,
    },
  };
}

export interface ScenarioSeriesPoint {
  year: number;
  balance: number;
  payment: number;
}

/**
 * סדרת נתונים שנתית עבור גרפים: יתרת קרן (נומינלית) והחזר חודשי לאורך זמן,
 * מסוכמת על פני כל מסלולי התמהיל תחת תרחיש נתון.
 */
export function buildScenarioSeries(mix: MortgageMix, scenario: GlobalScenario): ScenarioSeriesPoint[] {
  const calc = calculateMixScenario(mix, scenario);
  const schedules = calc.trackCalculations.map((c) => c.amortSchedule);
  const maxLen = schedules.reduce((m, s) => Math.max(m, s.length), 0);
  const totalPrincipal = mix.tracks.reduce((s, t) => s + t.amount, 0);

  const points: ScenarioSeriesPoint[] = [
    {
      year: 0,
      balance: totalPrincipal,
      payment: schedules.reduce((s, sc) => s + (sc[0]?.payment ?? 0), 0),
    },
  ];

  const maxYears = Math.ceil(maxLen / 12);
  for (let y = 1; y <= maxYears; y++) {
    const monthIdx = Math.min(maxLen, y * 12) - 1;
    let balance = 0;
    let payment = 0;
    schedules.forEach((sc) => {
      if (monthIdx >= sc.length) return;
      const row = sc[monthIdx];
      if (row) {
        balance += row.balanceEnd;
        payment += row.payment;
      }
    });
    points.push({ year: y, balance, payment });
  }

  return points;
}

/** סדרת נתונים שנתית עבור מסלול בודד תחת תרחיש נתון. */
export function buildTrackSeries(track: MortgageTrack, scenario: GlobalScenario): ScenarioSeriesPoint[] {
  const calc = calculateTrackScenario(track, scenario);
  const sc = calc.amortSchedule;

  const points: ScenarioSeriesPoint[] = [
    { year: 0, balance: track.amount, payment: sc[0]?.payment ?? 0 },
  ];

  const maxYears = Math.ceil(sc.length / 12);
  for (let y = 1; y <= maxYears; y++) {
    const idx = Math.min(sc.length, y * 12) - 1;
    const row = idx >= 0 && idx < sc.length ? sc[idx] : undefined;
    points.push({ year: y, balance: row?.balanceEnd ?? 0, payment: row?.payment ?? 0 });
  }

  return points;
}
