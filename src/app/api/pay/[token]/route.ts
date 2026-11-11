import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { CheckoutError, startLinkCheckout } from '@/lib/billing';

/**
 * הלקוח לחץ "לתשלום" בעמוד קישור התשלום. לא צריך חשבון: הקישור עצמו מזהה על
 * מה ועל כמה משלמים, והחיוב קורה רק בעמוד של HYP.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limited = await rateLimit(`pay-link:${token}`, { limit: 10, windowSeconds: 900 });
  if (!limited.allowed) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות תשלום. נסו שוב בעוד כמה דקות.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  try {
    const redirectUrl = await startLinkCheckout(token, {
      name: typeof body?.name === 'string' ? body.name : null,
      email: typeof body?.email === 'string' ? body.email : null,
      phone: typeof body?.phone === 'string' ? body.phone : null,
    });
    return NextResponse.json({ redirectUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
