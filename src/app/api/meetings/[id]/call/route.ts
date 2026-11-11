import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { liveKitConfig, meetingCallInfo, meetingCallOpen, meetingCallToken } from '@/lib/meeting-call';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** פרטי הפגישה למסך השיחה — בלי אסימון, כדי שאפשר יהיה להציג אותם לפני הכניסה */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const info = await meetingCallInfo(userId, id);
  if (!info) return NextResponse.json({ error: 'הפגישה לא נמצאה' }, { status: 404 });
  return NextResponse.json({ ...info, configured: Boolean(liveKitConfig()) });
}

/** כניסה לשיחה: אסימון לחדר של הפגישה, רק לשני הצדדים שלה */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const info = await meetingCallInfo(userId, id);
  if (!info) return NextResponse.json({ error: 'הפגישה לא נמצאה' }, { status: 404 });
  if (!meetingCallOpen(info)) {
    return NextResponse.json({ error: 'הפגישה בוטלה, ולכן אי אפשר להיכנס לשיחה' }, { status: 409 });
  }

  const config = liveKitConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'שיחות הווידאו עוד לא הוגדרו. חסרים משתני LIVEKIT בסביבה.' },
      { status: 503 }
    );
  }

  const token = await meetingCallToken(info, userId, config);
  return NextResponse.json({ token, serverUrl: config.url });
}
