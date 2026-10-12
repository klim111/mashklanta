'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlanView } from './usePlan';

/** פתיחת תהליך חדש ומעבר אליו — משותף לסקירה ולאזור המשכנתאות */
export function useStartPlan(start: () => Promise<PlanView>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const startPlan = async () => {
    setBusy(true);
    try {
      const plan = await start();
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      // השגיאה מוצגת דרך usePlans
    } finally {
      setBusy(false);
    }
  };

  return { startPlan, busy };
}
