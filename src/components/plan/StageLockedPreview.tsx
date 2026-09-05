'use client';

import { Lock } from 'lucide-react';
import { PLAN_STAGES, stageIndex } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';

export function StageLockedPreview({
  stage,
  unfinished,
  onSelectStage,
}: {
  stage: PlanStageId;
  unfinished: PlanStageId[];
  onSelectStage: (stage: PlanStageId) => void;
}) {
  const journey = journeyStageFor(stage);
  const firstUnfinished = unfinished[0] ?? PLAN_STAGES[0];

  return (
    <div className="mb-5 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white shadow-sm">
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Lock className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-amber-950">השלימו קודם את השלבים הפתוחים</div>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
            אפשר לראות מה הכלי בשלב «{journey.shortTitle}» יודע לעשות, אבל כדי לעבוד בו באמת
            צריך לסגור קודם את מה שעדיין לא הושלם.
          </p>
          <div className="mt-3 rounded-2xl border border-amber-100 bg-white/80 p-3">
            <div className="text-[11px] font-black text-slate-500">מה הכלי בשלב הזה יודע לעשות</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{journey.selfServiceSummary}</p>
            <ul className="mt-2 space-y-1">
              {journey.selfServiceSteps.map((step) => (
                <li key={step} className="text-xs leading-relaxed text-slate-500">
                  • {step}
                </li>
              ))}
            </ul>
          </div>
          <ul className="mt-3 space-y-2">
            {unfinished.map((item) => {
              const info = journeyStageFor(item);
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onSelectStage(item)}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-950 transition-colors hover:border-amber-400 hover:bg-amber-50"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-black">
                      {stageIndex(item) + 1}
                    </span>
                    {info.shortTitle} — טרם הושלם
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => onSelectStage(firstUnfinished)}
            className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-slate-700"
          >
            חזרה להשלמת השלב הפתוח
          </button>
        </div>
      </div>
    </div>
  );
}
