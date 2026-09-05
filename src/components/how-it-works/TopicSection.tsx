'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import CardCarousel3D, { type CarouselCardData } from './CardCarousel3D';

interface TopicSectionProps {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  cards: CarouselCardData[];
  variant?: 'track' | 'simple';
  index: number;
}

export default function TopicSection({
  id,
  title,
  subtitle,
  icon: Icon,
  gradient,
  cards,
  variant = 'simple',
  index,
}: TopicSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        'relative py-20 md:py-28 scroll-mt-52 overflow-hidden',
        index % 2 === 0 ? 'bg-white' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40'
      )}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={cn(
            'absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 bg-gradient-to-br',
            gradient
          )}
        />
        <div
          className={cn(
            'absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-15 bg-gradient-to-tr',
            gradient
          )}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-10 md:mb-12"
        >
          <div
            className={cn(
              'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-[0_16px_40px_rgba(15,23,42,0.28)] bg-gradient-to-br text-white',
              gradient
            )}
          >
            <Icon className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">{title}</h2>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"
        >
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-40">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur">
              <p className="mb-3 px-2 text-xs font-black tracking-wide text-slate-500">
                שלבי ההסבר
              </p>
              <ol className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory lg:flex-col lg:overflow-visible lg:gap-1.5">
                {cards.map((card, i) => {
                  const CardIcon = card.icon;
                  const isCurrent = i === activeIndex;
                  return (
                    <li key={card.id} className="min-w-[8.5rem] shrink-0 snap-start sm:min-w-[9.5rem] lg:min-w-0">
                      <button
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-right transition-all',
                          isCurrent
                            ? 'bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.35)]'
                            : 'text-slate-700 hover:bg-slate-100'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black',
                            isCurrent
                              ? `bg-gradient-to-br ${card.gradient} text-white ring-2 ring-white/80`
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {isCurrent ? <CardIcon className="h-4 w-4" /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold leading-snug">
                            {card.shortTitle ?? card.title}
                          </span>
                          <span
                            className={cn(
                              'block text-[11px]',
                              isCurrent ? 'text-white/70' : 'text-slate-400'
                            )}
                          >
                            שלב {i + 1} מתוך {cards.length}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <CardCarousel3D
              cards={cards}
              variant={variant}
              activeIndex={activeIndex}
              onActiveChange={setActiveIndex}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
