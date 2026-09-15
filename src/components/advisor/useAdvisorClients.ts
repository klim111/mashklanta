'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientStage } from '@/lib/client-process';
import type { PlanStageId } from '@/lib/advisor-crm';

export interface AdvisorClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'POTENTIAL' | 'ACTIVE' | 'IN_PROCESS';
  stage: ClientStage;
  progress: number;
  propertyValue: number | null;
  mortgageAmount: number | null;
  mixCount: number;
  incomeBucket: 'UNDER_10K' | 'FROM_10K_TO_15K' | 'FROM_15K_TO_25K' | 'FROM_25K_TO_40K' | 'ABOVE_40K' | null;
  openDocuments: number;
  /** משימות של היועץ שעדיין פתוחות עבור הלקוח */
  openTasks: number;
  /** הפגישה הקרובה שנקבעה עם הלקוח */
  nextMeetingAt: string | null;
  /** השלב בכלי תכנון המשכנתא — אותם חמישה שלבים שהלקוח רואה אצלו */
  planStage: PlanStageId | null;
  planProgress: number;
  updatedAt: string;
}

interface AddClientInput {
  email: string;
  name?: string;
  phone?: string;
}

/**
 * הלקוחות של היועץ המחובר, מבסיס הנתונים.
 *
 * הרשימה נטענת פעם אחת ומתרעננת אחרי כל שינוי, כדי שכל מסך שמציג לקוחות —
 * לוח היועץ וכלי התכנון — יראה בדיוק את אותם נתונים.
 */
export function useAdvisorClients(enabled = true) {
  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setReady(true);
      return;
    }
    try {
      const response = await fetch('/api/clients', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setClients(Array.isArray(body) ? body : []);
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את רשימת הלקוחות');
    } finally {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** צירוף לקוח קיים. מחזיר הודעת שגיאה בעברית, או null כשהצליח */
  const addClient = useCallback(
    async (input: AddClientInput): Promise<string | null> => {
      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) return body?.error ?? 'הוספת הלקוח נכשלה';
        await refresh();
        return null;
      } catch {
        return 'הוספת הלקוח נכשלה';
      }
    },
    [refresh]
  );

  return { clients, ready, error, refresh, addClient };
}
