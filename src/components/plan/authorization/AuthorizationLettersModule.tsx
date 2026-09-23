'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileSignature,
  Loader2,
  Lock,
  PenLine,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import {
  AUTHORIZATION_TASK_KEY,
  authorizationDocumentKey,
  authorizationDocumentName,
  authorizationFormUrl,
} from '@/lib/authorization-letters';
import { PRE_APPROVAL_BANKS } from '../stages/preapproval/banks';
import type { PreApprovalBankInfo } from '../stages/preapproval/banks';
import { BankMark } from '../stages/preapproval/BankMark';
import { documentContentUrl, usePlanDocuments } from '../documents/usePlanDocuments';
import { useClientTasks } from '../tasks/useClientTasks';

const ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');

const STEPS = [
  { icon: Download, text: 'הורידו את הטופס של הבנק' },
  { icon: PenLine, text: 'מלאו וחתמו עליו' },
  { icon: Upload, text: 'העלו כאן את הכתב החתום' },
];

/**
 * החלון שנפתח מהמשימה "כתבי הסמכה ליועץ" שהיועץ שלח.
 *
 * כל בנק בשורה משלו: הורדת הטופס הריק, והעלאת הכתב החתום לתיק המסמכים של
 * התהליך. הלקוח בוחר לאילו בנקים להעלות — אין חובה לכולם. כל כתב שעולה מגיע
 * מיד ליועץ, בלשונית "כתבי הסמכה חתומים" שבתיק המסמכים של הלקוח אצלו.
 */
export function AuthorizationLettersModule({ planId }: { planId: string }) {
  const { documents, ready, error, busyKey, upload, remove } = usePlanDocuments(planId);
  const { tasks, complete } = useClientTasks({ planId });
  const [localError, setLocalError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const letters = useMemo(() => {
    const map = new Map<string, PlanDocumentView>();
    documents.forEach((document) => map.set(document.key, document));
    return map;
  }, [documents]);
  const uploadedCount = PRE_APPROVAL_BANKS.filter((info) => letters.has(authorizationDocumentKey(info.slug))).length;
  const openTask = tasks.find((task) => task.templateKey === AUTHORIZATION_TASK_KEY && task.status === 'OPEN');

  const onFile = async (info: PreApprovalBankInfo, file: File) => {
    setLocalError(null);
    if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
      setLocalError('אפשר להעלות PDF או תמונה (JPG, PNG, WEBP, HEIC).');
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setLocalError('הקובץ גדול מ-15MB. נסו לסרוק ברזולוציה נמוכה יותר.');
      return;
    }
    await upload(authorizationDocumentKey(info.slug), authorizationDocumentName(info.bank), file);
  };

  const finish = async () => {
    if (!openTask) return;
    if (await complete(openTask.id)) setFinished(true);
  };

  const shownError = localError ?? error;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div dir="rtl" className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
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

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <section className="space-y-3">
          <span dir="rtl" className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-2xs font-black text-blue-700">
            <FileSignature className="h-3.5 w-3.5" />
            משימה מהיועץ
          </span>
          <h1 className="text-title font-black leading-tight text-slate-900">כתבי הסמכה ליועץ</h1>
          <p dir="rtl" className="text-info leading-relaxed text-slate-600">
            כדי שהיועץ יוכל לפנות לבנקים בשמכם, כל בנק מבקש כתב הסמכה חתום על הטופס שלו. בחרו את הבנקים
            שתרצו שהיועץ יטפל מולם, והעלו לכל אחד מהם כתב חתום. כל כתב שתעלו מגיע ישירות ליועץ.
          </p>
          <ol className="grid gap-2 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, text }, index) => (
              <li
                key={text}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-info font-bold text-slate-700"
              >
                <span dir="rtl" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xs font-black text-blue-700">
                  {index + 1}
                </span>
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                {text}
              </li>
            ))}
          </ol>
        </section>

        {shownError && (
          <p dir="rtl" role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-info text-rose-800">
            {shownError}
          </p>
        )}

        <section className="space-y-2.5">
          {PRE_APPROVAL_BANKS.map((info) => (
            <BankRow
              key={info.slug}
              info={info}
              planId={planId}
              letter={letters.get(authorizationDocumentKey(info.slug)) ?? null}
              busy={!ready || busyKey === authorizationDocumentKey(info.slug)}
              onFile={(file) => void onFile(info, file)}
              onRemove={(id) => void remove(id, authorizationDocumentKey(info.slug))}
            />
          ))}
        </section>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p dir="rtl" className="min-w-0 flex-1 text-right text-info text-slate-600">
            {uploadedCount === 0
              ? 'עדיין לא הועלו כתבים חתומים.'
              : uploadedCount === 1
                ? 'כתב הסמכה אחד הועלה ונמצא אצל היועץ.'
                : `${uploadedCount} כתבי הסמכה הועלו ונמצאים אצל היועץ.`}
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
                סיימתי להעלות
              </button>
            )
          )}
        </section>
      </main>
    </div>
  );
}

function BankRow({
  info,
  planId,
  letter,
  busy,
  onFile,
  onRemove,
}: {
  info: PreApprovalBankInfo;
  planId: string;
  letter: PlanDocumentView | null;
  busy: boolean;
  onFile: (file: File) => void;
  onRemove: (documentId: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const formUrl = authorizationFormUrl(info.slug);
  const pick = () => input.current?.click();

  return (
    <div dir="rtl"
      className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 ${
        letter ? 'border-emerald-200' : 'border-slate-200'
      }`}
    >
      <BankMark info={info} size={40} />
      <div dir="rtl" className="min-w-0 flex-1 text-right">
        <p dir="rtl" className="text-info font-black text-slate-900">{info.fullName}</p>
        <p dir="rtl" className="mt-0.5 text-2xs text-slate-500">
          {letter ? (
            <span dir="rtl" className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              כתב חתום הועלה · {new Date(letter.uploadedAt).toLocaleDateString('he-IL')}
            </span>
          ) : formUrl ? (
            'הורידו את הטופס, חתמו והעלו אותו כאן'
          ) : (
            'הטופס של הבנק יתווסף כאן בקרוב. כבר יש לכם כתב חתום? אפשר להעלות אותו.'
          )}
        </p>
      </div>

      <div dir="rtl" className="flex flex-wrap items-center gap-1.5">
        {formUrl && (
          <a
            href={formUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-button font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            הורדת הטופס
          </a>
        )}
        {letter ? (
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
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              title="החלפת הכתב החתום"
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
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
        ) : (
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            העלאת כתב חתום
          </button>
        )}
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
