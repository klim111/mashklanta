import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

interface CPIData {
  value: number;
  date: string;
  previousValue: number;
  change: number;
  changePercentage: number;
  source: 'api' | 'fallback';
}

function buildFallbackCPI(): CPIData {
  const currentDate = new Date().toISOString().slice(0, 10);
  // Current CPI estimate based on recent Bank of Israel data
  // This should be updated with real API data
  return {
    value: 127.8, // Current estimated CPI index
    date: currentDate,
    previousValue: 126.9,
    change: 0.9,
    changePercentage: 0.71,
    source: 'fallback'
  };
}

export async function GET(req: NextRequest) {
  const cacheKey = 'boi:cpi:current';
  const ttlSeconds = parseInt(process.env.CPI_CACHE_TTL ?? "3600", 10); // Cache for 1 hour

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
    // TODO: Implement real Bank of Israel CPI API integration
    const data = buildFallbackCPI();
    
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(data), "EX", ttlSeconds);
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ 
      error: err?.message ?? "Failed to fetch CPI data" 
    }, { status: 502 });
  }
}