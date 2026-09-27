'use client';

import { useCallback, useEffect, useState } from 'react';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';
import { MAX_OPEN_PROCESSES } from '@/lib/process-access';

export interface PlatformAccess {
  /** יש חבילת גישה פנויה לפתיחת תהליך משכנתא בלי תשלום נוסף */
  active: boolean;
  since: string | null;
  /** מה ששולם על הגישה הפנויה — מקוזז אם יוזמן ליווי */
  paid: number;
  price: number;
  accessDays: number;
  passExpiresAt: string | null;
  openProcesses: number;
  maxOpenProcesses: number;
  /** עד שני תהליכים פתוחים במקביל — כשמלא, צריך לסיים או למחוק תהליך */
  canOpenMore: boolean;
}

const NO_ACCESS: PlatformAccess = {
  active: false,
  since: null,
  paid: 0,
  price: PLATFORM_PROCESS_PRICE,
  accessDays: PLATFORM_ACCESS_DAYS,
  passExpiresAt: null,
  openProcesses: 0,
  maxOpenProcesses: MAX_OPEN_PROCESSES,
  canOpenMore: true,
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
        openProcesses: typeof body.openProcesses === 'number' ? body.openProcesses : 0,
        maxOpenProcesses: typeof body.maxOpenProcesses === 'number' ? body.maxOpenProcesses : MAX_OPEN_PROCESSES,
        canOpenMore: body.canOpenMore !== false,
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
