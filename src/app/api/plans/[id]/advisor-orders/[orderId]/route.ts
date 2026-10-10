import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { cancelOrder } from '@/lib/advisor-order-store';

interface RouteContext {
  params: Promise<{ id: string; orderId: string }>;
}

/**
 * הלקוח אינו יכול לסמן הזמנת ליווי כמשולמת בעצמו. התשלום על ליווי מתבצע
 * בקישור תשלום שהיועץ שולח (HYP), וההזמנה נחשבת משולמת רק כשהיועץ מאשר אותה
 * מלוח היועץ — זה מה שפותח ללקוח את כל הכלים בתהליך.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'התשלום על ליווי מתבצע בקישור תשלום מהיועץ, והיועץ מאשר אותו.' },
    { status: 410 }
  );
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
