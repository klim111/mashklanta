import { INTEREST_RATES } from './interest-rates';
import {
  FALLBACK_NOMINAL_SPOTS,
  fallbackPrimeForecast,
  type PrimeForecast,
  type YieldSpot,
} from './prime-forward-curve';

const ZCM_URL =
  'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0?c%5BDATA_TYPE%5D=ZC_YTM&c%5BNOMINAL_REAL%5D=N&lastNObservations=1&format=csv';
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

function spotsFromZcmCsv(csv: string): { spots: YieldSpot[]; asOf: string } {
  const rows = parseCsv(csv).filter(
    (row) =>
      row.NOMINAL_REAL === 'N' &&
      row.DATA_TYPE === 'ZC_YTM' &&
      (row.SERIES_CODE || '').includes('ZND')
  );
  const byYears = new Map<number, { yieldPct: number; asOf: string }>();
  rows.forEach((row) => {
    const years = parseMaturityYears(row.TIME_TO_MATURITY || row.SERIES_CODE || '');
    const yieldPct = Number(row.OBS_VALUE);
    if (!years || !Number.isFinite(yieldPct) || yieldPct <= 0) return;
    byYears.set(years, { yieldPct, asOf: row.TIME_PERIOD || '' });
  });
  const spots = [...byYears.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([years, value]) => ({ years, yieldPct: value.yieldPct }));
  const asOf = [...byYears.values()].map((v) => v.asOf).sort().at(-1) || '';
  return { spots, asOf };
}

export async function fetchPrimeForecast(): Promise<PrimeForecast> {
  const defaultBoi = INTEREST_RATES.prime - 1.5;
  try {
    const [zcm, br] = await Promise.allSettled([fetchText(ZCM_URL), fetchText(BR_URL)]);
    const parsed = zcm.status === 'fulfilled' ? spotsFromZcmCsv(zcm.value) : { spots: [], asOf: '' };
    const { spots, asOf } = parsed;
    const boiRate =
      br.status === 'fulfilled'
        ? latestNumeric(parseCsv(br.value)) ?? defaultBoi
        : defaultBoi;

    if (spots.length >= 3) {
      return { asOf: asOf || new Date().toISOString().slice(0, 7), source: 'boi', boiRate, spots };
    }
  } catch {
    // fall through
  }
  return fallbackPrimeForecast(defaultBoi);
}

export { FALLBACK_NOMINAL_SPOTS };
