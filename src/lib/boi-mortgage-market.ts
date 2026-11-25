/**
 * ============================================================================
 *  שוק המשכנתאות בישראל — נתונים מבנק ישראל בלבד
 * ============================================================================
 *
 *  כל מה שמוצג בדאשבורד שוק המשכנתאות בדף הבית נמשך ממאגר הסדרות של בנק ישראל
 *  (SDMX), ומשום מקור אחר. אין ערכי נפילה שנכתבו בקוד: כשבנק ישראל אינו זמין
 *  ואין משיכה מוצלחת קודמת, הדאשבורד אומר זאת במפורש.
 *
 *  מקורות:
 *    BIR_MRTG_99 — "ריביות וביצועים לדיור": הלוואות חדשות לדיור בכל המערכת
 *                  הבנקאית, חודשי. ממנו נלקחים הריבית הממוצעת לכל מסלול, העוגן
 *                  והמרווח של המסלולים המשתנים, מספר ההלוואות וסכומן.
 *    BR          — ריבית בנק ישראל, ממנה נגזרת ריבית הפריים (+1.5%), העוגן של
 *                  המסלול המשתנה הלא צמוד.
 *
 *  מה בנק ישראל מפרסם ומה לא:
 *    • קבועה לא צמודה, קבועה צמודה — ריבית ממוצעת. למסלול קבוע אין עוגן.
 *    • משתנה צמודה — עוגן ומרווח ממוצעים; הריבית היא סכומם.
 *    • משתנה לא צמודה — בנק ישראל הפסיק לפרסם את הממוצע ברמת כל ההלוואות
 *      לדיור אחרי ינואר 2024, ולכן מוצג רק העוגן (הפריים).
 * ============================================================================
 */

import { parseCsv } from './market-rates';

const SDMX_BASE = 'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS';

/** קודי הסדרות ב-BIR_MRTG_99 (כל המערכת הבנקאית, הלוואות חדשות לדיור, סה"כ) */
export const MORTGAGE_SERIES = {
  /** מספר ההלוואות החדשות לדיור בחודש */
  count: 'BNK_99034_LR_BIR_MRTG_63',
  /** סכום ההלוואות החדשות לדיור בחודש, באלפי ש"ח */
  volume: 'BNK_99034_LR_BIR_MRTG_897',
  /** שיעור ההחזר מההכנסה הממוצע, באחוזים */
  paymentToIncome: 'BNK_99034_LR_BIR_MRTG_155',
  /** ריבית ממוצעת — קבועה לא צמודה */
  fixedUnlinkedRate: 'BNK_99034_LR_BIR_MRTG_467',
  /** ריבית ממוצעת — קבועה צמודה */
  fixedLinkedRate: 'BNK_99034_LR_BIR_MRTG_1492',
  /** עוגן ממוצע — משתנה צמודה */
  variableLinkedAnchor: 'BNK_99034_LR_BIR_MRTG_1489',
  /** מרווח ממוצע — משתנה צמודה */
  variableLinkedMargin: 'BNK_99034_LR_BIR_MRTG_1488',
} as const;

const BOI_RATE_SERIES = 'MNT_RIB_BOI_D';
const PRIME_OVER_BOI = 1.5;

/** כמה חודשים של ריביות מוצגים בגרף המגמה */
export const RATE_HISTORY_MONTHS = 36;

/** השנה הראשונה עם 12 חודשי נתונים בסדרות הביצועים (הסדרה מתחילה באפריל 2011) */
const FIRST_FULL_YEAR = 2012;

const FETCH_TIMEOUT_MS = 20_000;

export type RateTrackKey = 'fixed_unlinked' | 'fixed_linked' | 'variable_linked' | 'variable_unlinked';

export interface TrackRate {
  key: RateTrackKey;
  label: string;
  /** הריבית הממוצעת, או null כשבנק ישראל אינו מפרסם אותה */
  rate: number | null;
  /** העוגן, או null למסלול בלי עוגן */
  anchor: number | null;
  anchorLabel: string | null;
  /** איך העוגן מחושב, כשצריך להסביר */
  anchorDetail: string | null;
  /** המרווח הממוצע מעל העוגן, כשבנק ישראל מפרסם אותו */
  margin: number | null;
  /** החודש (YYYY-MM) או היום (YYYY-MM-DD) שהנתון מתייחס אליו */
  asOf: string;
  note: string | null;
}

export interface YearStat {
  year: number;
  /** מספר המשכנתאות החדשות בשנה */
  count: number;
  /** סכום המשכנתאות בשנה, בש"ח */
  volume: number;
  /** משכנתא ממוצעת בשנה, בש"ח */
  average: number;
  /** כמה חודשים נכללו — פחות מ-12 בשנה הנוכחית */
  months: number;
}

export interface RatePoint {
  month: string;
  fixed_unlinked: number | null;
  fixed_linked: number | null;
  variable_linked: number | null;
}

export interface MortgageMarketSnapshot {
  fetchedAt: string;
  /** החודש האחרון שבנק ישראל פרסם עבורו נתוני ביצועים */
  latestMonth: string;
  rates: TrackRate[];
  latest: {
    count: number;
    volume: number;
    average: number;
    paymentToIncome: number | null;
  };
  /** השנה הנוכחית בנתונים — מתחילת השנה ועד החודש האחרון שפורסם */
  yearToDate: YearStat;
  /** מספר המשכנתאות וסכומן לפי שנה, כולל השנה הנוכחית (חלקית) */
  years: YearStat[];
  rateHistory: RatePoint[];
  boiRate: { value: number; asOf: string } | null;
}

type SeriesMap = Map<string, Map<string, number>>;

/** טבלת CSV של בנק ישראל → סדרה → חודש → ערך. תאים ריקים אינם תצפיות. */
export function seriesFromCsv(csv: string): SeriesMap {
  const map: SeriesMap = new Map();
  for (const row of parseCsv(csv)) {
    const code = row.SERIES_CODE;
    const period = (row.TIME_PERIOD ?? '').trim();
    const raw = (row.OBS_VALUE ?? '').trim();
    if (!code || !period || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (!map.has(code)) map.set(code, new Map());
    map.get(code)!.set(period, value);
  }
  return map;
}

function sortedPeriods(series: Map<string, number> | undefined): string[] {
  return series ? [...series.keys()].sort() : [];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function latestValue(series: Map<string, number> | undefined): { value: number; period: string } | null {
  const period = sortedPeriods(series).at(-1);
  if (!series || !period) return null;
  return { value: series.get(period)!, period };
}

/** הצירוף של שתי סדרות לפי החודש האחרון ששתיהן פורסמו בו */
function latestCommon(
  a: Map<string, number> | undefined,
  b: Map<string, number> | undefined
): { a: number; b: number; period: string } | null {
  if (!a || !b) return null;
  const period = sortedPeriods(a).filter((p) => b.has(p)).at(-1);
  if (!period) return null;
  return { a: a.get(period)!, b: b.get(period)!, period };
}

/** מספר המשכנתאות וסכומן לפי שנה, מהחודשים שבהם פורסמו שתי הסדרות */
export function yearlyStats(count: Map<string, number>, volumeThousands: Map<string, number>): YearStat[] {
  const byYear = new Map<number, { count: number; volume: number; months: number }>();
  for (const period of sortedPeriods(count)) {
    const volume = volumeThousands.get(period);
    if (volume === undefined) continue;
    const year = Number(period.slice(0, 4));
    if (!Number.isFinite(year) || year < FIRST_FULL_YEAR) continue;
    const bucket = byYear.get(year) ?? { count: 0, volume: 0, months: 0 };
    bucket.count += count.get(period)!;
    bucket.volume += volume * 1000;
    bucket.months += 1;
    byYear.set(year, bucket);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, bucket]) => ({
      year,
      count: Math.round(bucket.count),
      volume: Math.round(bucket.volume),
      average: bucket.count > 0 ? Math.round(bucket.volume / bucket.count) : 0,
      months: bucket.months,
    }));
}

function monthsBack(latestMonth: string, count: number): string[] {
  const [y, m] = latestMonth.split('-').map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** הרכבת התצלום מתוך הסדרות שנמשכו. זורק כשחסרות סדרות הבסיס. */
export function buildMortgageMarket(
  series: SeriesMap,
  boiRate: { value: number; asOf: string } | null,
  fetchedAt: Date = new Date()
): MortgageMarketSnapshot {
  const S = MORTGAGE_SERIES;
  const count = series.get(S.count);
  const volume = series.get(S.volume);
  const latest = latestCommon(count, volume);
  if (!count || !volume || !latest) {
    throw new Error('Bank of Israel housing-loan series are missing');
  }

  const years = yearlyStats(count, volume);
  const latestYear = Number(latest.period.slice(0, 4));
  const yearToDate =
    years.find((item) => item.year === latestYear) ??
    { year: latestYear, count: 0, volume: 0, average: 0, months: 0 };

  const fixedUnlinked = latestValue(series.get(S.fixedUnlinkedRate));
  const fixedLinked = latestValue(series.get(S.fixedLinkedRate));
  const variableLinked = latestCommon(series.get(S.variableLinkedAnchor), series.get(S.variableLinkedMargin));
  const pti = latestValue(series.get(S.paymentToIncome));

  const prime = boiRate ? round2(boiRate.value + PRIME_OVER_BOI) : null;

  const rates: TrackRate[] = [
    {
      key: 'fixed_unlinked',
      label: 'קבועה לא צמודה',
      rate: fixedUnlinked ? round2(fixedUnlinked.value) : null,
      anchor: null,
      anchorLabel: null,
      anchorDetail: null,
      margin: null,
      asOf: fixedUnlinked?.period ?? '',
      note: 'ריבית קבועה לכל התקופה, ללא עוגן',
    },
    {
      key: 'fixed_linked',
      label: 'קבועה צמודה למדד',
      rate: fixedLinked ? round2(fixedLinked.value) : null,
      anchor: null,
      anchorLabel: null,
      anchorDetail: null,
      margin: null,
      asOf: fixedLinked?.period ?? '',
      note: 'ריבית קבועה לכל התקופה, ללא עוגן',
    },
    {
      key: 'variable_linked',
      label: 'משתנה צמודה למדד',
      rate: variableLinked ? round2(variableLinked.a + variableLinked.b) : null,
      anchor: variableLinked ? round2(variableLinked.a) : null,
      anchorLabel: 'עוגן ממוצע',
      anchorDetail: null,
      margin: variableLinked ? round2(variableLinked.b) : null,
      asOf: variableLinked?.period ?? '',
      note: null,
    },
    {
      key: 'variable_unlinked',
      label: 'משתנה לא צמודה (פריים)',
      rate: null,
      anchor: prime,
      anchorLabel: 'עוגן (פריים)',
      anchorDetail: boiRate ? `ריבית בנק ישראל ${round2(boiRate.value).toFixed(2)}% + 1.5%` : null,
      margin: null,
      asOf: boiRate?.asOf ?? '',
      note: 'בנק ישראל אינו מפרסם ריבית ממוצעת למסלול זה מאז ינואר 2024',
    },
  ];

  const history = monthsBack(latest.period, RATE_HISTORY_MONTHS).map((month) => {
    const anchor = series.get(S.variableLinkedAnchor)?.get(month);
    const margin = series.get(S.variableLinkedMargin)?.get(month);
    return {
      month,
      fixed_unlinked: series.get(S.fixedUnlinkedRate)?.get(month) ?? null,
      fixed_linked: series.get(S.fixedLinkedRate)?.get(month) ?? null,
      variable_linked: anchor !== undefined && margin !== undefined ? round2(anchor + margin) : null,
    };
  });

  return {
    fetchedAt: fetchedAt.toISOString(),
    latestMonth: latest.period,
    rates,
    latest: {
      count: Math.round(latest.a),
      volume: Math.round(latest.b * 1000),
      average: latest.a > 0 ? Math.round((latest.b * 1000) / latest.a) : 0,
      paymentToIncome: pti ? round2(pti.value) : null,
    },
    yearToDate,
    years,
    rateHistory: history.filter(
      (point) => point.fixed_unlinked !== null || point.fixed_linked !== null || point.variable_linked !== null
    ),
    boiRate,
  };
}

// ───────────────────────────── משיכה ─────────────────────────────

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/csv' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function mortgageSeriesUrl(): string {
  const codes = Object.values(MORTGAGE_SERIES).join(',');
  return `${SDMX_BASE}/BIR_MRTG_99/1.0?c%5BSERIES_CODE%5D=${codes}&startPeriod=2011-01&format=csv`;
}

const BOI_RATE_URL = `${SDMX_BASE}/BR/1.0?c%5BSERIES_CODE%5D=${BOI_RATE_SERIES}&lastNObservations=5&format=csv`;

export async function fetchMortgageMarket(now: Date = new Date()): Promise<MortgageMarketSnapshot> {
  const [mortgageCsv, boiCsv] = await Promise.all([
    fetchText(mortgageSeriesUrl()),
    fetchText(BOI_RATE_URL).catch(() => ''),
  ]);

  const boiSeries = latestValue(seriesFromCsv(boiCsv).get(BOI_RATE_SERIES));
  const boiRate =
    boiSeries && boiSeries.value >= 0 && boiSeries.value < 20
      ? { value: boiSeries.value, asOf: boiSeries.period }
      : null;

  return buildMortgageMarket(seriesFromCsv(mortgageCsv), boiRate, now);
}

// ───────────────────────────── מטמון ─────────────────────────────

/** הנתונים חודשיים; משיכה אחת לכמה שעות מספיקה */
const TTL_MS = 6 * 60 * 60 * 1000;

let cached: { snapshot: MortgageMarketSnapshot; at: number } | null = null;
let inFlight: Promise<MortgageMarketSnapshot> | null = null;

/**
 * התצלום העדכני, עם מטמון בזיכרון. כשהמשיכה נכשלת מוגש התצלום המוצלח האחרון;
 * כשאין כזה — השגיאה עולה למעלה, ואין ערכים שנכתבו בקוד.
 */
export async function getMortgageMarket(): Promise<MortgageMarketSnapshot> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.snapshot;
  if (inFlight) return inFlight;

  inFlight = fetchMortgageMarket()
    .then((snapshot) => {
      cached = { snapshot, at: Date.now() };
      return snapshot;
    })
    .catch((error) => {
      if (cached) return cached.snapshot;
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
