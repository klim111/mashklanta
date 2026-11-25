import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { CheckoutError, startCheckout } from '@/lib/billing';

/**
 * רכישת חבילת גישה — ₪49 לחודש קלנדרי.
 *
 * הלקוח משלם בעמוד התשלום המאובטח של HYP, ופרטי הכרטיס לא עוברים דרך האתר:
 * כאן רק נפתח המעבר לתשלום, והתשובה היא הכתובת שאליה הדפדפן עובר. התשלום
 * נרשם כשהלקוח חוזר מ-HYP (`/api/payments/hyp/return`). בלי `planId` החבילה
 * נקשרת לתהליך הבא שייפתח; עם `planId` זו חבילה נוספת לתהליך קיים. אין חיוב
 * חוזר — כל חבילה נרכשת ביוזמת הלקוח.
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
  try {
    const redirectUrl = await startCheckout({
      userId,
      planId: typeof body?.planId === 'string' && body.planId ? body.planId : null,
      returnPath: typeof body?.returnPath === 'string' ? body.returnPath : null,
    });
    return NextResponse.json({ redirectUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
