/**
 * צפי ריבית פריים מתוך עקום התשואות השקלי (אפס-קופון) של בנק ישראל.
 *
 * 1. ריבית פורוורד: f = (1+R₂)^T₂ / (1+R₁)^T₁ − 1
 * 2. ריבית בנק ישראל החזויה = הפורוורד פחות פרמיית הזמן, ואז פריים = בנק ישראל + 1.5%
 * 3. לוח שפיצר מעדכן את הריבית בכל חודש לפי העקום שנוצר כאן
 */

export const PRIME_OVER_BOI = 1.5;
export const PRIME_CURVE_MONTHS = 360;

export interface YieldSpot {
  years: number;
  yieldPct: number;
}

export interface PrimeForecast {
  asOf: string;
  source: 'boi' | 'fallback';
  boiRate: number;
  spots: YieldSpot[];
}

/** נקודות עקום אפס נומינלי אחרונות שפורסמו (ממוצע קלנדרי יולי 2026, בנק ישראל ZCM) */
export const FALLBACK_NOMINAL_SPOTS: YieldSpot[] = [
  { years: 1, yieldPct: 3.2425 },
  { years: 2, yieldPct: 3.3841 },
  { years: 3, yieldPct: 3.4553 },
  { years: 4, yieldPct: 3.492 },
  { years: 5, yieldPct: 3.5344 },
  { years: 7, yieldPct: 3.6619 },
  { years: 10, yieldPct: 3.8816 },
  { years: 15, yieldPct: 4.1232 },
];

export function sortSpots(spots: YieldSpot[]): YieldSpot[] {
  return [...spots]
    .filter((spot) => Number.isFinite(spot.years) && spot.years > 0 && Number.isFinite(spot.yieldPct))
    .sort((a, b) => a.years - b.years);
}

/** תשואת אפס שנתית (עשרונית) לזמן T בשנים, באינטרפולציה ליניארית בין נקודות העקום */
export function interpolateSpotDecimal(spots: YieldSpot[], years: number, overnightDecimal: number): number {
  const curve = sortSpots(spots);
  if (curve.length === 0) return overnightDecimal;
  if (years <= 0) return overnightDecimal;

  const points: YieldSpot[] = [{ years: 0, yieldPct: overnightDecimal * 100 }, ...curve];
  const last = points[points.length - 1];
  if (years >= last.years) {
    if (points.length < 2) return last.yieldPct / 100;
    const prev = points[points.length - 2];
    const slope = (last.yieldPct - prev.yieldPct) / (last.years - prev.years);
    const extended = last.yieldPct + slope * (years - last.years);
    return Math.min(8, Math.max(0.1, extended)) / 100;
  }

  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (years <= to.years) {
      const span = to.years - from.years;
      const t = span <= 0 ? 1 : (years - from.years) / span;
      return (from.yieldPct + (to.yieldPct - from.yieldPct) * t) / 100;
    }
  }
  return last.yieldPct / 100;
}

/**
 * ריבית פורוורד לתקופה שבין T₁ ל-T₂, מתוך תשואות האפס לאותם טווחים.
 * התוצאה היא הריבית לתקופה עצמה (לא שנתית) — למשל חודש אחד.
 */
export function forwardRate(spotShort: number, yearsShort: number, spotLong: number, yearsLong: number): number {
  if (yearsLong <= yearsShort + 1e-12) return 0;
  const growthLong = Math.pow(1 + spotLong, yearsLong);
  const growthShort = yearsShort <= 0 ? 1 : Math.pow(1 + spotShort, yearsShort);
  if (growthShort <= 0) return 0;
  return growthLong / growthShort - 1;
}

function annualizePeriodRate(periodRate: number, years: number): number {
  if (years <= 0) return 0;
  return Math.pow(1 + periodRate, 1 / years) - 1;
}

/** ריבית פורוורד שנתית באחוזים לתקופה של `periodYears` שמתחילה בעוד `startYears` */
export function periodForwardAnnualPct(
  spots: YieldSpot[],
  boiRatePct: number,
  startYears: number,
  periodYears: number
): number {
  const overnight = Math.max(0, boiRatePct) / 100;
  const start = Math.max(0, startYears);
  const period = Math.max(1 / 12, periodYears);
  const spotStart = interpolateSpotDecimal(spots, start, overnight);
  const spotEnd = interpolateSpotDecimal(spots, start + period, overnight);
  const holding = forwardRate(spotStart, start, spotEnd, start + period);
  return annualizePeriodRate(holding, period) * 100;
}

export function variablePeriodMonths(periodYears: number | undefined): number {
  const years = periodYears && periodYears > 0 ? periodYears : 5;
  return Math.max(12, Math.round(years * 12));
}

/** תחנת יציאה / עדכון ריבית במסלול משתנה — לא כולל חודש ההתחלה */
export function isVariableRateStation(monthWithinTerm: number, periodYears: number | undefined): boolean {
  const periodMonths = variablePeriodMonths(periodYears);
  return monthWithinTerm > 1 && (monthWithinTerm - 1) % periodMonths === 0;
}

/**
 * ריבית מל"צ בחודש נתון: קבועה בין תחנות, ובתחנה מתעדכנת לפי הפורוורד
 * לאותה תקופה (2/3/4/5 שנים) מעקום האפס, עם המרווח שצוטט מהבנק.
 * שינוי תרחיש נכנס רק מהתחנה הראשונה והלאה.
 */
export function variableUnlinkedRateAtMonth(
  quotedRate: number,
  calendarMonth: number,
  monthWithinTerm: number,
  periodYears: number | undefined,
  forecast: PrimeForecast | undefined,
  scenarioDelta = 0
): number {
  const periodMonths = variablePeriodMonths(periodYears);
  const termMonth = Math.max(1, Math.round(monthWithinTerm));
  const calMonth = Math.max(1, Math.round(calendarMonth));
  const station = Math.floor((termMonth - 1) / periodMonths);
  const delta = station >= 1 ? scenarioDelta : 0;

  if (!forecast || forecast.spots.length < 2) {
    return Math.max(0.01, quotedRate + delta);
  }

  const monthsIntoPeriod = (termMonth - 1) % periodMonths;
  const stationCalendarMonth = Math.max(1, calMonth - monthsIntoPeriod);
  const startYears = (stationCalendarMonth - 1) / 12;
  const termStartYears = Math.max(0, (calMonth - termMonth) / 12);
  const period = periodMonths / 12;

  const market = periodForwardAnnualPct(forecast.spots, forecast.boiRate, startYears, period);
  const marketAtTermStart = periodForwardAnnualPct(
    forecast.spots,
    forecast.boiRate,
    termStartYears,
    period
  );
  const spread = quotedRate - marketAtTermStart;
  return Math.max(0.01, market + spread + delta);
}

/**
 * 360 נקודות חודשיות של פריים שוק צפוי (באחוזים שנתיים), בלי מרווח המשכנתא
 * הספציפי של הלקוח. המרווח מתווסף במנוע לפי הריבית שצוטטה במסלול.
 */
export function expectedMarketPrimePath(
  spots: YieldSpot[],
  boiRatePct: number,
  months = PRIME_CURVE_MONTHS
): number[] {
  const overnight = Math.max(0, boiRatePct) / 100;
  const firstYearSpot = interpolateSpotDecimal(spots, 1, overnight);
  const termPremium = Math.max(0, firstYearSpot * 100 - boiRatePct);

  const path: number[] = [];
  let prevYears = 0;
  let prevSpot = overnight;

  for (let month = 1; month <= months; month++) {
    const years = month / 12;
    const spot = interpolateSpotDecimal(spots, years, overnight);
    const period = forwardRate(prevSpot, prevYears, spot, years);
    const annual = annualizePeriodRate(period, 1 / 12) * 100;
    const expectedBoi = annual - termPremium;
    path.push(expectedBoi + PRIME_OVER_BOI);
    prevYears = years;
    prevSpot = spot;
  }
  return path;
}

export function primeRateAtMonth(
  quotedRate: number,
  month: number,
  path: number[] | undefined,
  scenarioDelta = 0
): number {
  if (!path || path.length === 0) return Math.max(0.01, quotedRate + scenarioDelta);
  const index = Math.min(path.length, Math.max(1, Math.round(month))) - 1;
  const market = path[index] ?? path[path.length - 1];
  const spread = quotedRate - path[0];
  return Math.max(0.01, market + spread + scenarioDelta);
}

export function fallbackPrimeForecast(boiRate = 3.5): PrimeForecast {
  return {
    asOf: '2026-07',
    source: 'fallback',
    boiRate,
    spots: FALLBACK_NOMINAL_SPOTS,
  };
}
