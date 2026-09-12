'use client';

/**
 * שלב 2 — האישור העקרוני.
 *
 * כל ההזנה של השלב נמצאת בטופס איסוף פרטי הבקשה
 * (`src/components/principal-approval`): פרטי הלווים והערבים, ההכנסות, חשבונות
 * הבנק, מקורות המימון, תיק המסמכים והאישורים העקרוניים לפי בנק — כולל הריביות
 * שכל בנק נקב לשלושת הסלים האחידים.
 *
 * השלב עצמו נשאר נקודת החיבור: הוא מתרגם את האישורים שנאספו לנתוני
 * `PlanData.APPLICATIONS` שעליהם נשענים תנאי סגירת השלב והשלבים שאחריו
 * (בניית התמהיל, מכרז הריביות והחתימה).
 */

import { useCallback, useRef } from 'react';
import { PrincipalApproval } from '@/components/principal-approval/PrincipalApproval';
import {
  toPreApprovalData,
  type ApprovalSummary,
} from '@/lib/principal-approval/plan-bridge';
import type { PlanData, PreApprovalData } from '@/lib/mortgage-plan';

export function PreApprovalStage({
  data,
  onChange,
}: {
  data: PlanData;
  onChange: (next: PreApprovalData) => void;
  onGoToProfile: () => void;
}) {
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

  return <PrincipalApproval embedded onApprovals={handleApprovals} />;
}
