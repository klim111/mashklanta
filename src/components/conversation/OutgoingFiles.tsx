'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { upload } from '@vercel/blob/client';
import { FileText, FolderOpen, Laptop, Loader2, Paperclip, X } from 'lucide-react';
import type { ConversationDocument, OutgoingFileRef } from '@/lib/conversation';
import { MAX_OUTGOING_FILES, conversationFilePrefix } from '@/lib/conversation';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import { sizeLabel } from './EmailAttachments';

interface PendingFile {
  localId: string;
  fileName: string;
  size: number;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
  ref?: OutgoingFileRef;
}

let counter = 0;
const nextId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * הקבצים שמצורפים להודעה או למייל לפני השליחה. קובץ מהמחשב מתחיל לעלות לחנות
 * הקבצים מיד כשנבחר; מסמך מתיק המסמכים רק נרשם, והשרת מעתיק אותו בשליחה.
 * בסיור ההדגמה שום קובץ לא עולה — הוא רק מופיע ברשימה.
 */
export function useOutgoingFiles(clientUserId?: string | null) {
  const { data: session } = useSession();
  const demo = (usePathname() || '').startsWith('/demo');
  const owner = clientUserId || session?.user?.id || null;
  const [files, setFiles] = useState<PendingFile[]>([]);

  const update = (localId: string, patch: Partial<PendingFile>) =>
    setFiles((current) => current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const room = MAX_OUTGOING_FILES - files.length;
      for (const file of Array.from(list).slice(0, Math.max(0, room))) {
        const localId = nextId();
        const base: PendingFile = { localId, fileName: file.name, size: file.size, status: 'uploading' };
        if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
          setFiles((current) => [...current, { ...base, status: 'error', error: 'רק PDF או תמונה' }]);
          continue;
        }
        if (file.size > MAX_DOCUMENT_BYTES) {
          setFiles((current) => [...current, { ...base, status: 'error', error: 'גדול מ-15MB' }]);
          continue;
        }
        if (demo || !owner) {
          const ref: OutgoingFileRef = { kind: 'upload', pathname: `demo/${file.name}`, fileName: file.name };
          setFiles((current) => [...current, { ...base, status: 'ready', ref }]);
          continue;
        }
        setFiles((current) => [...current, base]);
        const safe = file.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(-80) || 'file';
        upload(`${conversationFilePrefix(owner)}${localId}-${safe}`, file, {
          access: 'private',
          handleUploadUrl: '/api/conversation/uploads',
          clientPayload: clientUserId ?? undefined,
          contentType: file.type,
        })
          .then((blob) =>
            update(localId, { status: 'ready', ref: { kind: 'upload', pathname: blob.pathname, fileName: file.name } })
          )
          .catch((failure) =>
            update(localId, {
              status: 'error',
              error: failure instanceof Error && failure.message ? failure.message.slice(0, 80) : 'ההעלאה נכשלה',
            })
          );
      }
    },
    [files.length, demo, owner, clientUserId]
  );

  const addDocument = useCallback((doc: ConversationDocument) => {
    setFiles((current) =>
      current.some((item) => item.ref?.kind === 'document' && item.ref.documentId === doc.id) ||
      current.length >= MAX_OUTGOING_FILES
        ? current
        : [
            ...current,
            {
              localId: nextId(),
              fileName: doc.fileName,
              size: doc.size,
              status: 'ready',
              ref: { kind: 'document', documentId: doc.id },
            },
          ]
    );
  }, []);

  const remove = useCallback((localId: string) => {
    setFiles((current) => current.filter((item) => item.localId !== localId));
  }, []);

  const reset = useCallback(() => setFiles([]), []);

  return {
    files,
    refs: files.filter((item) => item.status === 'ready' && item.ref).map((item) => item.ref!),
    uploading: files.some((item) => item.status === 'uploading'),
    failed: files.some((item) => item.status === 'error'),
    full: files.length >= MAX_OUTGOING_FILES,
    addFiles,
    addDocument,
    remove,
    reset,
  };
}

export type OutgoingFiles = ReturnType<typeof useOutgoingFiles>;

/** כפתור הצירוף: מהמחשב, או מתיק המסמכים של הלקוח */
export function AttachButton({
  outgoing,
  clientUserId,
  className = '',
}: {
  outgoing: OutgoingFiles;
  clientUserId?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState<'menu' | 'folder' | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => (current ? null : 'menu'))}
        disabled={outgoing.full}
        aria-label="צירוף קובץ"
        title={outgoing.full ? 'אפשר לצרף עד 5 קבצים' : 'צירוף קובץ'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <Paperclip className="h-4 w-4" />
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ALLOWED_DOCUMENT_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          if (event.target.files) outgoing.addFiles(event.target.files);
          event.target.value = '';
        }}
      />
      {open === 'menu' && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              input.current?.click();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            <Laptop className="h-4 w-4 text-slate-500" />
            קובץ מהמחשב
          </button>
          <button
            type="button"
            onClick={() => setOpen('folder')}
            className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            <FolderOpen className="h-4 w-4 text-slate-500" />
            מתיק המסמכים
          </button>
        </div>
      )}
      {open === 'folder' && (
        <FolderPicker
          clientUserId={clientUserId}
          chosen={outgoing.files.flatMap((item) => (item.ref?.kind === 'document' ? [item.ref.documentId] : []))}
          onPick={(doc) => {
            outgoing.addDocument(doc);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

function FolderPicker({
  clientUserId,
  chosen,
  onPick,
}: {
  clientUserId?: string | null;
  chosen: readonly string[];
  onPick: (doc: ConversationDocument) => void;
}) {
  const [docs, setDocs] = useState<ConversationDocument[] | null>(null);
  useEffect(() => {
    const qs = clientUserId ? `?clientUserId=${encodeURIComponent(clientUserId)}` : '';
    fetch(`/api/conversation/documents${qs}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]));
  }, [clientUserId]);

  return (
    <div className="absolute bottom-full right-0 z-20 mb-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <p className="border-b border-slate-100 px-3 py-2 text-sm font-black text-slate-800">מתיק המסמכים</p>
      <div className="max-h-64 overflow-y-auto py-1">
        {!docs ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : docs.length === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-500">אין עדיין מסמכים בתיק.</p>
        ) : (
          docs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              disabled={chosen.includes(doc.id)}
              onClick={() => onPick(doc)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-right hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-800">{doc.name}</span>
                <span className="block truncate text-2xs text-slate-500">
                  {doc.planName} · {sizeLabel(doc.size)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** הקבצים שכבר צורפו, מעל שורת הכתיבה */
export function PendingFiles({ outgoing }: { outgoing: OutgoingFiles }) {
  if (outgoing.files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {outgoing.files.map((item) => (
        <span
          key={item.localId}
          className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-bold ${
            item.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {item.status === 'uploading' ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          ) : (
            <Paperclip className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{item.fileName}</span>
          <span className="shrink-0 text-slate-400">{item.status === 'error' ? item.error : sizeLabel(item.size)}</span>
          <button
            type="button"
            onClick={() => outgoing.remove(item.localId)}
            aria-label={`הסרת ${item.fileName}`}
            className="shrink-0 rounded-full p-0.5 hover:bg-white"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
