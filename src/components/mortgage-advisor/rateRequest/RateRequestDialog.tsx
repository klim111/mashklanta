'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  BookmarkCheck,
  Building2,
  CheckCircle2,
  CloudOff,
  FileSpreadsheet,
  FileText,
  Gavel,
  Loader2,
  Printer,
} from 'lucide-react';
import { MORTGAGE_BANKS } from '../types';
import type { MixSummary, WorkspaceMix } from '../engine';
import { buildRateRequestDocument } from './document';
import type { RateRequestDetails } from './document';
import { printRateRequest } from './letter';
import { downloadRateRequestXlsx } from './excel';
import { RateRequestLetter } from './RateRequestLetter';
import { useRateRequests } from './useRateRequests';

interface RateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mix: WorkspaceMix;
  /** סיכום קיים, כדי לא לחשב לוח סילוקין מחדש */
  summary?: MixSummary;
  /**
   * בקשה שכבר נשמרה ונפתחת שוב — המזהה, האסמכתה ותאריך היצירה נשמרים כפי שהם,
   * כך שהמכתב שנפתח מהאזור האישי זהה לזה שהופק בפעם הראשונה.
   */
  existing?: {
    id: string;
    reference: string;
    createdAt: string;
    details: RateRequestDetails;
  };
  onSaved?: () => void;
}

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

/**
 * הפקת בקשת הצעת מחיר לתמהיל.
 *
 * המכתב מוצג כאן בדיוק כפי שהוא יישמר — אותו HTML נשלח למדפסת ול-PDF, ואותו
 * מבנה יוצא לאקסל. עמודת הריביות נשארת ריקה בכוונה: זו כל מטרת המסמך.
 */
export function RateRequestDialog({
  open,
  onOpenChange,
  mix,
  summary,
  existing,
  onSaved,
}: RateRequestDialogProps) {
  const { data: session } = useSession();
  const { save, signedIn } = useRateRequests();

  const [details, setDetails] = useState<RateRequestDetails>(existing?.details ?? {});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // כל פתיחה מתחילה מפרטים נקיים, פרט לבקשה שמורה שנפתחת שוב
  useEffect(() => {
    if (!open) return;
    setSavedAt(null);
    setDetails(
      existing?.details ?? {
        applicantName: session?.user?.name?.trim() || undefined,
        contactEmail: session?.user?.email?.trim() || undefined,
      }
    );
  }, [open, existing, session?.user?.name, session?.user?.email]);

  // המזהה, האסמכתה ותאריך היצירה נקבעים פעם אחת לכל פתיחה, כדי שהמסמך שיישמר
  // יהיה אותו מסמך שהודפס
  const identity = useMemo(() => {
    if (existing) return existing;
    const base = buildRateRequestDocument(mix, { summary });
    return { id: base.id, reference: base.reference, createdAt: base.createdAt };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, mix.id, open]);

  const document = useMemo(
    () =>
      buildRateRequestDocument(mix, {
        details,
        summary,
        id: identity.id,
        reference: identity.reference,
        createdAt: identity.createdAt,
      }),
    [mix, details, summary, identity]
  );

  /** היועץ נשלח ללוח שלו, והלקוח לאזור האישי — שניהם לאזור הבקשות לבנקים */
  const personalAreaHref =
    session?.user?.role === 'ADVISOR' ? '/advisor-dashboard' : '/dashboard#rate-requests';

  const patch = (next: Partial<RateRequestDetails>) =>
    setDetails((current) => ({ ...current, ...next }));

  const onSave = async () => {
    setSaving(true);
    try {
      await save(document, mix);
      setSavedAt(new Date().toISOString());
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] max-w-5xl flex-col gap-3">
        <DialogHeader className="shrink-0 pr-7">
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-600" />
            הצעת התמהיל למיקוח מול הבנקים
          </DialogTitle>
          <DialogDescription>
            המכתב מציג את התמהיל במלואו — לוח סילוקין, סוג ריבית, תקופה, סכום ואחוז מכלל התמהיל —
            כשעמודת הריביות ריקה לתמחור הבנק. אפשר לשמור אותו כ-PDF, כאקסל ובאזור האישי.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
              <Building2 className="h-3.5 w-3.5" />
              לכבוד
            </span>
            <button
              type="button"
              onClick={() => patch({ bankName: undefined })}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                !details.bankName
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              ללא ציון בנק
            </button>
            {MORTGAGE_BANKS.map((bank) => (
              <button
                key={bank}
                type="button"
                onClick={() => patch({ bankName: bank })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  details.bankName === bank
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
              >
                {bank}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500">שם הפונה</span>
              <input
                className={fieldClass}
                value={details.applicantName ?? ''}
                placeholder="השם שיופיע בחתימה"
                onChange={(event) => patch({ applicantName: event.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500">טלפון</span>
              <input
                className={fieldClass}
                value={details.contactPhone ?? ''}
                placeholder="לחזרה עם ההצעה"
                onChange={(event) => patch({ contactPhone: event.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500">דוא"ל</span>
              <input
                className={fieldClass}
                value={details.contactEmail ?? ''}
                placeholder="כתובת לשליחת ההצעה"
                onChange={(event) => patch({ contactEmail: event.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500">מועד אחרון לתשובה</span>
              <input
                type="date"
                className={fieldClass}
                value={details.replyBy ?? ''}
                onChange={(event) => patch({ replyBy: event.target.value })}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-semibold text-slate-500">
              בקשה נוספת שתתווסף לסעיפי המכתב (רשות)
            </span>
            <input
              className={fieldClass}
              value={details.notes ?? ''}
              placeholder='לדוגמה: "נא לציין גם את עלות ביטוח החיים דרך הבנק"'
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-slate-100 p-2 sm:p-4">
          <RateRequestLetter document={document} />
        </div>

        <div className="shrink-0 space-y-2">
          {savedAt && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              הבקשה נשמרה באזור האישי, תחת &quot;תמהילים שהוגשו לבנקים&quot;.
              <Link href={personalAreaHref} className="underline">
                מעבר לאזור האישי
              </Link>
            </div>
          )}
          {!signedIn && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                אינכם מחוברים — שמירה תישמר בדפדפן הזה בלבד ותעלה לחשבון בהתחברות הבאה.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              variant="outline"
              className="h-10 w-full text-xs sm:w-auto"
              onClick={() => downloadRateRequestXlsx(document)}
            >
              <FileSpreadsheet className="h-4 w-4 ml-1.5" />
              שמירה כאקסל
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full text-xs sm:w-auto"
              onClick={() => printRateRequest(document)}
            >
              <Printer className="h-4 w-4 ml-1.5" />
              שמירה כ-PDF
            </Button>
            <Button className="h-10 w-full text-xs sm:w-auto" onClick={onSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
              ) : (
                <BookmarkCheck className="h-4 w-4 ml-1.5" />
              )}
              {existing ? 'עדכון הבקשה השמורה' : 'שמור הצעה באזור האישי'}
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-400 sm:text-right">
            <FileText className="ml-1 inline h-3 w-3" />
            שמירה כ-PDF נעשית דרך חלון ההדפסה של הדפדפן — בחרו ביעד &quot;שמירה כ-PDF&quot;.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
