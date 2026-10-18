import type { Metadata } from 'next';
import { LANDING_TOOLS } from './landingTools';
import type { LandingToolId } from './landingTools';

/** הכותרת, התיאור והתצוגה בשיתוף של דף נחיתה — מאותו מקור כמו הטקסט שבדף */
export function landingMetadata(id: LandingToolId): Metadata {
  const tool = LANDING_TOOLS[id];
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://mashkalanta.com'),
    title: tool.metaTitle,
    description: tool.metaDescription,
    alternates: { canonical: tool.path },
    openGraph: {
      title: tool.metaTitle,
      description: tool.metaDescription,
      siteName: 'משכלנתא',
      locale: 'he_IL',
      type: 'website',
      url: tool.path,
    },
  };
}
