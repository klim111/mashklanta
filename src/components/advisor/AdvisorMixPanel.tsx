'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { planFlowOf } from '@/lib/mortgage-plan';
import type { MixData } from '@/lib/mortgage-plan';
import { useMarketRates } from '@/hooks/useMarketRates';
import { RefinanceMixStage } from '@/components/plan/stages/refinance/RefinanceMixStage';
import { AdvisorRefinanceBroadcast } from './AdvisorRefinanceBroadcast';
import type { AdvisorPlanDraft } from './useAdvisorPlanDraft';
import { MixStage } from '@/components/plan/stages/MixStage';
import { StagePanel } from '@/components/plan/stages/auction/ui';
import { AdvisorMixBroadcast } from './AdvisorMixBroadcast';

/**
 * שלב בניית התמהיל אצל היועץ.
 *
 * זה אותו מסך בדיוק שהלקוח רואה, ולכן הוא בנוי מאותו רכיב: אותו כלי, אותם
 * כפתורים, אותה התנהגות. ההבדל היחיד הוא אזור השידור שמעליו — מה שהיועץ
 * שומר נשאר אצלו עד שישדר אותו ללקוח.
 */
export function AdvisorMixPanel({
  clientId,
  clientName,
  planId,
  draft,
}: {
  clientId: string;
  clientName: string;
  planId: string | null;
  /** התהליך של הלקוח עם הטיוטה של היועץ — מה שמשתנה כאן מחכה ל"שדר" */
  draft: AdvisorPlanDraft;
}) {
  const { plan, ready, updateStage } = draft;
  const { market } = useMarketRates();

  if (!planId) {
    return (
      <StagePanel
        title="הלקוח עדיין לא פתח תהליך"
        description="כלי בניית התמהיל בשלב הזה עובד בתוך תהליך משכנתא. פתחו ללקוח תהליך, או בקשו ממנו לפתוח אחד, כדי לעבוד כאן."
      >
        <div />
      </StagePanel>
    );
  }

  if (!ready || !plan) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  /*
    לקוח במיחזור רואה בשלב הזה את כלי המיחזור, ולכן גם היועץ: אותו כלי, ומה
    שהיועץ שומר נשאר טיוטה שלו עד שהוא משדר אותה — בדיוק כמו במשכנתא חדשה.
  */
  if (planFlowOf(plan.data).kind === 'REFINANCE') {
    return (
      <div className="space-y-4">
        <AdvisorRefinanceBroadcast
          clientId={clientId}
          clientName={clientName}
          planId={plan.id}
          mix={plan.data.MIX}
          onChange={(next: MixData) => {
            // שידור התמהיל למיחזור הוא גם שידור של השלב
            updateStage('MIX', next);
            void draft.broadcast('MIX');
          }}
        />
        <RefinanceMixStage
          data={plan.data}
          planId={plan.id}
          market={market}
          advisorClientId={clientId}
          onChange={(next: MixData) => updateStage('MIX', next)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdvisorMixBroadcast clientId={clientId} clientName={clientName} planId={planId} />

      <MixStage
        data={plan.data}
        planId={plan.id}
        clientId={clientId}
        onChange={(next: MixData) => updateStage('MIX', next)}
        onAnalysisChange={(next) => updateStage('ANALYSIS', next)}
      />
    </div>
  );
}
