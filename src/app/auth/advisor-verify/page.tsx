import type { Metadata } from 'next';
import { AdvisorEntryVerify } from '@/components/auth/AdvisorEntry';

export const metadata: Metadata = { title: 'כניסה', robots: { index: false, follow: false } };

export default function AdvisorVerifyPage() {
  return <AdvisorEntryVerify />;
}
