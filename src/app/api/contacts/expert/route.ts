import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createLead } from '@/lib/advisor-leads';
import { EXPERT_JOIN_TOPIC } from '@/lib/contacts-store';
import { cleanSourcePath } from '@/lib/page-labels';

/**
 * "צרפו מומחה משכלנתא לתהליך" מטאב אנשי הקשר: פנייה ליועץ בשם הלקוח, עם
 * השלב שבו הוא נמצא בתהליך. בקשה פתוחה אחת בכל פעם.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = await rateLimit(`contacts-expert:${userId}`, { limit: 5, windowSeconds: 3600 });
  if (!limit.allowed) return NextResponse.json({ error: 'נשלחו יותר מדי פניות. נסו שוב מאוחר יותר' }, { status: 429 });

  const open = await prisma.advisorLead.findFirst({
    where: { ownerId: userId, topic: EXPERT_JOIN_TOPIC, status: 'OPEN' },
    select: { createdAt: true },
  });
  if (open) return NextResponse.json({ requestedAt: open.createdAt.toISOString() });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const body = await req.json().catch(() => null);
  const lead = await createLead(userId, {
    topic: 'EXPERT_JOIN',
    name: user?.name?.trim() || user?.email || 'לקוח',
    email: user?.email ?? '',
    phone: typeof body?.phone === 'string' ? body.phone.trim().slice(0, 30) : '',
    notes: typeof body?.notes === 'string' ? body.notes.trim().slice(0, 2000) : undefined,
    requestKind: 'GUIDANCE',
    sourcePath: cleanSourcePath(body?.sourcePath) ?? '/dashboard',
  });
  if (!lead) return NextResponse.json({ error: 'הפנייה לא נשלחה' }, { status: 400 });
  return NextResponse.json({ requestedAt: lead.createdAt }, { status: 201 });
}
