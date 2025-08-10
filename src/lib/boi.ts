export type RatesQuery = { from?: string; to?: string };

function buildFallbackRates(asOfDate?: string) {
  const asOf = asOfDate || new Date().toISOString().slice(0, 10);
  // Conservative placeholders to avoid over-promising if real API is unavailable
  // The UI will map relevant keys per track id
  return {
    prime: 6.0,
    fixed_unlinked: 3.8,
    fixed_cpi: 4.2,
    gov_bonds: 3.5,
    gov_bonds_cpi: 3.7,
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