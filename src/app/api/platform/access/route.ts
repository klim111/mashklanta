import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';
import { MAX_OPEN_PROCESSES, passExpiresAt } from '@/lib/process-access';
import { canOpenAnotherPlan, countOpenSelfServicePlans, newProcessPassFor } from '@/lib/mortgage-plans';

export interface PlatformAccessView {
  /**
   * האם אפשר לפתוח עכשיו תהליך משכנתא בלי לשלם: יש תשלום שעוד לא עברו ממנו
   * 30 יום, ולא הסתיים אחריו אף תהליך. סיום תהליך מחייב תשלום על התהליך הבא.
   */
  active: boolean;
  since: string | null;
  /** מה ששולם על הגישה הפנויה — זה מה שיקוזז אם יוזמן ליווי */
  paid: number;
  price: number;
  accessDays: number;
  /** עד מתי הגישה הפנויה בתוקף */
  passExpiresAt: string | null;
  /** תהליכים פתוחים במסלול העצמאי, ומה המקסימום במקביל */
  openProcesses: number;
  maxOpenProcesses: number;
  /** האם מותר לפתוח עוד תהליך, בלי קשר לתשלום */
  canOpenMore: boolean;
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

  const [pass, openProcesses, canOpenMore] = await Promise.all([
    newProcessPassFor(userId),
    countOpenSelfServicePlans(userId),
    canOpenAnotherPlan(userId),
  ]);

  // ליועץ הכלים פתוחים תמיד — הוא הצד שמפעיל אותם
  const view: PlatformAccessView = {
    active: user.role === 'ADVISOR' || pass !== null,
    since: pass?.createdAt.toISOString() ?? null,
    paid: pass ? pass.amountAgorot / 100 : 0,
    price: PLATFORM_PROCESS_PRICE,
    accessDays: PLATFORM_ACCESS_DAYS,
    passExpiresAt: pass ? passExpiresAt(pass.createdAt).toISOString() : null,
    openProcesses,
    maxOpenProcesses: MAX_OPEN_PROCESSES,
    canOpenMore,
  };
  return NextResponse.json(view);
}
