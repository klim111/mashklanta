import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { fallbackCpi, fetchCpi, type CpiData } from "@/lib/cpi";

/** מדד המחירים לצרכן האחרון שפורסם */
export const dynamic = "force-dynamic";

const CACHE_KEY = "cpi:current:v2";

export async function GET() {
  const ttlSeconds = parseInt(process.env.CPI_CACHE_TTL ?? "3600", 10);

  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CpiData;
        if (Number.isFinite(parsed?.value)) {
          return NextResponse.json(parsed, { headers: { "Cache-Control": "no-store" } });
        }
      }
    } catch {
      // מטמון פגום — ממשיכים למשיכה חיה
    }
  }

  let data: CpiData;
  try {
    data = await fetchCpi();
  } catch {
    data = fallbackCpi();
  }

  // נתון שלא נמשך לא נשמר במטמון, כדי שהוא לא יקבע לשעה
  if (redis && data.source !== "fallback") {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(data), "EX", ttlSeconds);
    } catch {
      // כשלון כתיבה למטמון אינו סיבה להיכשל בבקשה
    }
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
