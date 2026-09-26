'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlanWorkspace } from '@/components/plan/PlanWorkspace';
import { DemoScreenGate } from '@/demo/components/DemoScreenGate';
import { DEMO_PLAN_ID, DEMO_REFINANCE_PLAN_ID } from '@/lib/demo-plan';

/** התהליך שמוצג: המשכנתא החדשה לדוגמה, או תהליך המיחזור לדוגמה (?plan=demo-refi) */
function DemoPlanWorkspace() {
  const params = useSearchParams();
  const planId = params.get('plan') === DEMO_REFINANCE_PLAN_ID ? DEMO_REFINANCE_PLAN_ID : DEMO_PLAN_ID;
  return <PlanWorkspace key={planId} planId={planId} />;
}

/** שולחן העבודה של חמשת השלבים, על תהליך ההדגמה שחי בדפדפן בלבד */
export default function DemoPlanPage() {
  return (
    <DemoScreenGate flowId="plan-stages">
      <Suspense fallback={null}>
        <DemoPlanWorkspace />
      </Suspense>
    </DemoScreenGate>
  );
}
