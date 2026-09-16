'use client';

import { useCallback, useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { demoDocuments, isDemoPlan } from '@/lib/demo-plan';

/** תיק המסמכים של תהליך ההדגמה — בזיכרון בלבד, משותף לכל מופעי ההוק */
let demoStore: PlanDocumentView[] | null = null;
const DEMO_EVENT = 'mashklanta:demo-documents-changed';
function readDemo(): PlanDocumentView[] {
  if (!demoStore) demoStore = demoDocuments();
  return demoStore;
}
function writeDemo(items: PlanDocumentView[]) {
  demoStore = items;
  window.dispatchEvent(new Event(DEMO_EVENT));
}

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
  const demo = isDemoPlan(planId);

  const refresh = useCallback(async () => {
    if (demo) {
      setDocuments(readDemo());
      setReady(true);
      return;
    }
    try {
      const response = await fetch(`/api/plans/${planId}/documents`, { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        // תקלת הגדרה — טבלה שלא נוצרה או אחסון שלא הוגדר — נאמרת במפורש
        setError(typeof body?.error === 'string' ? body.error : 'לא הצלחנו לטעון את המסמכים');
        setDocuments([]);
        return;
      }
      setDocuments(Array.isArray(body) ? body : []);
      setError(null);
    } catch {
      setDocuments([]);
    } finally {
      setReady(true);
    }
  }, [planId, demo]);

  useEffect(() => {
    void refresh();
    if (!demo) return;
    const onChange = () => void refresh();
    window.addEventListener(DEMO_EVENT, onChange);
    return () => window.removeEventListener(DEMO_EVENT, onChange);
  }, [refresh, demo]);

  /**
   * העלאת קובץ.
   *
   * הקובץ עולה ישירות לאחסון עם טוקן שהשרת מנפיק לנתיב אחד בלבד, ולא דרך
   * הפונקציה עצמה — כך גם קובץ סרוק גדול עובר, בלי להיתקל במגבלת גוף הבקשה.
   * אחרי שההעלאה הסתיימה נרשמת הרשומה שמקשרת את הקובץ למסמך בתיק.
   */
  const uploadDocument = useCallback(
    async (key: string, name: string, file: File) => {
      setBusyKey(key);
      setError(null);
      if (demo) {
        // בסיור הקובץ אינו עולה לשום מקום — רק הרשומה מופיעה בתיק
        writeDemo([
          {
            id: `demo-doc-${key}`,
            planId,
            key,
            name,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          },
          ...readDemo().filter((item) => item.key !== key),
        ]);
        setBusyKey(null);
        return;
      }
      try {
        const blob = await upload(`plans/${planId}/${key}`, file, {
          access: 'private',
          handleUploadUrl: `/api/plans/${planId}/documents/upload`,
          contentType: file.type,
        });

        const response = await fetch(`/api/plans/${planId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            name,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            blobPath: blob.pathname,
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error ?? 'ההעלאה נכשלה. נסו שוב.');
          return;
        }
        await refresh();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'ההעלאה נכשלה. נסו שוב.');
      } finally {
        setBusyKey(null);
      }
    },
    [planId, refresh, demo]
  );

  const remove = useCallback(
    async (documentId: string, key: string) => {
      setBusyKey(key);
      if (demo) {
        writeDemo(readDemo().filter((item) => item.id !== documentId));
        setBusyKey(null);
        return;
      }
      try {
        await fetch(`/api/plans/${planId}/documents/${documentId}`, { method: 'DELETE' });
        await refresh();
      } finally {
        setBusyKey(null);
      }
    },
    [planId, refresh, demo]
  );

  return { documents, ready, error, busyKey, upload: uploadDocument, remove, refresh };
}

/** הכתובת המאומתת שממנה נצפה מסמך — תקפה רק למשתמש המחובר */
export function documentContentUrl(planId: string, documentId: string): string {
  return `/api/plans/${planId}/documents/${documentId}/content`;
}
