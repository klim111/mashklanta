export type RatesQuery = { from?: string; to?: string };

export async function fetchBoiRates({ from, to }: RatesQuery): Promise<any> {
  const base = process.env.BOI_RATES_URL;
  if (!base) throw new Error("BOI_RATES_URL is not set");
  const url = new URL(base);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`BOI API error: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}