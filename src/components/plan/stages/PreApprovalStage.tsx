'use client';

/**
 * שלב האישור העקרוני.
 *
 * שני מסכים שונים לשני תפקידים:
 *
 * אצל **היועץ** — טופס איסוף פרטי הבקשה המלא
 * (`src/components/principal-approval`) על כל תת-השלבים שלו: הלווים והערבים,
 * ההכנסות, חשבונות הבנק, מקורות המימון, תיק המסמכים והאישורים העקרוניים לפי
 * בנק, כולל הריביות שכל בנק נקב לשלושת הסלים האחידים.
 *
 * אצל **הלקוח** שמגיש בעצמו — התמהיל שנבחר, לקריאה בלבד, ומתחתיו אזור לכל
 * בנק: קישור להגשה הדיגיטלית והעלאת האישור העקרוני שהתקבל. הבנקים שהתקבל
 * מהם אישור הם אלה שנפתחים לתמחור בשלב המכרז.
 *
 * בשני המקרים השלב מזין את `PlanData.APPLICATIONS`, שעליו נשענים תנאי סגירת
 * השלב והשלבים שאחריו.
 */

import { useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { PrincipalApproval } from '@/components/principal-approval/PrincipalApproval';
import {
  toPreApprovalData,
  type ApprovalSummary,
} from '@/lib/principal-approval/plan-bridge';
import type { PlanData, PreApprovalData } from '@/lib/mortgage-plan';
import { SelfPreApproval } from './preapproval/SelfPreApproval';

export function PreApprovalStage({
  data,
  planId,
  onChange,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: PreApprovalData) => void;
  onGoToProfile: () => void;
}) {
  const { data: session } = useSession();
  const isAdvisor = session?.user?.role === 'ADVISOR';

  // The latest stage data, read inside the callback without re-subscribing to it.
  const current = useRef(data.APPLICATIONS);
  current.current = data.APPLICATIONS;
  const lastPushed = useRef<string | null>(null);

  const handleApprovals = useCallback(
    (approvals: ApprovalSummary[]) => {
      const next = toPreApprovalData(current.current, approvals);
      const serialized = JSON.stringify(next);
      // Only write when something actually changed, so this cannot loop.
      if (serialized === lastPushed.current || serialized === JSON.stringify(current.current)) return;
      lastPushed.current = serialized;
      onChange(next);
    },
    [onChange],
  );

  if (isAdvisor) return <PrincipalApproval embedded onApprovals={handleApprovals} />;

  return <SelfPreApproval data={data} planId={planId} onChange={onChange} />;
}
