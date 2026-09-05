import { INTEREST_RATES } from "./interest-rates";

export type RatesQuery = { from?: string; to?: string };

function buildFallbackRates(asOfDate?: string) {
  const asOf = asOfDate || new Date().toISOString().slice(0, 10);
  // ריביות ברירת מחדל נטענות מקובץ הריביות המרכזי (src/lib/interest-rates.ts).
  // ה-UI ממפה את המפתחות לפי מסלול.
  return {
    prime: INTEREST_RATES.prime,
    fixed_unlinked: INTEREST_RATES.fixed_unlinked,
    fixed_cpi: INTEREST_RATES.fixed_linked,
    gov_bonds: INTEREST_RATES.variable_unlinked_5y,
    gov_bonds_cpi: INTEREST_RATES.variable_linked_5y,
    asOf,
    source: "fallback",
  } as const;
}

export async function fetchBoiRates({ from, to }: RatesQuery): Promise<any> {
  const base = process.env.BOI_RATES_URL;
  const asOf = to || from || new Date().toISOString().slice(0, 10);

  if (!base) {
    return buildFallbackRates(asOf);
  }

  try {
    const url = new URL(base);
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      // fall back instead of throwing to avoid 502 to clients
      return buildFallbackRates(asOf);
    }
    return await res.json();
  } catch {
    // Network/parse error – return safe fallback
    return buildFallbackRates(asOf);
  }
}