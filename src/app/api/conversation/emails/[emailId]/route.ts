import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { deleteEmailForever, resolveConversationAccess, setEmailArchived } from '@/lib/conversation-store';

interface RouteContext {
  params: Promise<{ emailId: string }>;
}

/** מחיקה מהפיד לארכיון, או החזרה מהארכיון: `{ archived: boolean }` */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const access = await resolveConversationAccess(
    session.user,
    typeof body?.clientUserId === 'string' ? body.clientUserId : null
  );
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (typeof body?.archived !== 'boolean') return NextResponse.json({ error: 'archived must be boolean' }, { status: 400 });

  const { emailId } = await params;
  const result = await setEmailArchived(access, emailId, body.archived);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

/** מחיקה לגמרי מהארכיון (לקוח בלבד). `?backup=1` שולח קודם עותק לתיבה הפרטית */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, null);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const backup = req.nextUrl.searchParams.get('backup') === '1';
  if (backup) {
    const limit = await rateLimit(`conversation-backup:${access.viewerId}`, { limit: 30, windowSeconds: 3600 });
    if (!limit.allowed) return NextResponse.json({ error: 'יותר מדי גיבויים. נסו שוב מאוחר יותר' }, { status: 429 });
  }
  const { emailId } = await params;
  const result = await deleteEmailForever(access, emailId, backup);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
