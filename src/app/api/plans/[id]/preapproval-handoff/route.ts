import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import {
  advisorHandoffView,
  handBankToAdvisor,
  isPreApprovalBank,
  setHandoffMeeting,
  updateHandoffBank,
} from '@/lib/preapproval-handoff-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * הגשה לבנק דרך יועץ משכלנתא, בשלב האישור העקרוני.
 *
 * POST — הלקוח מעביר בנק ליועץ. GET ו-PATCH — היועץ רואה את הבנקים שהועברו
 * אליו, קובע מועד לפגישה להשלמת הפרטים, ומזין את הבנקאי והאישור העקרוני.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role === 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!isPreApprovalBank(body?.bank)) {
    return NextResponse.json({ error: 'בנק לא מוכר' }, { status: 400 });
  }

  const result = await handBankToAdvisor(userId, id, body.bank);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result);
}

async function advisorSession() {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session?.user?.role !== 'ADVISOR') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { advisorId };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await advisorSession();
  if (auth.error) return auth.error;

  const { id } = await params;
  const view = await advisorHandoffView(auth.advisorId, id);
  if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(view);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await advisorSession();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // מועד הפגישה להשלמת הפרטים
  if (typeof body.meetingAt === 'string') {
    const startsAt = new Date(body.meetingAt);
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: 'מועד הפגישה אינו תקין' }, { status: 400 });
    }
    const meeting = await setHandoffMeeting(auth.advisorId, id, startsAt);
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const view = await advisorHandoffView(auth.advisorId, id);
    return NextResponse.json(view);
  }

  if (!isPreApprovalBank(body.bank)) {
    return NextResponse.json({ error: 'בנק לא מוכר' }, { status: 400 });
  }
  const result = await updateHandoffBank(auth.advisorId, id, {
    bank: body.bank,
    ...(typeof body.bankerName === 'string' ? { bankerName: body.bankerName } : {}),
    ...(typeof body.bankerEmail === 'string' ? { bankerEmail: body.bankerEmail } : {}),
    ...(body.approvedAt === null || typeof body.approvedAt === 'string' ? { approvedAt: body.approvedAt } : {}),
  });

  if (result === 'not-found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (result === 'invalid-email') {
    return NextResponse.json({ error: 'כתובת המייל של הבנקאי אינה תקינה' }, { status: 400 });
  }
  if (result === 'invalid-date') {
    return NextResponse.json({ error: 'תאריך האישור אינו תקין' }, { status: 400 });
  }
  if (result === 'not-handed') {
    return NextResponse.json({ error: 'הלקוח לא העביר את ההגשה לבנק הזה' }, { status: 409 });
  }
  return NextResponse.json(result);
}
