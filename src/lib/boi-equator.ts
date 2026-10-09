/**
 * ============================================================================
 *  "קו המשווה" של בנק ישראל — השוואת ריביות על הלוואות צרכניות
 * ============================================================================
 *
 *  לוח ההשוואה שבנק ישראל מפרסם באתר (boi.org.il › קו המשווה › הלוואות) הוא
 *  דוח Power BI ציבורי. הנתונים שלו לא מתפרסמים במאגר הסדרות (SDMX): סדרות
 *  BIR הישנות לפי בנק נעצרו ב-2024 ובחברות הכרטיסים ב-2025, והלוח עבר לסדרות
 *  חדשות (LR_BIR_588x) שזמינות רק דרכו. כאן נמשכות אותן סדרות בדיוק, דרך אותו
 *  ממשק ציבורי שהדפדפן משתמש בו כשפותחים את הלוח, כדי שהמספרים יהיו זהים.
 *
 *  הסדרות (הלוואות בריבית משתנה צמודת פריים למשקי בית, לפי מוסד מממן):
 *    5880 — תקופה ממוצעת לפירעון, בשנים
 *    5881 — מרווח ממוצע מעל העוגן (שבר עשרוני: 0.0218 = 2.18%)
 *    5882 — ריבית עוגן ממוצעת
 *    5883 — סכום ההלוואות החדשות בחודש, במיליארדי ש"ח
 *    5885 / 5886 — עוגן ומרווח חציוניים
 *    5887 — הריבית שמעליה ניתנו 25% מההלוואות היקרות (אחוזון 75)
 *    5888 — הריבית שעד אליה ניתנו 25% מההלוואות הזולות (אחוזון 25)
 *  קוד 99050 הוא ממוצע המערכת כפי שהלוח מציג אותו.
 * ============================================================================
 */

const REPORT_KEY = '24b9277e-99a0-4c84-927e-aac3e862735a';
const API = 'https://wabi-west-europe-api.analysis.windows.net/public/reports';
const FETCH_TIMEOUT_MS = 20_000;

export const EQUATOR_PAGE_URL =
  'https://www.boi.org.il/information/bank-paymnts/financial-education/campaigns/boi-equator/loans/';

export const EQUATOR_MEASURES = {
  term: 'LR_BIR_5880',
  margin: 'LR_BIR_5881',
  anchor: 'LR_BIR_5882',
  volume: 'LR_BIR_5883',
  medianAnchor: 'LR_BIR_5885',
  medianMargin: 'LR_BIR_5886',
  high: 'LR_BIR_5887',
  low: 'LR_BIR_5888',
} as const;

/** ממוצע המערכת בלוח */
export const EQUATOR_SYSTEM_CODE = '99050';

/** תצפית אחת: מוסד (קוד הסדרה בלוח, למשל 10001), סדרה, חודש וערך */
export interface EquatorObservation {
  lender: string;
  measure: string;
  period: string;
  value: number;
}

const HEADERS: Record<string, string> = {
  'X-PowerBI-ResourceKey': REPORT_KEY,
  'Content-Type': 'application/json;charset=UTF-8',
  Accept: 'application/json',
  Origin: 'https://app.powerbi.com',
  Referer: 'https://app.powerbi.com/',
};

async function requestJson(url: string, body?: unknown): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

type Row = unknown[];

/**
 * פענוח תשובת Power BI (DSR): כל שורה מחזיקה רק את הערכים שהשתנו — R מסמן
 * עמודות שחוזרות מהשורה הקודמת, Ø עמודות ריקות, וערכי טקסט מגיעים כאינדקס
 * למילון (ValueDicts).
 */
export function decodeDsr(dsr: any): Row[] {
  const ds = dsr?.DS?.[0];
  const dicts: Record<string, unknown[]> = ds?.ValueDicts ?? {};
  const rows: Row[] = [];
  let schema: { DN?: string }[] | null = null;
  let previous: Row = [];
  for (const raw of ds?.PH?.[0]?.DM0 ?? []) {
    if (raw.S) schema = raw.S;
    if (!schema) continue;
    const values: unknown[] = raw.C ?? [];
    const repeat: number = raw.R ?? 0;
    const empty: number = raw['Ø'] ?? 0;
    let next = 0;
    const row: Row = schema.map((column, i) => {
      if ((repeat >> i) & 1) return previous[i];
      if ((empty >> i) & 1) return null;
      const value = values[next++];
      return column.DN && typeof value === 'number' ? dicts[column.DN]?.[value] : value;
    });
    rows.push(row);
    previous = row;
  }
  return rows;
}

function factQuery(modelId: number) {
  const column = (property: string) => ({
    Column: { Expression: { SourceRef: { Source: 'f' } }, Property: property },
  });
  const properties = ['Bank Series code', 'Measure Code', 'Time Period', 'Value'];
  return {
    version: '1.0.0',
    queries: [
      {
        Query: {
          Commands: [
            {
              SemanticQueryDataShapeCommand: {
                Query: {
                  Version: 2,
                  From: [{ Name: 'f', Entity: 'FactData', Type: 0 }],
                  Select: properties.map((property) => ({ ...column(property), Name: `FactData.${property}` })),
                  Where: [
                    {
                      Condition: {
                        In: {
                          Expressions: [column('Measure Code')],
                          Values: Object.values(EQUATOR_MEASURES).map((code) => [{ Literal: { Value: `'${code}'` } }]),
                        },
                      },
                    },
                  ],
                },
                Binding: {
                  Primary: { Groupings: [{ Projections: [0, 1, 2, 3] }] },
                  DataReduction: { DataVolume: 4, Primary: { Window: { Count: 30000 } } },
                  Version: 1,
                },
              },
            },
          ],
        },
      },
    ],
    cancelQueries: [],
    modelId,
  };
}

/** המרת השורות שפוענחו לתצפיות; שורות חסרות או לא מספריות נזרקות */
export function observationsFromRows(rows: Row[]): EquatorObservation[] {
  const codes = new Set<string>(Object.values(EQUATOR_MEASURES));
  const out: EquatorObservation[] = [];
  for (const [lender, measure, period, raw] of rows) {
    if (typeof lender !== 'string' && typeof lender !== 'number') continue;
    if (typeof measure !== 'string' || !codes.has(measure)) continue;
    if (typeof period !== 'string' || !/^\d{4}-\d{2}$/.test(period)) continue;
    const value = Number(raw);
    if (raw === null || raw === '' || !Number.isFinite(value)) continue;
    out.push({ lender: String(lender), measure, period, value });
  }
  return out;
}

/** כל התצפיות של סדרות ההלוואות בלוח, לכל המוסדות ולכל החודשים שמתפרסמים בו */
export async function fetchEquatorLoans(): Promise<EquatorObservation[]> {
  const models = await requestJson(`${API}/${REPORT_KEY}/modelsAndExploration?preferReadOnlySession=true`);
  const modelId = models?.models?.[0]?.id;
  if (typeof modelId !== 'number') throw new Error('Power BI model id is missing');
  const data = await requestJson(`${API}/querydata?synchronous=true`, factQuery(modelId));
  const dsr = data?.results?.[0]?.result?.data?.dsr;
  const observations = observationsFromRows(decodeDsr(dsr));
  if (observations.length === 0) throw new Error('Bank of Israel equator dashboard returned no loan data');
  return observations;
}
