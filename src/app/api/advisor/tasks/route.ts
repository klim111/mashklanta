import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createAdvisorTask, listAdvisorTasks } from '@/lib/advisor';
import { asPlanStage } from '@/lib/advisor-crm';

/** תאריך ושעה שהגיעו מהדפדפן, או null כשאין מועד */
function readDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * מזהה הלקוח שהתבקש בסינון. `none` מבקש את המשימות שאינן משויכות ללקוח,
 * וערך ריק פירושו בלי סינון בכלל.
 */
function readClientFilter(value: string | null): string | null | undefined {
  if (!value) return undefined;
  return value === 'none' ? null : value;
}

/**
 * המשימות של היועץ. בלי פרמטרים מוחזרות רק המשימות הפתוחות — זה מה שסדר היום
 * צריך — ועם `all=1` מוחזרות גם אלה שנסגרו, לתצוגת ההיסטוריה של הלקוח.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const stage = asPlanStage(params.get('stage'));

  return NextResponse.json(
    await listAdvisorTasks(advisorId, {
      clientId: readClientFilter(params.get('clientId')),
      stage: stage ?? undefined,
      includeClosed: params.get('all') === '1',
    })
  );
}

/**
 * פתיחת משימה חדשה בשלב מסוים ועם מועד לביצוע. שיוך ללקוח הוא רשות: משימה בלי
 * לקוח היא משימה של היועץ עצמו, והיא מופיעה בלוח השנה ובסדר היום כמו כל אחרת.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const clientId = typeof body?.clientId === 'string' && body.clientId ? body.clientId : null;
  const stage = asPlanStage(body?.stage);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';

  if (!stage || !title) {
    return NextResponse.json({ error: 'נדרשים שלב וכותרת למשימה' }, { status: 400 });
  }

  const task = await createAdvisorTask({
    advisorId,
    clientId,
    stage,
    title,
    details: typeof body?.details === 'string' && body.details.trim() ? body.details.trim() : null,
    dueDate: readDate(body?.dueDate),
  });

  if (!task) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(task, { status: 201 });
}
