import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuth } from '@/lib/auth';
import { summarizeVisits } from '@/lib/site-analytics';

/** תקרת שורות לחישוב אחד — מספיקה לעשרות אלפי צפיות בטווח */
const MAX_ROWS = 100_000;

/**
 * דאשבורד הביקורים: צפיות לפי עמוד, זמני שהייה, מקורות הגעה ומכשירים בטווח
 * הימים שנבחר, ומשפך ההרשמה — מבקרים, התחילו להירשם, שלחו, נפתח חשבון.
 */
export async function GET(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days')) || 30, 1), 365);
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000);

  const [rows, liveSessions, drafts, submittedDrafts, newClients] = await Promise.all([
    prisma.siteVisit.findMany({
      where: { startedAt: { gte: from } },
      select: {
        visitorId: true,
        sessionId: true,
        path: true,
        referrer: true,
        device: true,
        userId: true,
        durationMs: true,
        startedAt: true,
      },
      orderBy: { startedAt: 'desc' },
      take: MAX_ROWS,
    }),
    // "עכשיו באתר": ביקורים שנפתח בהם עמוד בחמש הדקות האחרונות
    prisma.siteVisit.findMany({
      where: { startedAt: { gte: new Date(to.getTime() - 5 * 60 * 1000) } },
      distinct: ['visitorId'],
      select: { visitorId: true },
    }),
    prisma.signupDraft.count({ where: { createdAt: { gte: from } } }),
    prisma.signupDraft.count({ where: { createdAt: { gte: from }, submitted: true } }),
    prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: from } } }),
  ]);

  return NextResponse.json({
    days,
    from: from.toISOString(),
    truncated: rows.length === MAX_ROWS,
    liveVisitors: liveSessions.length,
    funnel: { startedSignup: drafts, submittedSignup: submittedDrafts, newClients },
    summary: summarizeVisits(rows, from, to),
  });
}
