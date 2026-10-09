import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { readRenewalToken } from '@/lib/billing-links';
import { CheckoutError, startCheckout } from '@/lib/billing';

/**
 * הלקוח אישר חידוש מהקישור שבמייל התזכורת. הקישור חתום ומזהה את הלקוח, ולכן
 * לא צריך להתחבר. מכאן הלקוח עובר לעמוד התשלום של HYP — החיוב קורה רק שם.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const link = readRenewalToken(typeof body?.token === 'string' ? body.token : null);
  if (!link) {
    return NextResponse.json({ error: 'הקישור לחידוש פג או אינו תקין. היכנסו לאזור האישי כדי לחדש.' }, { status: 400 });
  }

  const limited = await rateLimit(`platform:checkout:${link.userId}`, { limit: 6, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות תשלום. נסו שוב בעוד כמה דקות.' }, { status: 429 });
  }

  try {
    const redirectUrl = await startCheckout({
      userId: link.userId,
      planId: link.planId,
      returnPath: link.planId ? `/dashboard/plans/${link.planId}` : '/dashboard',
    });
    return NextResponse.json({ redirectUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
