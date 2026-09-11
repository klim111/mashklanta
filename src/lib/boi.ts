import { getMarketRates, fallbackMarketRates, type MarketRatesSnapshot } from './market-rates';
import { defaultRateFor } from './rate-anchors';

export type RatesQuery = { from?: string; to?: string };

/**
 * טווח התקופה שלפיו נגזרות ריביות ברירת המחדל של מסלולים קבועים.
 * 25 שנים היא תקופת המשכנתא השכיחה בישראל.
 */
const DEFAULT_FIXED_YEARS = 25;

export interface BoiRatesPayload {
  /** ריבית הפריים במשק — ריבית בנק ישראל + 1.5% */
  prime: number;
  /** ריבית בנק ישראל עצמה */
  boi: number;
  /** קל"צ — עקום אפס נומינלי לתקופה + מרווח בנקאי טיפוסי */
  fixed_unlinked: number;
  /** ק"צ — עקום אפס ריאלי לתקופה + מרווח */
  fixed_cpi: number;
  /** מל"צ 5 — עקום אפס נומינלי ל-5 שנים + מרווח */
  gov_bonds: number;
  /** מ"צ 5 — עקום אפס ריאלי ל-5 שנים + מרווח */
  gov_bonds_cpi: number;
  asOf: string;
  source: MarketRatesSnapshot['source'];
}

/**
 * ריביות המסלולים לפי הנתונים החיים של בנק ישראל.
 *
 * כל ריבית נבנית מעוגן שנמשך מבנק ישראל ומהמרווח הבנקאי הטיפוסי של אותו מסלול,
 * ולכן היא זזה עם השוק במקום להישאר על ערך שנכתב בקוד.
 */
export function ratesFromSnapshot(snapshot: MarketRatesSnapshot): BoiRatesPayload {
  return {
    prime: snapshot.primeRate,
    boi: snapshot.boiRate,
    fixed_unlinked: defaultRateFor('fixed_unlinked', snapshot, { years: DEFAULT_FIXED_YEARS }),
    fixed_cpi: defaultRateFor('fixed_linked', snapshot, { years: DEFAULT_FIXED_YEARS }),
    gov_bonds: defaultRateFor('variable_unlinked', snapshot, { variablePeriod: 5 }),
    gov_bonds_cpi: defaultRateFor('variable_linked', snapshot, { variablePeriod: 5 }),
    asOf: snapshot.boiRateAsOf || snapshot.fetchedAt.slice(0, 10),
    source: snapshot.source,
  };
}

/**
 * הריביות העדכניות של בנק ישראל.
 *
 * `from`/`to` נשמרים לתאימות לאחור עם קוראים קיימים; הנתונים עצמם הם תמיד
 * העדכניים ביותר שפורסמו, כי ריבית שמוצגת בכלי חישוב חייבת להיות ריבית היום.
 */
export async function fetchBoiRates(_query: RatesQuery = {}): Promise<BoiRatesPayload> {
  try {
    return ratesFromSnapshot(await getMarketRates());
  } catch {
    return ratesFromSnapshot(fallbackMarketRates());
  }
}
