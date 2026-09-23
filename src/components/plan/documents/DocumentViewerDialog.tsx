'use client';

import { Download, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { documentContentUrl, documentDownloadUrl } from './usePlanDocuments';

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
  const downloadHref = documentDownloadUrl(planId, document.id);
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
          <DialogDescription className="text-center text-info">
            {document.fileName} · {Math.max(1, Math.round(document.size / 1024))}KB
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={document.name} className="mx-auto max-h-[65vh] w-auto" />
          ) : (
            /*
              מציג ה-PDF המובנה של הדפדפן הוא תוסף, והוא נחסם בתוך iframe עם
              sandbox — שם נראה עמוד ריק. `object` טוען אותו כרגיל, ומי שהתוסף
              שלו כבוי מקבל את קישור ההורדה שבתוכו.
            */
            <object data={src} type={document.contentType} className="h-[65vh] w-full">
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-info font-bold text-slate-700">
                  הדפדפן חוסם תצוגה מקדימה של הקובץ הזה.
                </p>
                <a
                  href={downloadHref}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-button font-black text-white transition-colors hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  הורדת המסמך
                </a>
              </div>
            </object>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={downloadHref}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-button font-black text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <Download className="h-4 w-4" />
            הורדת המסמך
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-900 px-8 py-3 text-button font-black text-white transition-colors hover:bg-slate-700"
          >
            סגירה וחזרה לשלב
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
