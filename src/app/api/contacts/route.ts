import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { resolveConversationAccess } from '@/lib/conversation-store';
import { listContacts, saveContact } from '@/lib/contacts-store';

/** אנשי הקשר של הלקוח. יועץ שולח `?clientUserId=` */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveConversationAccess(session.user, req.nextUrl.searchParams.get('clientUserId'));
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await listContacts(access));
}

/** איש קשר חדש: `{ role, name?, email?, phone?, bank? }` — מייל או טלפון */
export async function POST(req: NextRequest) {
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

  const result = await saveContact(access, {
    role: body?.role,
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    bank: body?.bank,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.contact, { status: 201 });
}
