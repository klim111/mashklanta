import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { deleteAdvisorTask, updateAdvisorTask } from '@/lib/advisor';
import { ADVISOR_TASK_STATUSES, asPlanStage } from '@/lib/advisor-crm';
import type { AdvisorTaskStatus } from '@/lib/advisor-crm';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isStatus(value: unknown): value is AdvisorTaskStatus {
  return typeof value === 'string' && (ADVISOR_TASK_STATUSES as readonly string[]).includes(value);
}

/**
 * ערך תאריך שהתקבל מהדפדפן: מועד חדש, null מפורש לניקוי המועד, או כלום —
 * כלומר "אל תיגע במועד הקיים".
 */
function readDateInput(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** עדכון משימה: כותרת, פירוט, מועד, שלב או סטטוס */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const stage = asPlanStage(body.stage);
  const dueDate = readDateInput(body.dueDate);

  const task = await updateAdvisorTask(advisorId, id, {
    ...(typeof body.title === 'string' && body.title.trim() ? { title: body.title.trim() } : {}),
    ...(typeof body.details === 'string' ? { details: body.details.trim() || null } : {}),
    ...(dueDate === undefined ? {} : { dueDate }),
    ...(stage ? { stage } : {}),
    ...(isStatus(body.status) ? { status: body.status } : {}),
  });

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const removed = await deleteAdvisorTask(advisorId, id);
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
