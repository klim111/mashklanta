'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarRange,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileUp,
  Gavel,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { PlanData, SigningData } from '@/lib/mortgage-plan';
import { paymentScheduleDefined, usesPaymentSchedule } from '@/lib/mortgage-plan';
import { paymentScheduleHref } from '@/lib/payment-schedule';
import type { ConversationDocument } from '@/lib/conversation';
import { useClientConversation } from '@/components/conversation/ClientChatDock';
import { useContacts } from '@/components/contacts/useContacts';
import { DocumentUploadDialog } from '../../documents/DocumentUploadDialog';
import { documentContentUrl } from '../../documents/usePlanDocuments';

const COLLATERAL_TITLE = 'טופס בטחונות מהבנק';
const TIYULIM_TITLE = 'טופס טיולים';

type FormKind = 'collateral' | 'tiyulim';

const stamp = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
        new Date(value)
      )
    : null;

/**
 * תת-השלב "בטחונות וטופס טיולים": שני טפסים שונים שהבנק מנפיק אחרי אישור התיק.
 *
 * - טופס הבטחונות: מה שעורך הדין והמוכרים צריכים לרשום ולהחתים לטובת הבנק.
 *   מעלים אותו ומעבירים לעורך הדין — במייל שנפתח, עורך הדין כבר בחור כנמען.
 * - טופס טיולים: רשימת המסמכים שהבנק דורש מהרוכשים לאישור התיק. מעלים אותו
 *   ושולחים למי שצריך — הנמענים נבחרים במייל שנפתח.
 *
 * לכל טופס שלושה צעדים: העלאה, שליחה, וסימון שהטיפול הושלם.
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
  const tiyulim = value.tiyulim;
  const newMortgage = usesPaymentSchedule(data);
  const scheduleReady = paymentScheduleDefined(data);
  const conversation = useClientConversation();
  const [uploading, setUploading] = useState<FormKind | null>(null);
  const [failure, setFailure] = useState<{ kind: FormKind; message: string } | null>(null);

  const setCollateral = (patch: Partial<SigningData['collateral']>) =>
    onChange({ ...value, collateral: { ...collateral, ...patch } });
  const setTiyulim = (patch: Partial<SigningData['tiyulim']>) =>
    onChange({ ...value, tiyulim: { ...tiyulim, ...patch } });

  /** עורך הדין מאנשי הקשר של הלקוח, אם כבר הוגדר עם כתובת מייל */
  const { contacts } = useContacts();
  const lawyer = contacts.find((contact) => contact.role === 'LAWYER' && Boolean(contact.email)) ?? null;

  const attachment = (documentId: string, name: string, fileName: string | null): ConversationDocument => ({
    id: documentId,
    name,
    fileName: fileName ?? 'document.pdf',
    contentType: 'application/pdf',
    size: 0,
    planName: '',
  });

  const composeUnavailable = (kind: FormKind) =>
    setFailure({ kind, message: 'תיבת המיילים אינה זמינה כרגע. נסו שוב מהאזור האישי.' });

  /** טופס הבטחונות לעורך הדין: המייל נפתח כשעורך הדין כבר בחור (או טופס להוספתו) */
  const sendCollateral = () => {
    if (!collateral.documentId) return;
    setFailure(null);
    if (!conversation?.compose) return composeUnavailable('collateral');
    conversation.compose({
      to: lawyer?.email ? [lawyer.email] : [],
      addRecipientRole: lawyer ? undefined : 'LAWYER',
      subject: 'טופס הבטחונות מהבנק — לטיפולך',
      text: [
        lawyer ? `שלום ${lawyer.name},` : 'שלום,',
        '',
        `מצורף טופס הבטחונות שקיבלנו מהבנק במסגרת ${newMortgage ? 'המשכנתא לרכישת הנכס' : 'מיחזור המשכנתא'}.`,
        newMortgage
          ? 'נבקש את טיפולך ברישום הבטחונות מול המוכרים, ולוודא שפריסת התשלומים תואמת לפעימות שהוגדרו בחוזה ושכך הן נכתבות במכתב ההוראות הבלתי חוזרות שעליו חותם מוכר הנכס.'
          : 'נבקש את טיפולך ברישום הבטחונות לטובת הבנק.',
        '',
        'תודה,',
      ].join('\n'),
      documents: [attachment(collateral.documentId, COLLATERAL_TITLE, collateral.fileName)],
      onSent: (to) => setCollateral({ sentToLawyerAt: new Date().toISOString(), lawyerEmail: to.join(', ') }),
    });
  };

  /** טופס טיולים: המייל נפתח בלי נמען, והלקוח בוחר למי לשלוח */
  const sendTiyulim = () => {
    if (!tiyulim.documentId) return;
    setFailure(null);
    if (!conversation?.compose) return composeUnavailable('tiyulim');
    conversation.compose({
      subject: 'טופס טיולים מהבנק — רשימת המסמכים לאישור התיק',
      text: [
        'שלום,',
        '',
        'מצורף טופס הטיולים שקיבלנו מהבנק: רשימת המסמכים שהבנק דורש מאיתנו לאישור תיק המשכנתא.',
        '',
        'תודה,',
      ].join('\n'),
      documents: [attachment(tiyulim.documentId, TIYULIM_TITLE, tiyulim.fileName)],
      onSent: (to) => setTiyulim({ sentAt: new Date().toISOString(), sentTo: to.join(', ') }),
    });
  };

  const collateralSent = stamp(collateral.sentToLawyerAt);
  const tiyulimSent = stamp(tiyulim.sentAt);

  return (
    <div dir="rtl" className="space-y-5 text-right">
      <FormCard
        icon={<ShieldCheck className="h-5 w-5" />}
        tone="violet"
        title="טופס הבטחונות"
        explanation={
          <>
            {newMortgage
              ? 'אחרי שהבנק מאשר את התיק הוא מנפיק טופס בטחונות: מה שצריך להירשם ולהיחתם לטובת הבנק לפני שהוא מעביר את כספי המשכנתא, כמו רישום משכנתא או הערת אזהרה לטובתו ומכתב הוראות בלתי חוזרות מהמוכר. '
              : 'אחרי שהבנק מאשר את התיק הוא מנפיק טופס בטחונות: מה שצריך להירשם ולהיחתם לטובת הבנק לפני שהוא מעביר את כספי המשכנתא, כמו רישום המשכנתא לטובתו. '}
            <span dir="rtl" className="font-black text-slate-800">את הטופס מעבירים לעורך הדין</span>
            {newMortgage ? ', שמטפל בו יחד עם המוכרים.' : ', שמטפל ברישום הבטחונות.'}
          </>
        }
        documentId={collateral.documentId}
        fileName={collateral.fileName}
        documentTitle={COLLATERAL_TITLE}
        planId={planId}
        onUpload={() => setUploading('collateral')}
        send={{
          title: 'העברת הטופס לעורך הדין',
          hint: collateralSent
            ? `נשלח ב-${collateralSent} אל ${collateral.lawyerEmail ?? 'עורך הדין'}`
            : lawyer
              ? `ייפתח מייל מוכן עם הטופס, ועורך הדין ${lawyer.name} כבר בחור כנמען.`
              : 'ייפתח מייל מוכן עם הטופס, ותוסיפו את עורך הדין כנמען.',
          label: collateralSent ? 'שליחה שוב' : 'העבר לעורך דין',
          icon: <Gavel className="h-4 w-4" />,
          done: Boolean(collateral.sentToLawyerAt),
          onSend: sendCollateral,
        }}
        confirm={{
          title: 'ודאו יחד עם עורך הדין',
          hint: newMortgage
            ? 'שהבטחונות נרשמים לטובת הבנק, ושפריסת התשלומים תואמת לפעימות שהוגדרו בחוזה וכך היא נכתבת במכתב ההוראות הבלתי חוזרות שעליו חותם מוכר הנכס: אותם סכומים ואותו סדר.'
            : 'שכל הבטחונות שבטופס נרשמו לטובת הבנק לפני מועד העברת הכסף.',
          extra: newMortgage ? (
            <Link
              href={paymentScheduleHref(planId, 'SIGNING')}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:underline"
            >
              <CalendarRange className="h-4 w-4" />
              {scheduleReady ? 'פעימות התשלום שהוגדרו' : 'לכלי תכנון פעימות התשלום'}
            </Link>
          ) : null,
          done: collateral.verifiedWithLawyer,
          labels: ['סימון שווידאנו', 'וידאנו'],
          onToggle: () => setCollateral({ verifiedWithLawyer: !collateral.verifiedWithLawyer }),
        }}
        failure={failure?.kind === 'collateral' ? failure.message : null}
      />

      <FormCard
        icon={<ClipboardList className="h-5 w-5" />}
        tone="teal"
        title="טופס טיולים"
        explanation={
          <>
            רשימת כל המסמכים שהבנק דורש מכם, הרוכשים, להמציא לטובת אישור תיק המשכנתא. העלו אותו, שלחו אותו למי
            שעוזר לכם לאסוף את המסמכים, וסמנו כשכל המסמכים שברשימה הומצאו לבנק.
          </>
        }
        documentId={tiyulim.documentId}
        fileName={tiyulim.fileName}
        documentTitle={TIYULIM_TITLE}
        planId={planId}
        onUpload={() => setUploading('tiyulim')}
        send={{
          title: 'שליחת טופס הטיולים',
          hint: tiyulimSent
            ? `נשלח ב-${tiyulimSent} אל ${tiyulim.sentTo ?? 'הנמענים'}`
            : 'ייפתח מייל מוכן עם הטופס, ותבחרו למי לשלוח אותו.',
          label: tiyulimSent ? 'שליחה שוב' : 'שליחת טופס הטיולים',
          icon: <Send className="h-4 w-4" />,
          done: Boolean(tiyulim.sentAt),
          onSend: sendTiyulim,
        }}
        confirm={{
          title: 'המצאת המסמכים לבנק',
          hint: 'סמנו כשכל המסמכים שברשימה הועברו לבנק.',
          extra: null,
          done: tiyulim.documentsProvided,
          labels: ['סימון שהמסמכים הומצאו', 'המסמכים הומצאו'],
          onToggle: () => setTiyulim({ documentsProvided: !tiyulim.documentsProvided }),
        }}
        failure={failure?.kind === 'tiyulim' ? failure.message : null}
      />

      <div className="flex justify-start">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
        >
          להגשת מקורות הבטחונות בסניף
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <DocumentUploadDialog
        open={uploading !== null}
        onOpenChange={(open) => !open && setUploading(null)}
        planId={planId}
        stage="SIGNING"
        defaultTitle={uploading === 'tiyulim' ? TIYULIM_TITLE : COLLATERAL_TITLE}
        data={data}
        onUploaded={(document) =>
          uploading === 'tiyulim'
            ? setTiyulim({ documentId: document.id, fileName: document.fileName, sentAt: null, sentTo: null })
            : setCollateral({ documentId: document.id, fileName: document.fileName, sentToLawyerAt: null, lawyerEmail: null })
        }
      />
    </div>
  );
}

const TONES = {
  violet: { icon: 'bg-violet-50 text-violet-600', send: 'bg-violet-600 hover:bg-violet-700' },
  teal: { icon: 'bg-teal-50 text-teal-600', send: 'bg-teal-600 hover:bg-teal-700' },
} as const;

function FormCard({
  icon,
  tone,
  title,
  explanation,
  documentId,
  fileName,
  documentTitle,
  planId,
  onUpload,
  send,
  confirm,
  failure,
}: {
  icon: ReactNode;
  tone: keyof typeof TONES;
  title: string;
  explanation: ReactNode;
  documentId: string | null;
  fileName: string | null;
  documentTitle: string;
  planId: string;
  onUpload: () => void;
  send: { title: string; hint: string; label: string; icon: ReactNode; done: boolean; onSend: () => void };
  confirm: {
    title: string;
    hint: string;
    extra: ReactNode;
    done: boolean;
    labels: [string, string];
    onToggle: () => void;
  };
  failure: string | null;
}) {
  const colors = TONES[tone];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colors.icon}`}>{icon}</span>
        <div dir="rtl" className="min-w-0 text-right">
          <h3 dir="rtl" className="text-subtitle font-black text-slate-900">{title}</h3>
          <p dir="rtl" className="mt-1 text-right text-info leading-relaxed text-slate-600">{explanation}</p>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {/* 1. העלאה */}
        <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <StepMark done={Boolean(documentId)} number={1} />
          <div className="min-w-0 flex-1 text-right">
            <p dir="rtl" className="text-right text-info font-black text-slate-900">העלאת הטופס לפלטפורמה</p>
            <p dir="rtl" className="text-right text-sm text-slate-500">
              {documentId ? `בתיק המסמכים: ${fileName ?? documentTitle}` : 'PDF או תמונה של הטופס שקיבלתם מהבנק.'}
            </p>
          </div>
          {documentId && (
            <a
              href={documentContentUrl(planId, documentId)}
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
            onClick={onUpload}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-button font-black transition-colors ${
              documentId
                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <FileUp className="h-4 w-4" />
            {documentId ? 'החלפה' : 'העלאת הטופס'}
          </button>
        </li>

        {/* 2. שליחה */}
        <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <StepMark done={send.done} number={2} />
          <div className="min-w-0 flex-1 text-right">
            <p dir="rtl" className="text-right text-info font-black text-slate-900">{send.title}</p>
            <p dir="rtl" className="text-right text-sm text-slate-500">{send.hint}</p>
            {failure && <p dir="rtl" className="mt-1 text-right text-sm font-bold text-rose-600">{failure}</p>}
          </div>
          <button
            type="button"
            onClick={send.onSend}
            disabled={!documentId}
            title={documentId ? undefined : 'העלו קודם את הטופס'}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-button font-black text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${colors.send}`}
          >
            {send.icon}
            {send.label}
          </button>
        </li>

        {/* 3. השלמה */}
        <li className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-wrap items-start gap-3">
            <StepMark done={confirm.done} number={3} />
            <div className="min-w-0 flex-1 text-right">
              <p dir="rtl" className="text-right text-info font-black text-amber-950">{confirm.title}</p>
              <p dir="rtl" className="mt-0.5 text-right text-sm leading-relaxed text-amber-950">{confirm.hint}</p>
              {confirm.extra}
            </div>
            <button
              type="button"
              onClick={confirm.onToggle}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-black transition-colors ${
                confirm.done
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border border-amber-300 bg-white text-amber-900 hover:border-amber-500'
              }`}
            >
              <Check className="h-4 w-4" />
              {confirm.done ? confirm.labels[1] : confirm.labels[0]}
            </button>
          </div>
        </li>
      </ol>
    </section>
  );
}

export function StepMark({ done, number }: { done: boolean; number: number }) {
  return done ? (
    <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-600 ring-1 ring-slate-300">
      {number}
    </span>
  );
}
