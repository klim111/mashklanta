'use client';

import { useEffect, useState } from 'react';
import { PlanWorkspace } from '@/components/plan/PlanWorkspace';
import { PlanCompletedDialog } from '@/components/plan/PlanCompletedDialog';
import { DemoScreenGate } from '@/demo/components/DemoScreenGate';
import { DEMO_PLAN_ID } from '@/lib/demo-plan';

/** הברכה בסוף התהליך, מעל תהליך ההדגמה — לסרטון השיווק (scripts/marketing-video) */
function Screen() {
  return (
    <DemoScreenGate flowId="marketing">
      <PlanWorkspace planId={DEMO_PLAN_ID} />
      <PlanCompletedDialog open refinance={false} bank="מזרחי" onDone={() => undefined} />
    </DemoScreenGate>
  );
}

/** נטען רק בדפדפן: בהידרציה החנות עדיין ריקה, והשער היה מתחיל הדגמה אחרת */
export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Screen /> : null;
}
