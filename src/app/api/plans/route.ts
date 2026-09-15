import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createPlan, createPlanFromMix, listPlansForUser } from '@/lib/mortgage-plans';
import { assignMixDeal, getMixForUser } from '@/lib/mixes';
import { rateLimit } from '@/lib/rate-limit';

/** תהליכי תכנון המשכנתא של המשתמש — הפעילים והמושלמים */
export async function GET() {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(await listPlansForUser(userId));
}

/** פתיחת תהליך חדש */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name : undefined;

  const limited = await rateLimit(`plans:create:${userId}`, { limit: 8, windowSeconds: 3600 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'Too many plans' },
      { status: 429, headers: { 'Retry-After': String(limited.resetInSeconds) } }
    );
  }

  if (typeof body?.fromMixId === 'string') {
    const mix = await getMixForUser(userId, body.fromMixId);
    if (!mix) return NextResponse.json({ error: 'Mix not found' }, { status: 404 });
    const propertyAddress = typeof body.propertyAddress === 'string' ? body.propertyAddress.trim() : '';
    const propertyValue =
      typeof body.propertyValue === 'number' && Number.isFinite(body.propertyValue)
        ? body.propertyValue
        : mix.mix.propertyValue ?? null;
    const mortgageAmount =
      typeof body.mortgageAmount === 'number' && Number.isFinite(body.mortgageAmount)
        ? body.mortgageAmount
        : mix.mix.totalAmount || null;
    const plan = await createPlanFromMix(userId, mix, {
      propertyAddress: propertyAddress || mix.mix.propertyAddress?.trim() || '',
      propertyValue,
      mortgageAmount,
    });
    await assignMixDeal(userId, body.fromMixId, {
      planId: plan.id,
      propertyAddress: plan.propertyAddress ?? propertyAddress,
      propertyValue: plan.propertyValue ?? propertyValue,
      totalAmount: plan.mortgageAmount ?? mortgageAmount ?? undefined,
    });
    return NextResponse.json(plan, { status: 201 });
  }

  return NextResponse.json(await createPlan(userId, name), { status: 201 });
}
