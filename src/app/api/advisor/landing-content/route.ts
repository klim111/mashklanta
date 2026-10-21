import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { getLandingContentFresh, saveLandingContent } from '@/lib/landing-content-store';

/**
 * הטקסטים של דפי הנחיתה — היועץ קורא ועורך אותם מ"דפי נחיתה". שמירה מתעדכנת
 * מיד בדפים עצמם.
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
  return NextResponse.json(await getLandingContentFresh());
}

export async function PUT(req: NextRequest) {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  return NextResponse.json(await saveLandingContent(body, id));
}
