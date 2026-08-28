'use client';

import { useRef } from 'react';
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

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        'relative py-20 md:py-28 scroll-mt-24 overflow-hidden',
        index % 2 === 0 ? 'bg-white' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40'
      )}
    >
      {/* Decorative background */}
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

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-12 md:mb-16"
        >
          <div
            className={cn(
              'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg bg-gradient-to-br text-white',
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
        >
          <CardCarousel3D cards={cards} variant={variant} />
        </motion.div>
      </div>
    </section>
  );
}
