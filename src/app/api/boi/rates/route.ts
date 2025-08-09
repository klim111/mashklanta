import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { fetchBoiRates } from "@/lib/boi";

export const runtime = "nodejs"; // ensure Node runtime for outbound fetch in some hosts

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const cacheKey = `boi:${from ?? ""}:${to ?? ""}`;
  const ttlSeconds = parseInt(process.env.RATES_CACHE_TTL ?? "900", 10);

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    } catch {
      // ignore cache errors
    }
  }

  try {
    const data = await fetchBoiRates({ from, to });
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), "EX", ttlSeconds);
      } catch {
        // ignore cache errors
      }
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    const message = err?.message ?? "Failed to fetch rates";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}