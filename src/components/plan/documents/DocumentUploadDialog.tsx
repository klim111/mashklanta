'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Lock, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { customDocumentKey } from '@/lib/document-progress';
import { usePlanDocuments } from './usePlanDocuments';
import { demoId } from '@/demo/demo-attr';

const ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  /** השלב שהמסמך שייך לו — נשמר במפתח, כדי שהתקדמות השלב תספור אותו */
  stage: PlanStageId | null;
  /** כותרת מוצעת, למשל מכותרת המשימה */
  defaultTitle?: string;
  onUploaded?: (document: PlanDocumentView) => void;
}

/**
 * העלאת מסמך בכותרת חופשית.
 *
 * הכותרת היא המפתח של המסמך בתיק: הקובץ עולה לאחסון הפלטפורמה, משויך ללקוח
 * ולתהליך, ומופיע מיד בתיק המסמכים — לצד המסמכים שהקטלוג דורש.
 */
export function DocumentUploadDialog({
  open,
  onOpenChange,
  planId,
  stage,
  defaultTitle = '',
  onUploaded,
}: DocumentUploadDialogProps) {
  const { error, upload, busyKey } = usePlanDocuments(planId);
  const [title, setTitle] = useState(defaultTitle);
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState<PlanDocumentView | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setFile(null);
    setDone(null);
    setBusy(false);
  }, [open, defaultTitle]);

  const key = customDocumentKey(stage, title);
  const canUpload = title.trim().length >= 2 && file !== null && !busy;

  const submit = async () => {
    if (!file || !canUpload) return;
    setBusy(true);
    try {
      // הקובץ עולה לאחסון הפרטי, והרשומה שחוזרת היא המסמך בתיק הלקוח
      const record = await upload(key, title.trim(), file);
      if (!record) return;
      setDone(record);
      onUploaded?.(record);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg rounded-3xl bg-white p-6 md:p-8">
        {done ? (
          <div className="py-4 text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </span>
            <DialogTitle className="text-xl font-black text-slate-900">המסמך נשמר בתיק</DialogTitle>
            <p className="mt-2 text-sm text-slate-500">
              «{done.name}» זמין עכשיו בתיק המסמכים שלכם, ונספר בהתקדמות איסוף המסמכים.
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-5 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white hover:bg-slate-700"
            >
              סגירה
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <FileUp className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">העלאת מסמך לתיק</DialogTitle>
                <p className="mt-0.5 text-sm text-slate-500">
                  {stage ? `שלב ${journeyStageFor(stage).shortTitle} · ` : ''}הכותרת היא המפתח שבו המסמך יישמר
                </p>
              </div>
            </div>

            <label className="block text-xs font-bold text-slate-600">
              כותרת המסמך
              <input
                {...demoId('upload-title')}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={`mt-1 ${inputClass}`}
                placeholder="למשל: תדפיס עו״ש 3 חודשים"
                autoFocus
              />
            </label>

            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                setFile(picked);
                event.target.value = '';
              }}
            />
            <button
              {...demoId('upload-file')}
              type="button"
              onClick={() => input.current?.click()}
              className={`mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                file ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
              }`}
            >
              <Upload className={`h-6 w-6 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-sm font-black text-slate-800">
                {file ? file.name : 'בחרו קובץ — PDF או תמונה'}
              </span>
              <span className="text-[11px] text-slate-500">
                עד {Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))}MB
              </span>
            </button>

            {error && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {error}
              </p>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              הקובץ נשמר באחסון פרטי ומוצג רק לכם וליועץ שמלווה אתכם
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                {...demoId('upload-submit')}
                type="button"
                disabled={!canUpload || busyKey === key}
                onClick={() => void submit()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                העלאה לתיק
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
