import { NextRequest, NextResponse } from 'next/server';
import { getSharedMarketRates } from '@/lib/market-rates-store';
import { fallbackMarketRates } from '@/lib/market-rates';

/**
 * הריביות והתחזיות החיות של בנק ישראל.
 *
 * המסלול פתוח גם למי שאינו מחובר — הכלים הציבוריים של האתר ניזונים ממנו.
 * המטמון משותף לכל המבקרים, וכשבנק ישראל אינו זמין מוגשת המשיכה המוצלחת
 * האחרונה במקום ערכים שנכתבו בקוד. `?refresh=1` מושך מחדש מיד.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('refresh') === '1';

  let snapshot;
  try {
    snapshot = await getSharedMarketRates({ force });
  } catch {
    snapshot = fallbackMarketRates();
  }

  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}
