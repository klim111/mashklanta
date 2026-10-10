'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  RotateCcw,
  Table2,
  XCircle,
} from 'lucide-react';
import { MORTGAGE_RATIO_LIMIT, cashFlowAlerts, loanSchedule, mortgageMonths, summarize, amortization } from '@/lib/cash-flow';
import type { AlertTone, CashFlowLoan } from '@/lib/cash-flow';
import { AUTHORIZATION_FONT_PATH } from '@/lib/authorization-forms';
import type { PlanView } from '@/components/plan/usePlan';
import { CashFlowCharts } from './CashFlowCharts';
import { IncomePanel, LoansPanel, MortgagePanel } from './CashFlowInputs';
import { LoanCalculator } from './LoanCalculator';
import type { CalculatorPreset } from './LoanCalculator';
import { ScheduleDialog } from './ScheduleDialog';
import type { ScheduleView } from './ScheduleDialog';
import { PERCENT, SHEKEL } from './fields';
import { useCashFlow } from './useCashFlow';

/**
 * כלי מצב הון ותזרים — המשכנתא, כל ההלוואות וההכנסה הפנויה במסך אחד.
 *
 * למעלה: ארבעת המספרים שחשובים (הכנסה, החזר, יחס למשכנתא, מה נשאר) והתרעות.
 * מימין הנתונים — הכנסות, משכנתא, הלוואות ומחשבון הלוואה מהיר; משמאל הגרף על
 * ציר הזמן. כל שינוי נשמר בחשבון הלקוח, ואפשר להפיק דוח PDF או אקסל.
 */
export function CashFlowTool({ plan, ready = true }: { plan: PlanView | null; ready?: boolean }) {
  return <CashFlowWorkspace store={useCashFlow(plan, ready)} />;
}

export type CashFlowStore = ReturnType<typeof useCashFlow>;

/** הכלי עצמו, על נתונים שנטענו בחוץ — כשהסקירה מציגה גם את כרטיס התקציר שלו */
export function CashFlowWorkspace({ store }: { store: CashFlowStore }) {
  const { state, update, reset, saved } = store;
  const [schedule, setSchedule] = useState<ScheduleView | null>(null);
  const [preset, setPreset] = useState<CalculatorPreset | null>(null);
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const summary = useMemo(() => (state ? summarize(state) : null), [state]);
  const alerts = useMemo(() => (state && summary ? cashFlowAlerts(state, summary) : []), [state, summary]);

  if (!state || !summary) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
      </div>
    );
  }

  const download = async (kind: 'pdf' | 'xlsx') => {
    setBusy(kind);
    setReportError(null);
    try {
      const report = await import('@/lib/cash-flow-report');
      if (kind === 'xlsx') {
        const { downloadXlsx } = await import('@/lib/xlsx');
        downloadXlsx(report.cashFlowFileName('xlsx'), report.cashFlowSheets(state));
      } else {
        const font = await fetch(AUTHORIZATION_FONT_PATH).then((response) => {
          if (!response.ok) throw new Error('font');
          return response.arrayBuffer();
        });
        const bytes = await report.cashFlowPdf(state, font);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = report.cashFlowFileName('pdf');
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch {
      setReportError('לא הצלחנו להפיק את הדוח. נסו שוב בעוד רגע.');
    } finally {
      setBusy(null);
    }
  };

  const openLoanSchedule = (loanId: string) => {
    const index = state.loans.findIndex((loan) => loan.id === loanId);
    if (index < 0) return;
    const loan = state.loans[index];
    setSchedule({ kind: 'loan', title: `לוח החזרים · ${loan.name || `הלוואה ${index + 1}`}`, rows: loanSchedule(loan) });
  };

  const ratioTone =
    summary.mortgageRatio === null
      ? 'default'
      : summary.mortgageRatio > MORTGAGE_RATIO_LIMIT
        ? 'bad'
        : summary.mortgageRatio > 0.35
          ? 'warn'
          : 'good';

  return (
    <div dir="rtl" className="space-y-4" data-demo-id="cash-flow-tool">
      {/* שורת הפעולות */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-500">
          {saved === 'saving' ? 'שומרים…' : saved === 'saved' ? 'נשמר בחשבון שלכם' : saved === 'error' ? 'השמירה נכשלה, נסו שוב' : 'הנתונים נטענו מהפרופיל ומהתהליך שלכם'}
        </span>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => setSchedule({ kind: 'flow' })} icon={<Table2 className="h-4 w-4" />}>
            תזרים חודשי
          </ActionButton>
          <ActionButton onClick={() => void download('pdf')} busy={busy === 'pdf'} icon={<FileText className="h-4 w-4" />}>
            דוח PDF
          </ActionButton>
          <ActionButton onClick={() => void download('xlsx')} busy={busy === 'xlsx'} icon={<FileSpreadsheet className="h-4 w-4" />}>
            אקסל
          </ActionButton>
          <ActionButton onClick={() => void reset()} icon={<RotateCcw className="h-4 w-4" />} quiet>
            טעינה מהפרופיל
          </ActionButton>
        </div>
      </div>
      {reportError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{reportError}</p>}

      {/* ארבעת המספרים */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="הכנסה פנויה" value={SHEKEL(summary.income)} note={state.household === 'COUPLE' ? 'של שני בני הזוג' : 'חודשית'} />
        <Kpi
          label="החזר חודשי כולל"
          value={SHEKEL(summary.totalPayment)}
          note={`משכנתא ${SHEKEL(summary.mortgagePayment)} · הלוואות ${SHEKEL(summary.loansPayment)}`}
          bar={
            summary.totalPayment > 0
              ? [
                  { share: summary.mortgagePayment / summary.totalPayment, color: '#2a78d6' },
                  { share: summary.loansPayment / summary.totalPayment, color: '#eb6834' },
                ]
              : undefined
          }
        />
        <Kpi
          label="יחס החזר למשכנתא"
          value={PERCENT(summary.mortgageRatio)}
          note={`בפועל ${PERCENT(summary.actualRatio)} מכל ההכנסה · תקרה 40%`}
          tone={ratioTone}
          gauge={summary.mortgageRatio}
        />
        <Kpi
          label="נשאר פנוי בחודש"
          value={SHEKEL(summary.freeMoney)}
          note="אחרי המשכנתא וכל ההלוואות"
          tone={summary.income <= 0 ? 'default' : summary.freeMoney < 0 ? 'bad' : 'good'}
        />
      </div>

      {alerts.length > 0 && <Alerts alerts={alerts} />}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <IncomePanel state={state} update={update} />
          <MortgagePanel
            state={state}
            update={update}
            summary={summary}
            onSchedule={() =>
              setSchedule({
                kind: 'loan',
                title: 'לוח סילוקין · משכנתא',
                rows: amortization(state.mortgage.amount ?? 0, state.mortgage.rate ?? 0, mortgageMonths(state.mortgage)),
              })
            }
          />
          <LoansPanel
            state={state}
            update={update}
            onSchedule={openLoanSchedule}
            onCalculate={(loan: CashFlowLoan) => setPreset((current) => ({ loan, nonce: (current?.nonce ?? 0) + 1 }))}
          />
          <LoanCalculator
            update={update}
            summary={summary}
            preset={preset}
            onSchedule={(title, terms) => setSchedule({ kind: 'loan', title, rows: amortization(terms.amount, terms.rate, terms.months) })}
          />
        </div>
        <div className="min-w-0 2xl:sticky 2xl:top-4 2xl:self-start">
          <CashFlowCharts state={state} />
        </div>
      </div>

      <ScheduleDialog view={schedule} state={state} onClose={() => setSchedule(null)} />
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  children,
  busy = false,
  quiet = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  busy?: boolean;
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-button font-black transition-colors disabled:opacity-60 ${
        quiet ? 'text-slate-500 hover:bg-slate-100' : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50/40'
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

const KPI_TONE = {
  default: 'border-slate-200 bg-white text-slate-900',
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  bad: 'border-rose-200 bg-rose-50 text-rose-800',
} as const;

function Kpi({
  label,
  value,
  note,
  tone = 'default',
  gauge,
  bar,
}: {
  label: string;
  value: string;
  note: string;
  tone?: keyof typeof KPI_TONE;
  /** יחס מול תקרת 40% — פס מילוי */
  gauge?: number | null;
  bar?: { share: number; color: string }[];
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${KPI_TONE[tone]}`}>
      <span className="block text-sm font-bold text-slate-500">{label}</span>
      <span className="mt-0.5 block text-2xl font-black tabular-nums leading-tight">{value}</span>
      {gauge !== undefined && gauge !== null && (
        <span className="relative mt-2 block h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <span
            className={`absolute inset-y-0 right-0 rounded-full ${
              tone === 'bad' ? 'bg-rose-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, (gauge / 0.5) * 100)}%` }}
          />
          {/* קו התקרה: 40% מתוך סקלה של 50% */}
          <span className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ right: '80%' }} />
        </span>
      )}
      {bar && (
        <span className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {bar.map((part, index) => (
            <span key={index} style={{ width: `${part.share * 100}%`, background: part.color }} />
          ))}
        </span>
      )}
      <span className="mt-1.5 block text-sm leading-snug text-slate-500">{note}</span>
    </div>
  );
}

const ALERT_STYLE: Record<AlertTone, { shell: string; icon: React.ReactNode }> = {
  bad: { shell: 'border-rose-200 bg-rose-50 text-rose-900', icon: <XCircle className="h-5 w-5 shrink-0 text-rose-600" /> },
  warn: { shell: 'border-amber-200 bg-amber-50 text-amber-900', icon: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /> },
  info: { shell: 'border-blue-100 bg-blue-50/60 text-slate-800', icon: <Info className="h-5 w-5 shrink-0 text-blue-600" /> },
  good: { shell: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> },
};

/** ההתרעות: החשובות למעלה; מעבר לשלוש — "ראה עוד" */
function Alerts({ alerts }: { alerts: ReturnType<typeof cashFlowAlerts> }) {
  const [all, setAll] = useState(false);
  const order: AlertTone[] = ['bad', 'warn', 'good', 'info'];
  const sorted = [...alerts].sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone));
  const shown = all ? sorted : sorted.slice(0, 3);
  return (
    <div className="space-y-2">
      <div className="grid gap-2 lg:grid-cols-3">
        {shown.map((alert) => (
          <div key={alert.id} className={`flex gap-2.5 rounded-xl border px-3 py-2.5 ${ALERT_STYLE[alert.tone].shell}`}>
            {ALERT_STYLE[alert.tone].icon}
            <span className="min-w-0 [&>span]:!text-right">
              <span className="block text-sm font-black">{alert.title}</span>
              <span className="block text-sm leading-snug opacity-90">{alert.text}</span>
            </span>
          </div>
        ))}
      </div>
      {sorted.length > 3 && (
        <button type="button" onClick={() => setAll((open) => !open)} className="text-sm font-black text-blue-600 hover:underline">
          {all ? 'פחות התרעות' : sorted.length - 3 === 1 ? 'ראה עוד התרעה' : `ראה עוד ${sorted.length - 3} התרעות`}
        </button>
      )}
    </div>
  );
}
