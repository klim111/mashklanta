'use client';

import { FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { documentContentUrl } from './usePlanDocuments';

/**
 * צפייה במסמך שהועלה, בחלון צף.
 *
 * הקובץ נטען מהמסלול המאומת של התהליך, ולא מכתובת אחסון — לכן אין כאן קישור
 * שאפשר להעתיק, והצפייה נבדקת מחדש בכל פתיחה. סגירת החלון מחזירה למסך השלב.
 */
export function DocumentViewerDialog({
  planId,
  document,
  onClose,
}: {
  planId: string;
  document: PlanDocumentView | null;
  onClose: () => void;
}) {
  if (!document) return null;
  const src = documentContentUrl(planId, document.id);
  const isImage = document.contentType.startsWith('image/');

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-w-4xl">
        <DialogHeader className="text-center">
          <DialogTitle className="justify-center text-center text-xl">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {document.name}
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-[15px]">
            {document.fileName} · {Math.max(1, Math.round(document.size / 1024))}KB
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={document.name} className="mx-auto max-h-[65vh] w-auto" />
          ) : (
            <iframe
              src={src}
              title={document.name}
              className="h-[65vh] w-full"
              sandbox="allow-same-origin"
            />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mx-auto rounded-2xl bg-slate-900 px-8 py-3 text-[15px] font-black text-white transition-colors hover:bg-slate-700"
        >
          סגירה וחזרה לשלב
        </button>
      </DialogContent>
    </Dialog>
  );
}
