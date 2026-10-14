'use client';

import { useEffect, useRef } from 'react';

/**
 * מרענן נתונים בלי שהמשתמש ילחץ "רענון": כל `ms` כל עוד הלשונית גלויה, ומיד
 * כשחוזרים אליה. כך פגישה שהצד השני קבע, אישר או הזיז מופיעה תוך שניות.
 * הטעינה הראשונה נשארת אצל מי שקורא להוק.
 */
export function useLiveRefresh(refresh: () => void, ms: number, enabled = true) {
  const saved = useRef(refresh);
  saved.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === 'visible') saved.current();
    };
    const timer = window.setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [ms, enabled]);
}
