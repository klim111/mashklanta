import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createMeeting, listAdvisorMeetings, listMeetingsForUser } from '@/lib/advisor';
import { asPlanStage } from '@/lib/advisor-crm';

/**
 * הפגישות של המשתמש המחובר: ליועץ — כל הפגישות שקבע עם לקוחותיו; ללקוח —
 * הפגישות שהיועץ שלו הציע לו. שני הצדדים רואים את אותה רשומה, ולכן אישור
 * הלקוח מופיע מיד בלוח השנה של היועץ.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json(await listMeetingsForUser(userId));
  }

  const clientId = req.nextUrl.searchParams.get('clientId');
  return NextResponse.json(
    await listAdvisorMeetings(userId, { clientId: clientId ?? undefined })
  );
}

/** שליחת הצעת פגישה ללקוח. הפגישה נכנסת ללוח השנה כמתוכננת עד שהלקוח יאשר */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const clientId = typeof body?.clientId === 'string' ? body.clientId : '';
  const startsAt = typeof body?.startsAt === 'string' ? new Date(body.startsAt) : null;

  if (!clientId || !startsAt || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'נדרשים לקוח, תאריך ושעה לפגישה' }, { status: 400 });
  }

  const duration = Number(body?.durationMinutes);

  const meeting = await createMeeting({
    advisorId,
    clientId,
    stage: asPlanStage(body?.stage),
    title: typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'פגישת ייעוץ',
    startsAt,
    durationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 45,
    location: typeof body?.location === 'string' && body.location.trim() ? body.location.trim() : null,
    note: typeof body?.note === 'string' && body.note.trim() ? body.note.trim() : null,
  });

  if (!meeting) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(meeting, { status: 201 });
}
