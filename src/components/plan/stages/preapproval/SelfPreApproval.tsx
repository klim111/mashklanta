'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Eye,
  ExternalLink,
  FileUp,
  Loader2,
  Lock,
  Mail,
  Trash2,
  Upload,
  UserRound,
  UserRoundCheck,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { isValidEmail, normalizeEmail } from '@/lib/conversation';
import { ALLOWED_DOCUMENT_TYPES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import type { BankPreApproval, PlanData, PreApprovalData } from '@/lib/mortgage-plan';
import { dayKey, parseDay, rateValidity } from '@/lib/rate-validity';
import type { RateValidityRow } from '@/lib/rate-validity';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { TrackStrip } from '../auction/TrackStrip';
import { PanelBadge, StagePanel } from '../auction/ui';
import { usePlanDocuments } from '../../documents/usePlanDocuments';
import { DocumentViewerDialog } from '../../documents/DocumentViewerDialog';
import { PRE_APPROVAL_BANKS, preApprovalDocumentKey } from './banks';
import type { PreApprovalBankInfo } from './banks';
import { BankMark } from './BankMark';
import { RateCountdown } from '../../RateValidity';
import { useClientConversation } from '@/components/conversation/ClientChatDock';
import { useClientMeetings } from '../../advisor/useClientMeetings';
import type { ClientMeetingView } from '../../advisor/useClientMeetings';
import type { SubmissionChannel } from '@/lib/mortgage-plan';
import { HANDOFF_MEETING_TITLE, emptyBankRow, submissionChannelOf } from '@/lib/preapproval-handoff';

const ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');

/**
 * שלב האישור העקרוני אצל הלקוח שמגיש בעצמו.
 *
 * למעלה — התמהיל שנבחר כסופי, לקריאה בלבד: זה המבנה שהבקשה מוגשת עליו, ואין
 * מה לערוך בו כאן. מתחתיו אזור לכל בנק: קישור לאזור המשכנתאות הדיגיטלי שלו,
 * והעלאת האישור העקרוני שהתקבל ממנו. הבנקים שסומנו כאן הם אלה שייפתחו
 * לתמחור בשלב המכרז, ולכן זה בדיוק מה שהשלב הזה צריך לאסוף.
 *
 * איסוף פרטי הבקשה המלא — הלווים, ההכנסות, החשבונות והמסמכים — נמצא אצל
 * היועץ, ולא כאן.
 */
/** הכותרות של המסך — במיחזור פנימי מדובר בבקשת מיחזור לבנק אחד, לא באישור עקרוני */
export interface SelfPreApprovalCopy {
  mixTitle: string;
  mixDescription: string;
  banksTitle: string;
  banksDescription: string;
}

const DEFAULT_COPY: SelfPreApprovalCopy = {
  mixTitle: 'התמהיל שנבחר לבקשה',
  mixDescription:
    'זה המבנה שנבחר בשלב בניית התמהיל, ועליו מוגשת הבקשה לאישור עקרוני. הוא אינו ניתן לעריכה כאן — לשינוי, חזרו לשלב בניית התמהיל.',
  banksTitle: 'הגשת הבקשה לבנקים',
  banksDescription:
    'ליד כל בנק שתרצו להתמחר מולו בחרו אם להגיש בעצמכם באתר הבנק, או לתת ליועץ משכלנתא לנהל את ההגשה מולו. בנק שהתקבל ממנו אישור עקרוני ייפתח לתמחור בשלב המכרז.',
};

export function SelfPreApproval({
  data,
  planId,
  onChange,
  banks,
  copy = DEFAULT_COPY,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: PreApprovalData) => void;
  /**
   * הבנקים שמוצגים להגשה. במיחזור פנימי זה הבנק שבו המשכנתא מנוהלת בלבד;
   * בלי הגבלה — כל הבנקים.
   */
  banks?: readonly string[];
  copy?: SelfPreApprovalCopy;
}) {
  const value = data.APPLICATIONS;
  const bankList = useMemo(() => {
    if (!banks || banks.length === 0) return PRE_APPROVAL_BANKS;
    const filtered = PRE_APPROVAL_BANKS.filter((info) => banks.includes(info.bank));
    // בנק שאין לו קישור הגשה ברשימה — מציגים את כולם, כדי שלא יישאר מסך ריק
    return filtered.length > 0 ? filtered : PRE_APPROVAL_BANKS;
  }, [banks]);
  const finalMixKey = data.MIX.mixKey;
  const { saved, ready: mixesReady } = useSavedMixes({ planId });
  const { documents, ready, error, busyKey, upload, remove } = usePlanDocuments(planId);
  const [viewing, setViewing] = useState<PlanDocumentView | null>(null);
  /** הבנק שהלקוח עומד לעבור לאתר שלו — לפני המעבר מוצגת תזכורת המייל */
  const [leaving, setLeaving] = useState<PreApprovalBankInfo | null>(null);
  const { data: session } = useSession();
  const registeredEmail = session?.user?.role === 'ADVISOR' ? null : session?.user?.email ?? null;
  // הכתובת האישית במשכלנתא, כשקבלת מיילים מוגדרת — היא שנרשמת בבקשה לבנק
  const mailbox = useClientConversation()?.summary?.mailboxAddress ?? null;

  const finalMix = useMemo(
    () => saved.find((item) => item.mix.id === finalMixKey) ?? null,
    [saved, finalMixKey]
  );

  const byKey = useMemo(
    () => new Map(documents.map((document) => [document.key, document])),
    [documents]
  );

  const approvalOf = (bank: string): BankPreApproval | null =>
    value.bankApprovals.find((row) => row.bank === bank) ?? null;

  /**
   * האישור מכל בנק נגזר מהמסמך שבתיק: קובץ שהועלה לאותו בנק הוא האישור ממנו.
   * מקור אמת אחד — ולכן העלאה שנכשלה פשוט לא מסמנת אישור, ומחיקת הקובץ מסירה
   * אותו. מה שנשמר בנפרד הוא רק מה שאינו נגזר מהקובץ: שהבקשה הוגשה.
   */
  const derived = useMemo<BankPreApproval[]>(
    () => [
      ...PRE_APPROVAL_BANKS.flatMap((info) => {
        const document = byKey.get(preApprovalDocumentKey(info.slug)) ?? null;
        const existing = value.bankApprovals.find((row) => row.bank === info.bank) ?? null;
        if (!document && !existing) return [];
        // בבנק שהועבר ליועץ, האישור נרשם בצד היועץ ולא נגזר מקובץ שהלקוח העלה
        if (existing?.channel === 'ADVISOR') return [existing];
        return [
          {
            bank: info.bank,
            submittedAt: existing?.submittedAt ?? document?.uploadedAt ?? null,
            approved: Boolean(document),
            approvedAt: document ? existing?.approvedAt ?? document.uploadedAt : null,
            approvedAmount: existing?.approvedAmount ?? null,
            documentName: document?.fileName ?? null,
            note: existing?.note ?? '',
            bankerName: existing?.bankerName ?? '',
            bankerEmail: existing?.bankerEmail ?? '',
            channel: existing?.channel ?? (document ? 'SELF' : null),
            handedAt: existing?.handedAt ?? null,
          },
        ];
      }),
      // בנק שנרשם במסך היועץ ואינו ברשימה כאן נשאר כפי שהוא, ולא נמחק מכאן
      ...value.bankApprovals.filter(
        (row) => !PRE_APPROVAL_BANKS.some((info) => info.bank === row.bank)
      ),
    ],
    [byKey, value.bankApprovals]
  );

  /**
   * הבנק המוביל של התהליך והדגל `approved` שמעליו נגזרים מהאישורים כאן, כי
   * עליהם נשענים תנאי סגירת השלב והשלבים שאחריו. כשאין כאן אף אישור, מה
   * שנקבע במסך היועץ נשאר כפי שהוא.
   */
  const withApprovals = (bankApprovals: BankPreApproval[]): PreApprovalData => {
    const leading = bankApprovals.find((item) => item.approved) ?? null;
    const ownedHere = value.bankApprovals.some((item) => item.approved);
    return {
      ...value,
      bankApprovals,
      bank: leading ? leading.bank : ownedHere ? null : value.bank,
      approved: leading ? true : ownedHere ? false : value.approved,
      submittedAt: leading?.submittedAt ?? value.submittedAt,
      approvedAmount: leading?.approvedAmount ?? value.approvedAmount,
    };
  };

  /* יישור הנתונים לתיק המסמכים, פעם אחת לכל שינוי אמיתי */
  const lastPushed = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const serialized = JSON.stringify(derived);
    if (serialized === JSON.stringify(value.bankApprovals) || serialized === lastPushed.current) {
      return;
    }
    lastPushed.current = serialized;
    onChange(withApprovals(derived));
    // withApprovals נגזר מ-value, שכבר בתלויות
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, derived, value, onChange]);

  /** סימון שהבקשה הוגשה לבנק — הדבר היחיד כאן שאינו נגזר מהמסמך */
  const markSubmitted = (bank: string) => {
    const existing = approvalOf(bank);
    if (existing?.submittedAt) return;

    const row: BankPreApproval = {
      ...(existing ?? emptyBankRow(bank)),
      channel: 'SELF',
      submittedAt: new Date().toISOString(),
    };
    const bankApprovals = existing
      ? value.bankApprovals.map((item) => (item.bank === bank ? row : item))
      : [...value.bankApprovals, row];

    lastPushed.current = null;
    onChange(withApprovals(bankApprovals));
  };

  /**
   * יום קבלת האישור — ממנו נספרים 24 ימי תוקף הריביות. ברירת המחדל היא יום
   * העלאת הקובץ, והלקוח מתקן אותו ליום שבו הבנק באמת נתן את האישור.
   */
  const setReceivedAt = (bank: string, day: string | null) => {
    const existing = approvalOf(bank);
    if (!existing || !day) return;
    const bankApprovals = value.bankApprovals.map((item) =>
      item.bank === bank ? { ...item, approvedAt: day } : item
    );
    lastPushed.current = null;
    onChange(withApprovals(bankApprovals));
  };

  /**
   * הבנקאי שמטפל בבקשה. המייל שלו נפתח כנמען בטאב המיילים של ההתכתבות עם
   * היועץ, וממנו מזוהות התשובות שחוזרות מהבנק.
   */
  const setBanker = (bank: string, banker: { bankerName: string; bankerEmail: string }) => {
    const existing = approvalOf(bank);
    if (
      (existing?.bankerName ?? '') === banker.bankerName &&
      (existing?.bankerEmail ?? '') === banker.bankerEmail
    ) {
      return;
    }
    const row: BankPreApproval = { ...(existing ?? emptyBankRow(bank)), ...banker };
    const bankApprovals = existing
      ? value.bankApprovals.map((item) => (item.bank === bank ? row : item))
      : [...value.bankApprovals, row];
    lastPushed.current = null;
    onChange(withApprovals(bankApprovals));
  };

  /** בחירת אופן ההגשה לבנק, או חזרה לבחירה (`null`) כל עוד לא הוגש דבר */
  const setChannel = (bank: string, channel: SubmissionChannel | null, handedAt?: string) => {
    const existing = approvalOf(bank);
    const row: BankPreApproval = {
      ...(existing ?? emptyBankRow(bank)),
      channel,
      ...(handedAt ? { handedAt } : {}),
    };
    const bankApprovals = existing
      ? value.bankApprovals.map((item) => (item.bank === bank ? row : item))
      : [...value.bankApprovals, row];
    lastPushed.current = null;
    onChange(withApprovals(bankApprovals));
  };

  /**
   * "הגשה באמצעות יועץ משכלנתא": השרת רושם את הבנק כמועבר ליועץ, פותח אצלו
   * משימה ופגישה להשלמת פרטים, ושולח לו מייל. רק אחרי שזה נשמר הכרטיס מתחלף.
   */
  const [handing, setHanding] = useState<string | null>(null);
  const [handError, setHandError] = useState<string | null>(null);
  const handToAdvisor = async (bank: string) => {
    setHanding(bank);
    setHandError(null);
    try {
      const response = await fetch(`/api/plans/${planId}/preapproval-handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setChannel(bank, 'ADVISOR', new Date().toISOString());
    } catch {
      setHandError('לא הצלחנו להעביר את ההגשה ליועץ. נסו שוב בעוד רגע.');
    } finally {
      setHanding(null);
    }
  };

  const conversation = useClientConversation();
  const emailBanker = conversation?.enabled ? conversation.composeEmail : null;
  const { meetings } = useClientMeetings();
  const handoffMeeting = useMemo(
    () =>
      meetings
        .filter(
          (meeting) =>
            meeting.title === HANDOFF_MEETING_TITLE &&
            meeting.status !== 'CANCELLED' &&
            meeting.status !== 'DECLINED'
        )
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0] ?? null,
    [meetings]
  );
  const anyHanded = bankList.some((info) => approvalOf(info.bank)?.channel === 'ADVISOR');

  const validity = useMemo(() => rateValidity(data), [data]);
  const validityOf = (bank: string): RateValidityRow | null =>
    validity.find((row) => row.bank === bank) ?? null;

  const approvedCount = value.bankApprovals.filter((row) => row.approved).length;


  return (
    <div className="space-y-5">
      {/* 1. התמהיל שנבחר — לקריאה בלבד, בדיוק כמו בשלב התמחור */}
      <StagePanel
        tone="locked"
        badge={
          <PanelBadge>
            <Lock className="h-3.5 w-3.5" />
            נעול לשינויים
          </PanelBadge>
        }
        title={copy.mixTitle}
        description={copy.mixDescription}
      >
        {finalMix ? (
          <>
            <TrackStrip tracks={finalMix.mix.tracks} variant="structure" />
            <p className="mt-3 text-center text-sm font-bold text-slate-600">
              {formatShekel(finalMix.mix.totalAmount)} · {finalMix.mix.tracks.length} מסלולים ·{' '}
              {formatDuration(finalMix.summary.months)}
            </p>
          </>
        ) : (
          <p className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">
            {mixesReady
              ? 'השלימו מילוי פרטים בשלב «בניית תמהיל»: בחרו שם את התמהיל הסופי שאיתו פונים לבנקים, והוא יופיע כאן.'
              : 'טוען את התמהיל שנבחר…'}
          </p>
        )}
      </StagePanel>

      {/* 2. הבנקים — קישור להגשה והעלאת האישור שהתקבל */}
      <StagePanel
        badge={
          approvedCount > 0 ? (
            <PanelBadge tone="emerald">{approvedCount} אישורים התקבלו</PanelBadge>
          ) : undefined
        }
        title={copy.banksTitle}
        description={copy.banksDescription}
      >
        {(error || handError) && (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm font-bold text-rose-700">
            {error || handError}
          </p>
        )}

        {anyHanded && <HandoffMeeting meeting={handoffMeeting} />}

        <div className={`grid gap-3 ${bankList.length > 1 ? 'md:grid-cols-2' : 'md:max-w-xl md:mx-auto'}`}>
          {bankList.map((info) => (
            <BankCard
              key={info.slug}
              info={info}
              approval={approvalOf(info.bank)}
              channel={submissionChannelOf(
                approvalOf(info.bank),
                byKey.has(preApprovalDocumentKey(info.slug))
              )}
              handing={handing === info.bank}
              onChooseSelf={() => setChannel(info.bank, 'SELF')}
              onChooseAdvisor={() => void handToAdvisor(info.bank)}
              onResetChoice={() => setChannel(info.bank, null)}
              onEmailBanker={emailBanker}
              uploaded={byKey.get(preApprovalDocumentKey(info.slug)) ?? null}
              busy={busyKey === preApprovalDocumentKey(info.slug) || !ready}
              onUpload={(file) =>
                upload(preApprovalDocumentKey(info.slug), `אישור עקרוני · ${info.bank}`, file)
              }
              onRemove={(documentId) => remove(documentId, preApprovalDocumentKey(info.slug))}
              onView={setViewing}
              onApply={() => setLeaving(info)}
              onBanker={(banker) => setBanker(info.bank, banker)}
              validity={validityOf(info.bank)}
              onReceivedAt={(day) => setReceivedAt(info.bank, day)}
            />
          ))}
        </div>
      </StagePanel>

      <DocumentViewerDialog planId={planId} document={viewing} onClose={() => setViewing(null)} />

      <BankEmailReminder
        info={leaving}
        email={mailbox ?? registeredEmail}
        personal={Boolean(mailbox)}
        onClose={() => setLeaving(null)}
        onContinue={(info) => {
          markSubmitted(info.bank);
          setLeaving(null);
        }}
      />
    </div>
  );
}

/**
 * תזכורת לפני המעבר לאתר הבנק: בבקשה לבנק מציינים את הכתובת האישית במשכלנתא
 * (`personal`) — כך תשובות הבנק נכנסות לטאב המיילים וגם לתיבה של הלקוח, ומייל
 * שיישלח לבנקאי מאותה כתובת יזוהה אצלו כשייך לבקשה. בלי קבלת מיילים — המייל
 * שאיתו נרשמו.
 */
function BankEmailReminder({
  info,
  email,
  personal,
  onClose,
  onContinue,
}: {
  info: PreApprovalBankInfo | null;
  email: string | null;
  personal: boolean;
  onClose: () => void;
  onContinue: (info: PreApprovalBankInfo) => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [info]);

  return (
    <Dialog open={Boolean(info)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        {info && (
          <div className="space-y-4 text-right">
            <div className="flex items-center gap-3">
              <BankMark info={info} />
              <div>
                <DialogTitle className="text-subtitle font-black text-slate-900">לפני המעבר לאתר {info.bank}</DialogTitle>
                <DialogDescription className="text-sm font-semibold text-slate-500">
                  תזכורת קצרה אחת, והבקשה תהיה מסונכרנת עם הפלטפורמה
                </DialogDescription>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3">
              <p className="text-info font-black text-amber-950">
                {personal ? 'בטופס הבקשה ציינו את הכתובת האישית שלכם במשכלנתא:' : 'בטופס הבקשה ציינו את המייל שאיתו נרשמתם:'}
              </p>
              {email ? (
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(email).then(() => setCopied(true))}
                  className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-info font-black text-slate-900 shadow-sm"
                >
                  <span dir="ltr" className="truncate">
                    {email}
                  </span>
                  <span className="shrink-0 text-2xs font-bold text-slate-500">{copied ? 'הועתק' : 'העתקה'}</span>
                </button>
              ) : (
                <p className="mt-1 text-sm font-bold text-amber-900">המייל שמופיע בפרטי החשבון שלכם.</p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-amber-900">
                {personal
                  ? 'כך תשובות הבנק יגיעו לטאב המיילים בהתכתבות וגם לתיבה הרגילה שלכם, ומייל שתשלחו לבנקאי מהפלטפורמה ייצא מאותה כתובת.'
                  : 'כך תשובות הבנק יגיעו אליכם, ומייל שתשלחו לבנקאי מטאב המיילים בהתכתבות עם היועץ יזוהה אצלו כשייך לבקשה.'}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              אחרי ההגשה, הזינו בכרטיס של {info.bank} את השם והמייל של הבנקאי שמטפל בבקשה.
            </p>

            <div className="flex flex-wrap gap-2">
              <a
                href={info.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onContinue(info)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-button font-black text-white hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                הבנתי, לאתר הבנק
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-button font-black text-slate-700 hover:bg-slate-50"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** השם והמייל של הבנקאי שמטפל בבקשה בבנק אחד. נשמר כשיוצאים מהשדה */
function BankerFields({
  approval,
  onSave,
}: {
  approval: BankPreApproval | null;
  onSave: (banker: { bankerName: string; bankerEmail: string }) => void;
}) {
  const [name, setName] = useState(approval?.bankerName ?? '');
  const [email, setEmail] = useState(approval?.bankerEmail ?? '');
  useEffect(() => setName(approval?.bankerName ?? ''), [approval?.bankerName]);
  useEffect(() => setEmail(approval?.bankerEmail ?? ''), [approval?.bankerEmail]);

  const normalized = normalizeEmail(email);
  const invalid = normalized !== '' && !isValidEmail(normalized);
  const save = () => {
    if (invalid) return;
    onSave({ bankerName: name.trim(), bankerEmail: normalized });
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-sm font-black text-slate-700">הבנקאי שמטפל בבקשה</p>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-2 focus-within:border-blue-400">
          <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={save}
            placeholder="שם הבנקאי"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-bold text-slate-900 focus:outline-none"
          />
        </label>
        <label
          className={`flex items-center gap-2 rounded-lg border-2 bg-white px-2 ${
            invalid ? 'border-rose-300' : 'border-slate-200 focus-within:border-blue-400'
          }`}
        >
          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={save}
            placeholder="banker@bank.co.il"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-left text-sm font-bold text-slate-900 focus:outline-none"
          />
        </label>
      </div>
      <p className={`mt-1 text-2xs font-semibold ${invalid ? 'text-rose-600' : 'text-slate-500'}`}>
        {invalid
          ? 'כתובת המייל אינה תקינה'
          : 'אפשר לשלוח לבנקאי מייל מטאב המיילים בהתכתבות עם היועץ, והתשובות יישמרו שם.'}
      </p>
    </div>
  );
}

/** הפגישה עם היועץ להשלמת הפרטים להגשה — ממתינה למועד, או עם התאריך והשעה */
function HandoffMeeting({ meeting }: { meeting: ClientMeetingView | null }) {
  const when = meeting ? new Date(meeting.startsAt) : null;
  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border-2 border-violet-200 bg-violet-50 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
        <CalendarClock className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p dir="rtl" className="text-info font-black text-violet-950">
          פגישה עם יועץ משכלנתא להשלמת פרטים להגשה לבנקים
        </p>
        {when ? (
          <p dir="rtl" className="mt-0.5 text-sm font-black text-violet-800">
            {when.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })} · בשעה{' '}
            {when.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : (
          <p dir="rtl" className="mt-0.5 text-sm font-bold text-violet-800">
            היועץ יקבע מועד לפגישה, והתאריך והשעה יופיעו כאן.
          </p>
        )}
      </div>
    </div>
  );
}

/** הבנקאי שהיועץ הזין — לקריאה, עם מייל אליו מכלי ההתכתבויות */
function AdvisorBanker({
  approval,
  onEmail,
}: {
  approval: BankPreApproval;
  onEmail: ((to: string) => void) | null;
}) {
  const name = approval.bankerName?.trim() ?? '';
  const email = approval.bankerEmail?.trim() ?? '';
  if (!name && !email) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p dir="rtl" className="text-sm font-black text-slate-700">הבנקאי שמטפל בבקשה</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          {name && (
            <p dir="rtl" className="flex items-center gap-1.5 text-info font-black text-slate-900">
              <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
              {name}
            </p>
          )}
          {email && (
            <p dir="ltr" className="truncate text-right text-sm font-bold text-slate-500">
              {email}
            </p>
          )}
        </div>
        {email && onEmail && (
          <button
            type="button"
            onClick={() => onEmail(email)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-button font-black text-white hover:bg-blue-700"
          >
            <Mail className="h-3.5 w-3.5" />
            שליחת מייל לבנקאי
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * אזור של בנק אחד. בכניסה למסך יש בו רק שני כפתורים — הגשה עצמית או הגשה
 * באמצעות יועץ משכלנתא — ורק אחרי הבחירה נפתחות האפשרויות בשורה שמתחת:
 *
 * - **הגשה עצמית:** הקישור לאתר הבנק; אחרי המעבר אליו — העלאת האישור, פרטי
 *   הבנקאי, ותוקף הריביות כשהאישור התקבל.
 * - **דרך היועץ:** הודעה שהיועץ מטפל ויחזור להשלמת הפרטים; הבנקאי שהיועץ הזין
 *   עם מייל אליו, ותוקף הריביות כשהיועץ רשם את האישור. אין העלאה — הלקוח לא
 *   מגיש לבד.
 */
function BankCard({
  info,
  approval,
  channel,
  handing,
  onChooseSelf,
  onChooseAdvisor,
  onResetChoice,
  onEmailBanker,
  uploaded,
  busy,
  onUpload,
  onRemove,
  onView,
  onApply,
  onBanker,
  validity,
  onReceivedAt,
}: {
  info: PreApprovalBankInfo;
  approval: BankPreApproval | null;
  /** אופן ההגשה שנבחר; ריק — עוד לא נבחר */
  channel: SubmissionChannel | null;
  /** ההעברה ליועץ נשמרת כרגע */
  handing: boolean;
  onChooseSelf: () => void;
  onChooseAdvisor: () => void;
  onResetChoice: () => void;
  /** פתיחת מייל חדש לבנקאי בכלי ההתכתבויות; ריק — אין כלי התכתבות במסך */
  onEmailBanker: ((to: string) => void) | null;
  uploaded: PlanDocumentView | null;
  busy: boolean;
  onUpload: (file: File) => unknown;
  onRemove: (documentId: string) => void | Promise<void>;
  onView: (document: PlanDocumentView) => void;
  /** לחיצה על ההגשה באתר הבנק — פותחת קודם את תזכורת המייל */
  onApply: () => void;
  onBanker: (banker: { bankerName: string; bankerEmail: string }) => void;
  /** תוקף הריביות באישור, כשהתקבל */
  validity: RateValidityRow | null;
  onReceivedAt: (day: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const received = approval?.approvedAt ? parseDay(approval.approvedAt) : null;
  const viaAdvisor = channel === 'ADVISOR';
  const approved = viaAdvisor ? Boolean(approval?.approved) : Boolean(uploaded);
  // בהגשה עצמית, ההעלאה ופרטי הבנקאי נפתחים רק אחרי המעבר לאתר הבנק
  const selfOpened = channel === 'SELF' && Boolean(approval?.submittedAt || uploaded);

  const status = approved
    ? `אישור עקרוני התקבל${!viaAdvisor && uploaded ? ` · ${uploaded.fileName}` : ''}`
    : viaAdvisor
      ? 'ההגשה בטיפול יועץ משכלנתא'
      : approval?.submittedAt
        ? 'הבקשה הוגשה — ממתינים לאישור'
        : channel === 'SELF'
          ? 'הגשה עצמית — טרם הוגשה בקשה'
          : 'בחרו איך להגיש לבנק';

  return (
    <section
      className="rounded-2xl border-2 bg-white p-4"
      style={{ borderColor: approved ? info.color : '#e2e8f0' }}
    >
      <header className="flex items-center gap-3">
        <BankMark info={info} />
        <div className="min-w-0 flex-1">
          <p className="text-info font-black leading-tight text-slate-900">{info.bank}</p>
          <p className="truncate text-xs font-bold text-slate-500">{info.fullName}</p>
        </div>
        {approved ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <CircleDashed className="h-5 w-5 shrink-0 text-slate-300" />
        )}
      </header>

      <p className={`mt-2 text-sm font-bold ${approved ? 'text-emerald-700' : viaAdvisor ? 'text-violet-700' : 'text-slate-500'}`}>
        {status}
      </p>

      {/* בכניסה למסך: שני כפתורים בלבד */}
      {channel === null && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onChooseSelf}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-button font-black text-white transition-colors hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            הגשה עצמית
          </button>
          <button
            type="button"
            disabled={handing}
            onClick={onChooseAdvisor}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-button font-black text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {handing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}
            הגשה באמצעות יועץ משכלנתא
          </button>
        </div>
      )}

      {/* הגשה עצמית */}
      {channel === 'SELF' && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-black text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: info.color }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              להגשה באתר הבנק
            </button>

            {selfOpened && (
              <>
                <input
                  ref={input}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUpload(file);
                    event.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-button font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : uploaded ? (
                    <FileUp className="h-3.5 w-3.5" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploaded ? 'החלפת האישור' : 'העלאת האישור העקרוני'}
                </button>
              </>
            )}

            {uploaded && (
              <>
                <button
                  type="button"
                  onClick={() => onView(uploaded)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-button font-black text-white transition-colors hover:bg-blue-700"
                >
                  <Eye className="h-3.5 w-3.5" />
                  צפייה
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRemove(uploaded.id)}
                  aria-label="הסרת האישור"
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}

            {!selfOpened && (
              <button
                type="button"
                onClick={onResetChoice}
                className="text-sm font-bold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
              >
                חזרה לבחירה
              </button>
            )}
          </div>

          {selfOpened && <BankerFields approval={approval} onSave={onBanker} />}
        </>
      )}

      {/* הגשה דרך יועץ משכלנתא */}
      {viaAdvisor && approval && (
        <>
          {!approved && (
            <p dir="rtl" className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold leading-relaxed text-violet-900">
              יועץ משכלנתא מטפל בהגשה ל{info.bank} ויחזור אליכם להשלמת הפרטים. אין צורך להגיש בעצמכם.
            </p>
          )}
          <AdvisorBanker approval={approval} onEmail={onEmailBanker} />
          {approved && validity && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <RateCountdown row={validity} compact />
            </div>
          )}
        </>
      )}

      {/* תאריך הקבלה והספירה של 24 ימי תוקף הריביות, בהגשה עצמית */}
      {channel === 'SELF' && approved && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <label className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
            תאריך קבלת האישור
            <input
              type="date"
              value={received ? dayKey(received) : ''}
              max={dayKey(new Date())}
              onChange={(event) => onReceivedAt(event.target.value || null)}
              className="rounded-lg border-2 border-slate-200 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:border-blue-400 focus:outline-none"
            />
          </label>
          {validity && <RateCountdown row={validity} compact />}
        </div>
      )}
    </section>
  );
}
