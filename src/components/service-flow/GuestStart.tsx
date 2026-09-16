'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { MortgageGoal, ServiceType } from '@/lib/service-flow';
import { ServiceChooser } from './ServiceChooser';
import { GuidanceRequestDialog } from './GuidanceRequestDialog';

type FlowGoal = 'NEW_MORTGAGE' | 'REFINANCE';

/**
 * "מה תרצו לעשות?" בעמוד הבית.
 *
 * אורח שבוחר במסלול העצמאי נשלח להרשמה, והבחירה שלו ממשיכה אוטומטית באזור
 * האישי אחרי ההתחברות. אורח שבוחר בליווי או בייעוץ ממלא את פרטיו והבקשה
 * מגיעה ליועצים. משתמש מחובר מקבל את אותה זרימה בדיוק, בלי טופס פרטים.
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
        onAdvisor={(goal, service) => setRequest({ goal, service })}
        subtitle="בחרו את המטרה, ומיד אחריה — כמה עזרה תרצו בדרך. במסלול העצמאי נפתח לכם חשבון וסיור בכלי; בליווי או בייעוץ יועץ חוזר אליכם."
      />

      {request && (
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
