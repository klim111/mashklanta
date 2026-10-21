import { NextResponse } from 'next/server';
import { getConsumerCredit } from '@/lib/boi-consumer-credit';

/**
 * נתוני האשראי הצרכני לכלי ההלוואות — אזור המידע הפיננסי וחלונית הריביות לפי
 * מוסד מממן. מבנק ישראל בלבד; כשהוא אינו זמין ואין משיכה קודמת מוחזרת שגיאה,
 * והכלי אומר שהנתונים אינם זמינים במקום להציג ערכים ממקור אחר.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getConsumerCredit();
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Bank of Israel data';
    return NextResponse.json({ error: message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
