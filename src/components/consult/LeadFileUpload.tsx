'use client';

import { useCallback, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { CheckCircle2, FileUp, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import { MAX_LEAD_FILES, leadUploadPath, newLeadUploadBatch } from '@/lib/lead-file-paths';
import type { LeadFileRef } from '@/lib/lead-file-paths';

interface PendingFile {
  localId: number;
  fileName: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
  ref?: LeadFileRef;
}

/** מצב ההעלאה — הטופס שולח רק את הקבצים שסיימו לעלות */
export function useLeadFiles() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const batch = useRef<string | null>(null);
  const counter = useRef(0);

  const update = (localId: number, patch: Partial<PendingFile>) =>
    setFiles((current) => current.map((file) => (file.localId === localId ? { ...file, ...patch } : file)));

  const add = useCallback(
    (list: FileList | File[]) => {
      if (!batch.current) batch.current = newLeadUploadBatch();
      const room = MAX_LEAD_FILES - files.length;
      for (const file of Array.from(list).slice(0, Math.max(0, room))) {
        const localId = ++counter.current;
        const base: PendingFile = { localId, fileName: file.name, status: 'uploading' };
        if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
          setFiles((current) => [...current, { ...base, status: 'error', error: 'אפשר להעלות רק PDF או תמונה' }]);
          continue;
        }
        if (file.size > MAX_DOCUMENT_BYTES) {
          setFiles((current) => [...current, { ...base, status: 'error', error: 'הקובץ גדול מ-15MB' }]);
          continue;
        }
        setFiles((current) => [...current, base]);
        upload(leadUploadPath(batch.current, `${localId}-${file.name}`), file, {
          access: 'private',
          handleUploadUrl: '/api/advisor-leads/uploads',
          contentType: file.type,
        })
          .then((blob) => update(localId, { status: 'ready', ref: { pathname: blob.pathname, fileName: file.name } }))
          .catch((failure) =>
            update(localId, {
              status: 'error',
              error: failure instanceof Error && failure.message ? failure.message.slice(0, 90) : 'ההעלאה נכשלה',
            })
          );
      }
    },
    [files.length]
  );

  const remove = (localId: number) => setFiles((current) => current.filter((file) => file.localId !== localId));

  return {
    files,
    add,
    remove,
    uploading: files.some((file) => file.status === 'uploading'),
    refs: files.flatMap((file) => (file.status === 'ready' && file.ref ? [file.ref] : [])),
  };
}

/**
 * אזור העלאת מסמך לפנייה ליועץ — טופס ההצעה מהבנק או דוח היתרות. גוררים קובץ
 * או לוחצים לבחירה מהמחשב (או מהטלפון).
 */
export function LeadFileUpload({
  title,
  hint,
  state,
}: {
  title: string;
  hint: string;
  state: ReturnType<typeof useLeadFiles>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const full = state.files.length >= MAX_LEAD_FILES;

  return (
    <div className="block text-sm font-bold text-slate-700">
      {title}
      <button
        type="button"
        disabled={full}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length > 0) state.add(event.dataTransfer.files);
        }}
        className={`mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          dragging ? 'border-violet-500 bg-violet-50' : 'border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/50'
        }`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <FileUp className="h-5 w-5" />
        </span>
        <span className="text-base font-bold text-slate-900">
          {full ? `אפשר לצרף עד ${MAX_LEAD_FILES} קבצים` : 'לחצו לבחירת קובץ או גררו אותו לכאן'}
        </span>
        <span className="text-sm font-normal leading-relaxed text-slate-500">{hint}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ALLOWED_DOCUMENT_TYPES.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          if (event.target.files?.length) state.add(event.target.files);
          event.target.value = '';
        }}
      />

      {state.files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {state.files.map((file) => (
            <li
              key={file.localId}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-normal ${
                file.status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {file.status === 'uploading' ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />
              ) : file.status === 'ready' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
              {file.error && <span className="shrink-0 text-xs">{file.error}</span>}
              <button
                type="button"
                onClick={() => state.remove(file.localId)}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                aria-label={`הסרת ${file.fileName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
