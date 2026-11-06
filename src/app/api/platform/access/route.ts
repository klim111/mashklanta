import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPricing } from '@/lib/pricing-store';
import { passDays, passExpiresAt } from '@/lib/process-access';
import { grantActive } from '@/lib/granted-access';
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
   * לתהליך (תשלום על תהליך נוסף, או של תהליך שנמחק) — שהחודש שלו עוד לא הסתיים,
   * או שהיועץ הגדיר ללקוח גישה בתשלום שעוד בתוקף. זו הבדיקה "האם הלקוח משלם".
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
  /**
   * עד מתי פתוחה הגישה שהיועץ הגדיר ללקוח (src/lib/granted-access.ts). עד אז
   * הלקוח נחשב משלם: `active` אמת, והתהליכים שלו פתוחים
   */
  grantedUntil: string | null;
}

/** האם למשתמש המחובר יש גישה פנויה לפתיחת תהליך משכנתא */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, paidAccessUntil: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [pass, openPlans, canOpenMore, pricing, paidClient] = await Promise.all([
    newProcessPassFor(userId),
    listOpenSelfServicePlans(userId),
    canOpenAnotherPlan(userId),
    getPricing(),
    clientHasPaidAccess(userId),
  ]);

  const passEnds = pass ? passExpiresAt(pass.createdAt) : null;
  const grantedUntil = grantActive(user.paidAccessUntil) ? user.paidAccessUntil : null;
  const accessEnds = grantedUntil && (!passEnds || grantedUntil > passEnds) ? grantedUntil : passEnds;

  // ליועץ הכלים פתוחים תמיד — הוא הצד שמפעיל אותם. לקוח שהיועץ הגדיר לו גישה — עד סוף התקופה
  const view: PlatformAccessView = {
    active: user.role === 'ADVISOR' || pass !== null || grantedUntil !== null,
    since: pass?.createdAt.toISOString() ?? null,
    paid: pass ? pass.amountAgorot / 100 : 0,
    price: pricing.platformPrice,
    accessDays: passDays(new Date()),
    passExpiresAt: accessEnds?.toISOString() ?? null,
    openProcesses: openPlans.length,
    openPlans,
    canOpenMore,
    paidClient: false,
    grantedUntil: grantedUntil?.toISOString() ?? null,
  };
  // כל מה שפותח תהליך חדש (תשלום פנוי, או גישה שהיועץ הגדיר) פותח גם את תיק המסמכים ובונה התמהילים
  view.paidClient = view.active || paidClient;
  return NextResponse.json(view);
}
