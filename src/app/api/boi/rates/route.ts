import { NextRequest, NextResponse } from "next/server";
import { fetchBoiRates } from "@/lib/boi";

/**
 * ריביות המסלולים לפי הנתונים החיים של בנק ישראל.
 *
 * המטמון יושב בשכבת `market-rates` עצמה ומשותף לכל הצרכנים בפלטפורמה, ולכן
 * המסלול הזה לא מחזיק מטמון משלו — אחרת ריבית שהתעדכנה הייתה מגיעה לכלי אחד
 * ולא לאחר.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const data = await fetchBoiRates();
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch rates";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
