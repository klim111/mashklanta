'use client';

import { PlanWorkspace } from '@/components/plan/PlanWorkspace';
import { DemoScreenGate } from '@/demo/components/DemoScreenGate';
import { DEMO_PLAN_ID } from '@/lib/demo-plan';

/** שולחן העבודה של חמשת השלבים, על תהליך ההדגמה שחי בדפדפן בלבד */
export default function DemoPlanPage() {
  return (
    <DemoScreenGate flowId="plan-stages">
      <PlanWorkspace planId={DEMO_PLAN_ID} />
    </DemoScreenGate>
  );
}
