import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { fetchBoiMarketCurves } from '@/lib/boi-yield-curve';
import { expectedInflationPath, fallbackInflationForecast } from '@/lib/inflation-forecast';
import { expectedMarketPrimePath, fallbackPrimeForecast } from '@/lib/prime-forward-curve';
import { INTEREST_RATES } from '@/lib/interest-rates';

const CACHE_KEY = 'boi:market-curves:v1';

export async function GET() {
  const ttlSeconds = parseInt(process.env.PRIME_CURVE_CACHE_TTL ?? '21600', 10);

  if (redis) {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached));
      } catch {
        // ignore
      }
    }
  }

  try {
    const { prime, inflation } = await fetchBoiMarketCurves();
    const monthlyPrime = expectedMarketPrimePath(prime.spots, prime.boiRate);
    const monthlyInflation = expectedInflationPath(inflation.spots);
    const payload = {
      ...prime,
      currentPrime: INTEREST_RATES.prime,
      monthlyPrime,
      inflation: {
        ...inflation,
        monthlyInflation,
      },
    };
    if (redis && (prime.source === 'boi' || inflation.source === 'boi')) {
      await redis.set(CACHE_KEY, JSON.stringify(payload), 'EX', ttlSeconds);
    }
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch yield curve';
    const fallback = fallbackPrimeForecast(INTEREST_RATES.prime - 1.5);
    const inflation = fallbackInflationForecast();
    return NextResponse.json(
      {
        ...fallback,
        currentPrime: INTEREST_RATES.prime,
        monthlyPrime: expectedMarketPrimePath(fallback.spots, fallback.boiRate),
        inflation: {
          ...inflation,
          monthlyInflation: expectedInflationPath(inflation.spots),
        },
        error: message,
      },
      { status: 200 }
    );
  }
}
