'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Banknote,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Gavel,
  Info,
  Landmark,
  Loader2,
  Plus,
  RotateCcw,
  Scale,
  Trash2,
  Wallet,
} from 'lucide-react';
import { NumericInput } from '@/components/ui/numeric-input';
import { isPlanStage, usesPaymentSchedule } from '@/lib/mortgage-plan';
import {
  BANK_EQUITY_EXPLANATION,
  FULL_EQUITY_NOTE,
  LAWYER_NOTES,
  MAX_INSTALLMENTS,
  blankInstallment,
  draftSchedule,
  equityPaidBeforeBank,
  equityShare,
  insertInstallment,
  paymentScheduleReportHref,
  requiredEquityBeforeBank,
  scheduleDefined,
  scheduleIssues,
  sumBySource,
} from '@/lib/payment-schedule';
import type { PaymentInstallment, PaymentSchedule, PaymentSource } from '@/lib/payment-schedule';
import { AUTHORIZATION_FONT_PATH } from '@/lib/authorization-forms';
import { usePlan } from '../usePlan';
import { formatShekel } from '../ui';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-info text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

/**
 * כלי תכנון פעימות התשלום למוכר, למשכנתא חדשה.
 *
 * הלוח מתחיל מהפרופיל הפיננסי — מחיר הנכס וסכום המשכנתא — והוא רשימה אחת של
 * פעימות לפי הסדר, כל אחת מההון העצמי או מכספי הבנק. הלקוח עורך, מוסיף, מוחק
 * ומזיז פעימות, ומזין את אחוז ההון העצמי שהבנק דורש לפני כספי המשכנתא: הכלי
 * מתריע כשעד הפעימה הראשונה מהבנק לא שולם מספיק, ובודק שהסכומים מתחלקים בדיוק
 * בין ההון העצמי לבנק. אחרי האישור מפיקים דוח PDF ועמוד HTML לעורך הדין.
 */
export function PaymentScheduleTool({ planId }: { planId: string }) {
  const { plan, ready, error, saveState, updateStage } = usePlan(planId);
  const searchParams = useSearchParams();
  const from = searchParams?.get('from');
  const backStage = from && isPlanStage(from) ? from : null;
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const profile = plan?.data.ANALYSIS;
  const profilePrice = profile?.propertyValue ?? null;
  const profileBank =
    profile?.mortgageAmount ??
    (profilePrice && profile?.equity != null ? Math.max(0, profilePrice - profile.equity) : null);

  const stored = plan?.data.SIGNING.paymentSchedule ?? null;
  // עד העריכה הראשונה מוצג הלוח ההתחלתי מהפרופיל; הוא נשמר עם השינוי הראשון
  const initial = useMemo(
    () => draftSchedule(profilePrice, profileBank),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan?.id, profilePrice, profileBank]
  );
  const schedule: PaymentSchedule = stored ?? initial;

  const issues = useMemo(() => scheduleIssues(schedule), [schedule]);
  const defined = scheduleDefined(schedule);
  const price = schedule.propertyPrice ?? 0;
  const bankTotal = schedule.bankAmount ?? 0;
  const equityTarget = equityShare(schedule) ?? 0;
  const equityPaid = sumBySource(schedule, 'EQUITY');
  const bankPaid = sumBySource(schedule, 'BANK');
  const requiredBefore = requiredEquityBeforeBank(schedule);
  const paidBefore = equityPaidBeforeBank(schedule);
  const firstBank = schedule.installments.findIndex((item) => item.source === 'BANK');
  const issueIds = new Set(issues.map((issue) => issue.installmentId).filter(Boolean));

  useEffect(() => {
    document.title = 'תכנון פעימות התשלום · משכלנתא';
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div dir="rtl" className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h1 className="text-subtitle font-black text-slate-900">התהליך לא נמצא</h1>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-button font-bold text-white">
          חזרה לאזור האישי
        </Link>
      </div>
    );
  }

  const planHref = `/dashboard/plans/${planId}${backStage ? `?stage=${backStage}` : ''}`;
  const applies = usesPaymentSchedule(plan.data);

  /** כל שינוי נשמר מיד, ומבטל את האישור — לוח שנערך צריך אישור מחדש */
  const save = (next: PaymentSchedule) => {
    updateStage('SIGNING', {
      ...plan.data.SIGNING,
      paymentSchedule: { ...next, confirmedAt: null, updatedAt: new Date().toISOString() },
    });
  };

  const setInstallment = (id: string, patch: Partial<PaymentInstallment>) =>
    save({
      ...schedule,
      installments: schedule.installments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  const addInstallment = (source: PaymentSource) => {
    if (schedule.installments.length >= MAX_INSTALLMENTS) return;
    const item = blankInstallment(source);
    // פעימה חדשה מההון העצמי נכנסת לפני כספי הבנק; אפשר להזיז אותה אחר כך
    const remaining =
      source === 'EQUITY' ? Math.max(0, equityTarget - equityPaid) : Math.max(0, bankTotal - bankPaid);
    item.amount = remaining > 0 ? remaining : null;
    save({ ...schedule, installments: insertInstallment(schedule.installments, item) });
  };

  const removeInstallment = (id: string) =>
    save({ ...schedule, installments: schedule.installments.filter((item) => item.id !== id) });

  /** הזזה ברשימה כולה: הסדר הוא סדר התשלומים בחוזה */
  const move = (id: string, direction: -1 | 1) => {
    const list = [...schedule.installments];
    const index = list.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    save({ ...schedule, installments: list });
  };

  /** השלמת ההפרש בפעימה האחרונה של הקבוצה */
  const balance = (source: PaymentSource) => {
    const rows = schedule.installments.filter((item) => item.source === source);
    const last = rows[rows.length - 1];
    if (!last) return;
    const target = source === 'EQUITY' ? equityTarget : bankTotal;
    const others = rows.slice(0, -1).reduce((total, item) => total + (item.amount ?? 0), 0);
    setInstallment(last.id, { amount: Math.max(0, target - others) });
  };

  const resetFromProfile = () => save(draftSchedule(profilePrice, profileBank));

  const confirm = () => {
    if (issues.length > 0) return;
    updateStage('SIGNING', {
      ...plan.data.SIGNING,
      paymentSchedule: { ...schedule, confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    setPdfError(null);
    try {
      const [{ scheduleReportPdf }, font] = await Promise.all([
        import('@/lib/payment-schedule-pdf'),
        fetch(AUTHORIZATION_FONT_PATH).then((response) => {
          if (!response.ok) throw new Error('font');
          return response.arrayBuffer();
        }),
      ]);
      const bytes = await scheduleReportPdf(
        { schedule, title: plan.name, propertyAddress: plan.propertyAddress, generatedAt: new Date() },
        font
      );
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'פעימות-תשלום.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setPdfError('לא הצלחנו להפיק את ה-PDF. נסו שוב בעוד רגע.');
    } finally {
      setPdfBusy(false);
    }
  };

  const profileDiffers =
    (profilePrice !== null && profilePrice !== schedule.propertyPrice) ||
    (profileBank !== null && profileBank !== schedule.bankAmount);
  const equityShort = profile?.equity != null && profile.equity < equityTarget;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-right">
      <header className="border-b border-slate-200 bg-white">
        <div dir="rtl" className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <Link
            href={planHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-button font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            לתהליך המשכנתא
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl px-3.5 py-2 text-button font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            לאזור האישי
          </Link>
          <span dir="rtl" className="mr-auto text-xs font-bold text-slate-400">
            {saveState === 'saving' || saveState === 'dirty'
              ? 'שומר…'
              : saveState === 'error'
                ? 'השמירה נכשלה'
                : 'נשמר בחשבון שלכם'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-24">
        <section className="space-y-2">
          <span dir="rtl" className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-2xs font-black text-blue-700">
            <Scale className="h-3.5 w-3.5" />
            {plan.propertyAddress || plan.name}
          </span>
          <h1 className="text-title font-black leading-tight text-slate-900">תכנון פעימות התשלום</h1>
          <p dir="rtl" className="max-w-3xl text-info leading-relaxed text-slate-600">
            כאן קובעים איך ומתי משולם מחיר הנכס למוכר, כמו שייכתב בחוזה. הלוח מתחיל מהפרופיל הפיננסי שלכם; עדכנו
            אותו לפי מה שסוכם עם המוכר, הוסיפו או מחקו פעימות, ואשרו. אחר כך מפיקים דוח לעורך הדין.
          </p>
        </section>

        {!applies && (
          <p dir="rtl" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-info text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            הכלי מיועד למשכנתא חדשה לרכישת נכס. בתהליך הזה אין מוכר לשלם לו, ואפשר להשתמש בו לתכנון בלבד.
          </p>
        )}

        {/* מחיר הנכס והחלוקה */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div dir="rtl" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AmountField
              label="מחיר הנכס בחוזה"
              value={schedule.propertyPrice}
              onChange={(value) => save({ ...schedule, propertyPrice: value })}
            />
            <AmountField
              label="סכום המשכנתא מהבנק"
              value={schedule.bankAmount}
              onChange={(value) => save({ ...schedule, bankAmount: value })}
            />
            <div>
              <span dir="rtl" className="mb-1.5 block text-xs font-bold text-slate-600">החלק מההון העצמי</span>
              <div dir="rtl" className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-info font-black text-teal-800">
                {formatShekel(equityTarget)}
              </div>
            </div>
            <label className="block">
              <span dir="rtl" className="mb-1.5 block text-xs font-bold text-slate-600">
                אחוז מההון העצמי שהבנק דורש לפני כספי המשכנתא
              </span>
              <div dir="rtl" className="relative">
                <NumericInput
                  value={schedule.bankRequiredEquityPercent}
                  onChange={(value) =>
                    save({
                      ...schedule,
                      bankRequiredEquityPercent: value === null ? null : Math.min(100, Math.max(0, Math.round(value * 10) / 10)),
                    })
                  }
                  placeholder="לפי דרישת הבנק"
                  className={`${inputClass} pl-9 font-black`}
                />
                <span dir="rtl" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
              </div>
              {requiredBefore !== null && (
                <span dir="rtl" className="mt-1 block text-right text-2xs font-bold text-slate-500">
                  {formatShekel(requiredBefore)} לפני הפעימה הראשונה מהבנק
                </span>
              )}
            </label>
          </div>

          {price > 0 && (
            <div dir="rtl" className="mt-5 space-y-2">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <span dir="rtl" className="h-full bg-teal-600" style={{ width: `${(equityTarget / price) * 100}%` }} />
                <span dir="rtl" className="h-full bg-blue-600" style={{ width: `${(bankTotal / price) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span dir="rtl" className="text-teal-700">הון עצמי · {((equityTarget / price) * 100).toFixed(1)}%</span>
                <span dir="rtl" className="text-blue-700">משכנתא · {((bankTotal / price) * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {(profileDiffers || equityShort) && (
            <div dir="rtl" className="mt-4 space-y-2">
              {profileDiffers && (
                <p dir="rtl" className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <Info className="h-4 w-4 shrink-0 text-slate-400" />
                  בפרופיל הפיננסי: מחיר {formatShekel(profilePrice)}, משכנתא {formatShekel(profileBank)}.
                  <button
                    type="button"
                    onClick={resetFromProfile}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-black text-blue-700 hover:bg-blue-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    בנייה מחדש לפי הפרופיל
                  </button>
                </p>
              )}
              {equityShort && (
                <p dir="rtl" className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  ההון העצמי בפרופיל ({formatShekel(profile?.equity)}) קטן מהחלק שצריך לשלם ממנו למוכר. בדקו את
                  הסכומים לפני שמתחייבים בחוזה.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ההון העצמי שהבנק דורש */}
        <div dir="rtl" className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <p dir="rtl" className="text-right text-sm font-black text-blue-950">כמה הון עצמי הבנק דורש לפני כספי המשכנתא</p>
            <p dir="rtl" className="mt-0.5 text-right text-sm leading-relaxed text-blue-900">{BANK_EQUITY_EXPLANATION}</p>
            <p dir="rtl" className="mt-1.5 text-right text-sm leading-relaxed text-blue-900">
              <span className="font-black">שימו לב: </span>
              {FULL_EQUITY_NOTE}
            </p>
            {requiredBefore !== null && firstBank >= 0 && (
              <p
                dir="rtl"
                className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-right text-sm font-black ${
                  paidBefore + 1 >= requiredBefore ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {paidBefore + 1 >= requiredBefore ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                עד הפעימה הראשונה מהבנק: {formatShekel(paidBefore)} מההון העצמי, הבנק דורש {formatShekel(requiredBefore)}
              </p>
            )}
          </div>
        </div>

        <InstallmentList
          rows={schedule.installments}
          equity={{ paid: equityPaid, target: equityTarget }}
          bank={{ paid: bankPaid, target: bankTotal }}
          issueIds={issueIds}
          onChange={setInstallment}
          onRemove={removeInstallment}
          onMove={move}
          onAdd={addInstallment}
          onBalance={balance}
          full={schedule.installments.length >= MAX_INSTALLMENTS}
        />

        {/* סה״כ */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white">
          <span dir="rtl" className="text-sm font-bold text-white/80">
            סך הכל · {formatShekel(equityPaid)} הון עצמי + {formatShekel(bankPaid)} משכנתא
          </span>
          <span dir="rtl" className="text-lg font-black">
            {formatShekel(equityPaid + bankPaid)}
            <span dir="rtl" className="mr-2 text-sm font-bold text-white/70">מתוך {formatShekel(price)}</span>
          </span>
        </div>

        {/* הבדיקות */}
        <AnimatePresence mode="wait" initial={false}>
          {issues.length > 0 ? (
            <motion.div
              key="issues"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              dir="rtl"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5"
            >
              <p className="flex items-center gap-2 text-sm font-black text-rose-900">
                <AlertCircle className="h-4 w-4" />
                מה עוד צריך לתקן
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pr-6 text-sm leading-relaxed text-rose-900">
                {issues.map((issue, index) => (
                  <li key={`${issue.kind}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.p
              key="ok"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              dir="rtl"
              className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4" />
              הסכומים תואמים: ההון העצמי וכספי הבנק מסתכמים בדיוק במחיר הנכס.
            </motion.p>
          )}
        </AnimatePresence>

        {/* הערות לעורך הדין */}
        <section dir="rtl" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm font-black text-amber-950">
            <Gavel className="h-4 w-4 text-amber-700" />
            לבדיקה עם עורך הדין
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pr-6 text-sm leading-relaxed text-amber-950">
            {LAWYER_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        {/* אישור והדוחות */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {defined ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-button font-black text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                פעימות התשלום הוגדרו
              </span>
            ) : (
              <button
                type="button"
                onClick={confirm}
                disabled={issues.length > 0}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-button font-black text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                אישור פעימות התשלום
              </button>
            )}
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={pdfBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              דוח PDF
            </button>
            <a
              href={paymentScheduleReportHref(planId)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-button font-black text-slate-800 transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              דוח HTML
            </a>
            <a
              href={paymentScheduleReportHref(planId, true)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-button font-bold text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              הורדת קובץ HTML
            </a>
          </div>
          <p dir="rtl" className="mt-3 text-sm text-slate-500">
            {defined
              ? 'שינוי בלוח מבטל את האישור, ואז מאשרים שוב. שלב החתימה נסגר רק כשהפעימות מוגדרות.'
              : 'אחרי האישור התזכורת יורדת משלבי התהליך, והסעיף בשלב החתימה מסומן כהושלם.'}
          </p>
          {pdfError && <p dir="rtl" className="mt-2 text-sm font-bold text-rose-600">{pdfError}</p>}
        </section>
      </main>
    </div>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span dir="rtl" className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <div dir="rtl" className="relative">
        <NumericInput integer value={value} onChange={onChange} className={`${inputClass} pl-9 font-black`} />
        <span dir="rtl" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₪</span>
      </div>
    </label>
  );
}

function InstallmentList({
  rows,
  equity,
  bank,
  issueIds,
  onChange,
  onRemove,
  onMove,
  onAdd,
  onBalance,
  full,
}: {
  rows: PaymentInstallment[];
  equity: { paid: number; target: number };
  bank: { paid: number; target: number };
  issueIds: Set<string | undefined>;
  onChange: (id: string, patch: Partial<PaymentInstallment>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onAdd: (source: PaymentSource) => void;
  onBalance: (source: PaymentSource) => void;
  full: boolean;
}) {
  const groups: { source: PaymentSource; label: string; paid: number; target: number; tone: string; button: string }[] = [
    { source: 'EQUITY', label: 'הון עצמי', ...equity, tone: 'text-teal-800', button: 'text-teal-700 hover:bg-teal-50' },
    { source: 'BANK', label: 'כספי הבנק', ...bank, tone: 'text-blue-800', button: 'text-blue-700 hover:bg-blue-50' },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header dir="rtl" className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-5 py-3">
        <span className="text-base font-black text-slate-900">פעימות התשלום לפי הסדר בחוזה</span>
        <span className="flex flex-wrap gap-3 text-sm font-bold">
          {groups.map((group) => (
            <span key={group.source} dir="rtl" className={group.tone}>
              {group.label}: {formatShekel(group.paid)} מתוך {formatShekel(group.target)}
            </span>
          ))}
        </span>
      </header>

      {rows.length === 0 && (
        <p dir="rtl" className="px-5 py-4 text-right text-sm text-slate-500">עוד אין פעימות.</p>
      )}

      <ul className="divide-y divide-slate-100">
        {rows.map((item, index) => {
          const fromEquity = item.source === 'EQUITY';
          return (
            <li
              key={item.id}
              className={`grid gap-3 border-r-4 px-4 py-4 md:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.6fr)_10rem_auto] md:items-start ${
                fromEquity ? 'border-r-teal-600' : 'border-r-blue-600'
              } ${issueIds.has(item.id) ? 'bg-rose-50/60' : ''}`}
            >
              <div className="space-y-1.5">
                <span dir="rtl" className="block pt-2 text-right text-base font-black text-slate-900">פעימה {index + 1}</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="מקור הכסף">
                  {(['EQUITY', 'BANK'] as const).map((source) => {
                    const active = item.source === source;
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => !active && onChange(item.id, { source, payee: item.payee || (source === 'BANK' ? 'המוכר' : '') })}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-black transition-colors ${
                          active
                            ? source === 'EQUITY'
                              ? 'bg-teal-600 text-white'
                              : 'bg-blue-600 text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {source === 'EQUITY' ? <Wallet className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                        {source === 'EQUITY' ? 'הון עצמי' : 'בנק'}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block">
                <span dir="rtl" className="mb-1 block text-2xs font-bold text-slate-500">למי מועבר</span>
                <input
                  value={item.payee}
                  maxLength={160}
                  onChange={(event) => onChange(item.id, { payee: event.target.value })}
                  placeholder="המוכר, נאמנות אצל עו״ד…"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span dir="rtl" className="mb-1 block text-2xs font-bold text-slate-500">באיזה שלב / במה מותנה</span>
                <textarea
                  value={item.condition}
                  maxLength={600}
                  rows={2}
                  onChange={(event) => onChange(item.id, { condition: event.target.value })}
                  placeholder="למשל: תוך 14 ימים מרישום הערת האזהרה"
                  className={`${inputClass} resize-y`}
                />
                <input
                  type="date"
                  value={item.dueDate ?? ''}
                  onChange={(event) => onChange(item.id, { dueDate: event.target.value || null })}
                  aria-label="תאריך משוער"
                  className={`${inputClass} mt-1.5 cursor-pointer text-sm`}
                />
              </label>
              <label className="block">
                <span dir="rtl" className="mb-1 block text-2xs font-bold text-slate-500">סכום</span>
                <div dir="rtl" className="relative">
                  <NumericInput
                    integer
                    value={item.amount}
                    onChange={(value) => onChange(item.id, { amount: value })}
                    className={`${inputClass} pl-8 font-black`}
                  />
                  <span dir="rtl" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₪</span>
                </div>
              </label>
              <div className="flex items-center gap-1 md:flex-col md:pt-5">
                <button
                  type="button"
                  onClick={() => onMove(item.id, -1)}
                  disabled={index === 0}
                  aria-label="הקדמה"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(item.id, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="דחייה"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label="מחיקת הפעימה"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="space-y-2 border-t border-slate-100 px-4 py-3">
        {groups.map((group) => {
          const gap = group.target - group.paid;
          const has = rows.some((item) => item.source === group.source);
          return (
            <div key={group.source} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onAdd(group.source)}
                disabled={full}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-button font-black transition-colors disabled:opacity-40 ${group.button}`}
              >
                <Plus className="h-4 w-4" />
                {group.source === 'EQUITY' ? 'הוספת פעימה מההון העצמי' : 'הוספת פעימה מכספי הבנק'}
              </button>
              {has && Math.abs(gap) > 1 && (
                <>
                  <span dir="rtl" className={`text-sm font-bold ${gap > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                    {gap > 0 ? `נותרו ${formatShekel(gap)} לחלוקה` : `${formatShekel(-gap)} מעבר לסכום`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onBalance(group.source)}
                    className="rounded-lg px-2 py-1 text-sm font-black text-slate-600 underline-offset-2 hover:underline"
                  >
                    התאמה בפעימה האחרונה
                  </button>
                </>
              )}
            </div>
          );
        })}
      </footer>
    </section>
  );
}
