'use client';

import { BalanceSlide } from '@/components/home/hero-carousel/SvgSlides';
import { StormSlide } from '@/components/home/hero-carousel/StormSlide';
import { ThreadsSlide } from '@/components/home/hero-carousel/ThreadsSlide';

const SLIDES: Record<string, () => React.ReactNode> = {
  balance: () => <BalanceSlide />,
  storm: () => <StormSlide />,
  threads: () => <ThreadsSlide />,
};

export function VideoStage({ slide }: { slide: string }) {
  const render = SLIDES[slide] ?? SLIDES.balance;
  return (
    <div aria-hidden="true" className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="relative flex h-full w-full items-center justify-center">{render()}</div>
    </div>
  );
}
