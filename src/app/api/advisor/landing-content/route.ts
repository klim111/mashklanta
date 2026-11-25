import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-admin';
import { getLandingContentFresh, saveLandingContent } from '@/lib/landing-content-store';

/**
 * הטקסטים של דפי הנחיתה — היועץ קורא ועורך אותם מ"דפי נחיתה". שמירה מתעדכנת
 * מיד בדפים עצמם.
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
  return NextResponse.json(await getLandingContentFresh());
}

export async function PUT(req: NextRequest) {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  return NextResponse.json(await saveLandingContent(body, id));
}
