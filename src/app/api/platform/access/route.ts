import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PLATFORM_MONTHLY_PRICE, platformMonthsSince } from '@/lib/service-flow';

export interface PlatformAccessView {
  active: boolean;
  since: string | null;
  /** כמה חודשים כבר שולמו — זה מה שיקוזז אם יוזמן ליווי */
  monthsPaid: number;
  monthlyPrice: number;
}

/** האם למשתמש המחובר יש גישה מלאה לפלטפורמה */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformAccessAt: true, role: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // ליועץ הכלים פתוחים תמיד — הוא הצד שמפעיל אותם
  const since = user.platformAccessAt;
  const view: PlatformAccessView = {
    active: user.role === 'ADVISOR' || since !== null,
    since: since?.toISOString() ?? null,
    monthsPaid: platformMonthsSince(since),
    monthlyPrice: PLATFORM_MONTHLY_PRICE,
  };
  return NextResponse.json(view);
}
