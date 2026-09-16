'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientTaskKind, ClientTaskView } from '@/lib/client-tasks';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { isDemoPlan } from '@/lib/demo-plan';

export interface NewClientTaskInput {
  planId: string | null;
  stage: PlanStageId | null;
  kind: ClientTaskKind;
  templateKey: string | null;
  title: string;
  details?: string;
  bank?: string | null;
  /** ISO */
  dueAt: string | null;
  /** מסמך שכבר הועלה לתיק — המשימה נפתחת כבוצעה ומקושרת אליו */
  documentId?: string | null;
}

/** אירוע ששולח כל מופע של ההוק כשמשהו השתנה, כדי שהשלב ולוח השנה יראו אותו דבר */
const CHANGE_EVENT = 'mashklanta:client-tasks-changed';

/**
 * המשימות המתוכננות של הלקוח — לתהליך אחד (מתוך שלב) או לכולן (לוח השנה).
 * בתהליך ההדגמה של הסיור אין משימות, ואין מה לשמור.
 */
export function useClientTasks(options: { planId?: string | null; includeDone?: boolean } = {}) {
  const { planId, includeDone = false } = options;
  const demo = isDemoPlan(planId);
  const [tasks, setTasks] = useState<ClientTaskView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (demo) {
      setReady(true);
      return;
    }
    try {
      const query = new URLSearchParams();
      if (planId) query.set('planId', planId);
      if (includeDone) query.set('all', '1');
      const suffix = query.toString() ? `?${query}` : '';
      const response = await fetch(`/api/client-tasks${suffix}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setTasks(Array.isArray(body) ? body : []);
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את המשימות');
    } finally {
      setReady(true);
    }
  }, [planId, includeDone, demo]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [refresh]);

  const notify = () => window.dispatchEvent(new Event(CHANGE_EVENT));

  const add = useCallback(
    async (input: NewClientTaskInput): Promise<ClientTaskView | null> => {
      if (demo) return null;
      const response = await fetch('/api/client-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'המשימה לא נשמרה');
        return null;
      }
      await refresh();
      notify();
      return body as ClientTaskView;
    },
    [demo, refresh]
  );

  const patch = useCallback(
    async (taskId: string, input: Record<string, unknown>): Promise<boolean> => {
      const response = await fetch(`/api/client-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) return false;
      await refresh();
      notify();
      return true;
    },
    [refresh]
  );

  const complete = useCallback(
    (taskId: string, done = true) => patch(taskId, { status: done ? 'DONE' : 'OPEN' }),
    [patch]
  );

  /** משימת מסמך שבוצעה — נסגרת ומקושרת לקובץ שהועלה */
  const attachDocument = useCallback(
    (taskId: string, documentId: string) => patch(taskId, { status: 'DONE', documentId }),
    [patch]
  );

  const remove = useCallback(
    async (taskId: string): Promise<boolean> => {
      const response = await fetch(`/api/client-tasks/${taskId}`, { method: 'DELETE' });
      if (!response.ok) return false;
      await refresh();
      notify();
      return true;
    },
    [refresh]
  );

  return { tasks, ready, error, refresh, add, complete, attachDocument, remove };
}
