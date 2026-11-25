import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { removeConversationRecipient, resolveConversationAccess } from '@/lib/conversation-store';

interface RouteContext {
  params: Promise<{ recipientId: string }>;
}

/** הסרת נמען שנוסף ידנית */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { recipientId } = await params;
  if (!(await removeConversationRecipient(access, recipientId))) {
    return NextResponse.json({ error: 'הנמען לא נמצא' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
