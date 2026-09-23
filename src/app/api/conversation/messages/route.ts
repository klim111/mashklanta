import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { listChatMessages, postChatMessage, resolveConversationAccess } from '@/lib/conversation-store';

/**
 * הצ'אט בין הלקוח ליועץ. לקוח מקבל תמיד את השיחה שלו; יועץ מציין את הלקוח
 * ב-`clientUserId`, והגישה נבדקת מול הלקוחות שהוא מלווה.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await listChatMessages(access));
}

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const access = await resolveConversationAccess(
    session.user,
    typeof body?.clientUserId === 'string' ? body.clientUserId : null
  );
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = await rateLimit(`chat:${access.viewerId}`, { limit: 30, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'נשלחו הרבה הודעות ברצף. נסו שוב בעוד רגע' },
      { status: 429, headers: { 'Retry-After': String(limit.resetInSeconds) } }
    );
  }

  const message = await postChatMessage(access, body?.body);
  if (!message) return NextResponse.json({ error: 'ההודעה ריקה' }, { status: 400 });
  return NextResponse.json(message, { status: 201 });
}
