/**
 * מדד המחירים לצרכן — הנתון הרשמי האחרון שפורסם.
 *
 * מקור ראשי: הלשכה המרכזית לסטטיסטיקה (למ"ס), שהיא הגוף שמפרסם את המדד.
 * מקור משני: סדרת המדד ב-SDMX של בנק ישראל.
 *
 * המדד עצמו אינו משמש לחישוב ההצמדה בלוחות הסילוקין — שם ההצמדה נגזרת מציפיות
 * האינפלציה הגלומות בעקומי בנק ישראל — אלא להצגת רמת המדד העדכנית ליד מסלולים
 * צמודים. לכן כשהנתון לא נמשך הוא מסומן במפורש כלא-עדכני, במקום להציג מספר
 * שנראה רשמי אך נכתב בקוד.
 */

import { parseCsv } from './market-rates';

const CBS_CPI_URL =
  'https://api.cbs.gov.il/index/data/price?id=120&format=json&download=false&last=3';
const BOI_CPI_URL =
  'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/CPI/1.0?lastNObservations=3&format=csv';

const FETCH_TIMEOUT_MS = 12_000;

export interface CpiData {
  /** רמת המדד האחרונה שפורסמה */
  value: number;
  /** חודש המדד (YYYY-MM) או תאריך הפרסום */
  date: string;
  /** רמת המדד בפרסום הקודם */
  previousValue: number;
  /** השינוי בנקודות מדד */
  change: number;
  /** השינוי באחוזים */
  changePercentage: number;
  source: 'cbs' | 'boi' | 'fallback';
}

/**
 * אין נתון עדכני. הערכים מסומנים כ-fallback וה-UI אמור להימנע מהצגתם כמדד
 * רשמי; הם קיימים רק כדי שחישוב שמסתמך על רמת מדד לא יתפוצץ.
 */
export function fallbackCpi(): CpiData {
  return {
    value: 0,
    date: '',
    previousValue: 0,
    change: 0,
    changePercentage: 0,
    source: 'fallback',
  };
}

async function fetchWithTimeout(url: string, accept: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: accept },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

interface Observation {
  value: number;
  date: string;
}

function toCpi(observations: Observation[], source: CpiData['source']): CpiData | null {
  const sorted = observations
    .filter((o) => Number.isFinite(o.value) && o.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2] ?? latest;
  const change = latest.value - previous.value;

  return {
    value: latest.value,
    date: latest.date,
    previousValue: previous.value,
    change,
    changePercentage: previous.value > 0 ? (change / previous.value) * 100 : 0,
    source,
  };
}

/** תשובת הלמ"ס: month/year ורמת המדד תחת `currBase.value` */
export function cpiFromCbs(payload: unknown): CpiData | null {
  const months = (payload as { month?: unknown })?.month;
  if (!Array.isArray(months)) return null;

  const observations: Observation[] = months.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, any>;
    const value = Number(row.currBase?.value ?? row.value);
    const year = Number(row.year);
    const month = Number(row.month);
    if (!Number.isFinite(value) || !Number.isFinite(year) || !Number.isFinite(month)) return [];
    return [{ value, date: `${year}-${String(month).padStart(2, '0')}` }];
  });

  return toCpi(observations, 'cbs');
}

/** תשובת בנק ישראל ב-SDMX/CSV */
export function cpiFromBoiCsv(csv: string): CpiData | null {
  const observations: Observation[] = parseCsv(csv).flatMap((row) => {
    const raw = (row.OBS_VALUE ?? '').trim();
    const value = Number(raw);
    const date = row.TIME_PERIOD || '';
    // תא ריק אינו מדד של אפס, אלא תצפית חסרה
    if (raw === '' || !Number.isFinite(value) || !date) return [];
    return [{ value, date }];
  });
  return toCpi(observations, 'boi');
}

/**
 * המדד העדכני. מנסה קודם את הלמ"ס ואז את בנק ישראל, ומחזיר `fallback` רק אם
 * שני המקורות לא זמינים.
 */
export async function fetchCpi(): Promise<CpiData> {
  try {
    const res = await fetchWithTimeout(CBS_CPI_URL, 'application/json');
    const parsed = cpiFromCbs(await res.json());
    if (parsed) return parsed;
  } catch {
    // ממשיכים למקור הבא
  }

  try {
    const res = await fetchWithTimeout(BOI_CPI_URL, 'text/csv');
    const parsed = cpiFromBoiCsv(await res.text());
    if (parsed) return parsed;
  } catch {
    // אין נתון עדכני
  }

  return fallbackCpi();
}
