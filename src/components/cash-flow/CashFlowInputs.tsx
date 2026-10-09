'use client';

import { Calculator, CalendarRange, Home, Plus, Trash2, Users, UserRound, Wallet } from 'lucide-react';
import {
  LONG_LOAN_MONTHS,
  amountForPayment,
  cashFlowId,
  incomeTotal,
  isLongLoan,
  loanPayment,
  maxMortgageAmount,
  mortgagePayment,
} from '@/lib/cash-flow';
import type { CashFlowLoan, CashFlowState, CashFlowSummary, IncomeOwner } from '@/lib/cash-flow';
import { MiniNumber, SHEKEL, ToolPanel } from './fields';
import { loanColor } from './palette';

type Update = (next: (current: CashFlowState) => CashFlowState) => void;

// ───────────────────────────── הכנסה פנויה ─────────────────────────────

export function IncomePanel({ state, update }: { state: CashFlowState; update: Update }) {
  const owners: IncomeOwner[] = state.household === 'COUPLE' ? ['borrower', 'partner'] : ['borrower'];
  const setRows = (owner: IncomeOwner, rows: CashFlowState['incomes'][IncomeOwner]) =>
    update((current) => ({ ...current, incomes: { ...current.incomes, [owner]: rows } }));

  return (
    <ToolPanel
      title="הכנסה פנויה"
      icon={<Wallet className="h-5 w-5 text-emerald-600" />}
      action={
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="הרכב הלווים">
          {(
            [
              ['SINGLE', 'יחיד', UserRound],
              ['COUPLE', 'זוג', Users],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={state.household === value}
              onClick={() => update((current) => ({ ...current, household: value }))}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-black transition-colors ${
                state.household === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className={`grid gap-3 ${owners.length === 2 ? 'md:grid-cols-2' : ''}`}>
        {owners.map((owner) => {
          const rows = state.incomes[owner];
          const name = owner === 'partner' ? state.partnerName || 'בן/בת הזוג' : state.borrowerName || (state.household === 'COUPLE' ? 'לווה 1' : 'הלווה');
          return (
            <div key={owner} className="rounded-xl bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-black text-slate-800">{name}</span>
                <span className="text-sm font-black tabular-nums text-emerald-700">{SHEKEL(incomeTotal(state, owner))}</span>
              </div>
              <ul className="space-y-2">
                {rows.map((row, index) => (
                  <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)_auto] items-end gap-2">
                    <label className="block min-w-0">
                      {index === 0 && <span className="mb-1 block text-2xs font-bold text-slate-500">מקור</span>}
                      <input
                        value={row.label}
                        onChange={(event) =>
                          setRows(
                            owner,
                            rows.map((item) => (item.id === row.id ? { ...item, label: event.target.value } : item))
                          )
                        }
                        placeholder="משכורת, קצבה, שכירות…"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </label>
                    <MiniNumber
                      label={index === 0 ? 'סכום חודשי' : undefined}
                      value={row.amount}
                      suffix="₪"
                      onChange={(amount) =>
                        setRows(owner, rows.map((item) => (item.id === row.id ? { ...item, amount } : item)))
                      }
                    />
                    <button
                      type="button"
                      aria-label="הסרת שורת הכנסה"
                      title="הסרה"
                      onClick={() => setRows(owner, rows.filter((item) => item.id !== row.id))}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setRows(owner, [...rows, { id: cashFlowId('inc'), label: '', amount: null }])}
                className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-black text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                שורת הכנסה
              </button>
            </div>
          );
        })}
      </div>
    </ToolPanel>
  );
}

// ───────────────────────────── משכנתא ─────────────────────────────

export function MortgagePanel({
  state,
  update,
  summary,
  onSchedule,
}: {
  state: CashFlowState;
  update: Update;
  summary: CashFlowSummary;
  onSchedule: () => void;
}) {
  const mortgage = state.mortgage;
  const set = (patch: Partial<CashFlowState['mortgage']>) =>
    update((current) => ({ ...current, mortgage: { ...current.mortgage, ...patch } }));
  const payment = mortgagePayment(mortgage);
  const maxAmount = maxMortgageAmount(state, summary);
  const canSchedule = !!(mortgage.amount && mortgage.years && mortgage.rate !== null);

  return (
    <ToolPanel
      title="המשכנתא"
      icon={<Home className="h-5 w-5 text-blue-600" />}
      action={
        canSchedule ? (
          <button
            type="button"
            onClick={onSchedule}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-black text-blue-600 hover:bg-blue-50"
          >
            <CalendarRange className="h-4 w-4" />
            לוח סילוקין
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniNumber label="גובה המשכנתא" value={mortgage.amount} suffix="₪" onChange={(amount) => set({ amount })} />
        <MiniNumber label="ריבית ממוצעת" value={mortgage.rate} suffix="%" integer={false} onChange={(rate) => set({ rate })} />
        <MiniNumber label="תקופה" value={mortgage.years} suffix="שנים" onChange={(years) => set({ years })} />
        <MiniNumber
          label="החזר חודשי"
          value={payment ? Math.round(payment) : null}
          suffix="₪"
          tone="result"
          onChange={(value) => {
            // קביעת החזר: כשיש ריבית ותקופה — מחשבים את הסכום שמתאים לו
            if (value && mortgage.rate !== null && mortgage.years) {
              set({ amount: Math.round(amountForPayment(value, mortgage.rate, mortgage.years * 12)), payment: null });
            } else {
              set({ payment: value });
            }
          }}
        />
      </div>
      {maxAmount !== null && (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
            summary.mortgageHeadroom < 0 ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-600'
          }`}
        >
          ההחזר המותר למשכנתא: עד <b className="tabular-nums">{SHEKEL(summary.maxMortgagePayment)}</b> בחודש, כלומר
          משכנתא של עד <b className="tabular-nums">{SHEKEL(maxAmount)}</b> באותה ריבית ותקופה.
        </p>
      )}
    </ToolPanel>
  );
}

// ───────────────────────────── הלוואות ─────────────────────────────

export function LoansPanel({
  state,
  update,
  onSchedule,
  onCalculate,
}: {
  state: CashFlowState;
  update: Update;
  onSchedule: (loanId: string) => void;
  onCalculate: (loan: CashFlowLoan) => void;
}) {
  const setLoan = (id: string, patch: Partial<CashFlowLoan>) =>
    update((current) => ({
      ...current,
      loans: current.loans.map((loan) => (loan.id === id ? { ...loan, ...patch } : loan)),
    }));
  const total = state.loans.reduce((sum, loan) => sum + loanPayment(loan), 0);

  return (
    <ToolPanel
      title="ההלוואות"
      icon={<Calculator className="h-5 w-5 text-orange-600" />}
      action={<span className="text-sm font-black tabular-nums text-slate-700">{SHEKEL(total)} בחודש</span>}
    >
      {state.loans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
          אין הלוואות ברשימה. הוסיפו הלוואה קיימת, או חשבו הלוואה חדשה במחשבון שמתחת.
        </p>
      ) : (
        <ul className="space-y-2">
          {state.loans.map((loan, index) => {
            const payment = loanPayment(loan);
            const long = isLongLoan(loan);
            const complete = !!(loan.amount && loan.months && loan.rate !== null);
            return (
              <li key={loan.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: loanColor(index) }} />
                  <input
                    value={loan.name}
                    onChange={(event) => setLoan(loan.id, { name: event.target.value })}
                    placeholder={`הלוואה ${index + 1}`}
                    aria-label="שם ההלוואה"
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-black text-slate-900 outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white"
                  />
                  <span
                    title={
                      long
                        ? 'נותרו יותר מ-18 חודשים: הבנק מוריד את ההחזר מההכנסה הפנויה'
                        : 'עד 18 חודשים: לא נכנסת לחישוב כושר ההחזר למשכנתא'
                    }
                    className={`rounded-full px-2 py-0.5 text-2xs font-black ${
                      long ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {long ? 'נוגסת בהכנסה' : `עד ${LONG_LOAN_MONTHS} חודשים`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCalculate(loan)}
                    title="פתיחה במחשבון"
                    aria-label="פתיחה במחשבון"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Calculator className="h-4 w-4" />
                  </button>
                  {(complete || (loan.payment && loan.months)) && (
                    <button
                      type="button"
                      onClick={() => onSchedule(loan.id)}
                      title="לוח החזרים"
                      aria-label="לוח החזרים"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <CalendarRange className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      update((current) => ({ ...current, loans: current.loans.filter((item) => item.id !== loan.id) }))
                    }
                    title="הסרת ההלוואה"
                    aria-label="הסרת ההלוואה"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniNumber label="סכום / יתרה" value={loan.amount} suffix="₪" onChange={(amount) => setLoan(loan.id, { amount })} />
                  <MiniNumber label="ריבית שנתית" value={loan.rate} suffix="%" integer={false} onChange={(rate) => setLoan(loan.id, { rate })} />
                  <MiniNumber label="חודשים שנותרו" value={loan.months} onChange={(months) => setLoan(loan.id, { months })} />
                  <MiniNumber
                    label="החזר חודשי"
                    value={payment ? Math.round(payment) : null}
                    suffix="₪"
                    tone="result"
                    onChange={(value) => {
                      // קביעת החזר: עם ריבית ותקופה — הסכום מתעדכן כדי לעמוד בו
                      if (value && loan.rate !== null && loan.months) {
                        setLoan(loan.id, { amount: Math.round(amountForPayment(value, loan.rate, loan.months)), payment: value });
                      } else {
                        setLoan(loan.id, { payment: value, amount: complete ? null : loan.amount });
                      }
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() =>
          update((current) => ({
            ...current,
            loans: [
              ...current.loans,
              { id: cashFlowId('loan'), name: '', amount: null, rate: null, months: null, payment: null },
            ],
          }))
        }
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-black text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
      >
        <Plus className="h-4 w-4" />
        הוספת הלוואה
      </button>
    </ToolPanel>
  );
}
