import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';
import { openPass, passExpiresAt } from '@/lib/process-access';

export interface PlatformAccessView {
  /**
   * האם אפשר לפתוח עכשיו תהליך משכנתא בלי לשלם: יש תשלום שעוד לא נקשר לתהליך
   * ועוד לא עברו ממנו 35 יום. תשלום שכבר פתח תהליך אינו פותח תהליך נוסף.
   */
  active: boolean;
  since: string | null;
  /** מה ששולם על הגישה הפנויה — זה מה שיקוזז אם יוזמן ליווי */
  paid: number;
  price: number;
  accessDays: number;
  /** עד מתי הגישה הפנויה בתוקף */
  passExpiresAt: string | null;
}

/** האם למשתמש המחובר יש גישה פנויה לפתיחת תהליך משכנתא */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const unbound = await prisma.platformPayment.findMany({
    where: { userId, planId: null, status: 'PAID' },
    select: { createdAt: true, amountAgorot: true },
  });
  const pass = openPass(unbound);

  // ליועץ הכלים פתוחים תמיד — הוא הצד שמפעיל אותם
  const view: PlatformAccessView = {
    active: user.role === 'ADVISOR' || pass !== null,
    since: pass?.createdAt.toISOString() ?? null,
    paid: pass ? pass.amountAgorot / 100 : 0,
    price: PLATFORM_PROCESS_PRICE,
    accessDays: PLATFORM_ACCESS_DAYS,
    passExpiresAt: pass ? passExpiresAt(pass.createdAt).toISOString() : null,
  };
  return NextResponse.json(view);
}
