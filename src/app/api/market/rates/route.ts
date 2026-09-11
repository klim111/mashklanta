import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  fallbackMarketRates,
  getMarketRates,
  marketRatesTtlSeconds,
  type MarketRatesSnapshot,
} from '@/lib/market-rates';

/**
 * הריביות והתחזיות החיות של בנק ישראל.
 *
 * המסלול תמיד דינמי: התשובה נבנית בכל בקשה, ומטמון קצר (בתהליך וב-Redis)
 * מונע משיכה חוזרת מבנק ישראל לכל משתמש. `?refresh=1` עוקף את שני המטמונים
 * ומושך מחדש, לשימוש בכפתור הריענון בממשק.
 */
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'market:rates:v1';

function isSnapshot(value: unknown): value is MarketRatesSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<MarketRatesSnapshot>;
  return (
    typeof snapshot.primeRate === 'number' &&
    typeof snapshot.boiRate === 'number' &&
    !!snapshot.nominalCurve &&
    !!snapshot.realCurve
  );
}

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  const ttlSeconds = marketRatesTtlSeconds();

  if (!force && redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (isSnapshot(parsed)) {
          return NextResponse.json(parsed, { headers: { 'Cache-Control': 'no-store' } });
        }
      }
    } catch {
      // מטמון פגום או Redis לא זמין — ממשיכים למשיכה חיה
    }
  }

  let snapshot: MarketRatesSnapshot;
  try {
    snapshot = await getMarketRates({ force });
  } catch {
    snapshot = fallbackMarketRates();
  }

  // תצלום נפילה לא נשמר במטמון המשותף, כדי שתקלה אצל משתמש אחד לא תקפיא את
  // הערכים הסטטיים לכל השאר.
  if (redis && snapshot.source !== 'fallback') {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(snapshot), 'EX', ttlSeconds);
    } catch {
      // כשלון כתיבה למטמון אינו סיבה להיכשל בבקשה
    }
  }

  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}
