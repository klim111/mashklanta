'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlanDocumentView } from '@/lib/plan-documents';

/**
 * המסמכים שהועלו לתהליך.
 *
 * הקבצים עצמם אינם עוברים כאן — רק הרשומות. הצפייה בקובץ נעשית מול מסלול
 * מאומת, כך שאין בדפדפן שום כתובת שמובילה ישירות לאחסון.
 */
export function usePlanDocuments(planId: string) {
  const [documents, setDocuments] = useState<PlanDocumentView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/plans/${planId}/documents`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setDocuments(Array.isArray(body) ? body : []);
    } catch {
      setDocuments([]);
    } finally {
      setReady(true);
    }
  }, [planId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (key: string, name: string, file: File) => {
      setBusyKey(key);
      setError(null);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('key', key);
        form.append('name', name);
        const response = await fetch(`/api/plans/${planId}/documents`, {
          method: 'POST',
          body: form,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error ?? 'ההעלאה נכשלה. נסו שוב.');
          return;
        }
        await refresh();
      } finally {
        setBusyKey(null);
      }
    },
    [planId, refresh]
  );

  const remove = useCallback(
    async (documentId: string, key: string) => {
      setBusyKey(key);
      try {
        await fetch(`/api/plans/${planId}/documents/${documentId}`, { method: 'DELETE' });
        await refresh();
      } finally {
        setBusyKey(null);
      }
    },
    [planId, refresh]
  );

  return { documents, ready, error, busyKey, upload, remove, refresh };
}

/** הכתובת המאומתת שממנה נצפה מסמך — תקפה רק למשתמש המחובר */
export function documentContentUrl(planId: string, documentId: string): string {
  return `/api/plans/${planId}/documents/${documentId}/content`;
}
