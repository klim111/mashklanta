import type { Metadata } from 'next';
import type { LandingPageId } from '@/lib/landing-content';
import { LANDING_PAGES } from '@/lib/landing-content';
import { getLandingContent } from '@/lib/landing-content-store';

/** הכותרת, התיאור והתצוגה בשיתוף של דף נחיתה — מהטקסטים שהיועץ ערך */
export async function landingMetadata(id: LandingPageId): Promise<Metadata> {
  const text = (await getLandingContent())[id];
  const path = LANDING_PAGES.find((page) => page.id === id)!.path;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://mashkalanta.com'),
    title: text.metaTitle,
    description: text.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: text.metaTitle,
      description: text.metaDescription,
      siteName: 'משכלנתא',
      locale: 'he_IL',
      type: 'website',
      url: path,
    },
  };
}
