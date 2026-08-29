/**
 * תחזית אינפלציה להצמדת מסלולים צמודי מדד, מתוך ציפיות בנק ישראל.
 *
 * הציפיות נגזרות מפער ברק-איבן בין עקום האפס הנומינלי לעקום הצמוד (ZCM),
 * ומומרות לנתיב חודשי של אינפלציה שנתית — אותו עיקרון של פורוורד הריבית.
 */

import { forwardRate, interpolateSpotDecimal, type YieldSpot } from './prime-forward-curve';

export const INFLATION_CURVE_MONTHS = 360;

export interface InflationSpot {
  years: number;
  inflationPct: number;
}

export interface InflationForecast {
  asOf: string;
  source: 'boi' | 'fallback';
  spots: InflationSpot[];
}

/**
 * נתוני נפילה לפי תחזית חטיבת המחקר של בנק ישראל (מרץ 2026) לשנים הקרובות,
 * וסביב יעד האינפלציה לטווח הארוך. משמשים כשעקום הצמוד לא זמין.
 */
export const FALLBACK_INFLATION_SPOTS: InflationSpot[] = [
  { years: 1, inflationPct: 2.3 },
  { years: 2, inflationPct: 2.15 },
  { years: 3, inflationPct: 2.05 },
  { years: 5, inflationPct: 2.1 },
  { years: 7, inflationPct: 2.15 },
  { years: 10, inflationPct: 2.2 },
  { years: 15, inflationPct: 2.25 },
];

export function fallbackInflationForecast(): InflationForecast {
  return {
    asOf: '2026-03',
    source: 'fallback',
    spots: FALLBACK_INFLATION_SPOTS,
  };
}

export function sortInflationSpots(spots: InflationSpot[]): InflationSpot[] {
  return [...spots]
    .filter(
      (spot) =>
        Number.isFinite(spot.years) &&
        spot.years > 0 &&
        Number.isFinite(spot.inflationPct) &&
        spot.inflationPct > -2 &&
        spot.inflationPct < 12
    )
    .sort((a, b) => a.years - b.years);
}

function asYieldSpots(spots: InflationSpot[]): YieldSpot[] {
  return sortInflationSpots(spots).map((spot) => ({ years: spot.years, yieldPct: spot.inflationPct }));
}

function annualizePeriodRate(periodRate: number, years: number): number {
  if (years <= 0) return 0;
  return Math.pow(1 + periodRate, 1 / years) - 1;
}

/**
 * אינפלציית ברק-איבן השנתית (עשרונית) לאופק T, מציפיות השוק.
 * נקודת הפתיחה היא הציפייה לאופק הקצר ביותר — כדי שהשנה הראשונה תהיה
 * שטוחה לפי תחזית בנק ישראל ולא תטפס מיעד 2%.
 */
export function interpolateInflationDecimal(spots: InflationSpot[], years: number): number {
  const curve = sortInflationSpots(spots);
  if (curve.length === 0) return 0.02;
  const overnight = curve[0].inflationPct / 100;
  if (years <= 0) return overnight;
  const interpolated = interpolateSpotDecimal(asYieldSpots(curve), years, overnight);
  return Math.min(0.08, Math.max(-0.02, interpolated));
}

/**
 * 360 נקודות חודשיות של אינפלציה שנתית צפויה (באחוזים). כל חודש הוא
 * הפורוורד לאותו חודש מתוך עקום הציפיות — לא אינפלציה שנתית קבועה.
 */
export function expectedInflationPath(
  spots: InflationSpot[],
  months = INFLATION_CURVE_MONTHS
): number[] {
  const curve = sortInflationSpots(spots);
  if (curve.length === 0) return Array.from({ length: months }, () => 2);

  const overnight = curve[0].inflationPct / 100;
  const path: number[] = [];
  let prevYears = 0;
  let prevSpot = overnight;

  for (let month = 1; month <= months; month++) {
    const years = month / 12;
    const spot = interpolateInflationDecimal(curve, years);
    const period = forwardRate(prevSpot, prevYears, spot, years);
    const annual = annualizePeriodRate(period, 1 / 12) * 100;
    path.push(Math.min(8, Math.max(-2, annual)));
    prevYears = years;
    prevSpot = spot;
  }
  return path;
}

export function inflationRateAtMonth(path: number[] | undefined, month: number): number {
  if (!path || path.length === 0) return 0;
  const index = Math.min(path.length, Math.max(1, Math.round(month))) - 1;
  return path[index] ?? path[path.length - 1] ?? 0;
}

export interface InflationYearPoint {
  year: number;
  rate: number;
}

/** נקודה לכל שנה — האינפלציה הצפויה בתחילת אותה שנה, לגרף התחזית */
export function yearlyInflationRates(path: number[], years: number): InflationYearPoint[] {
  const count = Math.max(1, Math.round(years));
  const points: InflationYearPoint[] = [];
  for (let year = 1; year <= count; year++) {
    const month = (year - 1) * 12 + 1;
    points.push({ year, rate: inflationRateAtMonth(path, month) });
  }
  return points;
}

/** אינפלציית ברק-איבן מזוג תשואות נומינלית/צמודה לאותו אופק */
export function breakevenInflationPct(nominalPct: number, realPct: number): number {
  return ((1 + nominalPct / 100) / (1 + realPct / 100) - 1) * 100;
}

export function breakevenSpots(nominal: YieldSpot[], real: YieldSpot[]): InflationSpot[] {
  const realByYears = new Map(real.map((spot) => [spot.years, spot.yieldPct]));
  const spots: InflationSpot[] = [];
  nominal.forEach((n) => {
    const realPct = realByYears.get(n.years);
    if (realPct == null) return;
    const inflationPct = breakevenInflationPct(n.yieldPct, realPct);
    if (!Number.isFinite(inflationPct) || inflationPct <= -2 || inflationPct >= 12) return;
    spots.push({ years: n.years, inflationPct });
  });
  return sortInflationSpots(spots);
}
