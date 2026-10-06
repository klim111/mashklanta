'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarRange,
  Check,
  CheckCircle2,
  Eye,
  FileUp,
  Gavel,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { PlanData, SigningData } from '@/lib/mortgage-plan';
import { paymentScheduleDefined, usesPaymentSchedule } from '@/lib/mortgage-plan';
import type { ConversationContact } from '@/lib/conversation';
import { paymentScheduleHref } from '@/lib/payment-schedule';
import { useClientConversation } from '@/components/conversation/ClientChatDock';
import { DocumentUploadDialog } from '../../documents/DocumentUploadDialog';
import { documentContentUrl } from '../../documents/usePlanDocuments';

const DOCUMENT_TITLE = 'טופס בטחונות מהבנק (טופס טיולים)';

/**
 * תת-השלב הראשון של החתימה: טופס הבטחונות מהבנק ("טופס טיולים").
 *
 * אחרי שהבנק מאשר את התיק הוא מנפיק מסמך שמפרט את הבטחונות שהוא דורש לפני
 * העברת הכסף. מעלים אותו לתיק, ומעבירים לעורך הדין: אם עורך דין כבר מוגדר
 * בנמענים של תיבת המיילים — המייל יוצא אליו מיד עם הטופס; אחרת נפתחת תיבת
 * המיילים עם הטופס מצורף, וטופס "נמען חדש" פתוח על התפקיד "עורך דין".
 */
export function CollateralScreen({
  data,
  planId,
  onChange,
  onContinue,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: SigningData) => void;
  onContinue: () => void;
}) {
  const value = data.SIGNING;
  const collateral = value.collateral;
  const newMortgage = usesPaymentSchedule(data);
  const scheduleReady = paymentScheduleDefined(data);
  const conversation = useClientConversation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lawyer, setLawyer] = useState<ConversationContact | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const setCollateral = (patch: Partial<SigningData['collateral']>) =>
    onChange({ ...value, collateral: { ...collateral, ...patch } });

  /** עורך הדין מהנמענים של תיבת המיילים, אם כבר הוגדר עם כתובת מייל */
  const loadLawyer = useCallback(async () => {
    try {
      const response = await fetch('/api/conversation/emails', { cache: 'no-store' });
      if (!response.ok) return null;
      const body = (await response.json()) as { contacts?: ConversationContact[] };
      const found = body.contacts?.find((contact) => contact.role === 'LAWYER' && Boolean(contact.email)) ?? null;
      setLawyer(found);
      return found;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void loadLawyer();
  }, [loadLawyer]);

  const subject = 'טופס הבטחונות מהבנק — לטיפולך';
  const text = [
    'שלום,',
    '',
    'מצורף טופס הבטחונות ("טופס טיולים") שקיבלנו מהבנק במסגרת המשכנתא לרכישת הנכס.',
    newMortgage
      ? 'נבקש לוודא איתך שפריסת התשלומים תואמת לפעימות שהוגדרו בחוזה, ושכך הן נכתבות במכתב ההוראות הבלתי חוזרות שעליו חותם מוכר הנכס.'
      : 'נבקש את טיפולך ברישום הבטחונות לטובת הבנק.',
    '',
    'תודה,',
  ].join('\n');

  const sendToLawyer = async () => {
    if (!collateral.documentId) return;
    setFailure(null);
    setSending(true);
    try {
      const target = lawyer ?? (await loadLawyer());
      if (!target) {
        // אין עורך דין בנמענים — תיבת המיילים נפתחת עם הכל מוכן, והתפקיד כבר נבחר
        if (!conversation?.compose) {
          setFailure('תיבת המיילים אינה זמינה כרגע. נסו שוב מהאזור האישי.');
          return;
        }
        conversation.compose({
          subject,
          text,
          addRecipientRole: 'LAWYER',
          documents: [
            {
              id: collateral.documentId,
              name: DOCUMENT_TITLE,
              fileName: collateral.fileName ?? 'collateral.pdf',
              contentType: 'application/pdf',
              size: 0,
              planName: '',
            },
          ],
        });
        return;
      }
      const response = await fetch('/api/conversation/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [target.email],
          subject,
          text: text.replace('שלום,', `שלום ${target.name},`),
          files: [{ kind: 'document', documentId: collateral.documentId }],
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFailure(typeof body?.error === 'string' ? body.error : 'המייל לא נשלח. נסו שוב בעוד רגע.');
        return;
      }
      setCollateral({ sentToLawyerAt: new Date().toISOString(), lawyerEmail: target.email });
    } catch {
      setFailure('המייל לא נשלח. בדקו את החיבור ונסו שוב.');
    } finally {
      setSending(false);
    }
  };

  const sentAt = collateral.sentToLawyerAt
    ? new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
        new Date(collateral.sentToLawyerAt)
      )
    : null;

  return (
    <div dir="rtl" className="space-y-5 text-right">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div dir="rtl" className="min-w-0">
            <h3 dir="rtl" className="text-subtitle font-black text-slate-900">קבלת טופס הבטחונות מהבנק</h3>
            <p dir="rtl" className="mt-1 text-info leading-relaxed text-slate-600">
              אחרי שהבנק מאשר את התיק הוא מנפיק טופס בטחונות (נקרא גם &quot;טופס טיולים&quot;): הרשימה של מה שצריך
              להירשם ולהיחתם לטובת הבנק לפני שהוא מעביר את כספי המשכנתא, כמו רישום משכנתא או הערת אזהרה לטובתו,
              ומכתב הוראות בלתי חוזרות מהמוכר. <span dir="rtl" className="font-black text-slate-800">בשלב זה מעבירים את הטופס לעורך הדין</span>,
              שמטפל ברישום הבטחונות ובחתימת המוכר.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {/* 1. העלאה */}
          <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <StepMark done={Boolean(collateral.documentId)} number={1} />
            <div className="min-w-0 flex-1">
              <p dir="rtl" className="text-info font-black text-slate-900">העלאת הטופס לפלטפורמה</p>
              <p dir="rtl" className="text-sm text-slate-500">
                {collateral.documentId
                  ? `בתיק המסמכים: ${collateral.fileName ?? DOCUMENT_TITLE}`
                  : 'PDF או תמונה של הטופס שקיבלתם מהבנק.'}
              </p>
            </div>
            {collateral.documentId && (
              <a
                href={documentContentUrl(planId, collateral.documentId)}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black text-slate-600 hover:bg-white"
              >
                <Eye className="h-4 w-4" />
                צפייה
              </a>
            )}
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-button font-black transition-colors ${
                collateral.documentId
                  ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <FileUp className="h-4 w-4" />
              {collateral.documentId ? 'החלפה' : 'העלאת הטופס'}
            </button>
          </li>

          {/* 2. לעורך הדין */}
          <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <StepMark done={Boolean(collateral.sentToLawyerAt)} number={2} />
            <div className="min-w-0 flex-1">
              <p dir="rtl" className="text-info font-black text-slate-900">העברת הטופס לעורך הדין</p>
              <p dir="rtl" className="text-sm text-slate-500">
                {sentAt
                  ? `נשלח ב-${sentAt} אל ${collateral.lawyerEmail ?? 'עורך הדין'}`
                  : lawyer
                    ? `המייל יישלח אל ${lawyer.name} (${lawyer.email}) עם הטופס מצורף.`
                    : 'עוד לא הוגדר עורך דין בתיבת המיילים: ייפתח מייל מוכן, ותוסיפו אותו כנמען.'}
              </p>
              {failure && <p dir="rtl" className="mt-1 text-sm font-bold text-rose-600">{failure}</p>}
            </div>
            <button
              type="button"
              onClick={() => void sendToLawyer()}
              disabled={!collateral.documentId || sending}
              title={collateral.documentId ? undefined : 'העלו קודם את הטופס'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-button font-black text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
              {sentAt ? 'שליחה שוב' : 'העבר לעורך דין'}
            </button>
          </li>

          {/* 3. וידוא מול עורך הדין */}
          <li className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex flex-wrap items-start gap-3">
              <StepMark done={collateral.verifiedWithLawyer} number={3} />
              <div className="min-w-0 flex-1">
                <p dir="rtl" className="text-info font-black text-amber-950">ודאו יחד עם עורך הדין</p>
                <p dir="rtl" className="mt-0.5 text-sm leading-relaxed text-amber-950">
                  {newMortgage
                    ? 'שפריסת התשלומים תואמת לפעימות שהוגדרו בחוזה, ושכך היא נכתבת במכתב ההוראות הבלתי חוזרות שעליו חתם מוכר הנכס: אותם סכומים, אותו סדר, וכספי הבנק אחרונים.'
                    : 'שכל הבטחונות שבטופס נרשמו לטובת הבנק לפני מועד העברת הכסף.'}
                </p>
                {newMortgage && (
                  <Link
                    href={paymentScheduleHref(planId, 'SIGNING')}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:underline"
                  >
                    <CalendarRange className="h-4 w-4" />
                    {scheduleReady ? 'פעימות התשלום שהוגדרו' : 'לכלי תכנון פעימות התשלום'}
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCollateral({ verifiedWithLawyer: !collateral.verifiedWithLawyer })}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-black transition-colors ${
                  collateral.verifiedWithLawyer
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-amber-300 bg-white text-amber-900 hover:border-amber-500'
                }`}
              >
                <Check className="h-4 w-4" />
                {collateral.verifiedWithLawyer ? 'וידאנו' : 'סימון שווידאנו'}
              </button>
            </div>
          </li>
        </ol>
      </section>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
        >
          לאישור לבנק לפתיחת תיק
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        planId={planId}
        stage="SIGNING"
        defaultTitle={DOCUMENT_TITLE}
        data={data}
        onUploaded={(document) =>
          setCollateral({ documentId: document.id, fileName: document.fileName, sentToLawyerAt: null, lawyerEmail: null })
        }
      />
    </div>
  );
}

function StepMark({ done, number }: { done: boolean; number: number }) {
  return done ? (
    <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-600 ring-1 ring-slate-300">
      {number}
    </span>
  );
}
