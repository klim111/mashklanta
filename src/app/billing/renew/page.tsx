import type { Metadata } from 'next';
import { readRenewalToken } from '@/lib/billing-links';
import { RenewConfirm } from './RenewConfirm';

export const metadata: Metadata = { title: 'חידוש הגישה', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * העמוד שהקישור במייל התזכורת (או במייל על סיום הליווי) פותח: הלקוח מאשר שהוא
 * רוצה חודש נוסף, ורק אז עובר לעמוד התשלום של HYP. פתיחת הקישור לבדה לא מחייבת.
 */
export default async function RenewPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const link = readRenewalToken(token ?? null);
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <RenewConfirm token={link ? (token as string) : null} afterAdvisory={link?.reason === 'advisory-ended'} />
    </div>
  );
}
