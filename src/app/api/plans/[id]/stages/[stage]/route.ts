import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { saveStage } from '@/lib/mortgage-plans';
import { isPlanStage } from '@/lib/mortgage-plan';

interface RouteContext {
  params: Promise<{ id: string; stage: string }>;
}

/**
 * שמירת נתוני שלב. עם `complete` השלב נסגר והתהליך עובר לשלב הבא — אלא אם
 * חסרים נתונים שהשלבים הבאים נשענים עליהם, ואז השמירה מתבצעת בלי הסגירה.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, stage } = await params;
  if (!isPlanStage(stage)) return NextResponse.json({ error: 'Unknown stage' }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const result = await saveStage({
    userId,
    planId: id,
    stage,
    data: body.data,
    complete: body.complete === true,
  });

  if (result.blocked) {
    return NextResponse.json({ error: 'Stage incomplete', plan: result.plan }, { status: 409 });
  }
  if (!result.ok || !result.plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(result.plan);
}
