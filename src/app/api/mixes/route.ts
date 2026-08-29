import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { listMixesForClient, listMixesForUser, saveMix } from '@/lib/mixes';
import { fillClientDealFromMix, findAccessibleClient } from '@/lib/clients';
import { sanitizeMix } from '@/components/mortgage-advisor/engine';

/**
 * התמהילים השמורים. בלי פרמטר מוחזרים כל התמהילים שהמשתמש רשאי לראות, ועם
 * clientId מוחזרים התמהילים של אותו לקוח — אחרי בדיקה שהמשתמש רשאי לגשת אליו.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (clientId) {
    const client = await findAccessibleClient(userId, clientId);
    if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(await listMixesForClient(clientId));
  }

  return NextResponse.json(await listMixesForUser(userId));
}

/** שמירת תמהיל. שמירה חוזרת של אותו תמהיל מעדכנת את הרשומה הקיימת */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const mix = sanitizeMix(body?.mix);
  if (!mix) return NextResponse.json({ error: 'Invalid mix' }, { status: 400 });

  const requestedClientId: string | null | undefined =
    body?.clientId === null || typeof body?.clientId === 'string' ? body.clientId : undefined;

  if (typeof requestedClientId === 'string') {
    const client = await findAccessibleClient(userId, requestedClientId);
    if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const requestedPlanId: string | null | undefined =
    body?.planId === null || typeof body?.planId === 'string' ? body.planId : undefined;

  if (typeof requestedPlanId === 'string') {
    const { getPlanForUser } = await import('@/lib/mortgage-plans');
    const plan = await getPlanForUser(userId, requestedPlanId);
    if (!plan) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // לקוח ששומר תמהיל משלו מקבל שיוך אוטומטי, כדי שהיועץ שלו יראה אותו מיד
  let clientId = requestedClientId;
  if (clientId === undefined) {
    const own = await prisma.client.findFirst({ where: { userId }, select: { id: true } });
    if (own) clientId = own.id;
  }

  const saved = await saveMix({ ownerId: userId, mix, clientId, planId: requestedPlanId });
  // פרטי העסקה בכרטיס הלקוח מושלמים מהתמהיל, כדי שלא יידרש להזין אותם פעמיים
  if (saved.clientId) await fillClientDealFromMix(saved.clientId, mix);

  return NextResponse.json(saved, { status: 201 });
}
