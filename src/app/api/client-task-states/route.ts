import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * המועדים והסימונים שהלקוח קבע למשימות ולהמלצות שלו.
 *
 * המשימות עצמן נגזרות בצד הלקוח מהתהליכים, הפגישות והבקשות; כאן נשמר רק מה
 * שהלקוח קבע בעצמו — מתי לבצע, והאם סימן שביצע — לפי מפתח המשימה.
 */

export interface ClientTaskStateView {
  key: string;
  due: string | null;
  done: boolean;
}

function toView(row: { key: string; dueAt: Date | null; doneAt: Date | null }): ClientTaskStateView {
  return {
    key: row.key,
    due: row.dueAt ? row.dueAt.toISOString() : null,
    done: row.doneAt !== null,
  };
}

export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.clientTaskState.findMany({
    where: { userId },
    select: { key: true, dueAt: true, doneAt: true },
  });

  return NextResponse.json(rows.map(toView));
}

export async function PATCH(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const key = body && typeof body.key === 'string' ? body.key.trim() : '';
  if (!key) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  /** `due` ו-`done` אופציונליים: מה שלא נשלח נשאר כפי שהוא */
  const patch: { dueAt?: Date | null; doneAt?: Date | null } = {};

  if ('due' in body) {
    if (body.due === null) {
      patch.dueAt = null;
    } else if (typeof body.due === 'string') {
      const parsed = new Date(body.due);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      patch.dueAt = parsed;
    }
  }

  if ('done' in body) {
    patch.doneAt = body.done ? new Date() : null;
  }

  const row = await prisma.clientTaskState.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, dueAt: patch.dueAt ?? null, doneAt: patch.doneAt ?? null },
    update: patch,
    select: { key: true, dueAt: true, doneAt: true },
  });

  return NextResponse.json(toView(row));
}
