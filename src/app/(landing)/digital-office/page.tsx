import type { Metadata } from 'next';
import { DigitalOfficeLanding } from '@/components/landing/DigitalOfficeLanding';

const TITLE = 'משרד ייעוץ משכנתאות דיגיטלי | משכלנתא';
const DESCRIPTION =
  'כל תהליך המשכנתא במשרד אחד דיגיטלי: יועץ משכנתאות אישי, הגשה לכמה בנקים ומכרז ריביות, ועבודה מול עורך הדין, השמאי והבנקאי ישירות מהפלטפורמה. משכנתא חדשה או מיחזור.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://mashkalanta.com'),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/digital-office' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'משכלנתא',
    locale: 'he_IL',
    type: 'website',
    url: '/digital-office',
  },
};

export default function DigitalOfficePage() {
  return <DigitalOfficeLanding />;
}
