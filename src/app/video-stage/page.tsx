import type { Metadata } from 'next';
import { VideoStage } from './VideoStage';

export const metadata: Metadata = {
  title: 'במת הסרטון',
  robots: { index: false, follow: false },
};

/**
 * במה לאנימציות של סרטון ההדגמה (scripts/promo-video/record.mjs): אנימציה אחת על
 * כל המסך, בלי שום דבר מסביב. לא מקושרת מהאתר.
 */
export default async function VideoStagePage({ searchParams }: { searchParams: Promise<{ slide?: string }> }) {
  const { slide } = await searchParams;
  return <VideoStage slide={slide ?? 'balance'} />;
}
