import type { Metadata } from 'next';
import { AdvisorEntryRequest } from '@/components/auth/AdvisorEntry';

export const metadata: Metadata = { title: 'כניסה', robots: { index: false, follow: false } };

export default function TeamEntryPage() {
  return <AdvisorEntryRequest />;
}
