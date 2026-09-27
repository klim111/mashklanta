'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Eye, FileText, FolderInput, ImageIcon, Loader2, Paperclip } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AttachmentFolder, EmailAttachmentView } from '@/lib/conversation';
import { MAX_STREAMED_ATTACHMENT_BYTES } from '@/lib/conversation';
import { attachmentUrl } from './useConversation';

type Save = (attachmentId: string, planId: string | null) => Promise<string | null>;

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/**
 * הקבצים שצורפו למייל. לחיצה על קובץ פותחת תצוגה מקדימה, ומשם — או ישר
 * מהשורה — אפשר לשמור אותו בתיק המסמכים של התהליך.
 */
export function EmailAttachments({
  emailId,
  attachments,
  folders,
  clientUserId,
  onSave,
}: {
  emailId: string;
  attachments: readonly EmailAttachmentView[];
  folders: readonly AttachmentFolder[];
  clientUserId?: string | null;
  onSave: Save;
}) {
  const [preview, setPreview] = useState<EmailAttachmentView | null>(null);
  if (attachments.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="flex items-center gap-1 text-2xs font-bold text-slate-500">
        <Paperclip className="h-3.5 w-3.5" />
        {attachments.length === 1 ? 'קובץ מצורף' : `${attachments.length} קבצים מצורפים`}
      </p>
      {attachments.map((item) => (
        <AttachmentRow
          key={item.id}
          attachment={item}
          download={attachmentUrl(emailId, item.id, clientUserId, true)}
          folders={folders}
          onOpen={() =>
            // קובץ גדול נפתח בלשונית חדשה, ישר מספק המיילים
            item.size > MAX_STREAMED_ATTACHMENT_BYTES
              ? window.open(attachmentUrl(emailId, item.id, clientUserId), '_blank', 'noopener')
              : setPreview(item)
          }
          onSave={onSave}
        />
      ))}
      {preview && (
        <AttachmentPreview
          attachment={attachments.find((item) => item.id === preview.id) ?? preview}
          src={attachmentUrl(emailId, preview.id, clientUserId)}
          download={attachmentUrl(emailId, preview.id, clientUserId, true)}
          folders={folders}
          onSave={onSave}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function AttachmentRow({
  attachment,
  download,
  folders,
  onOpen,
  onSave,
}: {
  attachment: EmailAttachmentView;
  download: string;
  folders: readonly AttachmentFolder[];
  onOpen: () => void;
  onSave: Save;
}) {
  const Icon = attachment.contentType.startsWith('image/') ? ImageIcon : FileText;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={attachment.savable ? onOpen : undefined}
          disabled={!attachment.savable}
          title={attachment.savable ? 'תצוגה מקדימה' : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 text-right enabled:hover:text-blue-700"
        >
          <Icon className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{attachment.fileName}</span>
          <span className="shrink-0 text-2xs font-semibold text-slate-400">{sizeLabel(attachment.size)}</span>
        </button>
        {attachment.savable && (
          <button
            type="button"
            onClick={onOpen}
            aria-label="תצוגה מקדימה"
            className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-900"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <a href={download} aria-label="הורדה" className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-900">
          <Download className="h-4 w-4" />
        </a>
      </div>
      {attachment.savable ? (
        <SaveControl attachment={attachment} folders={folders} onSave={onSave} compact />
      ) : (
        <p className="mt-1 text-2xs font-semibold text-slate-500">
          אפשר להוריד את הקובץ. בתיק המסמכים נשמרים רק PDF ותמונות.
        </p>
      )}
    </div>
  );
}

/**
 * כפתור השמירה בתיק. כשיש ללקוח יותר מתהליך פתוח אחד, בוחרים קודם לאיזה תיק.
 */
function SaveControl({
  attachment,
  folders,
  onSave,
  compact = false,
}: {
  attachment: EmailAttachmentView;
  folders: readonly AttachmentFolder[];
  onSave: Save;
  compact?: boolean;
}) {
  const [planId, setPlanId] = useState<string>(folders[0]?.planId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!folders.some((item) => item.planId === planId)) setPlanId(folders[0]?.planId ?? '');
  }, [folders, planId]);

  if (attachment.savedToPlanId) {
    const folder = folders.find((item) => item.planId === attachment.savedToPlanId);
    return (
      <p className={`flex items-center gap-1 font-bold text-emerald-700 ${compact ? 'mt-1 text-2xs' : 'text-sm'}`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        נשמר בתיק המסמכים{folder && folders.length > 1 ? ` · ${folder.name}` : ''}
      </p>
    );
  }
  if (folders.length === 0) {
    return (
      <p className={`font-semibold text-slate-500 ${compact ? 'mt-1 text-2xs' : 'text-sm'}`}>
        כדי לשמור בתיק המסמכים צריך תהליך משכנתא פתוח.
      </p>
    );
  }

  const save = async () => {
    setBusy(true);
    setError(null);
    const failure = await onSave(attachment.id, planId || null);
    setBusy(false);
    if (failure) setError(failure);
  };

  return (
    <div className={compact ? 'mt-1.5' : ''}>
      <div className="flex flex-wrap items-center gap-2">
        {folders.length > 1 && (
          <select
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            aria-label="התהליך שבתיק שלו לשמור"
            className="min-w-0 max-w-[12rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-800"
          >
            {folders.map((folder) => (
              <option key={folder.planId} value={folder.planId}>
                {folder.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 font-black text-white hover:bg-blue-700 disabled:opacity-60 ${
            compact ? 'px-2.5 py-1 text-sm' : 'px-5 py-2.5 text-button'
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderInput className="h-4 w-4" />}
          שמירה בתיק המסמכים
        </button>
      </div>
      {error && <p className="mt-1 text-2xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}

/**
 * תצוגה מקדימה. הקובץ נטען כ-Blob ומוצג מכתובת מקומית, כך שתקלה (קובץ שפג
 * אצל ספק המיילים, חיבור שנפל) מוצגת כהודעה ולא כעמוד ריק.
 */
function AttachmentPreview({
  attachment,
  src,
  download,
  folders,
  onSave,
  onClose,
}: {
  attachment: EmailAttachmentView;
  src: string;
  download: string;
  folders: readonly AttachmentFolder[];
  onSave: Save;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = attachment.contentType.startsWith('image/');

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    fetch(src, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        // הסוג נקבע כאן לפי הרשימה המותרת, ולא לפי מה שהשרת של השולח טען
        const blob = new Blob([await response.arrayBuffer()], { type: attachment.contentType });
        if (cancelled) return;
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src, attachment.contentType]);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-w-4xl">
        <DialogHeader className="text-center">
          <DialogTitle className="justify-center text-center text-subtitle">
            <span className="inline-flex max-w-full items-center gap-2">
              <Paperclip className="h-5 w-5 shrink-0 text-blue-600" />
              <span className="truncate">{attachment.fileName}</span>
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-info">
            קובץ שצורף למייל · {sizeLabel(attachment.size)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[60vh] items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50">
          {failed ? (
            <p className="px-6 text-center text-info font-bold text-slate-700">
              לא הצלחנו לטעון את הקובץ לתצוגה. אפשר לנסות להוריד אותו.
            </p>
          ) : !url ? (
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={attachment.fileName} className="max-h-full w-auto" />
          ) : (
            <object data={url} type={attachment.contentType} className="h-full w-full">
              <p className="p-6 text-center text-info font-bold text-slate-700">
                הדפדפן חוסם תצוגה מקדימה של הקובץ הזה. אפשר להוריד אותו.
              </p>
            </object>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <SaveControl attachment={attachment} folders={folders} onSave={onSave} />
          <a
            href={download}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-5 py-2 text-button font-black text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            הורדה
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
