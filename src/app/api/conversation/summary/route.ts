import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { conversationSummary, resolveConversationAccess } from '@/lib/conversation-store';

/** כמה הודעות ומיילים ממתינים — למספר שעל כפתור הצ'אט, בלי לסמן אותם כנקראו */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await conversationSummary(access));
}
