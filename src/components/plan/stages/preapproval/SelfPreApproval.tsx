'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Eye,
  ExternalLink,
  FileUp,
  Loader2,
  Lock,
  Trash2,
  Upload,
} from 'lucide-react';
import { ALLOWED_DOCUMENT_TYPES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import type { BankPreApproval, PlanData, PreApprovalData } from '@/lib/mortgage-plan';
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
    'פנו לכל בנק שתרצו להתמחר מולו — הקישור פותח את אזור המשכנתאות הדיגיטלי שלו. את האישור העקרוני שתקבלו העלו כאן, והבנק ייפתח לתמחור בשלב המכרז.',
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
        return [
          {
            bank: info.bank,
            submittedAt: existing?.submittedAt ?? document?.uploadedAt ?? null,
            approved: Boolean(document),
            approvedAt: document ? existing?.approvedAt ?? document.uploadedAt : null,
            approvedAmount: existing?.approvedAmount ?? null,
            documentName: document?.fileName ?? null,
            note: existing?.note ?? '',
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
      bank,
      approved: false,
      approvedAt: null,
      approvedAmount: null,
      documentName: null,
      note: '',
      ...(existing ?? {}),
      submittedAt: new Date().toISOString(),
    };
    const bankApprovals = existing
      ? value.bankApprovals.map((item) => (item.bank === bank ? row : item))
      : [...value.bankApprovals, row];

    lastPushed.current = null;
    onChange(withApprovals(bankApprovals));
  };

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
              ? 'עדיין לא נבחר תמהיל סופי. חזרו לשלב בניית התמהיל ובחרו את התמהיל שאיתו פונים לבנקים.'
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
        {error && (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[13px] font-bold text-rose-700">
            {error}
          </p>
        )}

        <div className={`grid gap-3 ${bankList.length > 1 ? 'md:grid-cols-2' : 'md:max-w-xl md:mx-auto'}`}>
          {bankList.map((info) => (
            <BankCard
              key={info.slug}
              info={info}
              approval={approvalOf(info.bank)}
              uploaded={byKey.get(preApprovalDocumentKey(info.slug)) ?? null}
              busy={busyKey === preApprovalDocumentKey(info.slug) || !ready}
              onUpload={(file) =>
                upload(preApprovalDocumentKey(info.slug), `אישור עקרוני · ${info.bank}`, file)
              }
              onRemove={(documentId) => remove(documentId, preApprovalDocumentKey(info.slug))}
              onView={setViewing}
              onMarkSubmitted={() => markSubmitted(info.bank)}
            />
          ))}
        </div>
      </StagePanel>

      <DocumentViewerDialog planId={planId} document={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/** אזור של בנק אחד: הסמל, הקישור להגשה, והאישור שהתקבל ממנו */
function BankCard({
  info,
  approval,
  uploaded,
  busy,
  onUpload,
  onRemove,
  onView,
  onMarkSubmitted,
}: {
  info: PreApprovalBankInfo;
  approval: BankPreApproval | null;
  uploaded: PlanDocumentView | null;
  busy: boolean;
  onUpload: (file: File) => unknown;
  onRemove: (documentId: string) => void | Promise<void>;
  onView: (document: PlanDocumentView) => void;
  onMarkSubmitted: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const approved = Boolean(uploaded);

  return (
    <section
      className="rounded-2xl border-2 bg-white p-4"
      style={{ borderColor: approved ? info.color : '#e2e8f0' }}
    >
      <header className="flex items-center gap-3">
        <BankMark info={info} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-tight text-slate-900">{info.bank}</p>
          <p className="truncate text-[12px] font-bold text-slate-500">{info.fullName}</p>
        </div>
        {approved ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <CircleDashed className="h-5 w-5 shrink-0 text-slate-300" />
        )}
      </header>

      <p className={`mt-2 text-[13px] font-bold ${approved ? 'text-emerald-700' : 'text-slate-500'}`}>
        {approved
          ? `אישור עקרוני התקבל${uploaded ? ` · ${uploaded.fileName}` : ''}`
          : approval?.submittedAt
            ? 'הבקשה הוגשה — ממתינים לאישור'
            : 'טרם הוגשה בקשה'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={info.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onMarkSubmitted}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-black text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: info.color }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          להגשה באתר הבנק
        </a>

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
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-[13px] font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-60"
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

        {uploaded && (
          <>
            <button
              type="button"
              onClick={() => onView(uploaded)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[13px] font-black text-white transition-colors hover:bg-slate-700"
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
      </div>
    </section>
  );
}
