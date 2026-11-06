'use client';

import { DemoCallStage } from '@/components/meeting-call/DemoCallStage';
import { DemoScreenGate } from '@/demo/components/DemoScreenGate';
import { DEMO_PERSONA } from '@/demo/data/demo-session';
import { DEMO_PLAN_ID } from '@/lib/demo-plan';

/** שיחת וידאו עם היועץ, על תהליך ההדגמה: שיתוף מסך, צ'אט ותיק המסמכים של השיחה */
export default function DemoMeetingPage() {
  const startsAt = new Date();
  startsAt.setMinutes(0, 0, 0);
  return (
    <DemoScreenGate flowId="client-area">
      <DemoCallStage
        details={{
          meetingId: 'demo-meeting',
          title: 'פגישת ייעוץ: בחירת התמהיל',
          startsAt: startsAt.toISOString(),
          durationMinutes: 45,
          status: 'CONFIRMED',
          role: 'CLIENT',
          advisorName: 'רון, יועץ משכלנתא',
          clientName: DEMO_PERSONA.firstName,
          clientId: 'demo-client',
          clientUserId: DEMO_PERSONA.id,
          planId: DEMO_PLAN_ID,
          configured: true,
        }}
      />
    </DemoScreenGate>
  );
}
