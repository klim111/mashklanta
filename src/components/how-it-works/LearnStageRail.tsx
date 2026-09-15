'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LearnStage = {
  id: string;
  number: number;
  shortTitle: string;
  icon: LucideIcon;
  gradient: string;
};

/**
 * פס השלבים של מרכז הלמידה — באותו סגנון של סרגל חמשת השלבים בכלי תכנון המשכנתא.
 */
export function LearnStageRail({
  stages,
  current,
}: {
  stages: LearnStage[];
  current: string;
}) {
  const currentIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.id === current)
  );
  const fill = stages.length > 1 ? (currentIndex / (stages.length - 1)) * 100 : 0;

  return (
    <div className="relative rounded-3xl bg-white/10 px-2 py-4 ring-1 ring-white/25 md:px-4">
      <div className="absolute top-10 right-[10%] left-[10%] hidden h-1.5 rounded-full bg-cyan-100/55 md:block" />
      <motion.div
        className="absolute top-10 right-[10%] hidden h-1.5 rounded-full bg-gradient-to-l from-cyan-300 via-sky-300 to-emerald-300 shadow-[0_0_12px_rgba(125,211,252,0.65)] md:block"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(fill, 100) * 0.8}%` }}
        transition={{ type: 'spring', stiffness: 110, damping: 22 }}
      />

      <ol className="relative flex snap-x gap-3 overflow-x-auto pb-1 md:grid md:overflow-visible"
        style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
      >
        {stages.map((stage, index) => {
          const isCurrent = stage.id === current;
          const isDone = index < currentIndex;
          const Icon = stage.icon;

          return (
            <li key={stage.id} className="w-[58%] shrink-0 snap-center sm:w-[34%] md:w-auto">
              <a
                href={`#${stage.id}`}
                aria-current={isCurrent ? 'step' : undefined}
                className="group flex w-full cursor-pointer flex-col items-center text-center focus:outline-none"
              >
                <motion.span
                  animate={{ scale: isCurrent ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className={cn(
                    'relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors',
                    isCurrent
                      ? `bg-gradient-to-br ${stage.gradient} text-white ring-2 ring-white`
                      : isDone
                        ? 'bg-emerald-400 text-white ring-2 ring-emerald-100'
                        : 'bg-white/20 text-white ring-2 ring-white/70 group-hover:bg-white/30'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {isCurrent && (
                    <motion.span
                      layoutId="learn-stage-halo"
                      className="absolute -inset-1.5 rounded-3xl border-2 border-cyan-200 shadow-[0_0_16px_rgba(165,243,252,0.55)]"
                    />
                  )}
                </motion.span>

                <span
                  className={cn(
                    'mt-2.5 rounded-full px-2 py-0.5 text-[11px] font-black',
                    isCurrent ? 'bg-white text-slate-900' : 'bg-white/20 text-white'
                  )}
                >
                  שלב {index + 1}
                </span>
                <span
                  className={cn(
                    'mt-1 text-xs font-bold leading-snug drop-shadow',
                    isCurrent ? 'text-white' : 'text-white/90'
                  )}
                >
                  {stage.shortTitle}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
