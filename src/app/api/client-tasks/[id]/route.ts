import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { deleteClientTask, updateClientTask } from '@/lib/client-task-store';
import { isClientTaskStatus } from '@/lib/client-tasks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** עדכון משימה: סימון כבוצעה, שינוי מועד או כותרת, קישור למסמך שהועלה */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const dueAt =
    body?.dueAt === null
      ? null
      : typeof body?.dueAt === 'string' && !Number.isNaN(new Date(body.dueAt).getTime())
        ? new Date(body.dueAt)
        : undefined;

  const task = await updateClientTask(userId, id, {
    status: isClientTaskStatus(body?.status) ? body.status : undefined,
    title: typeof body?.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : undefined,
    details: typeof body?.details === 'string' ? body.details.trim().slice(0, 2000) || null : undefined,
    dueAt,
    documentId:
      typeof body?.documentId === 'string' ? body.documentId : body?.documentId === null ? null : undefined,
  });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const removed = await deleteClientTask(userId, id);
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
