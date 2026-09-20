'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientTaskState } from '@/lib/client-agenda';

/**
 * המועדים והסימונים שהלקוח קבע למשימות ולהמלצות שלו.
 *
 * המשימות עצמן נגזרות מהנתונים ואינן נשמרות; מה שנשמר הוא רק מה שהלקוח קבע —
 * מתי לבצע, והאם סימן שביצע. השמירה אופטימית: המסך מתעדכן מיד, והשרת מעודכן
 * ברקע, כדי שקביעת מועד לא תרגיש כמו טעינה.
 */
export function useClientTaskStates() {
  const [states, setStates] = useState<Record<string, ClientTaskState>>({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/client-task-states', { cache: 'no-store' });
      if (!response.ok) {
        setStates({});
        return;
      }
      const body = (await response.json()) as Array<{ key: string; due: string | null; done: boolean }>;
      if (!Array.isArray(body)) return;
      setStates(
        Object.fromEntries(body.map((row) => [row.key, { due: row.due, done: row.done }]))
      );
    } catch {
      // בלי חיבור לשרת נשארים עם מה שכבר נטען — המשימות עצמן עדיין מוצגות
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = useCallback(async (key: string, change: Partial<ClientTaskState>) => {
    setStates((current) => {
      const existing: ClientTaskState = current[key] ?? { due: null, done: false };
      return { ...current, [key]: { ...existing, ...change } };
    });
    try {
      await fetch('/api/client-task-states', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...change }),
      });
    } catch {
      // השמירה נכשלה — הערך המקומי יתוקן בטעינה הבאה
    }
  }, []);

  /** קביעת מועד למשימה, או ביטול המועד כש-null */
  const schedule = useCallback((key: string, due: string | null) => patch(key, { due }), [patch]);

  /** סימון "בוצע" / ביטול הסימון */
  const setDone = useCallback((key: string, done: boolean) => patch(key, { done }), [patch]);

  return { states, ready, schedule, setDone, refresh };
}

export type ClientTaskStatesState = ReturnType<typeof useClientTaskStates>;
