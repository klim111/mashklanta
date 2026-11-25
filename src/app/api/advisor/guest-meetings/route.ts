import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createGuestMeeting, listGuestMeetings } from '@/lib/guest-meetings';

async function advisorId(): Promise<string | NextResponse> {
  const session = await getServerAuth();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return id;
}

/** הפגישות בלינק חד-פעמי של היועץ (src/lib/guest-meetings.ts) — ללוח השנה */
export async function GET() {
  const id = await advisorId();
  if (typeof id !== 'string') return id;
  return NextResponse.json(await listGuestMeetings(id));
}

/** קביעת פגישה בלינק חד-פעמי. הלינק תקף מהמועד ועוד תשעים דקות */
export async function POST(req: NextRequest) {
  const id = await advisorId();
  if (typeof id !== 'string') return id;

  const body = await req.json().catch(() => null);
  const startsAt = typeof body?.startsAt === 'string' ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'נדרשים תאריך ושעה לפגישה' }, { status: 400 });
  }
  const text = (key: string, max: number) =>
    typeof body?.[key] === 'string' && body[key].trim() ? (body[key] as string).trim().slice(0, max) : null;

  const meeting = await createGuestMeeting({
    advisorId: id,
    title: text('title', 120) ?? 'פגישת היכרות',
    guestName: text('guestName', 120),
    startsAt,
    note: text('note', 1000),
  });
  return NextResponse.json(meeting, { status: 201 });
}
