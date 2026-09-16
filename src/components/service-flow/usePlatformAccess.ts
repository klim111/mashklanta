'use client';

import { useCallback, useEffect, useState } from 'react';
import { PLATFORM_MONTHLY_PRICE } from '@/lib/service-flow';

export interface PlatformAccess {
  active: boolean;
  since: string | null;
  monthsPaid: number;
  monthlyPrice: number;
}

const NO_ACCESS: PlatformAccess = {
  active: false,
  since: null,
  monthsPaid: 0,
  monthlyPrice: PLATFORM_MONTHLY_PRICE,
};

/**
 * האם למשתמש המחובר יש גישה מלאה לפלטפורמה.
 *
 * נקרא מהשרת ולא מה-session, כי הרכישה מתבצעת באמצע ההתחברות והטוקן לא
 * מתעדכן — בסיס הנתונים הוא מקור האמת היחיד לשאלה "שילם או לא".
 */
export function usePlatformAccess() {
  const [access, setAccess] = useState<PlatformAccess>(NO_ACCESS);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/access', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as Partial<PlatformAccess>;
      setAccess({
        active: Boolean(body.active),
        since: typeof body.since === 'string' ? body.since : null,
        monthsPaid: typeof body.monthsPaid === 'number' ? body.monthsPaid : 0,
        monthlyPrice: typeof body.monthlyPrice === 'number' ? body.monthlyPrice : PLATFORM_MONTHLY_PRICE,
      });
    } catch {
      setAccess(NO_ACCESS);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { access, ready, refresh };
}
