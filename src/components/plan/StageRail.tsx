'use client';

import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId, PlanStageStatus } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';

/**
 * פס ההתקדמות בין חמשת השלבים.
 *
 * אפשר ללחוץ על כל שלב גם לפני שהקודמים נסגרו — אז מוצגת תצוגה מקדימה.
 * שלב שנסגר נשאר פתוח לעריכה, כי תמיד אפשר לחזור ולתקן.
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
    <div className="relative rounded-3xl bg-white/10 px-2 py-4 ring-1 ring-white/25 md:px-4">
      <div className="absolute top-10 right-[10%] left-[10%] hidden h-1.5 rounded-full bg-cyan-100/55 md:block" />
      <motion.div
        className="absolute top-10 right-[10%] hidden h-1.5 rounded-full bg-gradient-to-l from-cyan-300 via-sky-300 to-emerald-300 shadow-[0_0_12px_rgba(125,211,252,0.65)] md:block"
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
                onClick={() => onSelect(stage)}
                aria-current={isCurrent ? 'step' : undefined}
                className="group flex w-full cursor-pointer flex-col items-center text-center focus:outline-none"
              >
                <motion.span
                  animate={{ scale: isCurrent ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors ${
                    isCurrent
                      ? `bg-gradient-to-br ${journey.gradient} text-white ring-2 ring-white`
                      : isDone
                        ? 'bg-emerald-400 text-white ring-2 ring-emerald-100'
                        : isLocked
                          ? 'bg-slate-900/70 text-cyan-50 ring-2 ring-cyan-200/80'
                          : 'bg-white/20 text-white ring-2 ring-white/70 group-hover:bg-white/30'
                  }`}
                >
                  {isDone && !isCurrent ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}

                  {isLocked && !isCurrent && (
                    <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 ring-2 ring-cyan-200">
                      <Lock className="h-2.5 w-2.5 text-cyan-100" />
                    </span>
                  )}

                  {isCurrent && (
                    <motion.span
                      layoutId="plan-stage-halo"
                      className="absolute -inset-1.5 rounded-3xl border-2 border-cyan-200 shadow-[0_0_16px_rgba(165,243,252,0.55)]"
                    />
                  )}
                </motion.span>

                <span
                  className={`mt-2.5 rounded-full px-2 py-0.5 text-[11px] font-black ${
                    isCurrent
                      ? 'bg-white text-slate-900'
                      : isLocked
                        ? 'bg-white/15 text-cyan-50'
                        : 'bg-white/20 text-white'
                  }`}
                >
                  שלב {index + 1}
                </span>
                <span
                  className={`mt-1 text-xs font-bold leading-snug drop-shadow ${
                    isCurrent ? 'text-white' : isLocked ? 'text-cyan-50' : 'text-white'
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
