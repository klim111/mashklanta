import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { canManagePaymentLink, cancelPaymentLink, sendPaymentLink } from '@/lib/payment-links';
import { requireAdvisor } from '@/lib/platform-admin';

/**
 * פעולה על קישור תשלום: `send` — שליחה ללקוח במייל · `cancel` — ביטול קישור שעוד לא שולם.
 * רק על קישור שהיועץ יצר בעצמו (מנהל הפלטפורמה — על כל קישור).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  const session = await getServerAuth();

  const { id } = await params;
  if (!(await canManagePaymentLink(id, auth.advisorId, auth.platformAdmin))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (body?.action === 'send') {
    const error = await sendPaymentLink(id, session?.user?.email);
    return error ? NextResponse.json({ error }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (body?.action === 'cancel') {
    const link = await cancelPaymentLink(id);
    return link ? NextResponse.json(link) : NextResponse.json({ error: 'הקישור כבר שולם או בוטל' }, { status: 409 });
  }
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}
