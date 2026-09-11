import { NextResponse } from 'next/server';
import { expectedInflationPath } from '@/lib/inflation-forecast';
import { expectedMarketPrimePath } from '@/lib/prime-forward-curve';
import { fallbackMarketRates, getMarketRates, type MarketRatesSnapshot } from '@/lib/market-rates';

/**
 * עקום הפריים וציפיות האינפלציה של בנק ישראל.
 *
 * המטמון משותף עם שאר צרכני הריביות (`market-rates`), כדי שריבית שהתעדכנה
 * תופיע בכל הכלים באותו רגע ולא תיתקע בעותק ישן של מסלול אחד.
 */
export const dynamic = 'force-dynamic';

function payload(snapshot: MarketRatesSnapshot) {
  const { primeForecast, inflationForecast } = snapshot;
  return {
    ...primeForecast,
    /** ריבית הפריים במשק כפי שנמשכה מבנק ישראל — לא ערך קבוע בקוד */
    currentPrime: snapshot.primeRate,
    boiRateAsOf: snapshot.boiRateAsOf,
    monthlyPrime: expectedMarketPrimePath(primeForecast.spots, primeForecast.boiRate),
    inflation: {
      ...inflationForecast,
      monthlyInflation: expectedInflationPath(inflationForecast.spots),
    },
  };
}

export async function GET() {
  try {
    return NextResponse.json(payload(await getMarketRates()), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch yield curve';
    return NextResponse.json(
      { ...payload(fallbackMarketRates()), error: message },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
