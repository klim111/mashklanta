import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-admin';
import { getPricingFresh, savePricing } from '@/lib/pricing-store';

/**
 * המחירים והמסלולים — היועץ קורא ועורך אותם מ"תמחור ומסלולים". שמירה מתעדכנת
 * מיד בכל עמודי האתר ובסכום שנגבה ב-HYP בתשלום הבא.
 */
async function advisorId(): Promise<string | NextResponse> {
  // משנה את האתר כולו — מנהל הפלטפורמה בלבד (src/lib/platform-admin.ts)
  const auth = await requirePlatformAdmin();
  if (auth instanceof NextResponse) return auth;
  return auth.advisorId;
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
