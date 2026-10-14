'use client';

import React, { useRef } from 'react';
import { Eye, FileUp, Loader2 } from 'lucide-react';
import { ALLOWED_DOCUMENT_TYPES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';

/**
 * הגישה לאישורים העקרוניים מתוך המכרז: האישור שהועלה בשלב האישור העקרוני לכל
 * בנק, וההעלאה של אישור חדש או משופר — לאותו מקום בתיק, כך שהוא מופיע גם שם.
 */
export interface BankApprovalAccess {
  documentOf: (bank: string) => PlanDocumentView | null;
  /** אפשר להעלות אישור לבנק הזה (יש לו מקום בשלב האישור העקרוני) */
  canUpload: (bank: string) => boolean;
  onView: (document: PlanDocumentView) => void;
  onUpload: (bank: string, file: File) => Promise<unknown> | void;
  /** הבנק שהאישור שלו עולה כרגע */
  busyBank: string | null;
}

/**
 * אייקון ליד בנק: "צפייה באישור העקרוני" כשהועלה ממנו אישור, ו"העלאת אישור
 * עקרוני" כשעוד לא. `improved` — העלאת אישור משופר במקום הקיים.
 */
export function ApprovalDocButton({
  bank,
  access,
  improved = false,
  labeled = false,
}: {
  bank: string;
  access: BankApprovalAccess;
  improved?: boolean;
  /** עם כיתוב ליד האייקון, ולא אייקון בלבד */
  labeled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const document = access.documentOf(bank);
  const busy = access.busyBank === bank;
  const upload = improved || !document;
  if (upload && !access.canUpload(bank)) return null;

  const label = upload
    ? improved
      ? `העלאת אישור עקרוני משופר מ${bank}`
      : `העלאת אישור עקרוני מ${bank}`
    : `צפייה באישור העקרוני של ${bank}`;
  const text = upload ? (improved ? 'העלאת אישור משופר' : 'העלאת אישור עקרוני') : 'צפייה באישור העקרוני';

  return (
    <>
      {upload && (
        <input
          ref={input}
          type="file"
          accept={ALLOWED_DOCUMENT_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void access.onUpload(bank, file);
            event.target.value = '';
          }}
        />
      )}
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={busy}
        onClick={() => (upload ? input.current?.click() : document && access.onView(document))}
        className={`inline-flex items-center gap-1 rounded-xl border-2 text-2xs font-black transition-colors disabled:opacity-60 ${
          labeled ? 'px-2.5 py-1.5' : 'p-2'
        } ${
          upload
            ? 'border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-700'
            : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : upload ? (
          <FileUp className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        {labeled && text}
      </button>
    </>
  );
}
