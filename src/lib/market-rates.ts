/**
 * ============================================================================
 *  משיכת הריביות והתחזיות מבנק ישראל — מקור האמת החי של הפלטפורמה
 * ============================================================================
 *
 *  כל הריביות שמוצגות ושמחושבות בפלטפורמה נגזרות מהתצלום (snapshot) שהמודול
 *  הזה מייצר. הנתונים נמשכים מ-SDMX של בנק ישראל:
 *
 *    BR   — ריבית בנק ישראל (ריבית המוניטרית). ממנה נגזרת ריבית הפריים במשק:
 *           פריים = ריבית בנק ישראל + 1.5%.
 *    ZCM  — עקומי האפס (Zero Coupon) של בנק ישראל, נומינלי (N) וריאלי (R).
 *           הם העוגנים של המסלולים המשתנים.
 *
 *  העוגן של מסלול משתנה נלקח מ**החודש הקודם** ביחס לחודש שבו מבוצע החישוב,
 *  כפי שנהוג בעדכון ריביות משתנות בבנקים, ולפי תקופת השינוי של המסלול: מל"צ
 *  שמשתנה כל שנתיים מתומחר לפי עקום האפס הנומינלי לשנתיים, מ"צ כל 5 שנים לפי
 *  עקום האפס הריאלי לחמש שנים, וכן הלאה.
 *
 *  כשהמשיכה נכשלת — אין רשת, בנק ישראל לא מגיב, או הפורמט השתנה — מוחזר תצלום
 *  נפילה מתוך טבלת הריביות הסטטית (`interest-rates.ts`), והוא מסומן במפורש
 *  כ-`fallback` כדי שה-UI יוכל לומר למשתמש שהערכים אינם חיים.
 * ============================================================================
 */

import { STATIC_INTEREST_RATES } from './interest-rates';
import { applyLiveInterestRates } from './rate-anchors';
import {
  breakevenSpots,
  fallbackInflationForecast,
  type InflationForecast,
} from './inflation-forecast';
import {
  FALLBACK_NOMINAL_SPOTS,
  PRIME_OVER_BOI,
  fallbackPrimeForecast,
  sortSpots,
  type PrimeForecast,
  type YieldSpot,
} from './prime-forward-curve';

const SDMX_BASE = 'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS';

/**
 * כמה תצפיות יומיות למשוך מעקומי האפס. הכמות צריכה לכסות בוודאות את החודש
 * הקודם כולו גם אחרי רצף חגים, ולכן נמשכות כ-4 חודשי מסחר.
 */
const ZCM_OBSERVATIONS = 120;

const ZCM_NOMINAL_URL =
  `${SDMX_BASE}/ZCM/1.0?c%5BDATA_TYPE%5D=ZC_YTM&c%5BNOMINAL_REAL%5D=N&lastNObservations=${ZCM_OBSERVATIONS}&format=csv`;
const ZCM_REAL_URL =
  `${SDMX_BASE}/ZCM/1.0?c%5BDATA_TYPE%5D=ZC_YTM&c%5BNOMINAL_REAL%5D=R&lastNObservations=${ZCM_OBSERVATIONS}&format=csv`;
const BR_URL = `${SDMX_BASE}/BR/1.0?lastNObservations=1&format=csv`;

const FETCH_TIMEOUT_MS = 12_000;

export type DataSource = 'boi' | 'fallback';

/** עקום אפס לחודש מסוים — הבסיס לעוגן של מסלול משתנה */
export interface CurveSnapshot {
  /** נקודות העקום, לפי שנים לפדיון, באחוזים שנתיים */
  spots: YieldSpot[];
  /** החודש שהתצפיות נלקחו ממנו, בפורמט YYYY-MM */
  month: string;
  /** תאריך התצפית האחרונה שנכללה */
  asOf: string;
  source: DataSource;
}

/** כל מה שנמשך מבנק ישראל בהרצה אחת */
export interface MarketRatesSnapshot {
  /** מתי התצלום נוצר בפועל (ISO) */
  fetchedAt: string;
  /** boi — הכל חי; fallback — שום דבר לא נמשך; mixed — חלק מהמקורות נכשלו */
  source: 'boi' | 'fallback' | 'mixed';
  /** ריבית בנק ישראל (המוניטרית), באחוזים */
  boiRate: number;
  boiRateAsOf: string;
  boiRateSource: DataSource;
  /**
   * בנק ישראל החזיר יותר מערך אחד לאותו תאריך, ולכן ייתכן שנבחרה הסדרה
   * הלא נכונה. מדווח ב-`/api/health` כדי שאפשר יהיה לאתר זאת מיד.
   */
  boiRateAmbiguous?: boolean;
  /** ריבית הפריים במשק = ריבית בנק ישראל + 1.5% */
  primeRate: number;
  /** עקום האפס הנומינלי של החודש הקודם — עוגן המשתנות הלא צמודות */
  nominalCurve: CurveSnapshot;
  /** עקום האפס הריאלי של החודש הקודם — עוגן המשתנות הצמודות */
  realCurve: CurveSnapshot;
  /** עקום האפס הנומינלי העדכני — בסיס לחישובי פורוורד ולתחזיות */
  primeForecast: PrimeForecast;
  /** ציפיות האינפלציה הגלומות (ברק-איבן בין העקום הנומינלי לריאלי) */
  inflationForecast: InflationForecast;
}

// ───────────────────────────── פענוח CSV ─────────────────────────────

/**
 * פענוח CSV עם תמיכה בשדות במרכאות. בנק ישראל מחזיר תיאורי סדרות שעשויים
 * להכיל פסיקים, ולכן פיצול נאיבי על פסיק היה מזיז את כל העמודות בשורה.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const table = rows.filter((line) => line.some((value) => value.trim() !== ''));
  if (table.length < 2) return [];

  const headers = table[0].map((header) => header.trim());
  return table.slice(1).map((line) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (line[index] ?? '').trim();
    });
    return record;
  });
}

/**
 * מספר השנים לפדיון מתוך קוד הסדרה או שדה התקופה.
 *
 * בנק ישראל מקודד את הטווח כשנים ("Y02") ולעיתים כחודשים ("M24"). שתי הצורות
 * מתורגמות לשנים, כדי שהעוגן לא ייפול לערכי נפילה רק בגלל שינוי בקידוד.
 */
export function parseMaturityYears(value: string): number | null {
  const years = /Y\s*0?(\d+(?:\.\d+)?)/i.exec(value);
  if (years) {
    const parsed = Number(years[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const months = /M\s*0?(\d+)/i.exec(value);
  if (months) {
    const parsed = Number(months[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed / 12;
  }

  return null;
}

/** החודש (YYYY-MM) של תצפית, מתוך שדה TIME_PERIOD בכל אחד מהפורמטים של SDMX */
export function observationMonth(timePeriod: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(timePeriod.trim());
  return match ? `${match[1]}-${match[2]}` : '';
}

/** החודש הקודם (YYYY-MM) ביחס לתאריך נתון */
export function previousMonthKey(reference: Date = new Date()): string {
  const year = reference.getUTCFullYear();
  // getUTCMonth מחזיר 0-11, ולכן החסרה של 1 נותנת את החודש הקודם, כולל מעבר שנה
  const date = new Date(Date.UTC(year, reference.getUTCMonth() - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

interface ZcmObservation {
  years: number;
  yieldPct: number;
  timePeriod: string;
  month: string;
}

/**
 * תצפיות עקום אפס תקינות מתוך ה-CSV.
 *
 * ההפרדה בין נומינלי לריאלי נשענת קודם כול על ממד `NOMINAL_REAL`, שגם הבקשה
 * עצמה מסננת לפיו. רק כשהממד חסר בתשובה נופלים לזיהוי לפי קוד הסדרה
 * (ZND / ZRD). הסדר הזה חשוב: זיהוי לפי קוד בלבד היה פוסל את כל השורות אילו
 * בנק ישראל היה משנה את מוסכמת השמות, והעוגנים היו נופלים בשקט לערכי נפילה.
 */
export function zcmObservations(csv: string, nominalReal: 'N' | 'R'): ZcmObservation[] {
  return parseCsv(csv)
    .filter((row) => {
      if (row.DATA_TYPE && row.DATA_TYPE !== 'ZC_YTM') return false;
      if (row.NOMINAL_REAL) return row.NOMINAL_REAL === nominalReal;
      const code = row.SERIES_CODE || '';
      if (!code) return true;
      if (code.includes('ZND')) return nominalReal === 'N';
      if (code.includes('ZRD')) return nominalReal === 'R';
      return true;
    })
    .flatMap((row) => {
      const years = parseMaturityYears(row.TIME_TO_MATURITY || row.SERIES_CODE || '');
      const raw = (row.OBS_VALUE ?? '').trim();
      const yieldPct = Number(raw);
      // תא ריק אינו תשואה של אפס — הוא פשוט תצפית חסרה
      if (!years || raw === '' || !Number.isFinite(yieldPct)) return [];
      // תשואה ריאלית יכולה להיות שלילית; נומינלית לא. מעבר לטווח הזה מדובר בזבל.
      if (nominalReal === 'N' && yieldPct <= 0) return [];
      if (yieldPct <= -5 || yieldPct > 20) return [];
      const timePeriod = row.TIME_PERIOD || '';
      return [{ years, yieldPct, timePeriod, month: observationMonth(timePeriod) }];
    });
}

/**
 * עקום אפס לחודש מבוקש: הממוצע החודשי של כל תצפית לכל טווח פדיון.
 *
 * ממוצע ולא תצפית בודדת, כי ריבית משתנה מעודכנת מול העקום של החודש הקודם
 * ולא מול יום מסחר אקראי בתוכו. כשאין תצפיות לאותו חודש — למשל כשהעקום עוד
 * לא פורסם — נלקח החודש המלא האחרון שכן קיים בנתונים.
 */
export function curveForMonth(observations: ZcmObservation[], month: string): CurveSnapshot | null {
  if (observations.length === 0) return null;

  const months = [...new Set(observations.map((o) => o.month).filter(Boolean))].sort();
  const target = months.includes(month) ? month : months.at(-1);
  if (!target) return null;

  const selected = observations.filter((o) => o.month === target);
  const byYears = new Map<number, { sum: number; count: number }>();
  selected.forEach((o) => {
    const entry = byYears.get(o.years) ?? { sum: 0, count: 0 };
    entry.sum += o.yieldPct;
    entry.count += 1;
    byYears.set(o.years, entry);
  });

  const spots = [...byYears.entries()]
    .map(([years, { sum, count }]) => ({ years, yieldPct: sum / count }))
    .sort((a, b) => a.years - b.years);
  if (spots.length === 0) return null;

  return {
    spots,
    month: target,
    asOf: selected.map((o) => o.timePeriod).sort().at(-1) || target,
    source: 'boi',
  };
}

/** העקום של התצפית האחרונה בלבד — הבסיס לחישובי פורוורד */
export function latestCurve(observations: ZcmObservation[]): CurveSnapshot | null {
  if (observations.length === 0) return null;
  const latest = observations.map((o) => o.timePeriod).sort().at(-1);
  if (!latest) return null;

  const selected = observations.filter((o) => o.timePeriod === latest);
  const byYears = new Map<number, number>();
  selected.forEach((o) => byYears.set(o.years, o.yieldPct));
  const spots = [...byYears.entries()]
    .map(([years, yieldPct]) => ({ years, yieldPct }))
    .sort((a, b) => a.years - b.years);
  if (spots.length === 0) return null;

  return { spots, month: observationMonth(latest), asOf: latest, source: 'boi' };
}

/**
 * התצפית המספרית האחרונה בסדרה חד-ממדית (כמו ריבית בנק ישראל).
 *
 * שני דברים שהלכו כאן לאיבוד בעבר:
 * 1. תא ריק אינו תצפית. `Number('')` הוא אפס, ובלי הבדיקה הזו סדרה עם תא ריק
 *    הייתה נקראת כריבית בנק ישראל של 0% — ומשם פריים של 1.5% בכל הפלטפורמה.
 * 2. כשחוזרות כמה סדרות לאותו תאריך, הבחירה חייבת להיות דטרמיניסטית ולא לפי
 *    סדר השורות בקובץ. מיון לפי קוד הסדרה מבטיח שאותו קלט ייתן תמיד אותה
 *    תשובה, ו-`ambiguous` מסמן שיש יותר מערך אחד כדי שאפשר יהיה לראות זאת
 *    ב-`/api/health` במקום לנחש למה הפריים נראה מוזר.
 */
export function latestObservation(
  rows: Record<string, string>[]
): { value: number; asOf: string; ambiguous: boolean } | null {
  const valid = rows.filter((row) => {
    const raw = (row.OBS_VALUE ?? '').trim();
    if (raw === '') return false;
    const value = Number(raw);
    // ריבית מוניטרית סבירה. אפס הוא ערך תקין (2015–2021), ולכן הגבול התחתון פתוח.
    return Number.isFinite(value) && value >= 0 && value < 20;
  });
  if (valid.length === 0) return null;

  const latestPeriod = valid
    .map((row) => row.TIME_PERIOD || '')
    .sort()
    .at(-1);

  const atLatest = valid
    .filter((row) => (row.TIME_PERIOD || '') === latestPeriod)
    .sort((a, b) => (a.SERIES_CODE || '').localeCompare(b.SERIES_CODE || ''));

  const distinct = new Set(atLatest.map((row) => Number(row.OBS_VALUE)));

  return {
    value: Number(atLatest[0].OBS_VALUE),
    asOf: latestPeriod || '',
    ambiguous: distinct.size > 1,
  };
}

// ───────────────────────────── משיכה ─────────────────────────────

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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

/** עקום אפס ריאלי לנפילה — נגזר מהעקום הנומינלי פחות ציפיות האינפלציה */
function fallbackRealSpots(): YieldSpot[] {
  const inflation = fallbackInflationForecast().spots;
  return FALLBACK_NOMINAL_SPOTS.map((spot) => {
    const nearest = inflation.reduce((best, point) =>
      Math.abs(point.years - spot.years) < Math.abs(best.years - spot.years) ? point : best
    );
    return {
      years: spot.years,
      yieldPct: ((1 + spot.yieldPct / 100) / (1 + nearest.inflationPct / 100) - 1) * 100,
    };
  });
}

/**
 * התצלום שמוחזר כשאף מקור לא נמשך — טבלת הריביות הסטטית.
 *
 * הערכים נלקחים מ-`STATIC_INTEREST_RATES` ולא מ-`INTEREST_RATES`, שהוא כבר
 * הטבלה החיה. תצלום הנפילה הוא גם נקודת הייחוס שממנה מחולץ המרווח הבנקאי
 * (`defaultSpreadFor`), ולכן הוא חייב להיות קבוע: אילו הוא היה זז עם השוק,
 * המרווח היה מתכווץ בדיוק כפי שהעוגן גדל, והריבית הסופית הייתה נתקעת על הערך
 * שנכתב בקוד במקום לעקוב אחרי בנק ישראל.
 */
export function fallbackMarketRates(reference: Date = new Date()): MarketRatesSnapshot {
  const boiRate = STATIC_INTEREST_RATES.prime - PRIME_OVER_BOI;
  const month = previousMonthKey(reference);
  const prime = fallbackPrimeForecast(boiRate);

  return {
    fetchedAt: reference.toISOString(),
    source: 'fallback',
    boiRate,
    boiRateAsOf: prime.asOf,
    boiRateSource: 'fallback',
    primeRate: STATIC_INTEREST_RATES.prime,
    nominalCurve: { spots: FALLBACK_NOMINAL_SPOTS, month, asOf: prime.asOf, source: 'fallback' },
    realCurve: { spots: fallbackRealSpots(), month, asOf: prime.asOf, source: 'fallback' },
    primeForecast: prime,
    inflationForecast: fallbackInflationForecast(),
  };
}

/**
 * משיכה חיה של כל הריביות והתחזיות מבנק ישראל.
 *
 * כל מקור נמשך בנפרד ונכשל בנפרד: אם רק העקום הריאלי לא חזר, ריבית בנק ישראל
 * והעקום הנומינלי עדיין יהיו חיים, והתצלום יסומן `mixed`.
 */
export async function fetchMarketRates(reference: Date = new Date()): Promise<MarketRatesSnapshot> {
  const fallback = fallbackMarketRates(reference);
  const wantedMonth = previousMonthKey(reference);

  const [nominalRes, realRes, brRes] = await Promise.allSettled([
    fetchText(ZCM_NOMINAL_URL),
    fetchText(ZCM_REAL_URL),
    fetchText(BR_URL),
  ]);

  const nominalObs = nominalRes.status === 'fulfilled' ? zcmObservations(nominalRes.value, 'N') : [];
  const realObs = realRes.status === 'fulfilled' ? zcmObservations(realRes.value, 'R') : [];

  const br = brRes.status === 'fulfilled' ? latestObservation(parseCsv(brRes.value)) : null;
  const boiRate = br?.value ?? fallback.boiRate;

  // עקום אפס תקין דורש לפחות 3 נקודות — פחות מכך אינו עקום שאפשר לאנטרפלט עליו
  const nominalMonthly = curveForMonth(nominalObs, wantedMonth);
  const nominalCurve =
    nominalMonthly && nominalMonthly.spots.length >= 3 ? nominalMonthly : fallback.nominalCurve;

  const realMonthly = curveForMonth(realObs, wantedMonth);
  const realCurve = realMonthly && realMonthly.spots.length >= 3 ? realMonthly : fallback.realCurve;

  const nominalLatest = latestCurve(nominalObs);
  const primeForecast: PrimeForecast =
    nominalLatest && nominalLatest.spots.length >= 3
      ? { asOf: nominalLatest.asOf, source: 'boi', boiRate, spots: sortSpots(nominalLatest.spots) }
      : { ...fallback.primeForecast, boiRate };

  const realLatest = latestCurve(realObs);
  const breakEvens = breakevenSpots(nominalLatest?.spots ?? [], realLatest?.spots ?? []);
  const inflationForecast: InflationForecast =
    breakEvens.length >= 3
      ? {
          asOf: realLatest?.asOf || nominalLatest?.asOf || '',
          source: 'boi',
          spots: breakEvens,
        }
      : fallback.inflationForecast;

  const live = [
    br !== null,
    nominalCurve.source === 'boi',
    realCurve.source === 'boi',
    primeForecast.source === 'boi',
  ];
  const source: MarketRatesSnapshot['source'] = live.every(Boolean)
    ? 'boi'
    : live.some(Boolean)
      ? 'mixed'
      : 'fallback';

  return {
    fetchedAt: reference.toISOString(),
    source,
    boiRate,
    boiRateAsOf: br?.asOf || fallback.boiRateAsOf,
    boiRateSource: br ? 'boi' : 'fallback',
    boiRateAmbiguous: br?.ambiguous ?? false,
    primeRate: boiRate + PRIME_OVER_BOI,
    nominalCurve,
    realCurve,
    primeForecast,
    inflationForecast,
  };
}

// ───────────────────────────── מטמון ─────────────────────────────

/**
 * מטמון בתוך התהליך. תפקידו למנוע משיכה חוזרת לכל בקשה בודדת — לא לשמר ערכים
 * ישנים. ה-TTL קצר במכוון כדי שריבית שהשתנתה בבנק ישראל תיכנס לפלטפורמה תוך
 * דקות, בלי להמתין לפריסה מחדש.
 */
let memoryCache: { snapshot: MarketRatesSnapshot; expiresAt: number } | null = null;
let inFlight: Promise<MarketRatesSnapshot> | null = null;

/**
 * המשיכה המוצלחת האחרונה, ללא תפוגה.
 *
 * כשבנק ישראל אינו זמין אין שום סיבה להציג למשתמש ערכים שנכתבו בקוד: הריבית
 * שנמשכה בהצלחה לפני שעה או לפני יומיים היא עדיין הריבית שבתוקף. לכן כל משיכה
 * מוצלחת נשמרת כאן, וכל משיכה כושלת נופלת אליה לפני שהיא נופלת לטבלה הסטטית.
 * ה-`fetchedAt` שנשמר הוא של המשיכה המקורית, כדי שיהיה גלוי מתי הנתון נמשך.
 */
let lastGood: MarketRatesSnapshot | null = null;

export function marketRatesTtlSeconds(): number {
  const parsed = parseInt(process.env.MARKET_RATES_CACHE_TTL ?? '900', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
}

/** האם התצלום מכיל נתונים שנמשכו באמת מבנק ישראל */
export function isLiveSnapshot(snapshot: MarketRatesSnapshot): boolean {
  return snapshot.source !== 'fallback';
}

/**
 * רישום משיכה מוצלחת כ"אחרונה שהצליחה".
 *
 * נקרא גם מהשרת בעליית התהליך, כדי לזרוע את הזיכרון מהמטמון המשותף — כך
 * משתמש חדש, מחובר או לא, רואה מיד את הערך שנמשך בהצלחה עבור מישהו אחר.
 */
export function recordLastGoodMarketRates(snapshot: MarketRatesSnapshot): void {
  if (!isLiveSnapshot(snapshot)) return;
  if (lastGood && lastGood.fetchedAt >= snapshot.fetchedAt) return;
  lastGood = snapshot;
  applyLiveInterestRates(snapshot);
}

/** המשיכה המוצלחת האחרונה שידועה לתהליך הזה */
export function lastGoodMarketRates(): MarketRatesSnapshot | null {
  return lastGood;
}

/** ניקוי המטמון — לשימוש בטסטים ובריענון יזום */
export function clearMarketRatesCache(): void {
  memoryCache = null;
  inFlight = null;
  lastGood = null;
}

/**
 * התצלום העדכני.
 *
 * בקשות מקבילות חולקות משיכה אחת. כשהמשיכה נכשלת מוחזרת המשיכה המוצלחת
 * האחרונה, ורק אם מעולם לא הייתה כזו מוחזר תצלום נפילה — אף פעם לא שגיאה,
 * כדי שהכלים ימשיכו לעבוד גם בלי רשת.
 */
export async function getMarketRates(options: { force?: boolean } = {}): Promise<MarketRatesSnapshot> {
  const now = Date.now();
  if (!options.force && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.snapshot;
  }
  if (!options.force && inFlight) return inFlight;

  const request = fetchMarketRates()
    .catch(() => fallbackMarketRates())
    .then((fetched) => {
      // משיכה שלא הביאה דבר מבנק ישראל אינה מחליפה נתון אמיתי שכבר יש לנו
      const snapshot = isLiveSnapshot(fetched) ? fetched : lastGood ?? fetched;
      recordLastGoodMarketRates(fetched);

      // כל תצלום שמוחזר מזרים את הריביות לטבלה המרכזית, כדי שגם קוד שלא חובר
      // ישירות לשכבת הנתונים יקרא את הערכים שבתוקף עכשיו.
      applyLiveInterestRates(snapshot);

      // תצלום שאינו חי אינו נשמר לזמן מלא, כדי שתקלת רשת רגעית לא תקפיא את
      // הפלטפורמה לרבע שעה לפני שננסה שוב.
      const ttl = isLiveSnapshot(fetched) ? marketRatesTtlSeconds() : 60;
      memoryCache = { snapshot, expiresAt: Date.now() + ttl * 1000 };
      inFlight = null;
      return snapshot;
    })
    .catch((error) => {
      inFlight = null;
      throw error;
    });

  inFlight = request;
  return request;
}
