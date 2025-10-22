import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

interface CurrencyRates {
  usd: number;
  eur: number;
  lastUpdated: string;
  source: 'api' | 'fallback';
}

function buildFallbackRates(): CurrencyRates {
  return {
    usd: 3.65,
    eur: 3.95,
    lastUpdated: new Date().toISOString(),
    source: 'fallback'
  };
}

export async function GET(req: NextRequest) {
  const cacheKey = 'currency:rates:current';
  const ttlSeconds = parseInt(process.env.CURRENCY_CACHE_TTL ?? "1800", 10); // Cache for 30 minutes

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached));
      } catch {
        // ignore parse error and refetch
      }
    }
  }

  try {
    // For now, return fallback data
    // TODO: Implement real currency exchange API integration
    const data = buildFallbackRates();
    
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(data), "EX", ttlSeconds);
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ 
      error: err?.message ?? "Failed to fetch currency rates" 
    }, { status: 502 });
  }
}



