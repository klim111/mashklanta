import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { answerMeetingAs, deleteMeeting, updateMeeting } from '@/lib/advisor';
import type { MeetingAnswer, MeetingParty } from '@/lib/advisor-crm';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * התשובה שבגוף הבקשה: `action` של accept / propose (עם startsAt) / decline.
 * `accepted` בוליאני נשאר לתאימות עם גרסאות קודמות של המסך.
 */
function readAnswer(body: Record<string, unknown> | null): MeetingAnswer | null {
  if (!body) return null;
  if (body.action === 'accept') return { action: 'accept' };
  if (body.action === 'decline') return { action: 'decline' };
  if (body.action === 'propose') {
    const startsAt = typeof body.startsAt === 'string' ? new Date(body.startsAt) : null;
    return startsAt && !Number.isNaN(startsAt.getTime()) ? { action: 'propose', startsAt } : null;
  }
  if (typeof body.accepted === 'boolean') return { action: body.accepted ? 'accept' : 'decline' };
  return null;
}

async function answer(party: MeetingParty, userId: string, id: string, input: MeetingAnswer) {
  const answered = await answerMeetingAs(party, userId, id, input);
  if (!answered) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (answered === 'invalid') {
    return NextResponse.json({ error: 'הפגישה כבר לא ממתינה לתשובה שלכם' }, { status: 409 });
  }
  return NextResponse.json(answered);
}

/**
 * שינוי בפגישה.
 *
 * שני הצדדים עונים באותה דרך: הצד שההצעה ממתינה לו יכול לאשר, וכל צד יכול
 * להציע מועד אחר — ואז הפגישה עוברת לאישור הצד השני, עד שמישהו מאשר. היועץ
 * יכול בנוסף לשנות פרטים או לבטל.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const reply = readAnswer(body);

  if (session?.user?.role !== 'ADVISOR') {
    if (!reply) return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
    return answer('CLIENT', userId, id, reply);
  }

  if (body?.action !== undefined) {
    if (!reply) return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
    return answer('ADVISOR', userId, id, reply);
  }

  const startsAt = typeof body?.startsAt === 'string' ? new Date(body.startsAt) : null;
  const duration = Number(body?.durationMinutes);

  const meeting = await updateMeeting(userId, id, {
    ...(typeof body?.title === 'string' && body.title.trim() ? { title: body.title.trim() } : {}),
    ...(startsAt && !Number.isNaN(startsAt.getTime()) ? { startsAt } : {}),
    ...(Number.isFinite(duration) && duration > 0 ? { durationMinutes: Math.round(duration) } : {}),
    ...(typeof body?.location === 'string' ? { location: body.location.trim() || null } : {}),
    ...(typeof body?.note === 'string' ? { note: body.note.trim() || null } : {}),
    ...(body?.status === 'CANCELLED' ? { status: 'CANCELLED' as const } : {}),
  });

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const removed = await deleteMeeting(advisorId, id);
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
