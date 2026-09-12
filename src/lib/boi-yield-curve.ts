/**
 * עקומי בנק ישראל לצורכי תמחור מסלולים.
 *
 * המשיכה עצמה מרוכזת ב-`market-rates.ts`, שהוא מקור האמת היחיד של הפלטפורמה
 * מול בנק ישראל. המודול הזה נשאר כממשק נוח לצרכנים שמעניינים אותם רק העקומים,
 * כך שגם הם וגם כל שאר הכלים רואים בדיוק את אותם נתונים ואותו מטמון.
 */

import { fallbackInflationForecast, type InflationForecast } from './inflation-forecast';
import { FALLBACK_NOMINAL_SPOTS, fallbackPrimeForecast, type PrimeForecast } from './prime-forward-curve';
import { fallbackMarketRates } from './market-rates';
import { getSharedMarketRates } from './market-rates-store';

export interface BoiMarketCurves {
  prime: PrimeForecast;
  inflation: InflationForecast;
}

export async function fetchBoiMarketCurves(): Promise<BoiMarketCurves> {
  try {
    const snapshot = await getSharedMarketRates();
    return { prime: snapshot.primeForecast, inflation: snapshot.inflationForecast };
  } catch {
    const snapshot = fallbackMarketRates();
    return { prime: snapshot.primeForecast, inflation: snapshot.inflationForecast };
  }
}

export async function fetchPrimeForecast(): Promise<PrimeForecast> {
  return (await fetchBoiMarketCurves()).prime;
}

export { FALLBACK_NOMINAL_SPOTS, fallbackPrimeForecast, fallbackInflationForecast };
