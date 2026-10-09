import crypto from 'node:crypto';
import { prisma } from './db';
import { sendEmail } from './email';
import { canonicalSiteOrigin } from './auth-url';
import { readPrice } from './pricing-config';
import { paymentLinkEmail } from './billing-emails';

/**
 * קישורי תשלום חד־פעמיים שהיועץ יוצר ללקוח — למשל על שירות ייעוץ. הלקוח
 * משלם בעמוד `/pay/<token>`, והתשלום נרשם ב-src/lib/billing.ts.
 */

export interface PaymentLinkView {
  id: string;
  url: string;
  title: string;
  description: string | null;
  amount: number;
  trackId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  paidAt: string | null;
  invoiceNumber: string | null;
  sentAt: string | null;
  createdAt: string;
}

function siteOrigin(): string {
  return (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
}

export function payUrl(token: string): string {
  return `${siteOrigin()}/pay/${token}`;
}

type LinkRow = Awaited<ReturnType<typeof prisma.paymentLink.findFirstOrThrow>>;

function toView(row: LinkRow): PaymentLinkView {
  return {
    id: row.id,
    url: payUrl(row.token),
    title: row.title,
    description: row.description,
    amount: row.amountAgorot / 100,
    trackId: row.trackId,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
    status: (['OPEN', 'PAID', 'CANCELLED'].includes(row.status) ? row.status : 'OPEN') as PaymentLinkView['status'],
    paidAt: row.paidAt?.toISOString() ?? null,
    invoiceNumber: row.invoiceNumber,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface PaymentLinkInput {
  title: string;
  description: string | null;
  amount: number;
  trackId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientId: string | null;
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return text || null;
}

/** קריאת הטופס של היועץ: שם שירות וסכום חובה, מייל — אם הוזן — תקין */
export function readPaymentLinkInput(raw: unknown): { input: PaymentLinkInput } | { error: string } {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const title = clean(body.title, 80);
  if (!title || title.length < 2) return { error: 'נדרש שם לשירות' };
  const amount = readPrice(body.amount);
  if (amount === null) return { error: 'הסכום אינו תקין' };
  const clientEmail = clean(body.clientEmail, 200)?.toLowerCase() ?? null;
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return { error: 'כתובת המייל אינה תקינה' };
  return {
    input: {
      title,
      description: clean(body.description, 300),
      amount,
      trackId: clean(body.trackId, 40),
      clientName: clean(body.clientName, 80),
      clientEmail,
      clientPhone: clean(body.clientPhone, 20),
      clientId: clean(body.clientId, 40),
    },
  };
}

export async function listPaymentLinks(): Promise<PaymentLinkView[]> {
  const rows = await prisma.paymentLink.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return rows.map(toView);
}

export async function createPaymentLink(createdById: string, input: PaymentLinkInput): Promise<PaymentLinkView> {
  const row = await prisma.paymentLink.create({
    data: {
      token: crypto.randomBytes(18).toString('base64url'),
      title: input.title,
      description: input.description,
      amountAgorot: input.amount * 100,
      trackId: input.trackId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      clientId: input.clientId,
      createdById,
    },
  });
  return toView(row);
}

export async function cancelPaymentLink(id: string): Promise<PaymentLinkView | null> {
  const updated = await prisma.paymentLink.updateMany({ where: { id, status: 'OPEN' }, data: { status: 'CANCELLED' } });
  if (updated.count === 0) return null;
  return toView(await prisma.paymentLink.findUniqueOrThrow({ where: { id } }));
}

/** שליחת הקישור ללקוח במייל. מחזיר הודעת שגיאה, או null כשנשלח */
export async function sendPaymentLink(id: string, replyTo?: string | null): Promise<string | null> {
  const link = await prisma.paymentLink.findUnique({ where: { id } });
  if (!link) return 'הקישור לא נמצא';
  if (link.status !== 'OPEN') return 'הקישור כבר שולם או בוטל';
  if (!link.clientEmail) return 'אין כתובת מייל ללקוח';
  const email = paymentLinkEmail({
    name: link.clientName,
    title: link.title,
    description: link.description,
    amount: link.amountAgorot / 100,
    payUrl: payUrl(link.token),
  });
  const result = await sendEmail({ to: link.clientEmail, ...email, replyTo: replyTo || undefined });
  if (!result.success) return 'המייל לא נשלח. אפשר להעתיק את הקישור ולשלוח אותו בעצמך.';
  await prisma.paymentLink.update({ where: { id }, data: { sentAt: new Date() } });
  return null;
}

/** הקישור כפי שהלקוח רואה אותו בעמוד התשלום */
export async function publicPaymentLink(token: string) {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const link = await prisma.paymentLink.findUnique({ where: { token } });
  if (!link) return null;
  return {
    title: link.title,
    description: link.description,
    amount: link.amountAgorot / 100,
    status: link.status as PaymentLinkView['status'],
    clientName: link.clientName,
    hasEmail: Boolean(link.clientEmail),
  };
}
