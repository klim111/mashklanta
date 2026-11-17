import { NextRequest, NextResponse } from 'next/server';
import { getOfficePage } from '@/lib/office-store';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

/**
 * פרטי משרד פעיל לפי הקישור — לגולש שעוד לא נרשם: עמוד ההרשמה מציג אליו
 * הוא מצטרף. רק מה שממילא מוצג בדף המשרד הציבורי.
 */
export async function GET(req: NextRequest) {
  const limit = await rateLimit(`office-public:${getClientIp(req)}`, { limit: 120, windowSeconds: 60 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const page = slug ? await getOfficePage(slug) : null;
  if (!page) return NextResponse.json({ office: null }, { status: 404 });
  return NextResponse.json({ office: page.office });
}
