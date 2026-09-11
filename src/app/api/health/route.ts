import { NextResponse } from "next/server";
import { fallbackMarketRates, getMarketRates } from "@/lib/market-rates";

export const dynamic = "force-dynamic";

/**
 * מצב המערכת. `boi` מדווח על המשיכה עצמה מבנק ישראל ולא על קיומו של משתנה
 * סביבה — זה מה שקובע אם הריביות שמוצגות בפלטפורמה אמיתיות.
 */
export async function GET() {
  const snapshot = await getMarketRates().catch(() => fallbackMarketRates());

  return NextResponse.json({
    ok: true,
    env: {
      db: !!process.env.DATABASE_URL,
      s3: !!process.env.S3_BUCKET && !!process.env.S3_REGION,
      redis: !!process.env.REDIS_URL,
      authSecret: !!process.env.NEXTAUTH_SECRET,
    },
    boi: {
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
      boiRate: snapshot.boiRate,
      boiRateAsOf: snapshot.boiRateAsOf,
      primeRate: snapshot.primeRate,
      nominalCurveMonth: snapshot.nominalCurve.month,
      nominalCurveSource: snapshot.nominalCurve.source,
      realCurveMonth: snapshot.realCurve.month,
      realCurveSource: snapshot.realCurve.source,
    },
    time: new Date().toISOString(),
  });
}