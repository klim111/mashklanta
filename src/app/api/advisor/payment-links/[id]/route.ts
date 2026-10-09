import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { cancelPaymentLink, sendPaymentLink } from '@/lib/payment-links';

/** פעולה על קישור תשלום: `send` — שליחה ללקוח במייל · `cancel` — ביטול קישור שעוד לא שולם */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body?.action === 'send') {
    const error = await sendPaymentLink(id, session.user.email);
    return error ? NextResponse.json({ error }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (body?.action === 'cancel') {
    const link = await cancelPaymentLink(id);
    return link ? NextResponse.json(link) : NextResponse.json({ error: 'הקישור כבר שולם או בוטל' }, { status: 409 });
  }
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}
