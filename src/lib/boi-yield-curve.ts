import { INTEREST_RATES } from './interest-rates';
import {
  breakevenSpots,
  fallbackInflationForecast,
  type InflationForecast,
} from './inflation-forecast';
import {
  FALLBACK_NOMINAL_SPOTS,
  fallbackPrimeForecast,
  type PrimeForecast,
  type YieldSpot,
} from './prime-forward-curve';

const ZCM_NOMINAL_URL =
  'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0?c%5BDATA_TYPE%5D=ZC_YTM&c%5BNOMINAL_REAL%5D=N&lastNObservations=1&format=csv';
const ZCM_REAL_URL =
  'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0?c%5BDATA_TYPE%5D=ZC_YTM&c%5BNOMINAL_REAL%5D=R&lastNObservations=1&format=csv';
const BR_URL =
  'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/BR/1.0?lastNObservations=1&format=csv';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? '';
    });
    return row;
  });
}

function parseMaturityYears(value: string): number | null {
  const match = /Y0?(\d+)/i.exec(value);
  if (!match) return null;
  const years = Number(match[1]);
  return Number.isFinite(years) && years > 0 ? years : null;
}

function latestNumeric(rows: Record<string, string>[], prefer?: (row: Record<string, string>) => boolean): number | null {
  const filtered = prefer ? rows.filter(prefer) : rows;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const value = Number(filtered[i].OBS_VALUE);
    if (Number.isFinite(value) && value > 0 && value < 20) return value;
  }
  return null;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/csv,application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function spotsFromZcmCsv(csv: string, nominalReal: 'N' | 'R'): { spots: YieldSpot[]; asOf: string } {
  const rows = parseCsv(csv).filter((row) => {
    if (row.NOMINAL_REAL && row.NOMINAL_REAL !== nominalReal) return false;
    if (row.DATA_TYPE && row.DATA_TYPE !== 'ZC_YTM') return false;
    const code = row.SERIES_CODE || '';
    if (!code) return true;
    if (nominalReal === 'N') return code.includes('ZND');
    return code.includes('ZRD') || !code.includes('ZND');
  });
  const byYears = new Map<number, { yieldPct: number; asOf: string }>();
  rows.forEach((row) => {
    const years = parseMaturityYears(row.TIME_TO_MATURITY || row.SERIES_CODE || '');
    const yieldPct = Number(row.OBS_VALUE);
    if (!years || !Number.isFinite(yieldPct)) return;
    if (nominalReal === 'N' && yieldPct <= 0) return;
    if (yieldPct <= -5 || yieldPct > 20) return;
    byYears.set(years, { yieldPct, asOf: row.TIME_PERIOD || '' });
  });
  const spots = [...byYears.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([years, value]) => ({ years, yieldPct: value.yieldPct }));
  const asOf = [...byYears.values()].map((v) => v.asOf).sort().at(-1) || '';
  return { spots, asOf };
}

export interface BoiMarketCurves {
  prime: PrimeForecast;
  inflation: InflationForecast;
}

export async function fetchBoiMarketCurves(): Promise<BoiMarketCurves> {
  const defaultBoi = INTEREST_RATES.prime - 1.5;
  const fallbackPrime = fallbackPrimeForecast(defaultBoi);
  const fallbackInflation = fallbackInflationForecast();

  try {
    const [nominal, real, br] = await Promise.allSettled([
      fetchText(ZCM_NOMINAL_URL),
      fetchText(ZCM_REAL_URL),
      fetchText(BR_URL),
    ]);

    const parsedNominal =
      nominal.status === 'fulfilled' ? spotsFromZcmCsv(nominal.value, 'N') : { spots: [] as YieldSpot[], asOf: '' };
    const parsedReal =
      real.status === 'fulfilled' ? spotsFromZcmCsv(real.value, 'R') : { spots: [] as YieldSpot[], asOf: '' };

    const boiRate =
      br.status === 'fulfilled' ? latestNumeric(parseCsv(br.value)) ?? defaultBoi : defaultBoi;

    const prime: PrimeForecast =
      parsedNominal.spots.length >= 3
        ? {
            asOf: parsedNominal.asOf || new Date().toISOString().slice(0, 7),
            source: 'boi',
            boiRate,
            spots: parsedNominal.spots,
          }
        : { ...fallbackPrime, boiRate };

    const breakEvens = breakevenSpots(parsedNominal.spots, parsedReal.spots);
    const inflation: InflationForecast =
      breakEvens.length >= 3
        ? {
            asOf: parsedReal.asOf || parsedNominal.asOf || new Date().toISOString().slice(0, 7),
            source: 'boi',
            spots: breakEvens,
          }
        : fallbackInflation;

    return { prime, inflation };
  } catch {
    return { prime: fallbackPrime, inflation: fallbackInflation };
  }
}

export async function fetchPrimeForecast(): Promise<PrimeForecast> {
  return (await fetchBoiMarketCurves()).prime;
}

export { FALLBACK_NOMINAL_SPOTS };
