'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileSignature,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { AUTHORIZATION_TASK_KEY, authorizationDocumentKey, authorizationDocumentName } from '@/lib/authorization-letters';
import {
  AUTHORIZATION_BANKS,
  AUTHORIZATION_FONT_PATH,
  MAX_AUTHORIZATION_BORROWERS,
  authorizationFormPath,
  authorizationFormSpec,
  emptyBorrower,
  missingForBank,
  signedLetterFileName,
} from '@/lib/authorization-forms';
import type { AdvisorFormDetails, AuthorizationBank, AuthorizationBorrower } from '@/lib/authorization-forms';
import { BankMark } from '../stages/preapproval/BankMark';
import { documentContentUrl, documentDownloadUrl, usePlanDocuments } from '../documents/usePlanDocuments';
import { useClientTasks } from '../tasks/useClientTasks';
import { SignaturePad } from './SignaturePad';

const ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');

interface Draft {
  borrowers: AuthorizationBorrower[];
  place: string;
  /** "לקוח הבנק" לכל לווה, לפי בנק — רק בטפסים ששואלים */
  customer: Record<string, Array<boolean | null>>;
}

const BORROWER_FIELDS: Array<{ key: keyof AuthorizationBorrower; label: string; ltr?: boolean; type?: string; hint?: string }> = [
  { key: 'name', label: 'שם מלא' },
  { key: 'idNumber', label: 'מספר ת"ז', ltr: true, type: 'text' },
  { key: 'phone', label: 'טלפון נייד', ltr: true, type: 'tel' },
  { key: 'email', label: 'אימייל', ltr: true, type: 'email', hint: 'נדרש בטופס של בנק ירושלים' },
  { key: 'address', label: 'כתובת מגורים', hint: 'נדרשת בטופס של בנק ירושלים' },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-info text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

/** הטיוטה נשמרת בלשונית עד שהיא נסגרת — כדי שרענון לא ימחק את מה שהוקלד */
function draftKey(planId: string) {
  return `mashklanta:authorization-draft:${planId}`;
}
function readDraft(planId: string): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(planId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(planId: string, draft: Draft) {
  try {
    window.sessionStorage.setItem(draftKey(planId), JSON.stringify(draft));
  } catch {
    // בלי אחסון הטיוטה פשוט לא נשמרת
  }
}

/**
 * החלון שנפתח מהמשימה "כתבי הסמכה ליועץ" שהיועץ שלח.
 *
 * הלקוח מקליד את הפרטים פעם אחת וחותם על המסך, ולכל בנק שיבחר נוצר הטופס
 * המקורי של הבנק — מלא בפרטים, עם פרטי היועץ ועם החתימה מוטבעת. הקובץ נשמר
 * בתיק המסמכים של התהליך, ומגיע מיד ליועץ בלשונית "כתבי הסמכה חתומים".
 * מי שמעדיף לחתום על נייר יכול עדיין להוריד טופס ריק ולהעלות סריקה.
 */
export function AuthorizationLettersModule({ planId }: { planId: string }) {
  const { documents, ready, error, busyKey, upload, remove } = usePlanDocuments(planId);
  const { tasks, complete } = useClientTasks({ planId });
  const [draft, setDraft] = useState<Draft>({ borrowers: [emptyBorrower()], place: '', customer: {} });
  const [signatures, setSignatures] = useState<Array<Uint8Array | null>>([null, null]);
  const [advisor, setAdvisor] = useState<{ details: AdvisorFormDetails | null; missing: string[] } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const loaded = useRef(false);

  // פרטי היועץ, והשמות מהפרופיל כשאין עדיין טיוטה
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/plans/${planId}/authorization-advisor`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled) setAdvisor({ details: body?.advisor ?? null, missing: body?.missing ?? [] });
      })
      .catch(() => undefined);

    const saved = readDraft(planId);
    if (saved) {
      setDraft(saved);
      loaded.current = true;
    } else {
      void fetch('/api/profile', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((profile) => {
          if (cancelled || !profile) return;
          const first = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.name || '';
          const partner = [profile.partnerFirstName, profile.partnerLastName].filter(Boolean).join(' ').trim();
          setDraft((current) => ({
            ...current,
            borrowers:
              profile.household === 'COUPLE' && partner
                ? [emptyBorrower(first), emptyBorrower(partner)]
                : [emptyBorrower(first)],
          }));
        })
        .catch(() => undefined)
        .finally(() => {
          loaded.current = true;
        });
    }
    return () => {
      cancelled = true;
    };
  }, [planId]);

  useEffect(() => {
    if (loaded.current) writeDraft(planId, draft);
  }, [planId, draft]);

  const letters = useMemo(() => {
    const map = new Map<string, PlanDocumentView>();
    documents.forEach((document) => map.set(document.key, document));
    return map;
  }, [documents]);
  const uploadedCount = AUTHORIZATION_BANKS.filter((bank) => letters.has(authorizationDocumentKey(bank.slug))).length;
  const openTask = tasks.find((task) => task.templateKey === AUTHORIZATION_TASK_KEY && task.status === 'OPEN');
  const borrowerCount = draft.borrowers.length;
  const missingSignatures = draft.borrowers
    .map((_, index) => (signatures[index] ? null : borrowerCount > 1 ? `חתימה של לווה ${index + 1}` : 'חתימה'))
    .filter((item): item is string => Boolean(item));

  const setBorrower = (index: number, key: keyof AuthorizationBorrower, value: string) =>
    setDraft((current) => ({
      ...current,
      borrowers: current.borrowers.map((borrower, i) => (i === index ? { ...borrower, [key]: value } : borrower)),
    }));

  const setCustomer = (slug: string, index: number, value: boolean) =>
    setDraft((current) => {
      const answers = [...(current.customer[slug] ?? [null, null])];
      answers[index] = value;
      return { ...current, customer: { ...current.customer, [slug]: answers } };
    });

  const setSignature = useCallback(
    (index: number) => (png: Uint8Array | null) =>
      setSignatures((current) => current.map((item, i) => (i === index ? png : item))),
    []
  );
  const signatureHandlers = useMemo(() => [setSignature(0), setSignature(1)], [setSignature]);

  const buildPdf = async (bank: AuthorizationBank): Promise<Uint8Array> => {
    const [{ fillAuthorizationForm }, form, font] = await Promise.all([
      import('@/lib/authorization-pdf'),
      fetch(authorizationFormPath(bank.slug)).then((response) => response.arrayBuffer()),
      fetch(AUTHORIZATION_FONT_PATH).then((response) => response.arrayBuffer()),
    ]);
    return fillAuthorizationForm(
      bank.slug,
      {
        borrowers: draft.borrowers,
        advisor: advisor?.details ?? { name: '', idNumber: '', phone: '', companyName: '', companyNumber: '' },
        place: draft.place,
        date: new Date(),
        customer: draft.customer[bank.slug] ?? [null, null],
      },
      { form, font, signatures: signatures.slice(0, borrowerCount) }
    );
  };

  const toFile = (bank: AuthorizationBank, bytes: Uint8Array) =>
    new File([bytes as BlobPart], signedLetterFileName(bank), { type: 'application/pdf' });

  const generate = async (bank: AuthorizationBank) => {
    setLocalError(null);
    setGenerating(bank.slug);
    try {
      const bytes = await buildPdf(bank);
      const file = toFile(bank, bytes);
      await upload(authorizationDocumentKey(bank.slug), authorizationDocumentName(bank.bank), file);
    } catch (failure) {
      setLocalError(failure instanceof Error ? `הפקת הטופס נכשלה: ${failure.message}` : 'הפקת הטופס נכשלה. נסו שוב.');
    } finally {
      setGenerating(null);
    }
  };

  const preview = async (bank: AuthorizationBank) => {
    setLocalError(null);
    // החלון נפתח מיד, בתוך הלחיצה, כדי שחוסם החלונות לא יעצור אותו
    const tab = window.open('', '_blank');
    setGenerating(bank.slug);
    try {
      const url = URL.createObjectURL(toFile(bank, await buildPdf(bank)));
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch {
      tab?.close();
      setLocalError('הפקת התצוגה המקדימה נכשלה. נסו שוב.');
    } finally {
      setGenerating(null);
    }
  };

  const onFile = async (bank: AuthorizationBank, file: File) => {
    setLocalError(null);
    if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
      setLocalError('אפשר להעלות PDF או תמונה (JPG, PNG, WEBP, HEIC).');
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setLocalError('הקובץ גדול מ-15MB. נסו לסרוק ברזולוציה נמוכה יותר.');
      return;
    }
    await upload(authorizationDocumentKey(bank.slug), authorizationDocumentName(bank.bank), file);
  };

  const finish = async () => {
    if (!openTask) return;
    if (await complete(openTask.id)) setFinished(true);
  };

  const shownError = localError ?? error;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div dir="rtl" className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-button font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            לאזור האישי
          </Link>
          <Link
            href={`/dashboard/plans/${planId}?stage=APPLICATIONS`}
            className="rounded-xl px-3.5 py-2 text-button font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            לתהליך המשכנתא
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <section className="space-y-3">
          <span dir="rtl" className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-2xs font-black text-blue-700">
            <FileSignature className="h-3.5 w-3.5" />
            משימה מהיועץ
          </span>
          <h1 className="text-title font-black leading-tight text-slate-900">כתבי הסמכה ליועץ</h1>
          <p dir="rtl" className="text-info leading-relaxed text-slate-600">
            כדי שהיועץ יוכל לפנות לבנקים בשמכם, כל בנק מבקש כתב הסמכה חתום על הטופס שלו. מלאו את הפרטים פעם
            אחת וחתמו על המסך, ואז הפיקו את הטופס של כל בנק שתרצו שהיועץ יטפל מולו. הטופס נוצר מלא וחתום, ומגיע
            ישירות ליועץ.
          </p>
        </section>

        {/* 1. הפרטים */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <StepTitle number={1} title="הפרטים שלכם" />
          {draft.borrowers.map((borrower, index) => (
            <div key={index} dir="rtl" className="space-y-2.5">
              {borrowerCount > 1 && (
                <div dir="rtl" className="flex items-center justify-between">
                  <p dir="rtl" className="text-info font-black text-slate-800">לווה {index + 1}</p>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({ ...current, borrowers: current.borrowers.slice(0, index) }));
                        setSignatures((current) => current.map((item, i) => (i >= index ? null : item)));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                      הסרת הלווה
                    </button>
                  )}
                </div>
              )}
              <div dir="rtl" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {BORROWER_FIELDS.map(({ key, label, ltr, type, hint }) => (
                  <label key={key} className="block">
                    <span dir="rtl" className="mb-1 block text-2xs font-bold text-slate-600">
                      {label}
                    </span>
                    <input
                      value={borrower[key]}
                      onChange={(event) => setBorrower(index, key, event.target.value)}
                      dir={ltr ? 'ltr' : 'rtl'}
                      type={type ?? 'text'}
                      inputMode={key === 'idNumber' ? 'numeric' : undefined}
                      autoComplete="off"
                      className={`${inputClass} ${ltr ? 'text-right' : ''}`}
                    />
                    {hint && (
                      <span dir="rtl" className="mt-0.5 block text-2xs text-slate-400">
                        {hint}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div dir="rtl" className="flex flex-wrap items-end gap-3">
            {borrowerCount < MAX_AUTHORIZATION_BORROWERS && (
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, borrowers: [...current.borrowers, emptyBorrower()] }))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-button font-bold text-slate-700 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                הוספת לווה נוסף
              </button>
            )}
            <label className="block min-w-[14rem] flex-1 sm:max-w-xs">
              <span dir="rtl" className="mb-1 block text-2xs font-bold text-slate-600">
                היישוב שבו אתם חותמים
              </span>
              <input
                value={draft.place}
                onChange={(event) => setDraft((current) => ({ ...current, place: event.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <AdvisorLine advisor={advisor} />
        </section>

        {/* 2. החתימות */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <StepTitle number={2} title="החתימה" />
          <p dir="rtl" className="text-info text-slate-600">
            החתימה מוטבעת בכל הטפסים שתפיקו כאן. אפשר לחתום בעכבר, באצבע או בעט של טאבלט.
          </p>
          <div dir="rtl" className={`grid gap-4 ${borrowerCount > 1 ? 'md:grid-cols-2' : ''}`}>
            {draft.borrowers.map((borrower, index) => (
              <SignaturePad
                key={index}
                label={borrower.name.trim() ? `החתימה של ${borrower.name.trim()}` : `החתימה של לווה ${index + 1}`}
                onChange={signatureHandlers[index]}
              />
            ))}
          </div>
        </section>

        {/* 3. הבנקים */}
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
          <StepTitle number={3} title="הפקת הכתבים לבנקים שבחרתם" />
          {shownError && (
            <p dir="rtl" role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-info text-rose-800">
              {shownError}
            </p>
          )}
          <div dir="rtl" className="space-y-2.5">
            {AUTHORIZATION_BANKS.map((bank) => {
              const key = authorizationDocumentKey(bank.slug);
              const missing = [
                ...missingForBank(bank.slug, {
                  borrowers: draft.borrowers,
                  place: draft.place,
                  customer: draft.customer[bank.slug] ?? [null, null],
                }),
                ...missingSignatures,
              ];
              return (
                <BankRow
                  key={bank.slug}
                  bank={bank}
                  planId={planId}
                  borrowers={draft.borrowers}
                  customer={draft.customer[bank.slug] ?? [null, null]}
                  onCustomer={(index, value) => setCustomer(bank.slug, index, value)}
                  letter={letters.get(key) ?? null}
                  missing={missing}
                  busy={!ready || busyKey === key || generating === bank.slug}
                  generating={generating === bank.slug}
                  onGenerate={() => void generate(bank)}
                  onPreview={() => void preview(bank)}
                  onFile={(file) => void onFile(bank, file)}
                  onRemove={(id) => void remove(id, key)}
                />
              );
            })}
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p dir="rtl" className="min-w-0 flex-1 text-right text-info text-slate-600">
            {uploadedCount === 0
              ? 'עדיין לא נשמרו כתבים חתומים.'
              : uploadedCount === 1
                ? 'כתב הסמכה אחד נשמר ונמצא אצל היועץ.'
                : `${uploadedCount} כתבי הסמכה נשמרו ונמצאים אצל היועץ.`}
            <span dir="rtl" className="mt-1 flex items-center gap-1 text-2xs text-slate-400">
              <Lock className="h-3 w-3" />
              הכתבים נשמרים באחסון פרטי ונגישים רק לכם וליועץ שלכם
            </span>
          </p>
          {finished ? (
            <span dir="rtl" className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-button font-black text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              המשימה סומנה כבוצעה
            </span>
          ) : (
            openTask && (
              <button
                type="button"
                onClick={() => void finish()}
                disabled={uploadedCount === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                סיימתי
              </button>
            )
          )}
        </section>
      </main>
    </div>
  );
}

function StepTitle({ number, title }: { number: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-subtitle font-black text-slate-900">
      <span dir="rtl" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-button font-black text-blue-700">
        {number}
      </span>
      {title}
    </h2>
  );
}

function AdvisorLine({ advisor }: { advisor: { details: AdvisorFormDetails | null; missing: string[] } | null }) {
  if (!advisor) return null;
  const details = advisor.details;
  if (!details) {
    return (
      <p dir="rtl" className="rounded-2xl bg-slate-50 px-4 py-3 text-2xs text-slate-500">
        אין יועץ משויך לתהליך הזה, ולכן שדות היועץ בטופס יישארו ריקים.
      </p>
    );
  }
  const parts = [
    details.name,
    details.idNumber && `ת"ז ${details.idNumber}`,
    details.phone,
    details.companyName && [details.companyName, details.companyNumber && `ח"פ ${details.companyNumber}`].filter(Boolean).join(', '),
  ].filter(Boolean);
  return (
    <div dir="rtl" className="rounded-2xl bg-slate-50 px-4 py-3">
      <p dir="rtl" className="text-2xs font-bold text-slate-500">היועץ שאתם מסמיכים (ימולא בטופס אוטומטית)</p>
      <p dir="rtl" className="mt-0.5 text-info font-bold text-slate-800">{parts.join(' · ')}</p>
      {advisor.missing.length > 0 && (
        <p dir="rtl" className="mt-1 flex items-center gap-1 text-2xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          היועץ עוד לא השלים {advisor.missing.join(', ')}. השדות האלה יישארו ריקים בטופס.
        </p>
      )}
    </div>
  );
}

function BankRow({
  bank,
  planId,
  borrowers,
  customer,
  onCustomer,
  letter,
  missing,
  busy,
  generating,
  onGenerate,
  onPreview,
  onFile,
  onRemove,
}: {
  bank: AuthorizationBank;
  planId: string;
  borrowers: AuthorizationBorrower[];
  customer: Array<boolean | null>;
  onCustomer: (index: number, value: boolean) => void;
  letter: PlanDocumentView | null;
  missing: string[];
  busy: boolean;
  generating: boolean;
  onGenerate: () => void;
  onPreview: () => void;
  onFile: (file: File) => void;
  onRemove: (documentId: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const asksCustomer = authorizationFormSpec(bank.slug)?.asksCustomer ?? false;
  const ready = missing.length === 0;

  return (
    <div
      dir="rtl"
      className={`space-y-2.5 rounded-2xl border px-4 py-3.5 ${letter ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}
    >
      <div dir="rtl" className="flex flex-wrap items-center gap-3">
        <BankMark info={bank} size={40} />
        <div dir="rtl" className="min-w-0 flex-1 text-right">
          <p dir="rtl" className="text-info font-black text-slate-900">{bank.fullName}</p>
          <p dir="rtl" className="mt-0.5 text-2xs text-slate-500">
            {letter ? (
              <span dir="rtl" className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                כתב חתום נשמר · {new Date(letter.uploadedAt).toLocaleDateString('he-IL')}
              </span>
            ) : ready ? (
              'הכול מוכן להפקה'
            ) : (
              `חסר: ${missing.join(', ')}`
            )}
          </p>
        </div>

        <div dir="rtl" className="flex flex-wrap items-center gap-1.5">
          {letter && (
            <>
              <a
                href={documentContentUrl(planId, letter.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-button font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                צפייה
              </a>
              <a
                href={documentDownloadUrl(planId, letter.id)}
                title="הורדה"
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => onRemove(letter.id)}
                disabled={busy}
                title="מחיקה"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={busy || !ready}
            className={
              letter
                ? 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-button font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40'
                : 'inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-40'
            }
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : letter ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <FileCheck2 className="h-4 w-4" />
            )}
            {letter ? 'הפקה מחדש' : 'הפקת כתב חתום'}
          </button>
        </div>
      </div>

      {asksCustomer && (
        <div dir="rtl" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5">
          {borrowers.map((borrower, index) => (
            <div key={index} dir="rtl" className="flex items-center gap-2">
              <span dir="rtl" className="text-2xs font-bold text-slate-600">
                {borrower.name.trim() || `לווה ${index + 1}`} לקוח/ה של {bank.bank}?
              </span>
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => onCustomer(index, value)}
                  aria-pressed={customer[index] === value}
                  className={`rounded-lg px-2.5 py-1 text-2xs font-black transition-colors ${
                    customer[index] === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {value ? 'כן' : 'לא'}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div dir="rtl" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
        <button
          type="button"
          onClick={onPreview}
          disabled={busy || !ready}
          className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline disabled:text-slate-300 disabled:no-underline"
        >
          <Eye className="h-3.5 w-3.5" />
          תצוגה מקדימה בלי לשמור
        </button>
        <span className="text-slate-300">|</span>
        <a
          href={authorizationFormPath(bank.slug)}
          download
          className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-700 hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          טופס ריק לחתימה ידנית
        </a>
        <span className="text-slate-300">|</span>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-40"
        >
          <Upload className="h-3.5 w-3.5" />
          העלאת כתב שנחתם ידנית
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onFile(file);
          }}
        />
      </div>
    </div>
  );
}
