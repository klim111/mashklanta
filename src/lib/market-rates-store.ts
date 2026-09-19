/**
 * האחסון המשותף של הריביות שנמשכו מבנק ישראל.
 *
 * המודול הזה רץ בשרת בלבד (הוא נוגע ב-Redis) ועוטף את שכבת המשיכה בשני
 * מטמונים:
 *
 *   1. מטמון קצר (TTL) — מונע משיכה חוזרת מבנק ישראל לכל מבקר.
 *   2. "האחרונה שהצליחה" — ללא תפוגה. כשבנק ישראל אינו זמין אין סיבה להציג
 *      ערכים שנכתבו בקוד: הריבית שנמשכה בהצלחה קודם היא עדיין הריבית שבתוקף.
 *
 * שני המטמונים משותפים לכל המשתמשים — מחוברים ואנונימיים כאחד. משיכה מוצלחת
 * של מבקר אחד מעדכנת את מה שכל השאר יראו, וכל משיכה מוצלחת דורסת את הקודמת.
 */

import { redis } from './redis';
import {
  fallbackMarketRates,
  getMarketRates,
  isLiveSnapshot,
  lastGoodMarketRates,
  marketRatesTtlSeconds,
  recordLastGoodMarketRates,
  type MarketRatesSnapshot,
} from './market-rates';

/** המטמון הקצר — התשובה שמוגשת כל עוד היא טרייה */
const FRESH_KEY = 'market:rates:v2';
/** המשיכה המוצלחת האחרונה, ללא תפוגה */
const LAST_GOOD_KEY = 'market:rates:last-good:v2';

function isSnapshot(value: unknown): value is MarketRatesSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<MarketRatesSnapshot>;
  return (
    Number.isFinite(snapshot.primeRate) &&
    Number.isFinite(snapshot.boiRate) &&
    Array.isArray(snapshot.nominalCurve?.spots) &&
    Array.isArray(snapshot.realCurve?.spots) &&
    Array.isArray(snapshot.primeForecast?.spots)
  );
}

async function readKey(key: string): Promise<MarketRatesSnapshot | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    // Redis לא זמין או מטמון פגום — ממשיכים בלעדיו
    return null;
  }
}

/**
 * המשיכה המוצלחת האחרונה מהאחסון המשותף, כולל הזרמתה לזיכרון התהליך.
 * כך מופע חדש של השרת מתחיל עם הערך שנמשך עבור מישהו אחר, ולא מאפס.
 */
export async function readSharedLastGood(): Promise<MarketRatesSnapshot | null> {
  const stored = await readKey(LAST_GOOD_KEY);
  if (stored) recordLastGoodMarketRates(stored);
  return stored ?? lastGoodMarketRates();
}

async function persist(snapshot: MarketRatesSnapshot): Promise<void> {
  if (!redis || !isLiveSnapshot(snapshot)) return;
  try {
    await redis.set(FRESH_KEY, JSON.stringify(snapshot), 'EX', marketRatesTtlSeconds());
    // ללא תפוגה: זה הערך שיוצג אם וכאשר בנק ישראל לא יהיה זמין
    await redis.set(LAST_GOOD_KEY, JSON.stringify(snapshot));
  } catch {
    // כשלון כתיבה למטמון אינו סיבה להיכשל בבקשה
  }
}

/**
 * הריביות שיוגשו למבקר.
 *
 * `force` עוקף את המטמון הקצר ומושך מחדש מבנק ישראל. גם אז, משיכה שנכשלת
 * אינה דורסת את הערך הטוב האחרון — היא פשוט מוגשת ממנו.
 */
export async function getSharedMarketRates(
  options: { force?: boolean } = {}
): Promise<MarketRatesSnapshot> {
  if (!options.force) {
    const fresh = await readKey(FRESH_KEY);
    if (fresh) {
      recordLastGoodMarketRates(fresh);
      return fresh;
    }
  }

  // הזרעת הזיכרון לפני המשיכה, כדי שגם אם היא תיכשל תהיה לנו נפילה אמיתית
  await readSharedLastGood();

  let snapshot: MarketRatesSnapshot;
  try {
    snapshot = await getMarketRates({ force: options.force });
  } catch {
    snapshot = lastGoodMarketRates() ?? fallbackMarketRates();
  }

  await persist(snapshot);
  return snapshot;
}
