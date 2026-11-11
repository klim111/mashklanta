'use client';

import { useEffect, useState } from 'react';
import { CalendarRange, Lock, Plus, Save, Sparkles, Timer, Unlock } from 'lucide-react';
import {
  LONG_LOAN_MONTHS,
  MORTGAGE_RATIO_LIMIT,
  annuityPayment,
  amountForPayment,
  cashFlowId,
  solveLoan,
} from '@/lib/cash-flow';
import type { CashFlowLoan, CashFlowState, CashFlowSummary, LoanTerms, SolveFor } from '@/lib/cash-flow';
import { MiniNumber, SHEKEL, ToolPanel } from './fields';

const TARGETS: { id: SolveFor; label: string }[] = [
  { id: 'amount', label: 'סכום' },
  { id: 'months', label: 'תקופה' },
  { id: 'rate', label: 'ריבית' },
  { id: 'payment', label: 'החזר חודשי' },
];

const DEFAULT_LOCKS: SolveFor[] = ['amount', 'rate'];

/**
 * שינוי של פרמטר אחד: הפרמטרים הנעולים נשארים, ומחושב מחדש פרמטר פתוח אחר —
 * קודם זה שחושב בפעם הקודמת, ואחריו זה שנערך הכי מזמן. כשאף פרמטר פתוח לא
 * פותר את המשוואה, הוא מתרוקן וההודעה "אין פתרון" מוצגת.
 */
export function recalcLoanTerms(
  terms: LoanTerms,
  key: SolveFor,
  value: number | null,
  locks: SolveFor[],
  computed: SolveFor,
  recent: SolveFor[]
): { terms: LoanTerms; computed: SolveFor } {
  const next: LoanTerms = { ...terms, [key]: value };
  const open = TARGETS.map((item) => item.id).filter((id) => id !== key && !locks.includes(id));
  if (!open.length) return { terms: next, computed };
  const byAge = [...open].sort((a, b) => recent.indexOf(a) - recent.indexOf(b));
  const candidates = open.includes(computed) ? [computed, ...byAge.filter((id) => id !== computed)] : byAge;
  for (const candidate of candidates) {
    const solved = solveLoan({ ...next, [candidate]: null }, candidate);
    if (solved !== null && Number.isFinite(solved) && solved > 0) {
      return { terms: { ...next, [candidate]: solved }, computed: candidate };
    }
  }
  return { terms: { ...next, [candidates[0]]: null }, computed: candidates[0] };
}

export interface CalculatorPreset {
  loan: CashFlowLoan;
  /** מספר רץ — כדי שאותה הלוואה תיטען שוב גם בלחיצה חוזרת */
  nonce: number;
}

/**
 * מחשבון הלוואה מהיר: ארבעה פרמטרים — סכום, תקופה, ריבית, החזר. נועלים את מה
 * שצריך להישאר קבוע, וכל שינוי מחשב מחדש את הפרמטרים הפתוחים. "בדיקה ל-18 חודשים" מראה מה קורה כשמקצרים את ההלוואה כך שלא
 * תיכנס לחישוב כושר ההחזר למשכנתא.
 */
export function LoanCalculator({
  update,
  summary,
  preset,
  onSchedule,
}: {
  update: (next: (current: CashFlowState) => CashFlowState) => void;
  summary: CashFlowSummary;
  preset: CalculatorPreset | null;
  onSchedule: (title: string, terms: { amount: number; rate: number; months: number }) => void;
}) {
  const [terms, setTerms] = useState<LoanTerms>(() => ({
    amount: 200_000,
    months: 24,
    rate: 4.75,
    payment: solveLoan({ amount: 200_000, months: 24, rate: 4.75, payment: null }, 'payment'),
  }));
  const [locks, setLocks] = useState<SolveFor[]>(DEFAULT_LOCKS);
  /** הפרמטר שחושב בפעם האחרונה — מודגש כתוצאה */
  const [computed, setComputed] = useState<SolveFor>('payment');
  /** סדר העריכות של הלקוח, מהישנה לחדשה */
  const [recent, setRecent] = useState<SolveFor[]>(['amount', 'rate', 'months']);
  const [editing, setEditing] = useState<CashFlowLoan | null>(null);
  const [check18, setCheck18] = useState(false);

  useEffect(() => {
    if (!preset) return;
    const { loan } = preset;
    setEditing(loan);
    const target: SolveFor = loan.amount && loan.rate !== null && loan.months ? 'payment' : 'amount';
    const base = { amount: loan.amount, months: loan.months, rate: loan.rate, payment: loan.payment };
    setTerms({ ...base, [target]: solveLoan({ ...base, [target]: null }, target) });
    setComputed(target);
    setLocks(target === 'payment' ? DEFAULT_LOCKS : ['payment', 'rate']);
    setRecent(['amount', 'rate', 'months', 'payment'].filter((id) => id !== target) as SolveFor[]);
    setCheck18(false);
  }, [preset]);

  const full = terms;
  const ready = full.amount && full.months && full.rate !== null && full.payment;
  const openKeys = TARGETS.map((item) => item.id).filter((id) => !locks.includes(id));

  const edit = (key: SolveFor, next: number | null) => {
    const result = recalcLoanTerms(terms, key, next, locks, computed, recent);
    setTerms(result.terms);
    setComputed(result.computed);
    setRecent((current) => [...current.filter((id) => id !== key), key]);
  };

  const toggleLock = (key: SolveFor) => {
    if (locks.includes(key)) {
      setLocks(locks.filter((id) => id !== key));
      return;
    }
    // לפחות פרמטר אחד נשאר פתוח, כדי שיהיה מה לחשב
    if (openKeys.length <= 1) return;
    const nextLocks = [...locks, key];
    setLocks(nextLocks);
    if (computed === key) {
      const free = TARGETS.map((item) => item.id).filter((id) => !nextLocks.includes(id));
      setComputed(free.sort((a, b) => recent.indexOf(a) - recent.indexOf(b))[0]);
    }
  };
  const totalPaid = ready ? full.payment! * full.months! : 0;
  const long = !!full.months && full.months > LONG_LOAN_MONTHS;

  const value = (key: SolveFor) => {
    const raw = full[key];
    if (raw === null || raw === undefined) return null;
    if (key === 'rate') return Math.round(raw * 100) / 100;
    return Math.round(raw);
  };

  const addLoan = (loan: Omit<CashFlowLoan, 'id' | 'name'>, name: string) => {
    if (editing) {
      update((current) => ({
        ...current,
        loans: current.loans.map((item) => (item.id === editing.id ? { ...item, ...loan } : item)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({ ...current, loans: [...current.loans, { id: cashFlowId('loan'), name, ...loan }] }));
  };

  const currentLoan = () =>
    ready
      ? { amount: Math.round(full.amount!), rate: Math.round(full.rate! * 100) / 100, months: full.months!, payment: null }
      : null;

  // ── בדיקה ל-18 חודשים: אותו החזר — כמה אפשר לקחת; אותו סכום — כמה ישלמו
  const amount18 = ready ? amountForPayment(full.payment!, full.rate!, LONG_LOAN_MONTHS) : 0;
  const payment18 = ready ? annuityPayment(full.amount!, full.rate!, LONG_LOAN_MONTHS) : 0;
  /* כמה מההחזר המותר למשכנתא ההלוואה הזו "אוכלת" כשהיא ארוכה */
  const mortgageBite = long && ready ? full.payment! * MORTGAGE_RATIO_LIMIT : 0;

  return (
    <ToolPanel
      title={editing ? `מחשבון · ${editing.name || 'הלוואה מהרשימה'}` : 'מחשבון הלוואה מהיר'}
      icon={<Sparkles className="h-5 w-5 text-violet-600" />}
      action={
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="נעילת פרמטרים">
          <span className="px-1.5 text-2xs font-bold text-slate-500">לחשב את כל הפרמטרים האחרים בשינוי, חוץ מהנעולים:</span>
          {TARGETS.map((item) => {
            const locked = locks.includes(item.id);
            const lastOpen = !locked && openKeys.length <= 1;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={locked}
                disabled={lastOpen}
                title={
                  lastOpen
                    ? 'פרמטר אחד לפחות נשאר פתוח לחישוב'
                    : locked
                      ? `${item.label} נעול. לחיצה משחררת`
                      : `נעילת ${item.label}: לא ישתנה כשמשנים פרמטר אחר`
                }
                onClick={() => toggleLock(item.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-black transition-colors disabled:cursor-not-allowed ${
                  locked ? 'bg-white text-slate-800 shadow-sm' : 'text-blue-700 hover:bg-white/60'
                }`}
              >
                {locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <Unlock className="h-3.5 w-3.5" aria-hidden />}
                {item.label}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['amount', 'סכום ההלוואה', '₪', true],
            ['months', 'תקופה (חודשים)', 'ח׳', true],
            ['rate', 'ריבית שנתית', '%', false],
            ['payment', 'החזר חודשי', '₪', true],
          ] as const
        ).map(([key, label, suffix, integer]) => {
          const locked = locks.includes(key);
          // הפרמטר הפתוח היחיד הוא תוצאה בלבד — אין מה לחשב במקומו
          const resultOnly = !locked && openKeys.length <= 1;
          return (
            <div key={key} className="relative">
              <MiniNumber
                label={label}
                value={computed === key ? value(key) : terms[key]}
                suffix={suffix}
                integer={integer}
                tone={computed === key && !locked ? 'result' : 'input'}
                onChange={(next) => {
                  if (resultOnly) return;
                  edit(key, next);
                }}
              />
              <button
                type="button"
                onClick={() => toggleLock(key)}
                disabled={!locked && openKeys.length <= 1}
                aria-pressed={locked}
                aria-label={locked ? `שחרור ${label}` : `נעילת ${label}`}
                className="absolute left-0.5 top-0 rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed"
              >
                {locked ? <Lock className="h-3 w-3 text-amber-600" /> : <Unlock className="h-3 w-3 text-blue-500" />}
              </button>
            </div>
          );
        })}
      </div>

      {terms[computed] === null && TARGETS.every((item) => item.id === computed || terms[item.id] !== null) ? (
        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          אין פתרון לנתונים האלה. למשל, החזר שלא מכסה אפילו את הריבית לא יסלק את ההלוואה לעולם.
        </p>
      ) : null}

      {ready && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span>
            סך הכול לתשלום <b className="tabular-nums text-slate-900">{SHEKEL(totalPaid)}</b>
          </span>
          <span>
            ריבית <b className="tabular-nums text-slate-900">{SHEKEL(totalPaid - full.amount!)}</b>
          </span>
          <span className={long ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
            {long ? 'מעל 18 חודשים: נוגסת בכושר ההחזר למשכנתא' : 'עד 18 חודשים: לא משפיעה על המשכנתא'}
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            const loan = currentLoan();
            if (loan) addLoan(loan, `הלוואה ${SHEKEL(loan.amount)}`);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-button font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-40"
        >
          {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editing ? 'עדכון ההלוואה ברשימה' : 'הוספה לרשימת ההלוואות'}
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => setCheck18((open) => !open)}
          className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-button font-black transition-colors disabled:opacity-40 ${
            check18 ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-violet-200 text-violet-700 hover:border-violet-400'
          }`}
        >
          <Timer className="h-4 w-4" />
          בדיקה ל-18 חודשים
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() =>
            onSchedule(`פריסת הלוואה של ${SHEKEL(full.amount)}`, {
              amount: full.amount!,
              rate: full.rate!,
              months: full.months!,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 px-4 py-2 text-button font-black text-slate-700 transition-colors hover:border-blue-300 disabled:opacity-40"
        >
          <CalendarRange className="h-4 w-4" />
          פריסה
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-xl px-3 py-2 text-button font-bold text-slate-500 hover:bg-slate-100"
          >
            מחשבון חדש
          </button>
        )}
      </div>

      {check18 && ready && (
        <div className="mt-3 rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-3">
          <p className="mb-2 text-sm font-black text-violet-900">
            {full.months === LONG_LOAN_MONTHS
              ? 'ההלוואה כבר ל-18 חודשים, ולכן לא נכנסת לחישוב כושר ההחזר למשכנתא.'
              : `מה יקרה אם ההלוואה תהיה ל-18 חודשים (במקום ${full.months})`}
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <Option
              title="אותו החזר חודשי"
              line={`${SHEKEL(full.payment)} בחודש · ${LONG_LOAN_MONTHS} חודשים`}
              value={SHEKEL(amount18)}
              note={`הסכום שאפשר לקחת באותם תנאים (${SHEKEL(Math.abs(amount18 - full.amount!))} ${amount18 >= full.amount! ? 'יותר' : 'פחות'})`}
              onAdd={() =>
                addLoan(
                  { amount: Math.round(amount18), rate: Math.round(full.rate! * 100) / 100, months: LONG_LOAN_MONTHS, payment: null },
                  `הלוואה ל-18 חודשים`
                )
              }
            />
            <Option
              title="אותו סכום"
              line={`${SHEKEL(full.amount)} · ${LONG_LOAN_MONTHS} חודשים`}
              value={`${SHEKEL(payment18)} בחודש`}
              note={
                summary.income > 0
                  ? `נשארים ${SHEKEL(summary.freeMoney - payment18)} פנויים בחודש עד סוף ההלוואה`
                  : 'ההחזר החודשי עד סוף ההלוואה'
              }
              warn={summary.income > 0 && summary.freeMoney - payment18 < 0}
              onAdd={() =>
                addLoan(
                  { amount: Math.round(full.amount!), rate: Math.round(full.rate! * 100) / 100, months: LONG_LOAN_MONTHS, payment: null },
                  `הלוואה ל-18 חודשים`
                )
              }
            />
          </div>
          {mortgageBite > 0 && (
            <p className="mt-2 text-sm font-semibold text-violet-900">
              בפריסה ל-{full.months} חודשים ההלוואה מורידה עד {SHEKEL(mortgageBite)} מההחזר המותר למשכנתא. ב-18 חודשים
              היא לא משפיעה על המשכנתא, רק על התזרים עד שתסתיים.
            </p>
          )}
        </div>
      )}
    </ToolPanel>
  );
}

function Option({
  title,
  line,
  value,
  note,
  warn = false,
  onAdd,
}: {
  title: string;
  line: string;
  value: string;
  note: string;
  warn?: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-violet-100 bg-white p-3">
      <span className="text-2xs font-black text-violet-700">{title}</span>
      <span className="text-sm text-slate-500">{line}</span>
      <span className="mt-1 text-xl font-black tabular-nums text-slate-900">{value}</span>
      <span className={`text-sm ${warn ? 'font-bold text-rose-700' : 'text-slate-500'}`}>{note}</span>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 inline-flex items-center gap-1 self-start rounded-lg px-2 py-1 text-sm font-black text-blue-600 hover:bg-blue-50"
      >
        <Plus className="h-4 w-4" />
        לרשימה כך
      </button>
    </div>
  );
}
