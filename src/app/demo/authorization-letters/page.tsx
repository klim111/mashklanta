'use client';

import { useEffect, useState } from 'react';
import { AuthorizationLettersModule } from '@/components/plan/authorization/AuthorizationLettersModule';
import { DemoScreenGate } from '@/demo/components/DemoScreenGate';
import { DEMO_PLAN_ID } from '@/lib/demo-plan';

/** כתבי ההסמכה על תהליך ההדגמה — לסרטון השיווק (scripts/marketing-video) */
function Screen() {
  return (
    <DemoScreenGate flowId="marketing">
      <AuthorizationLettersModule planId={DEMO_PLAN_ID} />
    </DemoScreenGate>
  );
}

/** נטען רק בדפדפן: בהידרציה החנות עדיין ריקה, והשער היה מתחיל הדגמה אחרת */
export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Screen /> : null;
}
