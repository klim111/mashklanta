import { NextRequest, NextResponse } from 'next/server';
import { approveAdvisorApplication, rejectAdvisorApplication } from '@/lib/advisor-applications';
import { requirePlatformAdmin } from '@/lib/platform-admin';

type RouteContext = { params: Promise<{ id: string }> };

/** אישור או דחייה של בקשת הצטרפות: { action: 'approve' | 'reject', note? } */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requirePlatformAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const result =
    body?.action === 'approve'
      ? await approveAdvisorApplication(id, auth.advisorId)
      : body?.action === 'reject'
        ? await rejectAdvisorApplication(id, auth.advisorId, body?.note)
        : { ok: false as const, status: 400, error: 'פעולה לא מוכרת' };
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
