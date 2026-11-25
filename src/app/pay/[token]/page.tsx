import type { Metadata } from 'next';
import { publicPaymentLink } from '@/lib/payment-links';
import { PayLinkForm } from './PayLinkForm';

export const metadata: Metadata = { title: 'תשלום מאובטח · משכלנתא', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * עמוד קישור התשלום שהיועץ שלח: על מה משלמים, כמה, וכפתור לעמוד התשלום של
 * HYP. פתוח בלי התחברות — הלקוח לא חייב חשבון כדי לשלם על שירות ייעוץ.
 */
export default async function PayLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await publicPaymentLink(token);
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <PayLinkForm token={token} link={link} />
    </div>
  );
}
