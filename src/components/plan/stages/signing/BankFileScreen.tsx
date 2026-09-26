'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  FileUp,
  Landmark,
  Loader2,
  Scale,
  ShieldCheck,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ALLOWED_DOCUMENT_TYPES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import type { PlanData, PlanFlow, SigningData } from '@/lib/mortgage-plan';
import type { ClientTaskView } from '@/lib/client-tasks';
import {
  BANK_FILE_AUTHORIZE_KEY,
  BANK_FILE_COLLATERAL_KEY,
  BANK_FILE_DOCUMENTS,
  COLLATERAL_LIST_DOCUMENT_KEY,
  TYPICAL_COLLATERALS,
  bankFileDueAt,
  bankFileTaskSpecs,
  collateralTaskSpec,
} from '@/lib/bank-file';
import type { BankFileTaskSpec } from '@/lib/bank-file';
import { finalAuctionBank, formatDay, rateValidity } from '@/lib/rate-validity';
import { planStageMeta } from '@/data/platform/planStages';
import { formatShekel } from '../../ui';
import { useClientTasks } from '../../tasks/useClientTasks';
import { usePlanDocuments } from '../../documents/usePlanDocuments';
import { DocumentViewerDialog } from '../../documents/DocumentViewerDialog';

const ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');

/** משימות שכבר נשלחו ליצירה — כדי שטעינה כפולה של המסך לא תיצור אותן פעמיים */
const creating = new Set<string>();

/**
 * תת-השלב "אישור לבנק לפתיחת תיק משכנתא".
 *
 * אחרי שנבחר התמהיל הסופי במכרז: מאשרים לבנק להתקדם איתו, ושולחים לו מסמכים
 * עדכניים לפתיחת התיק — תלושים, דפי חשבון, אישור שמאות וחוזה רכישה. כשיועץ
 * מלווה את התהליך, לכל מסמך נפתח חלון העלאה לתיק והיועץ מעביר אותו לבנק;
 * כשהלקוח מטפל לבד, מופיעה ההנחיה וסימון "בוצע". כשהכול נשלח קופץ חלון רשימת
 * הבטחונות מהבנק, עם ההנחיה להעביר אותה לעורך הדין שמלווה את העסקה.
 *
 * כל הנחיה נשמרת כמשימה של הלקוח, ולכן היא מופיעה ברשימת המשימות ובלוח השנה,
 * וסימון "בוצע" בכל מקום מסמן אותה גם כאן.
 */
export function BankFileScreen({
  data,
  planId,
  onChange,
  advisorRun,
  flow,
  onContinue,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: SigningData) => void;
  /** יועץ מלווה את שלב החתימה — המסמכים מועלים לתיק והוא מעביר אותם לבנק */
  advisorRun: boolean;
  flow: PlanFlow;
  onContinue: () => void;
}) {
  const value = data.SIGNING;
  const { data: session } = useSession();
  const isAdvisor = session?.user?.role === 'ADVISOR';
  const bank = finalAuctionBank(data) ?? value.bank;
  const signed = data.AUCTION.signedMix;
  const finalRate = rateValidity(data).find((row) => row.bank === bank) ?? null;

  const { tasks, ready: tasksReady, add, complete, attachDocument } = useClientTasks({
    planId,
    includeDone: true,
  });
  const { documents, ready: docsReady, error, busyKey, upload } = usePlanDocuments(planId);
  const [viewing, setViewing] = useState<PlanDocumentView | null>(null);
  const [collateralOpen, setCollateralOpen] = useState(false);

  const taskOf = useMemo(() => {
    const map = new Map<string, ClientTaskView>();
    tasks
      .filter((task) => task.planId === planId && task.templateKey)
      .forEach((task) => map.set(task.templateKey as string, task));
    return (key: string) => map.get(key) ?? null;
  }, [tasks, planId]);

  const documentOf = (key: string) => documents.find((document) => document.key === key) ?? null;

  /** בוצע: המשימה סומנה, או — כשאין משימות — הסימון שנשמר בשלב */
  const isDone = (key: string): boolean => {
    const task = taskOf(key);
    if (task) return task.status === 'DONE';
    return Boolean(value.bankFile[key]) || (advisorRun && Boolean(documentOf(key)));
  };

  const ensureTasks = async (specs: BankFileTaskSpec[]) => {
    if (isAdvisor || !tasksReady) return;
    for (const spec of specs) {
      const id = `${planId}:${spec.templateKey}`;
      if (taskOf(spec.templateKey) || creating.has(id)) continue;
      creating.add(id);
      await add({
        planId,
        stage: 'SIGNING',
        kind: spec.kind,
        templateKey: spec.templateKey,
        title: spec.title,
        details: spec.details,
        dueAt: bankFileDueAt(spec.dueInDays, finalRate?.expiresOn ?? null),
      });
    }
  };

  /* ההנחיות נכנסות לרשימת המשימות וללוח השנה ברגע שנכנסים לתת-השלב */
  useEffect(() => {
    if (!tasksReady) return;
    void ensureTasks(bankFileTaskSpecs(bank, advisorRun));
    // נקרא כשהמשימות נטענו, ושוב אם השתנה מי מטפל
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksReady, advisorRun, planId]);

  const setFlag = (key: string, done: boolean, extra: Partial<SigningData> = {}) => {
    const bankFile = { ...value.bankFile };
    if (done) bankFile[key] = true;
    else delete bankFile[key];
    onChange({ ...value, ...extra, bankFile });
  };

  const toggle = (key: string) => {
    const done = !isDone(key);
    setFlag(key, done);
    const task = taskOf(key);
    if (task) void complete(task.id, done);
  };

  const uploadFor = async (key: string, name: string, file: File) => {
    const document = await upload(key, name, file);
    if (!document) return;
    const task = taskOf(key);
    if (task) void attachDocument(task.id, document.id);
    setFlag(key, true);
  };

  const sentKeys = [BANK_FILE_AUTHORIZE_KEY, ...BANK_FILE_DOCUMENTS.map((document) => document.key)];
  const sentCount = sentKeys.filter(isDone).length;
  const allSent = sentCount === sentKeys.length;
  const collateralDone = isDone(BANK_FILE_COLLATERAL_KEY);

  /* כשכל ההנחיות לפתיחת התיק בוצעו — קופץ חלון רשימת הבטחונות, פעם אחת */
  useEffect(() => {
    if (!allSent || value.collateralShown || !tasksReady || !docsReady) return;
    setCollateralOpen(true);
    onChange({ ...value, collateralShown: true });
    void ensureTasks([collateralTaskSpec(bank)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSent, value.collateralShown, tasksReady, docsReady]);

  const openCollateral = () => {
    setCollateralOpen(true);
    void ensureTasks([collateralTaskSpec(bank)]);
  };

  const collateralDocument = documentOf(COLLATERAL_LIST_DOCUMENT_KEY);

  return (
    <div className="space-y-5">
      {/* 1. האישור לבנק */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <header className="mb-5 text-center">
          <p className="text-sm font-black text-slate-400">אישור לבנק לפתיחת תיק משכנתא</p>
          <h3 className="mt-1 text-subtitle font-black text-slate-900">
            {bank ? `אשרו לבנק ${bank} להתקדם עם התמהיל שאושר סופית` : 'אשרו לבנק להתקדם עם התמהיל שאושר סופית'}
          </h3>
          <p className="mx-auto mt-2 max-w-3xl text-info font-medium leading-relaxed text-slate-600">
            האישור פותח את תיק המשכנתא בבנק על התמהיל שנבחר במכרז. לפתיחת התיק הבנק צריך מסמכים
            עדכניים: תלושים, דפי חשבון, אישור שמאות וחוזה רכישה.
          </p>
        </header>

        {signed ? (
          <div className="mx-auto mb-5 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-info font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Landmark className="h-4 w-4 text-blue-600" />
              בנק {signed.bank}
            </span>
            <span>{signed.name}</span>
            {signed.monthlyPayment != null && <span>החזר חודשי {formatShekel(signed.monthlyPayment)}</span>}
            {finalRate && finalRate.daysLeft >= 0 && (
              <span className="text-slate-500">הריביות בתוקף עד {formatDay(finalRate.expiresOn)}</span>
            )}
          </div>
        ) : (
          <p className="mx-auto mb-5 flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-info leading-relaxed text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <span className="font-black">השלימו מילוי פרטים בשלב «{planStageMeta('AUCTION', flow).shortTitle}».</span>{' '}
              כשתבחרו שם את ההצעה הסופית, הבנק והתמהיל יופיעו כאן.
            </span>
          </p>
        )}

        <CheckRow
          done={isDone(BANK_FILE_AUTHORIZE_KEY)}
          title={bank ? `אישרתי לבנק ${bank} להתקדם עם התמהיל` : 'אישרתי לבנק להתקדם עם התמהיל'}
          hint="בטלפון לבנקאי או באזור המשכנתאות הדיגיטלי של הבנק"
          onToggle={() => toggle(BANK_FILE_AUTHORIZE_KEY)}
        />
      </section>

      {/* 2. המסמכים לפתיחת התיק */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <header className="mb-5 text-center">
          <h3 className="text-subtitle font-black text-slate-900">המסמכים לפתיחת התיק</h3>
          <p className="mx-auto mt-2 max-w-3xl text-info font-medium leading-relaxed text-slate-600">
            {advisorRun
              ? 'העלו כאן כל מסמך בגרסה העדכנית שלו. היועץ שמלווה אתכם יעביר אותם לבנק.'
              : `שלחו ${bank ? `לבנק ${bank}` : 'לבנק'} את המסמכים בגרסה העדכנית, וסמנו כל אחד שנשלח.`}
          </p>
          {advisorRun && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-800">
              <UserCheck className="h-4 w-4" />
              היועץ מטפל בשליחה לבנק
            </p>
          )}
        </header>

        {error && advisorRun && (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm font-bold text-rose-700">
            {error}
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {BANK_FILE_DOCUMENTS.map((document) =>
            advisorRun ? (
              <UploadRow
                key={document.key}
                title={document.name}
                hint={document.hint}
                uploaded={documentOf(document.key)}
                busy={busyKey === document.key || !docsReady}
                onUpload={(file) => void uploadFor(document.key, `${document.name} · פתיחת תיק`, file)}
                onView={setViewing}
              />
            ) : (
              <CheckRow
                key={document.key}
                done={isDone(document.key)}
                title={document.name}
                hint={document.hint}
                doneLabel="נשלח"
                onToggle={() => toggle(document.key)}
              />
            )
          )}
        </div>

        <p className="mt-4 text-center text-sm font-bold text-slate-500">
          {allSent
            ? 'התיק מוכן לפתיחה. השלב הבא: רשימת הבטחונות מהבנק.'
            : `בוצעו ${sentCount} מתוך ${sentKeys.length} הנחיות לפתיחת התיק`}
        </p>
      </section>

      {/* 3. רשימת הבטחונות — נפתחת כשהתיק נשלח, וזמינה מכאן גם אחר כך */}
      <section
        className={`rounded-3xl border-2 p-5 shadow-sm md:p-6 ${
          collateralDone ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
        } ${allSent || value.collateralShown ? '' : 'opacity-60'}`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${
              collateralDone ? 'bg-emerald-500' : 'bg-slate-900'
            }`}
          >
            {collateralDone ? <Check className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-info font-black text-slate-900">רשימת הבטחונות מהבנק</h3>
            <p className="text-sm font-medium text-slate-600">
              {collateralDone
                ? 'הרשימה הועברה לעורך הדין שמלווה את העסקה.'
                : 'אחרי פתיחת התיק הבנק שולח רשימת בטחונות. יש להעביר אותה לעורך הדין שמלווה את העסקה.'}
            </p>
          </div>
          <button
            type="button"
            disabled={!allSent && !value.collateralShown}
            onClick={openCollateral}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Scale className="h-4 w-4" />
            לרשימת הבטחונות
          </button>
        </div>
      </section>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
        >
          למסמכי התיק לחתימה
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={collateralOpen} onOpenChange={setCollateralOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader className="text-center">
            <DialogTitle className="justify-center text-center text-subtitle">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                רשימת הבטחונות מהבנק
              </span>
            </DialogTitle>
            <DialogDescription className="text-center text-info">
              {bank ? `בנק ${bank} ישלח` : 'הבנק ישלח'} אחרי פתיחת התיק רשימה של הבטחונות שנדרשים לפני
              העמדת ההלוואה. העבירו אותה לעורך הדין שמלווה את העסקה: הוא דואג לרישום ולמסמכים.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="mb-2 text-sm font-black text-slate-500">מה בדרך כלל ברשימה</p>
              <ul className="space-y-1.5">
                {TYPICAL_COLLATERALS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-info font-medium text-slate-700">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <UploadRow
              title="הרשימה שקיבלתם מהבנק"
              hint="לא חובה. כך היא תישמר בתיק המסמכים ותהיה זמינה תמיד"
              uploaded={collateralDocument}
              busy={busyKey === COLLATERAL_LIST_DOCUMENT_KEY || !docsReady}
              onUpload={(file) =>
                void upload(COLLATERAL_LIST_DOCUMENT_KEY, 'רשימת בטחונות מהבנק', file)
              }
              onView={setViewing}
            />

            <CheckRow
              done={collateralDone}
              title="העברתי את רשימת הבטחונות לעורך הדין"
              hint="עורך הדין שמלווה את העסקה"
              onToggle={() => toggle(BANK_FILE_COLLATERAL_KEY)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <DocumentViewerDialog planId={planId} document={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/** הנחיה עם סימון "בוצע" */
function CheckRow({
  done,
  title,
  hint,
  doneLabel = 'בוצע',
  onToggle,
}: {
  done: boolean;
  title: string;
  hint: string;
  doneLabel?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all ${
        done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
          done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
        }`}
      >
        {done && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-info font-black ${done ? 'text-emerald-900' : 'text-slate-900'}`}>
          {title}
        </span>
        <span className="block text-sm font-medium text-slate-500">{hint}</span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-black ${
          done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {done ? doneLabel : 'סמנו כשבוצע'}
      </span>
    </button>
  );
}

/** חלון העלאה של מסמך אחד לתיק */
function UploadRow({
  title,
  hint,
  uploaded,
  busy,
  onUpload,
  onView,
}: {
  title: string;
  hint: string;
  uploaded: PlanDocumentView | null;
  busy: boolean;
  onUpload: (file: File) => void;
  onView: (document: PlanDocumentView) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 p-4 ${
        uploaded ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-slate-300 bg-white'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          uploaded ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {uploaded ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-info font-black text-slate-900">{title}</span>
        <span className="block truncate text-sm font-medium text-slate-500">
          {uploaded ? uploaded.fileName : hint}
        </span>
      </span>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }}
      />
      <div className="flex items-center gap-2">
        {uploaded && (
          <button
            type="button"
            onClick={() => onView(uploaded)}
            aria-label="צפייה במסמך"
            className="rounded-lg border-2 border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-blue-300"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : uploaded ? (
            <FileUp className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploaded ? 'החלפה' : 'העלאה'}
        </button>
      </div>
    </div>
  );
}
