'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { MixData } from '@/lib/mortgage-plan';
import { usePlan } from '@/components/plan/usePlan';
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
}: {
  clientId: string;
  clientName: string;
  planId: string | null;
}) {
  const { plan, ready, updateStage } = usePlan(planId ?? '');

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

  return (
    <div className="space-y-4">
      <AdvisorMixBroadcast clientId={clientId} clientName={clientName} planId={planId} />

      <MixStage
        data={plan.data}
        planId={plan.id}
        clientId={clientId}
        onChange={(next: MixData) => updateStage('MIX', next)}
      />
    </div>
  );
}
