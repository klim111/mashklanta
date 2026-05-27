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
}

const SWIPE_THRESHOLD = 50;

/** קצב אחיד וחלק — בלי האטה בסיום */
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
}: CardCarousel3DProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (index: number, dir: number) => {
      const next = ((index % cards.length) + cards.length) % cards.length;
      setDirection(dir);
      setActiveIndex(next);
    },
    [cards.length]
  );

  const next = useCallback(() => goTo(activeIndex + 1, 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1, -1), [activeIndex, goTo]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) next();
    else if (info.offset.x > SWIPE_THRESHOLD) prev();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) &&
          document.activeElement?.tagName !== 'BODY') return;
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
      {/* 3D stage */}
      <div
        className="relative mx-auto h-[420px] sm:h-[460px] md:h-[480px] max-w-5xl"
        style={{ perspective: '1400px', perspectiveOrigin: '50% 40%' }}
      >
        {/* Background glow */}
        <div
          className={cn(
            'absolute inset-x-8 top-1/2 -translate-y-1/2 h-64 rounded-full blur-3xl opacity-30 transition-all duration-300 ease-in-out bg-gradient-to-r',
            card.gradient
          )}
        />

        {/* Side peek cards */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {cards.map((c, i) => {
            const offset = i - activeIndex;
            if (offset === 0 || Math.abs(offset) > 2) return null;
            const isCenter = offset === 0;
            if (isCenter) return null;

            const SideIcon = c.icon;
            return (
              <motion.div
                key={c.id}
                initial={false}
                animate={{
                  x: offset * 220,
                  z: -120,
                  rotateY: offset * -28,
                  opacity: 0.35,
                  scale: 0.82,
                }}
                transition={SIDE_UNIFORM_TRANSITION}
                className="absolute w-[280px] sm:w-[300px]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className={cn(
                    'h-[320px] rounded-2xl bg-gradient-to-br p-[2px] shadow-xl',
                    c.gradient
                  )}
                >
                  <div className="h-full rounded-2xl bg-white/90 backdrop-blur p-6 flex flex-col items-center justify-center text-center">
                    <SideIcon className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="font-bold text-gray-700 text-lg">{c.shortTitle ?? c.title}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Center card */}
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
              className="relative w-[min(92vw,380px)] sm:w-[400px] md:w-[420px] cursor-grab active:cursor-grabbing z-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className={cn(
                  'rounded-3xl bg-gradient-to-br p-[3px] shadow-2xl shadow-blue-900/20',
                  'ring-1 ring-white/40',
                  card.gradient
                )}
              >
                <div className="rounded-[22px] bg-white/95 backdrop-blur-xl overflow-hidden min-h-[380px] sm:min-h-[400px] flex flex-col">
                  {/* Header */}
                  <div
                    className={cn(
                      'px-6 py-5 bg-gradient-to-l text-white relative overflow-hidden',
                      card.gradient
                    )}
                  >
                    <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full bg-white/5" />
                    <div className="relative flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-white/20 backdrop-blur shrink-0">
                        <Icon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {card.tag && (
                          <span className="inline-block text-xs font-medium bg-white/25 px-2 py-0.5 rounded-full mb-1">
                            {card.tag}
                          </span>
                        )}
                        <h3 className="text-xl font-bold leading-tight">{card.title}</h3>
                        {card.subtitle && (
                          <p className="text-sm text-white/80 mt-0.5">{card.subtitle}</p>
                        )}
                      </div>
                      <Sparkles className="w-5 h-5 text-white/50 shrink-0 animate-pulse" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 px-6 py-5 overflow-y-auto text-right space-y-4">
                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{text}</p>

                    {variant === 'track' && card.advantages && card.advantages.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>יתרונות</span>
                        </div>
                        <ul className="space-y-1.5 pr-1">
                          {card.advantages.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-gray-600 flex gap-2 items-start"
                            >
                              <span className="text-emerald-500 mt-1 shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {variant === 'track' && card.risks && card.risks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>סיכונים</span>
                        </div>
                        <ul className="space-y-1.5 pr-1">
                          {card.risks.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-gray-600 flex gap-2 items-start"
                            >
                              <span className="text-amber-500 mt-1 shrink-0">•</span>
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
                            className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-700"
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

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          type="button"
          onClick={prev}
          aria-label="כרטיסיה קודמת"
          className="p-3 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
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
          className="p-3 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
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
