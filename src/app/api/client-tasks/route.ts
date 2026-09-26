import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createClientTask, listClientTasks } from '@/lib/client-task-store';
import { isClientTaskKind } from '@/lib/client-tasks';
import { isPlanStage } from '@/lib/mortgage-plan';

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function readDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** המשימות של הלקוח המחובר. `planId` מסנן לתהליך, `all=1` מביא גם את שבוצעו */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  return NextResponse.json(
    await listClientTasks(userId, {
      planId: params.get('planId') ?? undefined,
      includeDone: params.get('all') === '1',
    })
  );
}

/** הוספת משימה מתוכננת — מתוך שלב או מלוח השנה */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = clean(body?.title, 200);
  const kind = isClientTaskKind(body?.kind) ? body.kind : 'TASK';
  if (title.length < 2) return NextResponse.json({ error: 'נדרשת כותרת למשימה' }, { status: 400 });

  const dueAt = readDate(body?.dueAt);
  if (kind === 'MEETING' && !dueAt) {
    return NextResponse.json({ error: 'לפגישה נדרשים תאריך ושעה' }, { status: 400 });
  }

  const task = await createClientTask(userId, {
    planId: typeof body?.planId === 'string' && body.planId ? body.planId : null,
    stage: isPlanStage(body?.stage) ? body.stage : null,
    kind,
    templateKey: clean(body?.templateKey, 60) || null,
    title,
    details: clean(body?.details, 2000) || null,
    bank: clean(body?.bank, 40) || null,
    dueAt,
    documentId: clean(body?.documentId, 60) || null,
  });
  if (!task) return NextResponse.json({ error: 'התהליך לא נמצא' }, { status: 404 });
  return NextResponse.json(task, { status: 201 });
}
