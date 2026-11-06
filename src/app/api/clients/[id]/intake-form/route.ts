import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { publicSiteOrigin } from '@/lib/auth-url';
import { intakeFormUrl, intakeStatus, requestIntake } from '@/lib/principal-approval/intake';

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

/** מצב טופס פרטי הלקוח: הופק קישור? הלקוח שידר? */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const advisor = await advisorId();
  if (advisor instanceof NextResponse) return advisor;

  const { id } = await params;
  const status = await intakeStatus(advisor, id);
  if (!status) return NextResponse.json({ error: 'הלקוח לא נמצא' }, { status: 404 });
  return NextResponse.json({ ...status, url: intakeFormUrl(publicSiteOrigin(req.nextUrl.origin)) });
}

/** הפקת הקישור לטופס ללקוח. `{ email: true }` שולח אותו גם במייל ללקוח */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const advisor = await advisorId();
  if (advisor instanceof NextResponse) return advisor;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const result = await requestIntake(advisor, id, {
    origin: publicSiteOrigin(req.nextUrl.origin),
    email: body?.email === true,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ...result.status, url: result.url, emailed: result.emailed });
}
