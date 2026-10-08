import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { removeConversationRecipient, resolveConversationAccess } from '@/lib/conversation-store';
import { saveContact } from '@/lib/contacts-store';

type RouteContext = { params: Promise<{ contactId: string }> };

/** עדכון איש קשר */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const access = await resolveConversationAccess(
    session.user,
    typeof body?.clientUserId === 'string' ? body.clientUserId : null
  );
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = await rateLimit(`contacts:${access.viewerId}`, { limit: 40, windowSeconds: 3600 });
  if (!limit.allowed) return NextResponse.json({ error: 'יותר מדי שינויים. נסו שוב מאוחר יותר' }, { status: 429 });

  const { contactId } = await params;
  const result = await saveContact(
    access,
    { role: body?.role, name: body?.name, email: body?.email, phone: body?.phone, bank: body?.bank },
    contactId
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.contact);
}

/** מחיקת איש קשר */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { contactId } = await params;
  if (!(await removeConversationRecipient(access, contactId))) {
    return NextResponse.json({ error: 'איש הקשר לא נמצא' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
