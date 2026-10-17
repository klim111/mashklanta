import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ingestInboundEmail } from '@/lib/conversation-store';

/**
 * webhook של Resend למיילים נכנסים (`email.received`).
 *
 * כל מייל שמגיע לדומיין הקבלה נשלח לכאן. החתימה נבדקת מול
 * `RESEND_WEBHOOK_SECRET`, ובלעדיה הבקשה נדחית — אחרת כל אחד יכול היה להזריק
 * "מייל מהבנק" לשיחה של לקוח.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Inbound email is not configured' }, { status: 503 });

  const payload = await req.text();
  const header = (name: string) => req.headers.get(`svix-${name}`) ?? req.headers.get(`webhook-${name}`) ?? '';

  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY || 're_placeholder').webhooks.verify({
      payload,
      headers: { id: header('id'), timestamp: header('timestamp'), signature: header('signature') },
      webhookSecret: secret,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (event.type !== 'email.received') return NextResponse.json({ ok: true, skipped: event.type });

  const data = event.data;
  const result = await ingestInboundEmail({
    emailId: data.email_id,
    from: data.from,
    to: data.to ?? [],
    cc: data.cc ?? [],
    receivedFor: data.received_for ?? [],
    subject: data.subject ?? '',
    messageId: data.message_id ?? null,
  });
  return NextResponse.json({ ok: true, result });
}
