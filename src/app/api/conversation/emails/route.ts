import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import {
  conversationContacts,
  listConversationEmails,
  resolveConversationAccess,
  sendConversationEmail,
} from '@/lib/conversation-store';

/** טאב המיילים: המיילים של השיחה, והנמענים שמותר לשלוח אליהם */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [emails, contacts] = await Promise.all([
    listConversationEmails(access),
    conversationContacts(access.clientUserId),
  ]);
  return NextResponse.json({ emails, contacts });
}

/** שליחת מייל מהשיחה — לבנקאי, ליועץ או ללקוח בלבד */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const access = await resolveConversationAccess(
    session.user,
    typeof body?.clientUserId === 'string' ? body.clientUserId : null
  );
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = await rateLimit(`conversation-email:${access.viewerId}`, { limit: 20, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'הגעתם למספר המיילים המרבי לשעה. נסו שוב מאוחר יותר' },
      { status: 429, headers: { 'Retry-After': String(limit.resetInSeconds) } }
    );
  }

  const result = await sendConversationEmail(access, {
    to: body?.to,
    subject: body?.subject,
    text: body?.text,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.email, { status: 201 });
}
