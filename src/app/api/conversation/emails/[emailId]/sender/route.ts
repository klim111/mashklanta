import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { resolveConversationAccess, reviewHeldSender } from '@/lib/conversation-store';

interface RouteContext {
  params: Promise<{ emailId: string }>;
}

/**
 * הלקוח מאשר או מוחק שולח לא מוכר, מתוך מייל שממתין לאישור:
 * `{ decision: 'approve' | 'reject' }`.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, null);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: 'decision must be approve or reject' }, { status: 400 });
  }
  const { emailId } = await params;
  const result = await reviewHeldSender(access, emailId, decision === 'approve');
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
