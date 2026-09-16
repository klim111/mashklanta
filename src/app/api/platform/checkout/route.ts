import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { validateCheckout } from '@/lib/platform-access';
import { PLATFORM_MONTHLY_PRICE } from '@/lib/service-flow';

/**
 * רכישת גישה לפלטפורמה.
 *
 * פרטי הכרטיס מאומתים כאן ולא נשמרים: ברשומת התשלום נשארים רק המותג וארבע
 * הספרות האחרונות. אחרי התשלום המשתמש מסומן כמי שרכש גישה, וכלי התכנון נפתח
 * אצלו במלואו.
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

  const now = new Date();
  const [, user] = await prisma.$transaction([
    prisma.platformPayment.create({
      data: {
        userId,
        amountAgorot: PLATFORM_MONTHLY_PRICE * 100,
        holderName: String(body.holderName).trim(),
        cardBrand: validation.card.brand,
        cardLast4: validation.card.last4,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { platformAccessAt: now },
      select: { platformAccessAt: true },
    }),
  ]);

  return NextResponse.json(
    {
      active: true,
      since: user.platformAccessAt?.toISOString() ?? now.toISOString(),
      monthsPaid: 1,
      monthlyPrice: PLATFORM_MONTHLY_PRICE,
      receipt: { brand: validation.card.brand, last4: validation.card.last4, amount: PLATFORM_MONTHLY_PRICE },
    },
    { status: 201 }
  );
}
