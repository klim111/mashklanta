'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { parseClientProfile } from '@/lib/client-profile';
import { disposableIncomeOf } from '@/lib/mortgage-plan';

/**
 * ההכנסה הפנויה של הלקוח, כפי שהיא נגזרת מהנתונים שהוזנו בשלב הראשון —
 * הכנסות משק הבית פחות ההוצאות והחזרי ההלוואות הקיימות.
 *
 * הערך נטען מהפרופיל השמור של המשתמש, ולכן הוא זמין גם כשפותחים את הכלי
 * ישירות ולא מתוך תהליך המשכנתא. מי שלא הזין נתונים מקבל undefined, והמכתב
 * פשוט לא מציג את השורה הזו.
 */
export function useProfileDisposableIncome(): number | undefined {
  const { status } = useSession();
  const [value, setValue] = useState<number | undefined>();

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        if (!response.ok) return;
        const income = disposableIncomeOf(parseClientProfile(await response.json()));
        if (!cancelled && income > 0) setValue(Math.round(income));
      } catch {
        // בלי פרופיל המכתב מוצג בלי ההכנסה הפנויה
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return value;
}
