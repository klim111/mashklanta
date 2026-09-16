import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { setGuidanceStatus } from '@/lib/guidance-requests';
import { isGuidanceStatus } from '@/lib/service-flow';

/** עדכון סטטוס הבקשה — "יצרתי קשר" או "טופלה" */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!isGuidanceStatus(body?.status)) {
    return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 });
  }

  const updated = await setGuidanceStatus(advisorId, id, body.status);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
