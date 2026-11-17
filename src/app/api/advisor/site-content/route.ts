import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-admin';
import { getSiteContentFresh, saveSiteContent } from '@/lib/site-content-store';
import { setTextRule } from '@/lib/site-content';

/**
 * תוכן האתר — החלפות הטקסט והבאנרים. היועץ עורך מ"תוכן האתר" (PUT, הכל יחד)
 * ומעריכה ישירה על הדף (PATCH, טקסט אחד). שמירה מתעדכנת מיד בכל העמודים.
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
  return NextResponse.json(await getSiteContentFresh());
}

export async function PUT(req: NextRequest) {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  return NextResponse.json(await saveSiteContent(body, id));
}

/** `{ page, from, to }` — `to` ריק מחזיר את הטקסט המקורי */
export async function PATCH(req: NextRequest) {
  const id = await advisorId();
  if (id instanceof NextResponse) return id;
  const body = (await req.json().catch(() => null)) as { page?: unknown; from?: unknown; to?: unknown } | null;
  if (!body || typeof body.page !== 'string' || typeof body.from !== 'string' || typeof body.to !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const current = await getSiteContentFresh();
  return NextResponse.json(await saveSiteContent(setTextRule(current, body.page, body.from, body.to), id));
}
