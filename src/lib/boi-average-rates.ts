/**
 * מיפוי הריביות הממוצעות של בנק ישראל לסוגי המסלולים של הכלי.
 *
 * המקור (`/api/boi/rates`) מחזיר מפתחות של בנק ישראל, ולעיתים סדרה של תצפיות
 * לפי תאריך. כאן הם מתורגמים לסוגי המסלולים שהלקוח מזין, כדי שאפשר יהיה
 * להשוות את הריבית שהוא משלם היום לריבית הממוצעת באותו מסלול.
 */

import type { MarketRateMap, MarketRates } from './refinance';
import { DEFAULT_INTEREST_RATES } from './interest-rates';
import type { MortgageTrackType } from './interest-rates';

/** המפתחות האפשריים בתשובת בנק ישראל לכל סוג מסלול, לפי סדר עדיפות */
const SOURCE_KEYS: Partial<Record<MortgageTrackType, string[]>> = {
  fixed_unlinked: ['fixed_unlinked', 'fixedUnlinked', 'klatz', 'fixed_no_cpi'],
  fixed_linked: ['fixed_cpi', 'fixed_linked', 'fixedLinked', 'katz'],
  prime: ['prime', 'prime_rate', 'primeRate'],
  variable_unlinked: ['gov_bonds', 'variable_unlinked', 'variableUnlinked', 'mlatz'],
  variable_linked: ['gov_bonds_cpi', 'variable_linked', 'variableLinked', 'matz'],
  makam: ['makam', 'short_term'],
  eligibility: ['eligibility', 'zakaut'],
  dollar: ['dollar', 'usd'],
  euro: ['euro', 'eur'],
};

function numberAt(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = source[key];
    const value = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100) {
      return value;
    }
  }
  return undefined;
}

/** התצפית הרלוונטית בתשובה — אובייקט יחיד, או האחרונה בסדרה */
function latestObservation(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  if (Array.isArray(payload)) {
    const last = payload[payload.length - 1];
    return last && typeof last === 'object' ? (last as Record<string, unknown>) : null;
  }
  const record = payload as Record<string, unknown>;
  const series = Array.isArray(record.series)
    ? record.series
    : Array.isArray(record.data)
      ? record.data
      : null;
  if (series && series.length > 0) {
    const last = series[series.length - 1];
    if (last && typeof last === 'object') {
      return { ...record, ...(last as Record<string, unknown>) };
    }
  }
  return record;
}

/**
 * הריביות הממוצעות לפי סוג מסלול. מסלול שאין לו ריבית ממוצעת במקור נופל
 * לטבלת הריביות הפנימית, כדי שהשוואה תמיד תהיה אפשרית.
 */
export function mapBoiRatesToTrackTypes(payload: unknown): MarketRates {
  const observation = latestObservation(payload);
  const rates: MarketRateMap = {};

  (Object.keys(SOURCE_KEYS) as MortgageTrackType[]).forEach((type) => {
    const keys = SOURCE_KEYS[type];
    const fromSource = observation && keys ? numberAt(observation, keys) : undefined;
    const value = fromSource ?? DEFAULT_INTEREST_RATES[type];
    if (typeof value === 'number' && Number.isFinite(value)) {
      rates[type as keyof MarketRateMap] = value;
    }
  });

  const asOf = typeof observation?.asOf === 'string'
    ? observation.asOf
    : typeof observation?.date === 'string'
      ? observation.date
      : undefined;

  return {
    rates,
    asOf,
    source: typeof observation?.source === 'string' ? observation.source : undefined,
  };
}

/** ריביות ברירת המחדל כמפת שוק — כשאין חיבור לבנק ישראל */
export function fallbackMarketRates(): MarketRates {
  return mapBoiRatesToTrackTypes(null);
}
