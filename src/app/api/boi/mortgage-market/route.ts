import { NextResponse } from 'next/server';
import { getMortgageMarket } from '@/lib/boi-mortgage-market';

/**
 * נתוני שוק המשכנתאות לדאשבורד בדף הבית — מבנק ישראל בלבד.
 *
 * הנתונים חודשיים, ולכן התשובה נשמרת ב-CDN לכמה שעות. כשבנק ישראל אינו זמין
 * ואין משיכה מוצלחת קודמת מוחזרת שגיאה, והדאשבורד אומר שהנתונים אינם זמינים
 * במקום להציג ערכים ממקור אחר.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getMortgageMarket();
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Bank of Israel data';
    return NextResponse.json({ error: message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
