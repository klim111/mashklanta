'use client';

import { useEffect, useState } from 'react';
import { Eye, FileText, Loader2, Lock } from 'lucide-react';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { isAuthorizationDocumentKey } from '@/lib/authorization-letters';
import { SectionCard, EmptyState } from './ui';

/**
 * המסמכים שהלקוח העלה בעצמו באזור האישי.
 *
 * הם נשמרים באחסון פרטי, ולכן גם כאן אין כתובת קובץ — הצפייה נפתחת בלשונית
 * חדשה מול מסלול מאומת, שמוודא שהיועץ באמת מלווה את הלקוח הזה.
 */
export function ClientUploadedDocuments({ clientId }: { clientId: string }) {
  const [documents, setDocuments] = useState<PlanDocumentView[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/clients/${clientId}/plan-documents`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((body) => {
        // כתבי ההסמכה החתומים מוצגים בלשונית משלהם
        if (!cancelled) {
          const rows: PlanDocumentView[] = Array.isArray(body) ? body : [];
          setDocuments(rows.filter((document) => !isAuthorizationDocumentKey(document.key)));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <SectionCard
      title="מסמכים שהלקוח העלה"
      icon={<FileText className="h-4 w-4 text-blue-600" />}
      action={
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
          <Lock className="h-3 w-3" />
          אחסון פרטי
        </span>
      }
    >
      {!ready ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="הלקוח עדיין לא העלה מסמכים"
          hint="מסמכים שהלקוח מעלה בשלב הפרופיל או באישור העקרוני יופיעו כאן."
        />
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-900">{document.name}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {document.fileName} · {new Date(document.uploadedAt).toLocaleDateString('he-IL')}
                </span>
              </span>
              <a
                  href={`/api/plans/${document.planId}/documents/${document.id}/content`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-slate-700"
                >
                  <Eye className="h-3 w-3" />
                  צפייה
                </a>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
