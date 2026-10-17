'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, FolderDown, Loader2, MessageSquare, Presentation, Search, Upload } from 'lucide-react';
import { customDocumentKey } from '@/lib/document-progress';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { sizeLabel } from '@/components/conversation/EmailAttachments';
import { DocumentViewerDialog } from '@/components/plan/documents/DocumentViewerDialog';
import {
  documentDownloadUrl,
  documentsArchiveUrl,
  usePlanDocuments,
} from '@/components/plan/documents/usePlanDocuments';
import type { MeetingCallDetails, PresentedDocument } from './types';

/**
 * תיק המסמכים של הלקוח, בתוך השיחה.
 *
 * הכל עובר דרך המסלולים הקיימים של התיק — אותן הרשאות, ואותה נעילה כשהתיק
 * נעול. מכל מסמך אפשר: להציג אותו לשני הצדדים, לשלוח אותו בצ'אט, לצפות בו
 * או להוריד אותו. הלקוח מעלה מכאן מסמכים חדשים, והם מופיעים מיד גם אצל היועץ.
 */
export function CallDocumentsPanel({
  details,
  refreshSignal,
  presentingId,
  onPresent,
  onChanged,
  onSentToChat,
}: {
  details: MeetingCallDetails;
  /** הצד השני העלה מסמך */
  refreshSignal: number;
  presentingId: string | null;
  onPresent: (doc: Omit<PresentedDocument, 'by'>) => void;
  /** העליתי מסמך — הצד השני מרענן את התיק */
  onChanged: () => void;
  onSentToChat: () => void;
}) {
  const planId = details.planId;
  const { documents, ready, error, upload, refresh } = usePlanDocuments(planId);
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState<PlanDocumentView | null>(null);
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const canUpload = details.role === 'CLIENT';

  useEffect(() => {
    if (refreshSignal > 0) void refresh();
  }, [refreshSignal, refresh]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (doc) => doc.name.toLowerCase().includes(term) || doc.fileName.toLowerCase().includes(term)
    );
  }, [documents, query]);

  if (!planId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
        {details.role === 'ADVISOR'
          ? 'ללקוח עדיין אין תהליך פתוח, ולכן גם אין תיק מסמכים. אפשר לשלוח קבצים בצ׳אט.'
          : 'עדיין אין לכם תהליך פתוח, ולכן גם אין תיק מסמכים. אפשר לשלוח קבצים בצ׳אט.'}
      </div>
    );
  }

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setNotice(null);
    let added = 0;
    for (const file of Array.from(list)) {
      if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
        setNotice(`${file.name}: אפשר להעלות PDF או תמונה בלבד`);
        continue;
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        setNotice(`${file.name}: הקובץ גדול מ-15MB`);
        continue;
      }
      const title = file.name.replace(/\.[a-z0-9]{2,5}$/i, '') || 'מסמך מהפגישה';
      setUploading((count) => count + 1);
      const record = await upload(customDocumentKey(null, `${title}-${Date.now().toString(36)}`), title, file);
      setUploading((count) => count - 1);
      if (record) added += 1;
    }
    if (added > 0) {
      setNotice(added === 1 ? 'המסמך נשמר בתיק, והיועץ רואה אותו' : `${added} מסמכים נשמרו בתיק, והיועץ רואה אותם`);
      onChanged();
    }
  };

  const sendToChat = async (doc: PlanDocumentView) => {
    setSendingId(doc.id);
    setNotice(null);
    try {
      const response = await fetch('/api/conversation/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: '',
          files: [{ kind: 'document', documentId: doc.id }],
          clientUserId: details.role === 'ADVISOR' ? details.clientUserId : undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setNotice(body?.error ?? 'המסמך לא נשלח בצ׳אט');
        return;
      }
      setNotice(`"${doc.name}" נשלח בצ׳אט`);
      onSentToChat();
    } catch {
      setNotice('המסמך לא נשלח בצ׳אט. בדקו את החיבור ונסו שוב');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {canUpload && (
            <>
              <input
                ref={input}
                type="file"
                multiple
                accept={ALLOWED_DOCUMENT_TYPES.join(',')}
                className="hidden"
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={uploading > 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {uploading > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                העלאת מסמך לתיק
              </button>
            </>
          )}
          {documents.length > 0 && (
            <a
              href={documentsArchiveUrl(planId)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 px-3 py-1.5 text-sm font-black text-slate-700 hover:border-blue-300"
            >
              <FolderDown className="h-4 w-4" />
              הורדת התיק
            </a>
          )}
        </div>
        {!canUpload && (
          <p className="text-2xs text-slate-500">קובץ מהמחשב שולחים ללקוח בצ׳אט, בכפתור הצירוף.</p>
        )}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-1.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש מסמך…"
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </label>
        {(notice || error) && <p className="text-xs font-bold text-blue-700">{notice ?? error}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!ready ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : shown.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {documents.length === 0 ? 'עדיין לא הועלו מסמכים לתיק' : 'לא נמצא מסמך בשם הזה'}
          </div>
        ) : (
          <ul className="space-y-2">
            {shown.map((doc) => (
              <li
                key={doc.id}
                className={`rounded-xl border p-2.5 ${presentingId === doc.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
              >
                <p className="truncate text-sm font-black text-slate-900">{doc.name}</p>
                <p className="truncate text-2xs text-slate-500">
                  {doc.fileName} · {sizeLabel(doc.size)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <DocAction
                    onClick={() =>
                      onPresent({ id: doc.id, name: doc.name, fileName: doc.fileName, contentType: doc.contentType })
                    }
                    strong
                  >
                    <Presentation className="h-3.5 w-3.5" />
                    הצגה בשיחה
                  </DocAction>
                  <DocAction onClick={() => void sendToChat(doc)} disabled={sendingId === doc.id}>
                    {sendingId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                    שליחה בצ׳אט
                  </DocAction>
                  <DocAction onClick={() => setViewing(doc)}>
                    <Eye className="h-3.5 w-3.5" />
                    צפייה
                  </DocAction>
                  <a
                    href={documentDownloadUrl(planId, doc.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    הורדה
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DocumentViewerDialog planId={planId} document={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function DocAction({
  onClick,
  disabled,
  strong,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black transition-colors disabled:opacity-50 ${
        strong ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
