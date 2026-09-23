'use client';

import { useCallback, useEffect, useState } from 'react';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';

export interface PlatformAccess {
  /** יש גישה פנויה לפתיחת תהליך משכנתא — שולם ועוד לא נקשר לתהליך */
  active: boolean;
  since: string | null;
  /** מה ששולם על הגישה הפנויה — מקוזז אם יוזמן ליווי */
  paid: number;
  price: number;
  accessDays: number;
  passExpiresAt: string | null;
}

const NO_ACCESS: PlatformAccess = {
  active: false,
  since: null,
  paid: 0,
  price: PLATFORM_PROCESS_PRICE,
  accessDays: PLATFORM_ACCESS_DAYS,
  passExpiresAt: null,
};

/**
 * האם למשתמש המחובר יש גישה פנויה לפתיחת תהליך משכנתא.
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
        paid: typeof body.paid === 'number' ? body.paid : 0,
        price: typeof body.price === 'number' ? body.price : PLATFORM_PROCESS_PRICE,
        accessDays: typeof body.accessDays === 'number' ? body.accessDays : PLATFORM_ACCESS_DAYS,
        passExpiresAt: typeof body.passExpiresAt === 'string' ? body.passExpiresAt : null,
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
