import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { liveKitConfig } from '@/lib/meeting-call';
import { advisorGuestToken, guestMeetingForAdvisor } from '@/lib/guest-meetings';
import type { MeetingCallDetails } from '@/components/meeting-call/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function load(id: string) {
  const session = await getServerAuth();
  const advisorId = session?.user?.role === 'ADVISOR' ? session.user.id : null;
  if (!advisorId) return null;
  const found = await guestMeetingForAdvisor(advisorId, id);
  return found ? { advisorId, ...found } : null;
}

function detailsOf(found: NonNullable<Awaited<ReturnType<typeof load>>>): MeetingCallDetails {
  const { view } = found;
  return {
    kind: 'guest',
    meetingId: view.id,
    title: view.title,
    startsAt: view.startsAt,
    durationMinutes: view.durationMinutes,
    status: view.state === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
    role: 'ADVISOR',
    advisorName: found.advisorName,
    clientName: view.guestName || 'האורח',
    clientId: view.clientId ?? '',
    clientUserId: '',
    planId: null,
    configured: Boolean(liveKitConfig()),
    endsAt: view.endsAt,
    guestState: view.state,
    linkPath: view.linkPath,
    prospectClientId: view.clientId,
  };
}

/** פרטי פגישת האורח למסך השיחה של היועץ */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const found = await load(id);
  if (!found) return NextResponse.json({ error: 'הפגישה לא נמצאה' }, { status: 404 });
  return NextResponse.json(detailsOf(found));
}

/** כניסת היועץ לשיחה — כל עוד הפגישה לא בוטלה והלינק לא פג */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const found = await load(id);
  if (!found) return NextResponse.json({ error: 'הפגישה לא נמצאה' }, { status: 404 });
  if (found.view.state === 'cancelled') return NextResponse.json({ error: 'הפגישה בוטלה' }, { status: 409 });
  if (found.view.state === 'expired') return NextResponse.json({ error: 'הלינק של הפגישה פג' }, { status: 409 });
  const config = liveKitConfig();
  if (!config) {
    return NextResponse.json({ error: 'שיחות הווידאו עוד לא הוגדרו. חסרים משתני LIVEKIT בסביבה.' }, { status: 503 });
  }
  const token = await advisorGuestToken(found.advisorId, found.view, found.advisorName, config);
  return NextResponse.json({ token, serverUrl: config.url });
}
