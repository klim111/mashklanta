'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * זיהוי לקוח שכבר משחק עם המכוונים של הכלי.
 *
 * לקוח שהזיז מכוון שלוש פעמים כבר הבין מה הכלי עושה — זה הרגע להציע לו את
 * המשך התהליך. כל גרירה נספרת כתנועה אחת, גם אם הסליידר מדווח על עשרות
 * עדכונים בדרך, כדי שגרירה אחת ארוכה לא תיחשב כשלוש תנועות. הקריאה חוזרת
 * פעם אחת בלבד.
 */

/** פער זמן שמפריד בין שתי גרירות נפרדות של אותו מכוון */
const GESTURE_GAP_MS = 400;

export function useSliderEngagement({
  enabled,
  movesToTrigger = 3,
  onReached,
}: {
  /** מופעל רק כשיש למי להציע — למשל משתמש שאינו רשום */
  enabled: boolean;
  movesToTrigger?: number;
  onReached: () => void;
}): (controlKey: string) => void {
  const counts = useRef<Record<string, number>>({});
  const lastMoveAt = useRef<Record<string, number>>({});
  const fired = useRef(false);
  const callback = useRef(onReached);

  useEffect(() => {
    callback.current = onReached;
  }, [onReached]);

  return useCallback(
    (controlKey: string) => {
      if (!enabled || fired.current) return;

      const now = Date.now();
      const previous = lastMoveAt.current[controlKey] ?? 0;
      lastMoveAt.current[controlKey] = now;
      if (now - previous < GESTURE_GAP_MS) return;

      const moves = (counts.current[controlKey] ?? 0) + 1;
      counts.current[controlKey] = moves;
      if (moves >= movesToTrigger) {
        fired.current = true;
        callback.current();
      }
    },
    [enabled, movesToTrigger]
  );
}
