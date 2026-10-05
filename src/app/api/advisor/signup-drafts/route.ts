import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuth } from '@/lib/auth';
import { buildUnfinishedSignups } from '@/lib/site-analytics';

async function requireAdvisor() {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

/**
 * "הרשמות שלא הושלמו": מי שהתחיל להקליד פרטים בטופס ההרשמה ועזב, ומי ששלח
 * הרשמה ולא אישר את המייל — עם מה שהספקנו לשמור, ועד איפה הגיע.
 */
export async function GET() {
  const denied = await requireAdvisor();
  if (denied) return denied;

  const [drafts, pendings] = await Promise.all([
    prisma.signupDraft.findMany({ orderBy: { updatedAt: 'desc' }, take: 1000 }),
    prisma.pendingRegistration.findMany({
      orderBy: { lastSentAt: 'desc' },
      take: 1000,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        provider: true,
        expires: true,
        sendCount: true,
        createdAt: true,
        lastSentAt: true,
      },
    }),
  ]);

  const emails = [
    ...new Set(
      [...drafts.map((draft) => draft.email), ...pendings.map((pending) => pending.email)]
        .filter((email): email is string => Boolean(email))
        .map((email) => email.toLowerCase())
    ),
  ];
  const registered = emails.length
    ? await prisma.user.findMany({
        where: { OR: emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })) },
        select: { email: true },
      })
    : [];

  const visitorIds = [...new Set(drafts.map((draft) => draft.visitorId).filter((id): id is string => Boolean(id)))];
  const visitRows = visitorIds.length
    ? await prisma.siteVisit.groupBy({
        by: ['visitorId', 'sessionId'],
        where: { visitorId: { in: visitorIds } },
        _count: { _all: true },
      })
    : [];
  const signedIn = visitorIds.length
    ? await prisma.siteVisit.findMany({
        where: { visitorId: { in: visitorIds }, userId: { not: null } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      })
    : [];
  const visits = new Map<string, { pageViews: number; sessions: number }>();
  for (const row of visitRows) {
    const entry = visits.get(row.visitorId) ?? { pageViews: 0, sessions: 0 };
    entry.pageViews += row._count._all;
    entry.sessions += 1;
    visits.set(row.visitorId, entry);
  }

  const signups = buildUnfinishedSignups(
    drafts,
    pendings,
    new Set(registered.map((user) => (user.email ?? '').toLowerCase())),
    visits,
    new Date(),
    new Set(signedIn.map((row) => row.visitorId))
  );
  return NextResponse.json({ signups });
}

/** הסרת טיוטה מהרשימה (למשל אחרי שטופלה). הרשמה שממתינה לאישור לא נמחקת מכאן */
export async function DELETE(request: NextRequest) {
  const denied = await requireAdvisor();
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id || id.startsWith('pending:')) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  // כל הטיוטות של אותו מייל מוסרות יחד — אחרת הישנה יותר הייתה עולה במקומה
  const draft = await prisma.signupDraft.findUnique({ where: { id }, select: { email: true } });
  await prisma.signupDraft.deleteMany({
    where: draft?.email ? { OR: [{ id }, { email: draft.email }] } : { id },
  });
  return NextResponse.json({ ok: true });
}
