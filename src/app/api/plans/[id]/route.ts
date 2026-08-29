import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { archivePlan, getPlanForUser, renamePlan, setCurrentStage, updatePlanDeal } from '@/lib/mortgage-plans';
import { isPlanStage } from '@/lib/mortgage-plan';

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

/** שינוי שם התהליך או מעבר לשלב שכבר נפתח */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

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

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await archivePlan(userId, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
