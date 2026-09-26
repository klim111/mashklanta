import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { listAdvisorRequests, markOrderInWork } from '@/lib/advisor-order-store';

/** בקשות הליווי ששולמו ומופנות ליועץ המחובר */
export async function GET(_req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await listAdvisorRequests(advisorId));
}

/**
 * סימון שלב כ"בעבודה — התשלום סודר".
 *
 * זו ההצהרה של היועץ שהוא כבר עובד על השלב ושקיבל עליו תשלום. מרגע זה הלקוח
 * אינו יכול למחוק את התהליך, וכשהיועץ מסיים הוא מסיר את הסימון.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerAuth();
  const advisorId = session?.user?.id;
  if (!advisorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user?.role !== 'ADVISOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
  if (!orderId) return NextResponse.json({ error: 'נדרש מזהה בקשה' }, { status: 400 });

  const order = await markOrderInWork(advisorId, orderId, body?.inWork !== false);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(order);
}
