'use client';

import React from 'react';
import { ArrowLeft, ListChecks, Loader2, Sparkles, Wrench } from 'lucide-react';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { demoId } from '@/demo/demo-attr';

/**
 * שער השלב — הבחירה שנפתחת בכל אחד מחמשת השלבים באותו הגיון.
 *
 * לפני שנכנסים לעבודה, הלקוח רואה מה השלב כולל ובוחר: לעשות אותו בעצמו
 * באמצעות משכלנתא, או לתת ליועץ לעשות אותו במקומו (בקשה חינמית — התשלום
 * בהמשך). זה בדיוק אותו שער בכל השלבים, כדי שההתנהגות תהיה זהה.
 */
export function StageGate({
  stage,
  onSelfService,
  onAdvisor,
  busy = false,
}: {
  stage: PlanStageId;
  onSelfService: () => void;
  onAdvisor: () => void;
  busy?: boolean;
}) {
  const journey = journeyStageFor(stage);
  const steps = journey.selfServiceSteps?.slice(0, 4) ?? [];

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <header className="mb-5 text-center">
        <p className="text-xs font-black tracking-wide text-blue-600">{journey.shortTitle}</p>
        <h3 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">
          איך תרצו לעבור את השלב הזה?
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
          {journey.selfServiceSummary || journey.valueDescription}
        </p>
      </header>

      {steps.length > 0 && (
        <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <h4 className="mb-2 flex items-center justify-center gap-1.5 text-sm font-black text-slate-800">
            <ListChecks className="h-4 w-4 text-blue-600" />
            מה כולל השלב
          </h4>
          <ul className="space-y-1.5">
            {steps.map((step) => (
              <li key={step} className="flex items-start gap-2 text-sm font-medium leading-snug text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          {...demoId('plan-stage-gate-self')}
          onClick={onSelfService}
          className="flex flex-col items-center gap-2 rounded-3xl border-2 border-blue-200 bg-blue-50/40 p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
            <Wrench className="h-6 w-6 text-white" />
          </span>
          <span className="text-base font-black text-slate-900">נתחו את הנתונים לבד באמצעות משכלנתא</span>
          <span className="text-sm font-medium leading-snug text-slate-600">
            כל הכלים והמחשבונים בידיים שלכם, צעד אחר צעד
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-blue-700">
            נתחיל
            <ArrowLeft className="h-4 w-4" />
          </span>
        </button>

        <button
          type="button"
          onClick={onAdvisor}
          disabled={busy}
          className="flex flex-col items-center gap-2 rounded-3xl border-2 border-violet-300 bg-violet-50/50 p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg">
            {busy ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Sparkles className="h-6 w-6 text-white" />}
          </span>
          <span className="text-base font-black text-slate-900">
            תנו ליועץ משכלנתא לעשות לכם את העבודה
          </span>
          <span className="text-sm font-medium leading-snug text-slate-600">
            יועץ יטפל בשלב עבורכם ויחזור אליכם לתיאום — בקשה חינמית, התשלום בהמשך
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-violet-700">
            שלחו בקשה ליועץ
            <ArrowLeft className="h-4 w-4" />
          </span>
        </button>
      </div>
    </section>
  );
}
