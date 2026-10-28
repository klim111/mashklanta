import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { setPlanAdvisoryEnded } from '@/lib/advisor-order-store';

interface RouteContext {
  params: Promise<{ planId: string }>;
}

/**
 * סיום הליווי בתהליך (`ended: true`), או ביטול הסיום (`ended: false`).
 *
 * עד הסיום ללקוח פתוחים כל הכלים בתהליך. בסיום הוא מקבל מייל עם הצעה להמשיך
 * לבד במחיר החודשי, ואותה הצעה מוצגת לו בפלטפורמה.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { planId } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.ended !== 'boolean') {
    return NextResponse.json({ error: 'נדרש ended' }, { status: 400 });
  }

  const result = await setPlanAdvisoryEnded(advisorId, planId, body.ended);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result);
}
