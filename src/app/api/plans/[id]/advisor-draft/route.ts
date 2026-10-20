import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { isPlanStage } from '@/lib/mortgage-plan';
import { parseDraft } from '@/lib/advisor-draft';
import { advisedPlan, broadcastDraft, loadDrafts, saveDraft } from '@/lib/advisor-draft-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * טיוטות היועץ בתהליך של לקוח (src/lib/advisor-draft.ts). פתוח ליועץ המלווה
 * בלבד — הלקוח אינו רואה טיוטה עד שהיא משודרת.
 */
async function advisorOf(planId: string) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId || session?.user?.role !== 'ADVISOR') return null;
  return (await advisedPlan(userId, planId)) ? userId : null;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!(await advisorOf(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await loadDrafts(id), { headers: { 'Cache-Control': 'no-store' } });
}

/** שמירת הטיוטה של שלב. טיוטה ריקה מוחקת אותה — "בטל שינויים" */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!(await advisorOf(id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!isPlanStage(body?.stage)) return NextResponse.json({ error: 'Unknown stage' }, { status: 400 });
  await saveDraft(id, body.stage, parseDraft(body.draft));
  return NextResponse.json({ ok: true });
}

/** "שדר": הטיוטה של השלב עוברת ללקוח */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const advisorId = await advisorOf(id);
  if (!advisorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!isPlanStage(body?.stage)) return NextResponse.json({ error: 'Unknown stage' }, { status: 400 });
  // טיוטה שהדפדפן עוד לא הספיק לשמור נשמרת לפני השידור
  if (body.draft !== undefined) await saveDraft(id, body.stage, parseDraft(body.draft));

  const plan = await broadcastDraft(advisorId, id, body.stage);
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(plan);
}
