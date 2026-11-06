/**
 * חיפוש כתובות אמיתיות בישראל להשלמה אוטומטית.
 *
 * המקור הראשי הוא מרשם הרחובות הרשמי של data.gov.il — כל היישובים והרחובות
 * בישראל, בעברית, בלי צורך במפתח API. כשהמרשם לא מחזיר תוצאה (למשל הקלדה
 * באנגלית או חיפוש של נקודת עניין) נופלים למפות OpenStreetMap דרך Nominatim,
 * שגם מוסיפה דיוק ברמת מספר הבית.
 */

import { fetchExternalJson } from './external-json';

/** מרשם "רחובות בישראל" — 63 אלף רחובות ויישובים */
const STREETS_RESOURCE_ID = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b';
const CKAN_SEARCH_URL = 'https://data.gov.il/api/3/action/datastore_search';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

/** Nominatim מחייבת זיהוי של האפליקציה הקוראת */
const USER_AGENT = 'mashklanta-mortgage-planner/1.0';
const REQUEST_TIMEOUT_MS = 6_000;

/** במרשם, קוד רחוב 9000 מסמן את היישוב עצמו ולא רחוב בתוכו */
const LOCALITY_STREET_CODE = 9000;

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

export interface AddressSuggestion {
  /** הטקסט המלא שייכנס לשדה הכתובת */
  label: string;
  city: string;
  street?: string;
  houseNumber?: string;
  source: 'registry' | 'map';
}

interface StreetRecord {
  'שם_ישוב'?: string;
  'שם_רחוב'?: string;
  'סמל_רחוב'?: number;
}

interface CacheEntry {
  at: number;
  suggestions: AddressSuggestion[];
}

const cache = new Map<string, CacheEntry>();

function readCache(key: string): AddressSuggestion[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.suggestions;
}

function writeCache(key: string, suggestions: AddressSuggestion[]) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), suggestions });
}

interface ParsedQuery {
  /** המילים לחיפוש, בלי מספר הבית */
  words: string[];
  houseNumber?: string;
}

/**
 * מפריד את מספר הבית משאר הכתובת. במרשם אין מספרי בתים, ולכן החיפוש נעשה על
 * הרחוב והיישוב בלבד ומספר הבית מוחזר לתוך ההצעה בסוף.
 */
function parseQuery(raw: string): ParsedQuery {
  // גרש, מקף וכל תו שאינו אות או ספרה הופכים למפריד — כך "ג'ווייעד" נחפש כשתי מילים
  const tokens = raw
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const words: string[] = [];
  let houseNumber: string | undefined;

  tokens.forEach((token) => {
    if (/^\d+$/.test(token)) {
      // המספר האחרון שהוקלד הוא מספר הבית
      houseNumber = token;
      return;
    }
    words.push(token);
  });

  return { words, houseNumber };
}

/**
 * שאילתת to_tsquery עם השלמת תחיליות: כל מילה שהוקלדה חייבת להופיע ברשומה,
 * והמילה האחרונה נחשבת תחילית כדי שההשלמה תעבוד תוך כדי הקלדה.
 */
function buildPrefixQuery(words: string[]): string {
  return words.map((word) => `${word}:*`).join(' & ');
}

function labelFor(street: string | undefined, city: string, houseNumber?: string): string {
  if (!street) return city;
  const withNumber = houseNumber ? `${street} ${houseNumber}` : street;
  return `${withNumber}, ${city}`;
}

function fetchJson<T>(url: string): Promise<T> {
  return fetchExternalJson<T>(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
}

/** חיפוש במרשם הרחובות הרשמי */
async function searchRegistry(
  parsed: ParsedQuery,
  limit: number
): Promise<AddressSuggestion[]> {
  if (parsed.words.length === 0) return [];

  const url =
    `${CKAN_SEARCH_URL}?resource_id=${STREETS_RESOURCE_ID}` +
    `&plain=false&limit=${limit * 3}` +
    `&q=${encodeURIComponent(buildPrefixQuery(parsed.words))}`;

  const payload = await fetchJson<{
    success?: boolean;
    result?: { records?: StreetRecord[] };
  }>(url);
  if (!payload?.success || !Array.isArray(payload.result?.records)) return [];

  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];

  payload.result.records.forEach((record) => {
    const city = (record['שם_ישוב'] ?? '').trim();
    if (!city) return;

    const rawStreet = (record['שם_רחוב'] ?? '').trim();
    // ברשומת היישוב עצמו שם הרחוב הוא שם היישוב, ולכן אין רחוב להציג
    const street =
      record['סמל_רחוב'] === LOCALITY_STREET_CODE || rawStreet === city ? undefined : rawStreet;

    const key = `${street ?? ''}|${city}`;
    if (seen.has(key)) return;
    seen.add(key);

    suggestions.push({
      label: labelFor(street, city, street ? parsed.houseNumber : undefined),
      city,
      street,
      houseNumber: street ? parsed.houseNumber : undefined,
      source: 'registry',
    });
  });

  return suggestions.slice(0, limit);
}

interface NominatimResult {
  address?: Record<string, string>;
  display_name?: string;
}

/** גיבוי ממפות OpenStreetMap, כולל מספרי בתים */
async function searchMap(query: string, limit: number): Promise<AddressSuggestion[]> {
  const url =
    `${NOMINATIM_SEARCH_URL}?format=jsonv2&addressdetails=1&countrycodes=il` +
    `&accept-language=he&limit=${limit}&q=${encodeURIComponent(query)}`;

  const results = await fetchJson<NominatimResult[]>(url);
  if (!Array.isArray(results)) return [];

  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];

  results.forEach((result) => {
    const address = result.address ?? {};
    const city =
      address.city || address.town || address.village || address.municipality || address.suburb;
    if (!city) return;

    const street = address.road || undefined;
    const houseNumber = address.house_number || undefined;
    const label = labelFor(street, city, houseNumber);

    if (seen.has(label)) return;
    seen.add(label);

    suggestions.push({ label, city, street, houseNumber, source: 'map' });
  });

  return suggestions;
}

/**
 * הצעות כתובת לשדה חיפוש. מחזיר רשימה ריקה במקום לזרוק שגיאה, כדי שתקלה
 * בשירות חיצוני לא תחסום את הזנת הכתובת ידנית.
 */
export async function searchAddresses(query: string, limit = 8): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `${trimmed.toLowerCase()}|${limit}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const parsed = parseQuery(trimmed);

  let suggestions: AddressSuggestion[] = [];
  try {
    suggestions = await searchRegistry(parsed, limit);
  } catch {
    suggestions = [];
  }

  if (suggestions.length === 0) {
    try {
      suggestions = await searchMap(trimmed, limit);
    } catch {
      suggestions = [];
    }
  }

  if (suggestions.length > 0) writeCache(cacheKey, suggestions);
  return suggestions;
}
