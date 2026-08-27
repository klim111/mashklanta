import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { fetchPrimeForecast } from '@/lib/boi-yield-curve';
import { expectedMarketPrimePath, fallbackPrimeForecast } from '@/lib/prime-forward-curve';
import { INTEREST_RATES } from '@/lib/interest-rates';

const CACHE_KEY = 'boi:prime-forecast:v1';

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
    const forecast = await fetchPrimeForecast();
    const monthlyPrime = expectedMarketPrimePath(forecast.spots, forecast.boiRate);
    const payload = {
      ...forecast,
      currentPrime: INTEREST_RATES.prime,
      monthlyPrime,
    };
    if (redis && forecast.source === 'boi') {
      await redis.set(CACHE_KEY, JSON.stringify(payload), 'EX', ttlSeconds);
    }
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch yield curve';
    const fallback = fallbackPrimeForecast(INTEREST_RATES.prime - 1.5);
    return NextResponse.json(
      {
        ...fallback,
        currentPrime: INTEREST_RATES.prime,
        monthlyPrime: expectedMarketPrimePath(fallback.spots, fallback.boiRate),
        error: message,
      },
      { status: 200 }
    );
  }
}
