'use client';

import { ClientDashboard } from '@/components/dashboard/client/ClientDashboard';
import { DemoScreenGate } from '@/demo/components/DemoScreenGate';
import { DEMO_PERSONA } from '@/demo/data/demo-session';

/** האזור האישי האמיתי, על הפרסונה של ההדגמה ועל השרת המדומה */
export default function DemoDashboardPage() {
  return (
    <DemoScreenGate flowId="client-area">
      <ClientDashboard name={DEMO_PERSONA.name} email={DEMO_PERSONA.email} />
    </DemoScreenGate>
  );
}
