import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPricing } from '@/lib/pricing-store';
import { passDays, passExpiresAt } from '@/lib/process-access';
import {
  canOpenAnotherPlan,
  clientHasPaidAccess,
  listOpenSelfServicePlans,
  newProcessPassFor,
} from '@/lib/mortgage-plans';
import type { OpenProcessSummary } from '@/lib/mortgage-plans';

export interface PlatformAccessView {
  /**
   * האם אפשר לפתוח עכשיו תהליך משכנתא בלי לשלם: יש תשלום פנוי — שאינו קשור
   * לתהליך (תשלום על תהליך נוסף, או של תהליך שנמחק) — שהחודש שלו עוד לא הסתיים.
   */
  active: boolean;
  since: string | null;
  /** מה ששולם על הגישה הפנויה — זה מה שיקוזז אם יוזמן ליווי */
  paid: number;
  price: number;
  accessDays: number;
  /** עד מתי הגישה הפנויה בתוקף */
  passExpiresAt: string | null;
  /** התהליכים הפתוחים במסלול העצמאי — כל אחד מהם תופס תשלום */
  openProcesses: number;
  openPlans: OpenProcessSummary[];
  /**
   * האם מותר לפתוח עכשיו תהליך נוסף. כשלא — יש תהליך פתוח ואין תשלום פנוי,
   * וצריך לשלם על תהליך נוסף או למחוק את הקודם
   */
  canOpenMore: boolean;
  /**
   * הלקוח כבר רכש גישה — תהליך פתוח ששולם, ליווי, או תשלום פנוי. בלי זה תיק
   * המסמכים ובונה התמהילים נעולים
   */
  paidClient: boolean;
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

  const [pass, openPlans, canOpenMore, pricing, paidClient] = await Promise.all([
    newProcessPassFor(userId),
    listOpenSelfServicePlans(userId),
    canOpenAnotherPlan(userId),
    getPricing(),
    clientHasPaidAccess(userId),
  ]);

  // ליועץ הכלים פתוחים תמיד — הוא הצד שמפעיל אותם
  const view: PlatformAccessView = {
    active: user.role === 'ADVISOR' || pass !== null,
    since: pass?.createdAt.toISOString() ?? null,
    paid: pass ? pass.amountAgorot / 100 : 0,
    price: pricing.platformPrice,
    accessDays: passDays(new Date()),
    passExpiresAt: pass ? passExpiresAt(pass.createdAt).toISOString() : null,
    openProcesses: openPlans.length,
    openPlans,
    canOpenMore,
    paidClient: false,
  };
  // כל מה שפותח תהליך חדש (תשלום פנוי, ובהמשך גם גישה שהיועץ הגדיר) פותח גם את תיק המסמכים ובונה התמהילים
  view.paidClient = view.active || paidClient;
  return NextResponse.json(view);
}
