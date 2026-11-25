import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { authorizationLettersFor, sendAuthorizationRequest } from '@/lib/authorization-letter-store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function advisorId(): Promise<string | NextResponse> {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return userId;
}

/** כתבי ההסמכה החתומים של הלקוח, ומצב הבקשה שנשלחה אליו */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const advisor = await advisorId();
  if (advisor instanceof NextResponse) return advisor;

  const { id } = await params;
  const view = await authorizationLettersFor(advisor, id);
  if (!view) return NextResponse.json({ error: 'הלקוח לא נמצא' }, { status: 404 });
  return NextResponse.json(view);
}

/** שליחת המשימה "כתבי הסמכה ליועץ" ללקוח */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const advisor = await advisorId();
  if (advisor instanceof NextResponse) return advisor;

  const { id } = await params;
  const result = await sendAuthorizationRequest(advisor, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(
    { request: result.request, alreadyOpen: result.alreadyOpen },
    { status: result.alreadyOpen ? 200 : 201 }
  );
}
