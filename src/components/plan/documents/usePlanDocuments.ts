'use client';

import { useCallback, useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { demoDocuments, isDemoPlan } from '@/lib/demo-plan';

/**
 * כל מופעי ההוק מקשיבים לאותו אירוע, כדי שהעלאה מחלון אחד — משימת מסמך,
 * תיק המסמכים או שלב — תרענן מיד את התיק ואת פסי ההתקדמות בכל שאר המסכים.
 */
const CHANGE_EVENT = 'mashklanta:plan-documents-changed';
function notifyChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** תיק המסמכים של תהליך ההדגמה — בזיכרון בלבד, משותף לכל מופעי ההוק */
let demoStore: PlanDocumentView[] | null = null;
function readDemo(): PlanDocumentView[] {
  if (!demoStore) demoStore = demoDocuments();
  return demoStore;
}
function writeDemo(items: PlanDocumentView[]) {
  demoStore = items;
  notifyChanged();
}

/**
 * המסמכים שהועלו לתהליך.
 *
 * הקבצים עצמם אינם עוברים כאן — רק הרשומות. הצפייה בקובץ נעשית מול מסלול
 * מאומת, כך שאין בדפדפן שום כתובת שמובילה ישירות לאחסון.
 */
export function usePlanDocuments(planId: string | null) {
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
    // בלי תהליך אין תיק לטעון — למשל משימה כללית שנוספה מלוח השנה
    if (!planId) {
      setDocuments([]);
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
    const onChange = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [refresh]);

  /**
   * העלאת קובץ.
   *
   * הקובץ עולה ישירות לאחסון עם טוקן שהשרת מנפיק לנתיב אחד בלבד, ולא דרך
   * הפונקציה עצמה — כך גם קובץ סרוק גדול עובר, בלי להיתקל במגבלת גוף הבקשה.
   * אחרי שההעלאה הסתיימה נרשמת הרשומה שמקשרת את הקובץ למסמך בתיק.
   */
  const uploadDocument = useCallback(
    async (key: string, name: string, file: File): Promise<PlanDocumentView | null> => {
      if (!planId) {
        setError('אין תהליך לשייך אליו את המסמך');
        return null;
      }
      setBusyKey(key);
      setError(null);
      if (demo) {
        // בסיור הקובץ אינו עולה לשום מקום — רק הרשומה מופיעה בתיק
        const record: PlanDocumentView = {
          id: `demo-doc-${key}`,
          planId,
          key,
          name,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };
        writeDemo([record, ...readDemo().filter((item) => item.key !== key)]);
        setBusyKey(null);
        return record;
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
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setError(body?.error ?? 'ההעלאה נכשלה. נסו שוב.');
          return null;
        }
        await refresh();
        notifyChanged();
        // הרשומה שנוצרה חוזרת מהשרת — כך אפשר לקשר אותה מיד למשימה שנפתחה
        return (body ?? null) as PlanDocumentView | null;
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'ההעלאה נכשלה. נסו שוב.');
        return null;
      } finally {
        setBusyKey(null);
      }
    },
    [planId, refresh, demo]
  );

  const remove = useCallback(
    async (documentId: string, key: string) => {
      if (!planId) return;
      setBusyKey(key);
      if (demo) {
        writeDemo(readDemo().filter((item) => item.id !== documentId));
        setBusyKey(null);
        return;
      }
      try {
        await fetch(`/api/plans/${planId}/documents/${documentId}`, { method: 'DELETE' });
        await refresh();
        notifyChanged();
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
