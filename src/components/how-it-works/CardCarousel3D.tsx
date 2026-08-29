'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CarouselCardData {
  id: string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  advantages?: string[];
  risks?: string[];
  highlights?: string[];
  icon: LucideIcon;
  gradient: string;
  tag?: string;
}

interface CardCarousel3DProps {
  cards: CarouselCardData[];
  variant?: 'track' | 'simple';
  className?: string;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}

const SWIPE_THRESHOLD = 50;

const UNIFORM_TRANSITION = {
  type: 'tween' as const,
  duration: 0.34,
  ease: 'linear' as const,
};

const SIDE_UNIFORM_TRANSITION = {
  type: 'tween' as const,
  duration: 0.3,
  ease: 'linear' as const,
};

export default function CardCarousel3D({
  cards,
  variant = 'simple',
  className,
  activeIndex: controlledIndex,
  onActiveChange,
}: CardCarousel3DProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = controlledIndex ?? internalIndex;
  const prevIndexRef = useRef(activeIndex);

  useEffect(() => {
    if (prevIndexRef.current === activeIndex) return;
    setDirection(activeIndex > prevIndexRef.current ? 1 : -1);
    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  const goTo = useCallback(
    (index: number, dir: number) => {
      const next = ((index % cards.length) + cards.length) % cards.length;
      setDirection(dir);
      if (controlledIndex === undefined) setInternalIndex(next);
      onActiveChange?.(next);
    },
    [cards.length, controlledIndex, onActiveChange]
  );

  const next = useCallback(() => goTo(activeIndex + 1, 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1, -1), [activeIndex, goTo]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) next();
    else if (info.offset.x > SWIPE_THRESHOLD) prev();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        !containerRef.current?.contains(document.activeElement) &&
        document.activeElement?.tagName !== 'BODY'
      )
        return;
      if (e.key === 'ArrowLeft') next();
      if (e.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const card = cards[activeIndex];
  const Icon = card.icon;
  const text = card.description ?? card.body ?? '';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)} tabIndex={0}>
      <div
        className="relative mx-auto h-[520px] sm:h-[580px] md:h-[640px] max-w-6xl"
        style={{ perspective: '1600px', perspectiveOrigin: '50% 40%' }}
      >
        <div
          className={cn(
            'absolute inset-x-4 top-1/2 -translate-y-1/2 h-80 rounded-full blur-3xl opacity-40 transition-all duration-300 ease-in-out bg-gradient-to-r',
            card.gradient
          )}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {cards.map((c, i) => {
            const offset = i - activeIndex;
            if (offset === 0 || Math.abs(offset) > 2) return null;

            const SideIcon = c.icon;
            return (
              <motion.div
                key={c.id}
                initial={false}
                animate={{
                  x: offset * 280,
                  z: -140,
                  rotateY: offset * -26,
                  opacity: 0.32,
                  scale: 0.84,
                }}
                transition={SIDE_UNIFORM_TRANSITION}
                className="absolute w-[320px] sm:w-[360px]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className={cn(
                    'h-[380px] rounded-3xl bg-gradient-to-br p-[2px] shadow-[0_28px_70px_rgba(15,23,42,0.55)]',
                    c.gradient
                  )}
                >
                  <div className="h-full rounded-3xl bg-white p-8 flex flex-col items-center justify-center text-center border border-slate-200">
                    <SideIcon className="w-12 h-12 text-slate-500 mb-3" />
                    <p className="font-bold text-slate-800 text-xl">{c.shortTitle ?? c.title}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="sync" initial={false} custom={direction}>
            <motion.div
              key={card.id}
              custom={direction}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              dragTransition={{ power: 0.2, timeConstant: 200 }}
              onDragEnd={handleDragEnd}
              initial={{
                opacity: 0,
                x: direction * 72,
                rotateY: direction * -16,
                scale: 0.94,
                z: -60,
                filter: 'blur(4px)',
              }}
              animate={{
                opacity: 1,
                rotateY: 0,
                scale: 1,
                x: 0,
                z: 0,
                filter: 'blur(0px)',
              }}
              exit={{
                opacity: 0,
                x: direction * -72,
                rotateY: direction * 16,
                scale: 0.94,
                z: -60,
                filter: 'blur(4px)',
              }}
              transition={UNIFORM_TRANSITION}
              className="relative w-[min(94vw,560px)] sm:w-[540px] md:w-[620px] cursor-grab active:cursor-grabbing z-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className={cn(
                  'rounded-3xl bg-gradient-to-br p-[3px]',
                  'shadow-[0_40px_110px_rgba(15,23,42,0.62),0_18px_40px_rgba(15,23,42,0.4),0_0_0_1px_rgba(15,23,42,0.18)]',
                  'ring-1 ring-slate-900/15',
                  card.gradient
                )}
              >
                <div className="rounded-[22px] bg-white overflow-hidden min-h-[460px] sm:min-h-[500px] md:min-h-[540px] flex flex-col">
                  <div
                    className={cn(
                      'px-8 py-7 bg-gradient-to-l text-white relative overflow-hidden',
                      card.gradient
                    )}
                  >
                    <div className="absolute inset-0 bg-slate-950/35" />
                    <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                    <div className="absolute -bottom-4 -right-4 w-36 h-36 rounded-full bg-white/5" />
                    <div className="relative flex items-start gap-4">
                      <div className="p-3.5 rounded-2xl bg-white/20 backdrop-blur shrink-0">
                        <Icon className="w-9 h-9 text-white drop-shadow" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {card.tag && (
                          <span className="inline-block text-xs font-semibold bg-white/25 text-white px-2.5 py-0.5 rounded-full mb-1.5">
                            {card.tag}
                          </span>
                        )}
                        <h3 className="text-2xl md:text-3xl font-black leading-tight text-white drop-shadow-sm">
                          {card.title}
                        </h3>
                        {card.subtitle && (
                          <p className="text-base text-white/95 mt-1 font-medium">{card.subtitle}</p>
                        )}
                      </div>
                      <Sparkles className="w-5 h-5 text-white/80 shrink-0 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex-1 px-8 py-6 overflow-y-auto text-right space-y-5 bg-slate-50">
                    <p className="text-slate-800 leading-relaxed text-base md:text-lg font-medium">
                      {text}
                    </p>

                    {variant === 'track' && card.advantages && card.advantages.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          <span>יתרונות</span>
                        </div>
                        <ul className="space-y-2 pr-1">
                          {card.advantages.map((item, idx) => (
                            <li key={idx} className="text-base text-slate-700 flex gap-2 items-start">
                              <span className="text-emerald-500 mt-1.5 shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {variant === 'track' && card.risks && card.risks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 font-bold">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          <span>סיכונים</span>
                        </div>
                        <ul className="space-y-2 pr-1">
                          {card.risks.map((item, idx) => (
                            <li key={idx} className="text-base text-slate-700 flex gap-2 items-start">
                              <span className="text-amber-500 mt-1.5 shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {variant === 'simple' && card.highlights && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {card.highlights.map((h) => (
                          <span
                            key={h}
                            className="text-sm font-semibold px-3.5 py-1.5 rounded-full bg-slate-200 text-slate-800"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          type="button"
          onClick={prev}
          aria-label="כרטיסיה קודמת"
          className="p-3 rounded-full bg-white border border-gray-200 shadow-[0_12px_30px_rgba(15,23,42,0.22)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.3)] hover:border-blue-300 hover:bg-blue-50 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-blue-700" />
        </button>

        <div className="flex items-center gap-2 px-2">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => goTo(i, i > activeIndex ? 1 : -1)}
              aria-label={`עבור ל${c.shortTitle ?? c.title}`}
              className={cn(
                'rounded-full transition-all duration-300 ease-out',
                i === activeIndex
                  ? 'w-8 h-2.5 bg-blue-600'
                  : 'w-2.5 h-2.5 bg-gray-300 hover:bg-blue-300'
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="כרטיסיה הבאה"
          className="p-3 rounded-full bg-white border border-gray-200 shadow-[0_12px_30px_rgba(15,23,42,0.22)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.3)] hover:border-blue-300 hover:bg-blue-50 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-blue-700" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        גרור את הכרטיסיה או השתמש בחצים • {activeIndex + 1} מתוך {cards.length}
      </p>
    </div>
  );
}
