'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { MortgageGoal, ServiceType } from '@/lib/service-flow';
import { ServiceChooser } from './ServiceChooser';
import { GuidanceRequestDialog } from './GuidanceRequestDialog';
import { GuestAdviceDialog } from './GuestAdviceDialog';

type FlowGoal = 'NEW_MORTGAGE' | 'REFINANCE';

/**
 * "מה תרצו לעשות?" בעמוד הבית.
 *
 * אורח שבוחר משכנתא חדשה או מיחזור נשלח ישר להרשמה, והבחירה שלו ממשיכה
 * אוטומטית באזור האישי אחרי ההתחברות. אורח שבוחר "לקבל ייעוץ והכוונה" ממלא
 * פנייה קצרה (GuestAdviceDialog) ועובר אחריה להרשמה. משתמש מחובר ממשיך לבחירת
 * המסלול כמו קודם.
 */
export function GuestStart({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [request, setRequest] = useState<{ goal: MortgageGoal; service: ServiceType } | null>(null);

  const signedIn = Boolean(session?.user);

  const onSelf = (goal: FlowGoal) => {
    const target = `/dashboard?goal=${goal}&service=SELF`;
    if (signedIn) {
      router.push(target);
      return;
    }
    router.push(`/auth/register?callbackUrl=${encodeURIComponent(target)}`);
  };

  return (
    <>
      <ServiceChooser
        tone={tone}
        onSelf={onSelf}
        goalsGoToSignup={!signedIn}
        onAdvisor={(goal, service) => setRequest({ goal, service })}
        subtitle={
          signedIn
            ? 'בחרו את המטרה, ומיד אחריה — כמה עזרה תרצו בדרך. במסלול העצמאי / ההיברידי התהליך מתחיל מיד; בליווי או בייעוץ יועץ חוזר אליכם.'
            : 'משכנתא חדשה או מיחזור? נרשמים ומתחילים מיד. רוצים קודם לדבר עם יועץ? שלחו פנייה ונחזור אליכם.'
        }
      />

      {request && !signedIn && request.goal === 'ADVICE' && (
        <GuestAdviceDialog
          open
          onOpenChange={(open) => {
            if (!open) setRequest(null);
          }}
        />
      )}

      {request && (signedIn || request.goal !== 'ADVICE') && (
        <GuidanceRequestDialog
          open
          onOpenChange={(open) => {
            if (!open) setRequest(null);
          }}
          goal={request.goal}
          serviceType={request.service}
          mode={signedIn ? 'member' : 'guest'}
          memberName={session?.user?.name ?? undefined}
          memberEmail={session?.user?.email ?? undefined}
        />
      )}
    </>
  );
}
