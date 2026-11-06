import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { getPricingFresh, savePricing } from '@/lib/pricing-store';

/**
 * המחירים והמסלולים — היועץ קורא ועורך אותם מ"תמחור ומסלולים". שמירה מתעדכנת
 * מיד בכל עמודי האתר ובסכום שנגבה ב-HYP בתשלום הבא.
 */
async function advisorId(): Promise<string | NextResponse> {
  const session = await getServerAuth();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return id;
}

export async function GET() {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  return NextResponse.json(await getPricingFresh());
}

export async function PUT(req: NextRequest) {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  return NextResponse.json(await savePricing(body, id));
}
