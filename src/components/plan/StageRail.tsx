'use client';

import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId, PlanStageStatus } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';

/**
 * פס ההתקדמות בין חמשת השלבים.
 *
 * שלב שעדיין לא נפתח נעול — כדי לא לאפשר להזין נתונים לשלב שנשען על מידע
 * שטרם נאסף. שלב שנסגר נשאר פתוח לעריכה, כי תמיד אפשר לחזור ולתקן.
 */
export function StageRail({
  current,
  statuses,
  onSelect,
}: {
  current: PlanStageId;
  statuses: Record<PlanStageId, PlanStageStatus>;
  onSelect: (stage: PlanStageId) => void;
}) {
  const done = PLAN_STAGES.filter((stage) => statuses[stage] === 'COMPLETED').length;
  const fill = (done / (PLAN_STAGES.length - 1)) * 100;

  return (
    <div className="relative">
      <div className="absolute top-6 right-[10%] left-[10%] hidden h-1 rounded-full bg-white/10 md:block" />
      <motion.div
        className="absolute top-6 right-[10%] hidden h-1 rounded-full bg-gradient-to-l from-blue-400 via-violet-400 to-emerald-400 md:block"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(fill, 100) * 0.8}%` }}
        transition={{ type: 'spring', stiffness: 110, damping: 22 }}
      />

      <ol className="relative flex snap-x gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:gap-0 md:overflow-visible">
        {PLAN_STAGES.map((stage, index) => {
          const journey = journeyStageFor(stage);
          const status = statuses[stage];
          const isCurrent = stage === current;
          const isLocked = status === 'PENDING';
          const isDone = status === 'COMPLETED';
          const Icon = journey.icon;

          return (
            <li key={stage} className="w-[58%] shrink-0 snap-center sm:w-[34%] md:w-auto">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onSelect(stage)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`group flex w-full flex-col items-center text-center focus:outline-none ${
                  isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <motion.span
                  animate={{ scale: isCurrent ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-colors ${
                    isCurrent
                      ? `bg-gradient-to-br ${journey.gradient} text-white`
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : isLocked
                          ? 'bg-white/5 text-white/30 ring-1 ring-white/10'
                          : 'bg-white/10 text-white/80 ring-1 ring-white/20 group-hover:bg-white/20'
                  }`}
                >
                  {isDone && !isCurrent ? (
                    <Check className="h-5 w-5" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}

                  {isCurrent && (
                    <motion.span
                      layoutId="plan-stage-halo"
                      className="absolute -inset-1.5 rounded-3xl border-2 border-white/40"
                    />
                  )}
                </motion.span>

                <span
                  className={`mt-2.5 text-[11px] font-black transition-colors ${
                    isCurrent ? 'text-white' : isLocked ? 'text-white/30' : 'text-white/60'
                  }`}
                >
                  שלב {index + 1}
                </span>
                <span
                  className={`text-xs font-bold leading-snug transition-colors ${
                    isCurrent ? 'text-white' : isLocked ? 'text-white/30' : 'text-white/70'
                  }`}
                >
                  {journey.shortTitle}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
