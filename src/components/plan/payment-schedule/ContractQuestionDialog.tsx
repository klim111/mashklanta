'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarRange, FileSignature, FileUp, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CONTRACT_REMINDER, paymentScheduleHref } from '@/lib/payment-schedule';
import type { ContractAnswer } from '@/lib/payment-schedule';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { DocumentUploadDialog } from '../documents/DocumentUploadDialog';

/**
 * "האם כבר חתמתם על חוזה?" — נפתח בכניסה הראשונה למשכנתא חדשה.
 *
 * "עוד לא": תזכורת להגדיר בחוזה פעימות שעומדות בדרישות הבנק, וקישור לכלי.
 * "כן": העלאת החוזה לתיק המסמכים, וקישור לכלי — כדי לבדוק שהפעימות שבחוזה
 * עומדות בדרישות.
 */
export function ContractQuestionDialog({
  open,
  planId,
  stage,
  answer,
  onAnswer,
  onClose,
}: {
  open: boolean;
  planId: string;
  stage: PlanStageId;
  /** התשובה שנשמרה — כשהיא קיימת מוצג ההמשך שלה */
  answer: ContractAnswer | null;
  onAnswer: (answer: ContractAnswer) => void;
  onClose: () => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const toolLink = (
    <Link
      href={paymentScheduleHref(planId, stage)}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-button font-black text-white transition-colors hover:bg-blue-700"
    >
      <CalendarRange className="h-4 w-4" />
      לכלי תכנון פעימות התשלום
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );

  return (
    <>
      <Dialog
        open={open && !uploadOpen}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <DialogContent dir="rtl" className="max-w-lg rounded-3xl bg-white p-7">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FileSignature className="h-7 w-7" />
          </span>

          {answer === null && (
            <>
              <DialogTitle className="text-center text-subtitle font-black text-slate-900">
                האם כבר חתמתם על חוזה לרכישת הנכס?
              </DialogTitle>
              <DialogDescription className="text-center text-info text-slate-600">
                התשובה קובעת מה כדאי לעשות עכשיו עם פעימות התשלום למוכר.
              </DialogDescription>
              <div dir="rtl" className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onAnswer('SIGNED')}
                  className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-button font-black text-slate-900 transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  כן, חתמנו
                </button>
                <button
                  type="button"
                  onClick={() => onAnswer('NOT_YET')}
                  className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-button font-black text-slate-900 transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  עוד לא
                </button>
              </div>
            </>
          )}

          {answer === 'NOT_YET' && (
            <>
              <DialogTitle className="text-center text-subtitle font-black text-slate-900">
                לפני החתימה: פעימות התשלום
              </DialogTitle>
              <DialogDescription className="text-center text-info leading-relaxed text-slate-600">
                {CONTRACT_REMINDER} בכלי תכנון הפעימות בונים את הלוח מהפרופיל הפיננסי, ומפיקים דוח לעורך הדין.
              </DialogDescription>
              <div className="mt-5 flex flex-col gap-2">
                {toolLink}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-button font-bold text-slate-600 hover:bg-slate-100"
                >
                  אחזור לזה בהמשך
                </button>
              </div>
            </>
          )}

          {answer === 'SIGNED' && (
            <>
              <DialogTitle className="text-center text-subtitle font-black text-slate-900">
                העלו את החוזה לתיק המסמכים
              </DialogTitle>
              <DialogDescription className="text-center text-info leading-relaxed text-slate-600">
                הבנק יבקש את החוזה החתום. אחר כך הזינו בכלי את פעימות התשלום כמו שהן כתובות בחוזה, כדי לבדוק
                שההון העצמי משולם לפני כספי הבנק ושהסכומים תואמים למשכנתא.
              </DialogDescription>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-button font-black transition-colors ${
                    uploaded
                      ? 'border-2 border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <FileUp className="h-4 w-4" />
                  {uploaded ? 'החוזה בתיק · העלאה נוספת' : 'העלאת החוזה לתיק המסמכים'}
                </button>
                {toolLink}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-button font-bold text-slate-600 hover:bg-slate-100"
                >
                  סגירה
                </button>
              </div>
            </>
          )}

          {answer !== null && (
            <p dir="rtl" className="mt-3 flex items-start gap-1.5 text-2xs leading-relaxed text-slate-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              עד שתגדירו את הפעימות, תזכורת תופיע בראש כל שלב.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        planId={planId}
        stage="SIGNING"
        defaultTitle="חוזה המכר החתום"
        onUploaded={() => setUploaded(true)}
      />
    </>
  );
}
