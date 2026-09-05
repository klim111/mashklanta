import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assignMixDeal, canEditMix, markMixAsFinal, setMixCategory } from '@/lib/mixes';
import { findAccessibleClient } from '@/lib/clients';
import { getPlanForUser, persistFinalMix } from '@/lib/mortgage-plans';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** שינוי שם התמהיל, שיוכו ללקוח/תהליך, או נעילתו כתמהיל סופי */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await canEditMix(userId, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (body?.isFinal === true && typeof body?.planId === 'string') {
    const plan = await getPlanForUser(userId, body.planId);
    if (!plan) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const saved = await markMixAsFinal(userId, id, body.planId);
    if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await persistFinalMix(userId, body.planId, saved);
    return NextResponse.json(saved);
  }

  if (body?.categoryId === null || typeof body?.categoryId === 'string') {
    const saved = await setMixCategory(userId, id, body.categoryId);
    if (!saved) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(saved);
  }

  if (body?.deal && typeof body.deal === 'object') {
    const deal = body.deal as Record<string, unknown>;
    const saved = await assignMixDeal(userId, id, {
      ...(typeof deal.planId === 'string' || deal.planId === null ? { planId: deal.planId as string | null } : {}),
      ...(typeof deal.propertyAddress === 'string' ? { propertyAddress: deal.propertyAddress } : {}),
      ...(deal.propertyValue === null || typeof deal.propertyValue === 'number'
        ? { propertyValue: deal.propertyValue as number | null }
        : {}),
      ...(typeof deal.totalAmount === 'number' ? { totalAmount: deal.totalAmount } : {}),
    });
    return NextResponse.json(saved);
  }

  const data: { name?: string; clientId?: string | null; mixJson?: object } = {};

  if (typeof body?.name === 'string' && body.name.trim()) {
    const name = body.name.trim();
    const current = await prisma.mortgageMix.findUnique({
      where: { id },
      select: { mixJson: true, locked: true },
    });
    if (current?.locked) {
      return NextResponse.json({ error: 'Mix is locked' }, { status: 409 });
    }
    data.name = name;
    if (current?.mixJson && typeof current.mixJson === 'object') {
      data.mixJson = { ...(current.mixJson as object), name };
    }
  }

  if (body?.clientId === null) {
    data.clientId = null;
  } else if (typeof body?.clientId === 'string') {
    const client = await findAccessibleClient(userId, body.clientId);
    if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    data.clientId = body.clientId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  await prisma.mortgageMix.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!(await canEditMix(userId, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const current = await prisma.mortgageMix.findUnique({
    where: { id },
    select: { locked: true, isFinal: true },
  });
  if (current?.locked || current?.isFinal) {
    return NextResponse.json({ error: 'Mix is locked' }, { status: 409 });
  }

  await prisma.mortgageMix.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
