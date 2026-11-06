'use client';

import { AuthorizationLettersModule } from '@/components/plan/authorization/AuthorizationLettersModule';
import { DemoScreenGate } from '@/demo/components/DemoScreenGate';
import { DEMO_PLAN_ID } from '@/lib/demo-plan';

/** כתבי ההסמכה ליועץ, על תהליך ההדגמה: הפרטים, החתימה והפקת הטופס של כל בנק */
export default function DemoAuthorizationLettersPage() {
  return (
    <DemoScreenGate flowId="client-area">
      <AuthorizationLettersModule planId={DEMO_PLAN_ID} />
    </DemoScreenGate>
  );
}
