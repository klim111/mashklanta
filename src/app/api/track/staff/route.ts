import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuth } from '@/lib/auth';
import { isTrackingId } from '@/lib/site-analytics';

/**
 * רישום הדפדפן של היועץ כדפדפן של הצוות (src/lib/staff-device.ts): כל
 * הביקורים ממזהה המבקר הזה — מלפני הכניסה ומאחריה — לא נספרים בדאשבורד.
 * רק יועץ מחובר יכול לרשום דפדפן.
 */
export async function POST(request: NextRequest) {
  const session = await getServerAuth().catch(() => null);
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !isTrackingId(body.visitorId)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  await prisma.staffVisitor.upsert({
    where: { visitorId: body.visitorId },
    create: { visitorId: body.visitorId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
