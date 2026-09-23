import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import {
  deletePlan,
  getPlanForUser,
  markPlanSigned,
  renamePlan,
  setCurrentStage,
  updatePlanDeal,
} from '@/lib/mortgage-plans';
import { isPlanStage, planStageNumber } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const plan = await getPlanForUser(userId, id);
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(plan);
}

/** שינוי שם התהליך, מעבר לשלב שכבר נפתח, או סיום התהליך בחתימה */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  // "חתמתי על המשכנתא בבנק" — סיום התהליך מהשלב האחרון
  if (body?.signed === true) {
    const result = await markPlanSigned(userId, id);
    if (!result.ok && result.reason === 'incomplete') {
      return NextResponse.json({ error: 'Stage incomplete' }, { status: 409 });
    }
    if (!result.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.plan);
  }

  if (typeof body?.name === 'string') {
    const plan = await renamePlan(userId, id, body.name);
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(plan);
  }

  if (isPlanStage(body?.currentStage)) {
    const plan = await setCurrentStage(userId, id, body.currentStage);
    // שלב שעדיין לא נפתח אינו נגיש, ולכן המעבר אליו נדחה
    if (!plan) return NextResponse.json({ error: 'Stage not available' }, { status: 409 });
    return NextResponse.json(plan);
  }

  if (body?.deal && typeof body.deal === 'object') {
    const deal = body.deal as Record<string, unknown>;
    const plan = await updatePlanDeal(userId, id, {
      ...(typeof deal.propertyAddress === 'string' ? { propertyAddress: deal.propertyAddress } : {}),
      ...(deal.propertyValue === null || typeof deal.propertyValue === 'number'
        ? { propertyValue: deal.propertyValue }
        : {}),
      ...(deal.mortgageAmount === null || typeof deal.mortgageAmount === 'number'
        ? { mortgageAmount: deal.mortgageAmount }
        : {}),
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(plan);
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}

/**
 * מחיקת התהליך מבסיס הנתונים.
 *
 * הפרופיל הפיננסי שנאסף בשלבים נשמר על המשתמש לפני המחיקה, כדי שתהליך חדש
 * ייפתח עם אותם נתונים. שלב שהיועץ כבר עובד עליו בתשלום חוסם את המחיקה, ואז
 * מוחזר 409 עם שמות השלבים — כדי שההודעה ללקוח תגיד בדיוק מה תקוע.
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await deletePlan(userId, id);

  if (!result.ok && result.reason === 'locked') {
    const names = result.stages
      .map((stage) => `שלב ${planStageNumber(stage)} · ${journeyStageFor(stage).shortTitle}`)
      .join(', ');
    return NextResponse.json(
      {
        error: `${names} כבר בעבודה אצל היועץ, והתשלום עליו סודר. אי אפשר לבטל את התהליך עד שהיועץ יסיים את השלב.`,
        stages: result.stages,
      },
      { status: 409 }
    );
  }

  if (!result.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
