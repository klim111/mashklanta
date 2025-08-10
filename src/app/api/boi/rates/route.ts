import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { fetchBoiRates } from "@/lib/boi";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const cacheKey = `boi:${from ?? ""}:${to ?? ""}`;
  const ttlSeconds = parseInt(process.env.RATES_CACHE_TTL ?? "900", 10);

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
    const data = await fetchBoiRates({ from, to });
    const isFallback = data && typeof data === "object" && data.source === "fallback";
    if (redis && !isFallback) {
      await redis.set(cacheKey, JSON.stringify(data), "EX", ttlSeconds);
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to fetch rates" }, { status: 502 });
  }
}