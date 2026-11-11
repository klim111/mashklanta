import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createPaymentLink, listPaymentLinks, readPaymentLinkInput, sendPaymentLink } from '@/lib/payment-links';

/** קישורי התשלום שהיועץ יצר, ויצירת קישור חדש (ואם ביקש — שליחה ללקוח במייל) */
export async function GET() {
  const session = await getServerAuth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await listPaymentLinks());
}

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session?.user?.role !== 'ADVISOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const read = readPaymentLinkInput(body);
  if ('error' in read) return NextResponse.json({ error: read.error }, { status: 400 });

  const link = await createPaymentLink(userId, read.input);
  let sendError: string | null = null;
  if (body?.send === true && link.clientEmail) {
    sendError = await sendPaymentLink(link.id, session?.user?.email);
  }
  const [fresh] = (await listPaymentLinks()).filter((item) => item.id === link.id);
  return NextResponse.json({ link: fresh ?? link, sendError }, { status: 201 });
}
