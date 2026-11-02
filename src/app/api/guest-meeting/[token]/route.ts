import { NextRequest, NextResponse } from 'next/server';
import { liveKitConfig } from '@/lib/meeting-call';
import { guestJoinToken, guestMeetingByToken } from '@/lib/guest-meetings';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * הלינק החד-פעמי של פגישת אורח (src/lib/guest-meetings.ts) — פתוח בלי
 * התחברות; הלינק עצמו הוא ההרשאה, ורק בחלון הזמן של הפגישה.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = await rateLimit(`guest-meeting:info:${getClientIp(req)}`, { limit: 60, windowSeconds: 600 });
  if (!limited.allowed) return NextResponse.json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' }, { status: 429 });
  const { token } = await params;
  const meeting = await guestMeetingByToken(token, Boolean(liveKitConfig()));
  if (!meeting) return NextResponse.json({ error: 'הלינק אינו תקין' }, { status: 404 });
  return NextResponse.json(meeting, { headers: { 'Cache-Control': 'no-store' } });
}

/** כניסת האורח לשיחה, עם השם שהקליד */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = await rateLimit(`guest-meeting:join:${getClientIp(req)}`, { limit: 20, windowSeconds: 600 });
  if (!limited.allowed) return NextResponse.json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' }, { status: 429 });
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
  if (!name) return NextResponse.json({ error: 'כתבו את השם שלכם' }, { status: 400 });

  const config = liveKitConfig();
  if (!config) return NextResponse.json({ error: 'שיחות הווידאו עוד לא הוגדרו באתר' }, { status: 503 });

  const result = await guestJoinToken(token, name, config);
  if (!result) return NextResponse.json({ error: 'הלינק אינו תקין' }, { status: 404 });
  if (!result.token) {
    const message =
      result.state === 'early'
        ? 'הפגישה עוד לא התחילה'
        : result.state === 'cancelled'
          ? 'הפגישה בוטלה'
          : 'הלינק של הפגישה פג';
    return NextResponse.json({ error: message, state: result.state }, { status: 409 });
  }
  return NextResponse.json({ token: result.token, serverUrl: config.url });
}
