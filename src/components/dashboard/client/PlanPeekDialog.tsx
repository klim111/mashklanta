'use client';

import { Check, Eye, Layers, ListChecks, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PLAN_JOURNEY_STAGES, journeyStageFor } from '@/data/platform/planStages';
import { PLAN_STAGES, planStageNumber } from '@/lib/mortgage-plan';
import type { PlanStageStatus } from '@/lib/mortgage-plan';
import { planCreatedLabel, planHeadline } from '@/lib/client-agenda';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { PlanView } from '@/components/plan/usePlan';
import { PlanMixDetail, planMixOf } from './PlanMixDetail';

const STATUS_LABELS: Record<PlanStageStatus, string> = {
  COMPLETED: 'הושלם',
  IN_PROGRESS: 'בעבודה',
  PENDING: 'טרם התחיל',
};

/**
 * הצצה לתהליך — סיכום קצר בלי לעזוב את הדאשבורד.
 *
 * מציג איפה עומד כל אחד מחמשת השלבים, ואת התמהיל: המתומחר אם כבר נבחר, ואחרת
 * זה שנבנה. "הצג את התמהיל בדאשבורד" סוגר את החלון ופותח את אותו תמהיל בשורה
 * שמתחת לרשימת המשכנתאות, כדי להשוות אותו מול שאר המידע שעל המסך.
 */
export function PlanPeekDialog({
  plan,
  mixes,
  advisorStages,
  open,
  onOpenChange,
  onShowMix,
}: {
  plan: PlanView;
  mixes: SavedMix[];
  advisorStages: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowMix: () => void;
}) {
  const byStage = new Map(plan.stages.map((row) => [row.stage, row.status]));
  const mix = planMixOf(plan, mixes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="justify-center text-center text-xl">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              {planHeadline(plan)}
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-[15px]">
            {planCreatedLabel(plan.createdAt)} · שלב {planStageNumber(plan.currentStage)} ·{' '}
            {journeyStageFor(plan.currentStage).shortTitle}
          </DialogDescription>
        </DialogHeader>

        <section>
          <h3 className="mb-2 flex items-center justify-center gap-2 text-[15px] font-black text-slate-800">
            <ListChecks className="h-4 w-4 text-blue-600" />
            חמשת השלבים
          </h3>
          <ol className="space-y-1.5">
            {PLAN_STAGES.map((stage, index) => {
              const status = byStage.get(stage) ?? 'PENDING';
              const journey = PLAN_JOURNEY_STAGES[index];
              const advisor = advisorStages.includes(stage);
              return (
                <li
                  key={stage}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                    status === 'COMPLETED'
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : status === 'IN_PROGRESS'
                        ? 'border-blue-200 bg-blue-50/60'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      status === 'COMPLETED'
                        ? 'bg-emerald-500 text-white'
                        : status === 'IN_PROGRESS'
                          ? `bg-gradient-to-br ${journey.gradient} text-white`
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {status === 'COMPLETED' ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-black text-slate-900">
                    {journey.shortTitle}
                  </span>
                  {advisor && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[13px] font-black text-violet-700">
                      היועץ מטפל
                    </span>
                  )}
                  <span className="text-[13px] font-bold text-slate-500">{STATUS_LABELS[status]}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          {mix ? (
            <PlanMixDetail mix={mix} planId={plan.id} />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-8 text-center">
              <Layers className="h-7 w-7 text-slate-300" />
              <p className="text-[15px] font-bold text-slate-700">עדיין לא נבנה תמהיל בתהליך הזה</p>
              <p className="text-sm text-slate-500">התמהיל נבנה בשלב 2, ומתומחר מול הבנקים בשלב 4.</p>
            </div>
          )}
        </section>

        {mix && (
          <button
            type="button"
            onClick={() => {
              onShowMix();
              onOpenChange(false);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-[15px] font-black text-white transition-colors hover:bg-blue-700"
          >
            <Eye className="h-4 w-4" />
            הצג את התמהיל בדאשבורד
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
