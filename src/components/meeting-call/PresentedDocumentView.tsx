'use client';

import { Download, EyeOff, ExternalLink, Presentation, StopCircle } from 'lucide-react';
import { documentContentUrl, documentDownloadUrl } from '@/components/plan/documents/usePlanDocuments';
import type { PresentedDocument } from './types';

/**
 * מסמך מהתיק שמוצג לשני הצדדים, במקום התמונה הגדולה.
 *
 * כל צד טוען את הקובץ בעצמו מהמסלול המאומת של התיק — כך המסמך עצמו לא עובר
 * בשיחה, וההרשאות של התיק חלות גם כאן.
 */
export function PresentedDocumentView({
  planId,
  doc,
  mine,
  onStop,
  onHide,
}: {
  planId: string;
  doc: PresentedDocument;
  /** אני מציג — אפשר להפסיק לשניהם */
  mine: boolean;
  onStop: () => void;
  /** הצד שצופה יכול להסתיר אצלו */
  onHide: () => void;
}) {
  const src = documentContentUrl(planId, doc.id);
  const isImage = doc.contentType.startsWith('image/');

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-black">
          <Presentation className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="truncate">{doc.name}</span>
          <span className="shrink-0 text-xs font-bold text-slate-500">
            · {mine ? 'אתם מציגים' : `מוצג על ידי ${doc.by}`}
          </span>
        </p>
        <div className="flex items-center gap-1">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            בחלון חדש
          </a>
          <a
            href={documentDownloadUrl(planId, doc.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" />
            הורדה
          </a>
          {mine ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-black text-white hover:bg-rose-700"
            >
              <StopCircle className="h-3.5 w-3.5" />
              הפסקת הצגה
            </button>
          ) : (
            <button
              type="button"
              onClick={onHide}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
            >
              <EyeOff className="h-3.5 w-3.5" />
              הסתרה
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 bg-slate-100">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={doc.name} className="h-full w-full object-contain" />
        ) : (
          <iframe key={doc.id} src={src} title={doc.name} className="h-full w-full border-0" />
        )}
      </div>
    </div>
  );
}
