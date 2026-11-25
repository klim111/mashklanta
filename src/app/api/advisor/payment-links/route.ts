import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { createPaymentLink, listPaymentLinks, readPaymentLinkInput, sendPaymentLink } from '@/lib/payment-links';
import { requireAdvisor } from '@/lib/platform-admin';

/**
 * קישורי התשלום שהיועץ יצר, ויצירת קישור חדש (ואם ביקש — שליחה ללקוח במייל).
 * כל יועץ רואה רק את הקישורים שלו; מנהל הפלטפורמה רואה את כולם.
 */
export async function GET() {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listPaymentLinks(auth.platformAdmin ? null : auth.advisorId));
}

export async function POST(req: NextRequest) {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  const session = await getServerAuth();

  const body = await req.json().catch(() => null);
  const read = readPaymentLinkInput(body);
  if ('error' in read) return NextResponse.json({ error: read.error }, { status: 400 });

  const link = await createPaymentLink(auth.advisorId, read.input);
  let sendError: string | null = null;
  if (body?.send === true && link.clientEmail) {
    sendError = await sendPaymentLink(link.id, session?.user?.email);
  }
  const [fresh] = (await listPaymentLinks(auth.advisorId)).filter((item) => item.id === link.id);
  return NextResponse.json({ link: fresh ?? link, sendError }, { status: 201 });
}
