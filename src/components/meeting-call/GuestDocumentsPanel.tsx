'use client';

import { useRef, useState } from 'react';
import { Download, Eye, FileText, Folder, Presentation, Upload } from 'lucide-react';
import { sizeLabel } from '@/components/conversation/EmailAttachments';

/** קובץ שעבר בשיחה של פגישת אורח — חי בזיכרון של הדפדפן בלבד */
export interface SharedFile {
  id: string;
  name: string;
  category: string;
  contentType: string;
  size: number;
  url: string;
  by: string;
  mine: boolean;
}

/** הקבצים שאפשר להעביר בשיחה. גדול מזה — עדיף לשלוח אחרי ההרשמה */
export const MAX_SHARED_FILE_BYTES = 15 * 1024 * 1024;

/** תיק המסמכים לדוגמה — אותן קטגוריות שיש בתיק של לקוח רשום */
export const GUEST_DOCUMENT_CATEGORIES = [
  'תעודות זהות וספחים',
  'תלושי שכר (שלושה אחרונים)',
  'דפי חשבון בנק (שלושה חודשים)',
  'הסכם רכישה או טיוטה',
  'דוח נכסים / שמאות',
  'אישור עקרוני מהבנק',
  'אחר',
];

/**
 * תיק המסמכים של פגישת אורח (src/lib/guest-meetings.ts): התיק לדוגמה עם
 * הקטגוריות של לקוח רשום. קובץ שמעלים עובר ישר לצד השני בערוץ של השיחה,
 * ואפשר להציג אותו לשניהם. שום קובץ לא נשמר בשרת, וכולם נעלמים בסוף הפגישה.
 */
export function GuestDocumentsPanel({
  files,
  presentingId,
  onUpload,
  onPresent,
  onView,
}: {
  files: SharedFile[];
  presentingId: string | null;
  onUpload: (file: File, category: string) => Promise<string | null>;
  onPresent: (file: SharedFile) => void;
  onView: (file: SharedFile) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(GUEST_DOCUMENT_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const pick = (next: string) => {
    setCategory(next);
    input.current?.click();
  };

  const upload = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    if (file.size > MAX_SHARED_FILE_BYTES) {
      setNotice('הקובץ גדול מדי להעברה בשיחה (עד 15MB)');
      return;
    }
    setBusy(true);
    setNotice(null);
    const failure = await onUpload(file, category);
    setBusy(false);
    setNotice(failure ?? `${file.name} הועבר לשני הצדדים`);
    if (input.current) input.current.value = '';
  };

  return (
    <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
      <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-2xs font-bold text-slate-500">
        תיק לדוגמה לזמן הפגישה. הקבצים עוברים רק בשיחה ולא נשמרים
      </p>
      <input ref={input} type="file" className="hidden" onChange={(event) => void upload(event.target.files)} />
      {notice && <p className="bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">{notice}</p>}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {GUEST_DOCUMENT_CATEGORIES.map((name) => {
          const inside = files.filter((file) => file.category === name);
          return (
            <div key={name} className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-800">
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate">{name}</span>
                  {inside.length > 0 && <span className="text-2xs font-bold text-slate-500">({inside.length})</span>}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => pick(name)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  העלאה
                </button>
              </div>
              {inside.map((file) => (
                <div key={file.id} className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-1.5">
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-700">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-slate-400">
                      · {sizeLabel(file.size)} · {file.mine ? 'שלכם' : file.by}
                    </span>
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onPresent(file)}
                      title="הצגה לשני הצדדים"
                      className={`rounded p-1 hover:bg-slate-100 ${presentingId === file.id ? 'text-rose-600' : 'text-slate-500'}`}
                    >
                      <Presentation className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => onView(file)} title="צפייה" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <a href={file.url} download={file.name} title="הורדה" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
