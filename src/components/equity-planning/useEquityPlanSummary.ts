'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { equityCalendarExpenses } from '@/lib/equity-planning';
import type { EquityCalendarExpense, EquityPlanView } from '@/lib/equity-planning';
import { EQUITY_PLAN_CHANGED_EVENT } from './useEquityPlan';

/**
 * התכנון השמור של הלקוח, לקריאה בלבד — לדאשבורד וללוח השנה.
 *
 * בניגוד ל-`useEquityPlan`, שמחזיק את מצב העריכה בכלי, ההוק הזה רק טוען את מה
 * שכבר נשמר בחשבון: תמונת המצב לסקירה, והתשלומים עם המועדים שנכנסים ללוח
 * השנה הראשי.
 */
export function useEquityPlanSummary() {
  const { status } = useSession();
  const [plan, setPlan] = useState<EquityPlanView | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') {
      setPlan(null);
      setReady(status !== 'loading');
      return;
    }
    try {
      const response = await fetch('/api/equity-plans', { cache: 'no-store' });
      setPlan(response.ok ? ((await response.json()) as EquityPlanView | null) : null);
    } catch {
      setPlan(null);
    } finally {
      setReady(true);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
    // הכלי פתוח בתוך האזור האישי — כל שמירה שלו מעדכנת גם את הסקירה והלוח
    const onChange = () => void refresh();
    window.addEventListener(EQUITY_PLAN_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(EQUITY_PLAN_CHANGED_EVENT, onChange);
  }, [refresh]);

  // מיוצב כדי שלוח השנה של הדאשבורד לא יחושב מחדש בכל רינדור
  const expenses: EquityCalendarExpense[] = useMemo(() => equityCalendarExpenses(plan), [plan]);

  return { plan, expenses, ready, refresh };
}
