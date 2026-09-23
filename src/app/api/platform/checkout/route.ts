import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { validateCheckout } from '@/lib/platform-access';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';
import { passExpiresAt } from '@/lib/process-access';

/**
 * רכישת גישה לתהליך משכנתא — ₪49 ל-35 יום.
 *
 * פרטי הכרטיס מאומתים כאן ולא נשמרים: ברשומת התשלום נשארים רק המותג וארבע
 * הספרות האחרונות. בלי `planId` התשלום נשמר כגישה פנויה שנקשרת לתהליך הבא
 * שייפתח; עם `planId` זהו חידוש של תהליך קיים, והכלים בו נפתחים לעוד 35 יום.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await rateLimit(`platform:checkout:${userId}`, { limit: 6, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'יותר מדי ניסיונות תשלום. נסו שוב בעוד כמה דקות.' },
      { status: 429, headers: { 'Retry-After': String(limited.resetInSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const validation = validateCheckout({
    holderName: String(body?.holderName ?? ''),
    email: String(body?.email ?? ''),
    phone: typeof body?.phone === 'string' ? body.phone : undefined,
    idNumber: typeof body?.idNumber === 'string' ? body.idNumber : undefined,
    cardNumber: String(body?.cardNumber ?? ''),
    expiry: String(body?.expiry ?? ''),
    cvv: String(body?.cvv ?? ''),
  });

  if (!validation.ok || !validation.card) {
    return NextResponse.json({ error: 'פרטי התשלום אינם תקינים', errors: validation.errors }, { status: 400 });
  }

  // חידוש: רק לתהליך של המשתמש עצמו
  let planId: string | null = null;
  if (typeof body?.planId === 'string' && body.planId) {
    const plan = await prisma.mortgagePlan.findFirst({
      where: { id: body.planId, ownerId: userId },
      select: { id: true },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    planId = plan.id;
  }

  const payment = await prisma.platformPayment.create({
    data: {
      userId,
      planId,
      amountAgorot: PLATFORM_PROCESS_PRICE * 100,
      holderName: String(body.holderName).trim(),
      cardBrand: validation.card.brand,
      cardLast4: validation.card.last4,
    },
    select: { createdAt: true },
  });

  return NextResponse.json(
    {
      active: true,
      since: payment.createdAt.toISOString(),
      planId,
      price: PLATFORM_PROCESS_PRICE,
      accessDays: PLATFORM_ACCESS_DAYS,
      passExpiresAt: passExpiresAt(payment.createdAt).toISOString(),
      receipt: { brand: validation.card.brand, last4: validation.card.last4, amount: PLATFORM_PROCESS_PRICE },
    },
    { status: 201 }
  );
}
