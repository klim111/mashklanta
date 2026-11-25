import { NextRequest, NextResponse } from 'next/server';
import { searchAddresses } from '@/lib/address-lookup';

/** הצעות השלמה לכתובת נכס — עיר ורחוב מתוך מרשם הכתובות הרשמי */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? '';

  if (query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await searchAddresses(query, 8);

  return NextResponse.json(
    { suggestions },
    { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } }
  );
}
