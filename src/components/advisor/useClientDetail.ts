'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClientDocumentStatus } from '@/lib/client-process';
import type { ClientDetail } from './clientDetail';

/**
 * כרטיס הלקוח אצל היועץ: הפרטים, השלב ותיק המסמכים.
 *
 * גם דף הלקוח וגם דף תיק המסמכים עובדים מול אותו מקור, כדי שסימון מסמך במקום
 * אחד ייראה גם בשני בלי טעינה מחדש של הדף.
 */
export function useClientDetail(clientId: string) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    try {
      const response = await fetch(`/api/clients/${clientId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      setClient(await response.json());
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את פרטי הלקוח');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) setClient(await response.json());
    },
    [clientId]
  );

  const setDocumentStatus = useCallback(
    async (documentId: string, next: ClientDocumentStatus) => {
      const response = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, status: next }),
      });
      if (!response.ok) return;
      // רק המסמך שהשתנה מתעדכן, כדי שהסימון יגיב מיד בלי טעינה מחדש של הדף
      const updated = await response.json();
      setClient((current) =>
        current
          ? {
              ...current,
              documents: current.documents.map((doc) =>
                doc.id === updated.id
                  ? { ...doc, status: updated.status, submittedAt: updated.submittedAt }
                  : doc
              ),
            }
          : current
      );
    },
    [clientId]
  );

  return { client, loading, error, refresh, patch, setDocumentStatus };
}
