import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { cancelGuestMeeting, linkGuestMeetingClient } from '@/lib/guest-meetings';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function advisorId(): Promise<string | null> {
  const session = await getServerAuth();
  return session?.user?.role === 'ADVISOR' && session.user.id ? session.user.id : null;
}

/** ביטול הפגישה — הלינק מפסיק לעבוד מיד */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const advisor = await advisorId();
  if (!advisor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!(await cancelGuestMeeting(advisor, id))) return NextResponse.json({ error: 'הפגישה לא נמצאה' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** שיוך תיק הלקוח שנפתח לאורח במהלך הפגישה */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const advisor = await advisorId();
  if (!advisor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const clientId = typeof body?.clientId === 'string' ? body.clientId : '';
  if (!clientId || !(await linkGuestMeetingClient(advisor, id, clientId))) {
    return NextResponse.json({ error: 'הפגישה או התיק לא נמצאו' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
