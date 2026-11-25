import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { addConversationRecipient, resolveConversationAccess } from '@/lib/conversation-store';

/** נמען חדש לשיחה: `{ email, name, role, bank? }` */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const access = await resolveConversationAccess(
    session.user,
    typeof body?.clientUserId === 'string' ? body.clientUserId : null
  );
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = await rateLimit(`conversation-recipient:${access.viewerId}`, { limit: 20, windowSeconds: 3600 });
  if (!limit.allowed) return NextResponse.json({ error: 'יותר מדי נמענים חדשים. נסו שוב מאוחר יותר' }, { status: 429 });

  const result = await addConversationRecipient(access, {
    email: body?.email,
    name: body?.name,
    role: body?.role,
    bank: body?.bank,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.contact, { status: 201 });
}
