import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { cancelOrder, payOrder } from '@/lib/advisor-order-store';

interface RouteContext {
  params: Promise<{ id: string; orderId: string }>;
}

/**
 * תשלום על ההזמנה.
 *
 * החיוב עצמו נעשה מול ספק הסליקה בצד הלקוח; מה שמגיע לכאן הוא האסמכתה, שם
 * המשלם וארבע הספרות האחרונות. פרטי הכרטיס אינם עוברים דרך השרת ואינם נשמרים.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderId } = await params;
  const body = await req.json().catch(() => null);

  if (body?.termsAccepted !== true) {
    return NextResponse.json({ error: 'Terms not accepted' }, { status: 400 });
  }

  const order = await payOrder(userId, orderId, {
    termsAccepted: true,
    payerName: typeof body?.payerName === 'string' ? body.payerName : undefined,
    cardLast4: typeof body?.cardLast4 === 'string' ? body.cardLast4 : undefined,
    paymentRef: typeof body?.paymentRef === 'string' ? body.paymentRef : undefined,
  });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(order);
}

/** ביטול בקשה שעדיין לא שולמה */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderId } = await params;
  if (!(await cancelOrder(userId, orderId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
