/**
 * ============================================================================
 *  אשראי צרכני בישראל — נתונים מבנק ישראל בלבד
 * ============================================================================
 *
 *  מקור הנתונים של אזור המידע הפיננסי בכלי ההלוואות הצרכניות, ושל חלונית
 *  הריביות לפי מוסד מממן שנפתחת מסימן הקריאה שליד כל שדה ריבית. הכול נמשך
 *  ממאגר הסדרות של בנק ישראל (SDMX); אין ערכי נפילה שנכתבו בקוד.
 *
 *  מקורות:
 *    BIR      — "ריביות וביצועים - לא לדיור": אשראי צרכני חדש למשקי בית
 *               (ללא אוברדראפט וללא בטחון דירה). ממנו נלקחים הריבית הממוצעת,
 *               סכום ההלוואות החדשות בחודש והתקופה הממוצעת בכל המערכת
 *               הבנקאית — ולכל בנק: עוגן ומרווח ממוצעים, והריבית ברבעון
 *               הזול (עד אחוזון 25) וברבעון היקר (מעל אחוזון 75). באותו מבנה
 *               מתפרסם גם סך הגופים החוץ-בנקאיים שמדווחים לרשות להלבנת הון.
 *    CCIR     — אותם נתונים לחברות כרטיסי האשראי (ישראכרט, מקס, כאל).
 *    DEBT_AGG — מצרפי החוב: יתרת החוב של משקי הבית שלא לדיור לפי המלווה
 *               (בנקים, חברות כרטיסי אשראי, גופים מוסדיים, ממשלה), ויתרת
 *               החח"ד (אוברדראפט) בבנקים. רבעוני, במיליארדי ש"ח.
 *    BR       — ריבית בנק ישראל, ממנה נגזר הפריים (+1.5%).
 *
 *  מה בנק ישראל מפרסם ומה לא:
 *    • הפילוח לפי מוסד מממן מתפרסם באיחור ובתדירות נמוכה יותר מהממוצע של
 *      המערכת; לכל מוסד מוצג החודש שאליו הנתון מתייחס.
 *    • אין פרסום של ריבית האוברדראפט — רק היתרה.
 * ============================================================================
 */

import { parseCsv } from './market-rates';

const SDMX_BASE = 'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS';
const PRIME_OVER_BOI = 1.5;
const FETCH_TIMEOUT_MS = 20_000;

/** סדרות המערכת הבנקאית כולה — אשראי צרכני חדש למשקי בית */
export const CONSUMER_SERIES = {
  /** ריבית ממוצעת, אחוזים */
  rate: 'BNK_99010_LR_BIR_1893',
  /** סכום ההלוואות החדשות בחודש, באלפי ש"ח */
  volume: 'BNK_99010_LR_BIR_1895',
  /** תקופה ממוצעת לפירעון, בשנים */
  term: 'BNK_99010_LR_BIR_1890',
} as const;

/** סדרות מצרפי החוב של משקי הבית, במיליארדי ש"ח (רבעוני) */
export const DEBT_SERIES = {
  nonHousingTotal: 'CRA_OUT_0208',
  banks: 'CRA_OUT_0194',
  creditCards: 'CRA_OUT_0200',
  institutional: 'CRA_OUT_0197',
  government: 'CRA_OUT_0202',
  overdraft: 'CRA_OUT_0217',
  housingTotal: 'CRA_OUT_0209',
  total: 'CRA_OUT_0204',
} as const;

/** סיומות הסדרות לכל מוסד מממן — זהות ב-BIR וב-CCIR */
const LENDER_SUFFIX = {
  anchor: 'LR_BIR_2155',
  margin: 'LR_BIR_2151',
  low: 'LR_BIR_4122',
  high: 'LR_BIR_4091',
} as const;

export type LenderKind = 'bank' | 'card' | 'nonbank';

export interface LenderDef {
  /** קוד הגוף המדווח בבנק ישראל */
  entity: string;
  name: string;
  kind: LenderKind;
  dataflow: 'BIR' | 'CCIR';
}

export const LENDERS: LenderDef[] = [
  { entity: '10', name: 'בנק לאומי', kind: 'bank', dataflow: 'BIR' },
  { entity: '12', name: 'בנק הפועלים', kind: 'bank', dataflow: 'BIR' },
  { entity: '11', name: 'בנק דיסקונט', kind: 'bank', dataflow: 'BIR' },
  { entity: '20', name: 'בנק מזרחי טפחות', kind: 'bank', dataflow: 'BIR' },
  { entity: '31', name: 'הבנק הבינלאומי', kind: 'bank', dataflow: 'BIR' },
  { entity: '17', name: 'בנק מרכנתיל', kind: 'bank', dataflow: 'BIR' },
  { entity: '54', name: 'בנק ירושלים', kind: 'bank', dataflow: 'BIR' },
  { entity: '4', name: 'בנק יהב', kind: 'bank', dataflow: 'BIR' },
  { entity: '46', name: 'בנק מסד', kind: 'bank', dataflow: 'BIR' },
  { entity: '18', name: 'וואן זירו', kind: 'bank', dataflow: 'BIR' },
  { entity: '12002', name: 'ישראכרט', kind: 'card', dataflow: 'CCIR' },
  { entity: '10033', name: 'מקס', kind: 'card', dataflow: 'CCIR' },
  { entity: '10023', name: 'כאל (כרטיסי אשראי לישראל)', kind: 'card', dataflow: 'CCIR' },
  { entity: '99050', name: 'גופים חוץ-בנקאיים (סך המדווחים לרשות להלבנת הון)', kind: 'nonbank', dataflow: 'BIR' },
];

/** קוד הסדרה של מוסד: BNK_10001_LR_BIR_2155 לבנק, BNK_12002_LR_BIR_2155 לחברת כרטיסים */
export function lenderSeriesCode(entity: string, suffix: string): string {
  const prefix = entity.length <= 2 ? `${entity}001` : entity;
  return `BNK_${prefix}_${suffix}`;
}

export interface LenderRate {
  entity: string;
  name: string;
  kind: LenderKind;
  /** ריבית ממוצעת = עוגן ממוצע + מרווח ממוצע */
  average: number | null;
  anchor: number | null;
  margin: number | null;
  /** הרבעון הזול: 25% מההלוואות ניתנו בריבית הזו או נמוכה ממנה */
  low: number | null;
  /** הרבעון היקר: 25% מההלוואות ניתנו בריבית הזו או גבוהה ממנה */
  high: number | null;
  /** החודש (YYYY-MM) שאליו הנתון מתייחס */
  asOf: string;
}

export interface DebtPoint {
  quarter: string;
  banks: number | null;
  creditCards: number | null;
  institutional: number | null;
  government: number | null;
  overdraft: number | null;
  nonHousingTotal: number | null;
}

export interface RatePoint {
  month: string;
  rate: number | null;
}

export interface ConsumerCreditSnapshot {
  fetchedAt: string;
  /** אשראי צרכני חדש בכל המערכת הבנקאית — החודש האחרון שפורסם */
  system: {
    month: string;
    rate: number | null;
    /** סכום ההלוואות החדשות בחודש, בש"ח */
    volume: number | null;
    /** תקופה ממוצעת בשנים */
    termYears: number | null;
  } | null;
  /** ריבית ממוצעת לאורך הזמן */
  rateHistory: RatePoint[];
  /** יתרות החוב של משקי הבית — הרבעון האחרון, במיליארדי ש"ח */
  debt: {
    quarter: string;
    nonHousingTotal: number | null;
    banks: number | null;
    creditCards: number | null;
    institutional: number | null;
    government: number | null;
    overdraft: number | null;
    housingTotal: number | null;
    total: number | null;
  } | null;
  debtHistory: DebtPoint[];
  lenders: LenderRate[];
  prime: { value: number; asOf: string } | null;
}

type SeriesMap = Map<string, Map<string, number>>;

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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function latest(series: Map<string, number> | undefined): { value: number; period: string } | null {
  if (!series || series.size === 0) return null;
  const period = [...series.keys()].sort().at(-1)!;
  return { value: series.get(period)!, period };
}

/** הרכבת התצלום מהסדרות שנמשכו. זורק כשאין אף אחד מהמקורות העיקריים. */
export function buildConsumerCredit(
  series: SeriesMap,
  boiRate: { value: number; asOf: string } | null,
  fetchedAt: Date = new Date()
): ConsumerCreditSnapshot {
  const C = CONSUMER_SERIES;
  const D = DEBT_SERIES;

  const rate = latest(series.get(C.rate));
  const volume = latest(series.get(C.volume));
  const term = latest(series.get(C.term));
  const systemMonth = [rate?.period, volume?.period, term?.period].filter(Boolean).sort().at(-1) ?? null;
  const at = (code: string, period: string | null) =>
    period ? series.get(code)?.get(period) ?? null : null;

  const system = systemMonth
    ? {
        month: systemMonth,
        rate: at(C.rate, systemMonth) !== null ? round2(at(C.rate, systemMonth)!) : null,
        volume: at(C.volume, systemMonth) !== null ? Math.round(at(C.volume, systemMonth)! * 1000) : null,
        termYears: at(C.term, systemMonth) !== null ? round2(at(C.term, systemMonth)!) : null,
      }
    : null;

  const rateSeries = series.get(C.rate);
  const rateHistory: RatePoint[] = rateSeries
    ? [...rateSeries.keys()].sort().map((month) => ({ month, rate: round2(rateSeries.get(month)!) }))
    : [];

  const quarters = new Set<string>();
  for (const code of Object.values(D)) series.get(code)?.forEach((_, period) => quarters.add(period));
  const sortedQuarters = [...quarters].sort();
  const debtHistory: DebtPoint[] = sortedQuarters.map((quarter) => {
    const value = (code: string) => {
      const v = series.get(code)?.get(quarter);
      return v === undefined ? null : round2(v);
    };
    return {
      quarter,
      banks: value(D.banks),
      creditCards: value(D.creditCards),
      institutional: value(D.institutional),
      government: value(D.government),
      overdraft: value(D.overdraft),
      nonHousingTotal: value(D.nonHousingTotal),
    };
  });

  const debtQuarter = latest(series.get(D.nonHousingTotal))?.period ?? null;
  const debtValue = (code: string) => {
    const v = debtQuarter ? series.get(code)?.get(debtQuarter) : undefined;
    return v === undefined ? null : round2(v);
  };
  const debt = debtQuarter
    ? {
        quarter: debtQuarter,
        nonHousingTotal: debtValue(D.nonHousingTotal),
        banks: debtValue(D.banks),
        creditCards: debtValue(D.creditCards),
        institutional: debtValue(D.institutional),
        government: debtValue(D.government),
        overdraft: debtValue(D.overdraft),
        housingTotal: debtValue(D.housingTotal),
        total: debtValue(D.total),
      }
    : null;

  const lenders: LenderRate[] = [];
  for (const lender of LENDERS) {
    const pick = (suffix: string) => latest(series.get(lenderSeriesCode(lender.entity, suffix)));
    const anchor = pick(LENDER_SUFFIX.anchor);
    const margin = pick(LENDER_SUFFIX.margin);
    const low = pick(LENDER_SUFFIX.low);
    const high = pick(LENDER_SUFFIX.high);
    const asOf = [anchor?.period, margin?.period, low?.period, high?.period].filter(Boolean).sort().at(-1);
    if (!asOf) continue;
    // העוגן והמרווח נסכמים רק כששניהם מאותו חודש
    const average =
      anchor && margin && anchor.period === margin.period ? round2(anchor.value + margin.value) : null;
    lenders.push({
      entity: lender.entity,
      name: lender.name,
      kind: lender.kind,
      average,
      anchor: anchor ? round2(anchor.value) : null,
      margin: margin ? round2(margin.value) : null,
      low: low ? round2(low.value) : null,
      high: high ? round2(high.value) : null,
      asOf,
    });
  }

  if (!system && !debt && lenders.length === 0) {
    throw new Error('Bank of Israel consumer credit series are missing');
  }

  return {
    fetchedAt: fetchedAt.toISOString(),
    system,
    rateHistory,
    debt,
    debtHistory,
    lenders,
    prime: boiRate ? { value: round2(boiRate.value + PRIME_OVER_BOI), asOf: boiRate.asOf } : null,
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

function codesFor(dataflow: 'BIR' | 'CCIR'): string[] {
  return LENDERS.filter((lender) => lender.dataflow === dataflow).flatMap((lender) =>
    Object.values(LENDER_SUFFIX).map((suffix) => lenderSeriesCode(lender.entity, suffix))
  );
}

export function consumerCreditUrls(now: Date = new Date()) {
  const from = `${now.getUTCFullYear() - 6}-01`;
  const filter = (codes: string[]) => `c%5BSERIES_CODE%5D=${codes.join(',')}`;
  return {
    system: `${SDMX_BASE}/BIR/1.0?${filter(Object.values(CONSUMER_SERIES))}&startPeriod=${from}&format=csv`,
    bankLenders: `${SDMX_BASE}/BIR/1.0?${filter(codesFor('BIR'))}&lastNObservations=1&format=csv`,
    cardLenders: `${SDMX_BASE}/CCIR/1.0?${filter(codesFor('CCIR'))}&lastNObservations=1&format=csv`,
    debt: `${SDMX_BASE}/DEBT_AGG/1.0?${filter(Object.values(DEBT_SERIES))}&startPeriod=${from}&format=csv`,
    boiRate: `${SDMX_BASE}/BR/1.0?c%5BSERIES_CODE%5D=MNT_RIB_BOI_D&lastNObservations=5&format=csv`,
  };
}

export async function fetchConsumerCredit(now: Date = new Date()): Promise<ConsumerCreditSnapshot> {
  const urls = consumerCreditUrls(now);
  // כל מקור נמשך בנפרד: כשאחד נכשל, השאר עדיין מוצגים
  const [system, bankLenders, cardLenders, debt, boi] = await Promise.all(
    [urls.system, urls.bankLenders, urls.cardLenders, urls.debt, urls.boiRate].map((url) =>
      fetchText(url).catch(() => '')
    )
  );

  const series: SeriesMap = new Map();
  for (const csv of [system, bankLenders, cardLenders, debt]) {
    seriesFromCsv(csv).forEach((values, code) => series.set(code, values));
  }

  const boiSeries = latest(seriesFromCsv(boi).get('MNT_RIB_BOI_D'));
  const boiRate =
    boiSeries && boiSeries.value >= 0 && boiSeries.value < 20
      ? { value: boiSeries.value, asOf: boiSeries.period }
      : null;

  return buildConsumerCredit(series, boiRate, now);
}

// ───────────────────────────── מטמון ─────────────────────────────

const TTL_MS = 6 * 60 * 60 * 1000;

let cached: { snapshot: ConsumerCreditSnapshot; at: number } | null = null;
let inFlight: Promise<ConsumerCreditSnapshot> | null = null;

/** התצלום העדכני, עם מטמון בזיכרון; כשהמשיכה נכשלת מוגש התצלום המוצלח האחרון */
export async function getConsumerCredit(): Promise<ConsumerCreditSnapshot> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.snapshot;
  if (inFlight) return inFlight;

  inFlight = fetchConsumerCredit()
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
