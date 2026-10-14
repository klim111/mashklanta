'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientActivity } from '@/lib/client-activity';

/** סיכום הפעילות של לקוח — לטאב "סיכום פעילות" וללוח הבקרה בדף הלקוח */
export function useClientActivity(clientId: string, enabled = true) {
  const [activity, setActivity] = useState<ClientActivity | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!clientId || !enabled) return;
    try {
      const response = await fetch(`/api/clients/${clientId}/activity`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      setActivity(await response.json());
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את סיכום הפעילות');
    } finally {
      setReady(true);
    }
  }, [clientId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activity, ready, error, refresh };
}
