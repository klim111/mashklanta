import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { deleteMeeting, respondToMeeting, updateMeeting } from '@/lib/advisor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * שינוי בפגישה.
 *
 * הלקוח יכול רק לענות להצעה — לאשר או לדחות; היועץ יכול לשנות מועד, פרטים או
 * לבטל. שינוי מועד מחזיר את הפגישה להמתנה לאישור, כי הלקוח אישר מועד אחר.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (session?.user?.role !== 'ADVISOR') {
    if (typeof body?.accepted !== 'boolean') {
      return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
    }
    const answered = await respondToMeeting(userId, id, body.accepted);
    if (!answered) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(answered);
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
