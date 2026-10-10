'use client';

/**
 * בדיקת מיחזור מהירה — הכלי שנפתח לאורח מכרטיס "בדיקת מיחזור" בדף הבית.
 *
 * שלושה או ארבעה צעדים: מטרה → (הכנסה והלוואות, רק לקיצור ולהקטנת ריביות) →
 * מסלולי המשכנתא → תוצאה. החישוב כולו בדפדפן, לפי הריביות הממוצעות של בנק
 * ישראל (`/api/boi/mortgage-market`). הכלי המלא למשתמש רשום אינו משתנה.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  Landmark,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MortgageMarketSnapshot } from '@/lib/boi-mortgage-market';
import {
  LONG_TERM_LOAN_MONTHS,
  MAX_TERM_MONTHS,
  PAYMENT_TO_INCOME_LIMIT,
  REFI_CHECK_GOALS,
  TRACK_TYPE_LABELS,
  TRACK_TYPE_ORDER,
  analyzeRefinance,
  averageFor,
  averageRatesFromMarket,
  disposableIncome,
  formatTerm,
  goalNeedsIncome,
  monthlyPayment,
  monthsUntil,
  type AverageRates,
  type RefiCheckGoal,
  type RefiCheckLoan,
  type RefiCheckTrack,
  type RefiCheckTrackType,
} from '@/lib/refinance-check';
import { formatNumberInput, parseFormattedNumberInput, sanitizeDecimalInput } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { GuestSaveNotice } from '@/components/guest/GuestSaveNotice';
import { loadDraft, saveDraft, type RefinanceCheckDraft } from './refinanceCheckStore';
import { RefinanceCheckResult } from './RefinanceCheckResult';
import { CurrentTrackRow } from './CurrentTrackRow';
import { formatShekel, formatRate, formatMonth } from './format';

type Step = RefinanceCheckDraft['step'];

const GOAL_ICONS: Record<RefiCheckGoal, { icon: LucideIcon; gradient: string; ring: string }> = {
  'reduce-payment': { icon: Banknote, gradient: 'from-blue-500 to-cyan-500', ring: 'border-blue-500 ring-blue-100' },
  'reduce-interest': { icon: Percent, gradient: 'from-emerald-500 to-teal-600', ring: 'border-emerald-500 ring-emerald-100' },
  'fast-payoff': { icon: Rocket, gradient: 'from-amber-500 to-orange-600', ring: 'border-amber-500 ring-amber-100' },
};

let idCounter = 0;
function newId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function newTrack(type: RefiCheckTrackType = 'prime'): RefiCheckTrack {
  return { id: newId('t'), type, balance: 0, rate: 0, months: 240 };
}

type MarketState =
  | { status: 'loading' }
  | { status: 'ready'; averages: AverageRates }
  | { status: 'error' };

function useAverageRates(): [MarketState, () => void] {
  const [state, setState] = useState<MarketState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch('/api/boi/mortgage-market')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as MortgageMarketSnapshot;
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', averages: averageRatesFromMarket(data) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return [state, () => setAttempt((n) => n + 1)];
}

export function RefinanceCheck() {
  const [market, retryMarket] = useAverageRates();
  const [goal, setGoal] = useState<RefiCheckGoal | null>(null);
  const [income, setIncome] = useState(0);
  const [loans, setLoans] = useState<RefiCheckLoan[]>([]);
  const [tracks, setTracks] = useState<RefiCheckTrack[]>(() => [newTrack('prime')]);
  const [step, setStep] = useState<Step>('goal');
  const [hydrated, setHydrated] = useState(false);

  // חזרה מההצצה בכלי המלא — ממשיכים מאותה נקודה
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setGoal(draft.goal);
      setIncome(draft.income);
      setLoans(draft.loans);
      if (draft.tracks.length > 0) setTracks(draft.tracks);
      setStep(draft.step);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft({ goal, income, loans, tracks, step });
  }, [hydrated, goal, income, loans, tracks, step]);

  useEffect(() => {
    if (hydrated) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, hydrated]);

  const steps: { id: Step; label: string }[] = useMemo(
    () => [
      { id: 'goal', label: 'מטרה' },
      ...(goal && goalNeedsIncome(goal) ? [{ id: 'income' as Step, label: 'הכנסה והלוואות' }] : []),
      { id: 'tracks', label: 'המשכנתא היום' },
      { id: 'result', label: 'התוצאה' },
    ],
    [goal]
  );
  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === step));

  const averages = market.status === 'ready' ? market.averages : null;
  const result = useMemo(() => {
    if (!goal || !averages) return null;
    return analyzeRefinance({ goal, tracks, averages, income, loans });
  }, [goal, tracks, averages, income, loans]);

  const chooseGoal = (next: RefiCheckGoal) => {
    setGoal(next);
    setStep(goalNeedsIncome(next) ? 'income' : 'tracks');
  };

  const back = () => {
    if (stepIndex > 0) setStep(steps[stepIndex - 1].id);
  };

  const hasData = income > 0 || loans.length > 0 || tracks.some((track) => track.balance > 0);

  return (
    <div dir="rtl" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <GuestSaveNotice tool="refinance" hasData={hydrated && hasData} />
      <header className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" />
          חינם · בלי הרשמה · נתוני בנק ישראל
        </span>
        <h1 className="mt-3 text-title font-black text-slate-900">בדיקת מיחזור משכנתא</h1>
        <p className="mx-auto mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
          בוחרים מטרה, מזינים את המשכנתא כפי שהיא היום, והמערכת בודקת לבד — מול הריביות הממוצעות של בנק
          ישראל — אם יש מקום לשיפור ובכמה בערך.
        </p>
      </header>

      <Stepper steps={steps} current={stepIndex} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          {step === 'goal' && <GoalStep selected={goal} onChoose={chooseGoal} />}

          {step === 'income' && (
            <IncomeStep
              income={income}
              loans={loans}
              onIncome={setIncome}
              onLoans={setLoans}
              onBack={back}
              onNext={() => setStep('tracks')}
            />
          )}

          {step === 'tracks' && (
            <TracksStep
              tracks={tracks}
              onTracks={setTracks}
              market={market}
              onRetry={retryMarket}
              onBack={back}
              onNext={() => setStep('result')}
            />
          )}

          {step === 'result' && goal && result && averages && (
            <RefinanceCheckResult
              result={result}
              averages={averages}
              onEditTracks={() => setStep('tracks')}
              onChangeGoal={() => setStep('goal')}
            />
          )}
          {step === 'result' && (!goal || !averages) && (
            <div className="flex justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────────── סרגל הצעדים ─────────────────────────────

function Stepper({ steps, current }: { steps: { id: string; label: string }[]; current: number }) {
  return (
    <ol className="mx-auto mt-6 flex max-w-2xl items-center gap-1.5 sm:gap-2" aria-label="שלבי הבדיקה">
      {steps.map((s, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={s.id} className="flex flex-1 flex-col items-center gap-1.5" aria-current={active ? 'step' : undefined}>
            <div className="flex w-full items-center">
              <span
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  done || active ? 'bg-blue-600' : 'bg-slate-200'
                )}
              />
            </div>
            <span
              className={cn(
                'flex items-center gap-1 text-2xs font-bold sm:text-sm',
                active ? 'text-blue-700' : done ? 'text-slate-700' : 'text-slate-400'
              )}
            >
              {done && <Check className="h-3.5 w-3.5" />}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ───────────────────────────── מטרה ─────────────────────────────

function GoalStep({ selected, onChoose }: { selected: RefiCheckGoal | null; onChoose: (goal: RefiCheckGoal) => void }) {
  return (
    <section>
      <h2 className="text-center text-subtitle font-black text-slate-900">מה המטרה שלכם במיחזור?</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {(Object.keys(REFI_CHECK_GOALS) as RefiCheckGoal[]).map((id, index) => {
          const meta = REFI_CHECK_GOALS[id];
          const look = GOAL_ICONS[id];
          const Icon = look.icon;
          const active = selected === id;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onChoose(id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'group flex h-full flex-col items-center rounded-3xl border-2 bg-white p-6 text-center shadow-md transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-4',
                active ? `${look.ring} ring-4` : 'border-slate-200 focus-visible:ring-blue-100'
              )}
            >
              <span
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${look.gradient} shadow-lg transition-transform group-hover:scale-110`}
              >
                <Icon className="h-7 w-7 text-white" />
              </span>
              <span className="text-lg font-black text-slate-900">{meta.title}</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{meta.description}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-600">
                {goalNeedsIncome(id) ? 'הכנסה, ואז מסלולים' : 'ישר למסלולים'}
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        בקיצור התקופה ובהקטנת הריביות נבקש גם הכנסה והלוואות, כדי לבדוק מה ההחזר המקסימלי שבנק יאשר.
      </p>
    </section>
  );
}

// ───────────────────────────── הכנסה והלוואות ─────────────────────────────

function IncomeStep({
  income,
  loans,
  onIncome,
  onLoans,
  onBack,
  onNext,
}: {
  income: number;
  loans: RefiCheckLoan[];
  onIncome: (value: number) => void;
  onLoans: (loans: RefiCheckLoan[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const disposable = disposableIncome(income, loans);
  const maxPayment = disposable * PAYMENT_TO_INCOME_LIMIT;
  const updateLoan = (id: string, patch: Partial<RefiCheckLoan>) =>
    onLoans(loans.map((loan) => (loan.id === id ? { ...loan, ...patch } : loan)));

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-subtitle font-black text-slate-900">הכנסה והלוואות</h2>
        <p className="mt-1 text-sm text-slate-500">
          מהן מחושבת ההכנסה הפנויה — הבסיס למגבלת יחס ההחזר שהבנקים מחויבים לה.
        </p>

        <label className="mt-5 block">
          <span className="text-sm font-bold text-slate-700">הכנסה חודשית נטו של משק הבית</span>
          <MoneyInput value={income} onChange={onIncome} placeholder="לדוגמה 22,000" className="mt-1.5" autoFocus />
        </label>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-700">הלוואות קיימות (לא כולל המשכנתא)</span>
            <button
              type="button"
              onClick={() => onLoans([...loans, { id: newId('l'), monthlyPayment: 0, longTerm: true }])}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" />
              הוספת הלוואה
            </button>
          </div>
          {loans.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
              אין הלוואות? מצוין — אפשר להמשיך.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {loans.map((loan, index) => (
                <li key={loan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-[140px] flex-1">
                      <span className="text-2xs font-bold text-slate-500">החזר חודשי · הלוואה {index + 1}</span>
                      <MoneyInput
                        value={loan.monthlyPayment}
                        onChange={(value) => updateLoan(loan.id, { monthlyPayment: value })}
                        placeholder="₪"
                        className="mt-1"
                      />
                    </label>
                    <div className="flex flex-1 rounded-xl border border-slate-200 bg-white p-1 text-sm font-bold" role="radiogroup" aria-label="זמן עד הפירעון">
                      {[
                        { value: true, label: `יותר מ-${LONG_TERM_LOAN_MONTHS} חודשים` },
                        { value: false, label: `עד ${LONG_TERM_LOAN_MONTHS} חודשים` },
                      ].map((option) => (
                        <button
                          key={String(option.value)}
                          type="button"
                          role="radio"
                          aria-checked={loan.longTerm === option.value}
                          onClick={() => updateLoan(loan.id, { longTerm: option.value })}
                          className={cn(
                            'flex-1 whitespace-nowrap rounded-lg px-2 py-2 transition-colors',
                            loan.longTerm === option.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      aria-label={`מחיקת הלוואה ${index + 1}`}
                      onClick={() => onLoans(loans.filter((l) => l.id !== loan.id))}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {!loan.longTerm && loan.monthlyPayment > 0 && (
                    <p className="mt-1.5 text-2xs text-slate-500">
                      הלוואה שתיפרע בתוך {LONG_TERM_LOAN_MONTHS} חודשים אינה נכנסת לחישוב, כמו אצל הבנקים.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-3xl bg-brand-dark p-5 text-white shadow-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-200">
            <Wallet className="h-4 w-4" />
            ההכנסה הפנויה שלכם
          </div>
          <div className="mt-2 text-4xl font-black tabular-nums">{formatShekel(disposable)}</div>
          <div className="mt-4 border-t border-white/15 pt-3 text-sm text-slate-200">
            החזר משכנתא מקסימלי ({Math.round(PAYMENT_TO_INCOME_LIMIT * 100)}% מההכנסה הפנויה)
          </div>
          <div className="text-2xl font-black tabular-nums text-white">{formatShekel(maxPayment)}</div>
        </div>
        <NavButtons onBack={onBack} onNext={onNext} nextDisabled={income <= 0} nextLabel="להזנת המשכנתא" />
        {income <= 0 && <p className="text-center text-2xs text-slate-500">הזינו הכנסה כדי להמשיך</p>}
      </aside>
    </section>
  );
}

// ───────────────────────────── מסלולים ─────────────────────────────

const NOW = new Date();
const TRACK_TYPE_OPTIONS = TRACK_TYPE_ORDER.map((type) => ({ value: type, label: TRACK_TYPE_LABELS[type] }));

function endOf(months: number): { year: number; month: number } {
  const date = new Date(NOW.getFullYear(), NOW.getMonth() + months, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function TracksStep({
  tracks,
  onTracks,
  market,
  onRetry,
  onBack,
  onNext,
}: {
  tracks: RefiCheckTrack[];
  onTracks: (tracks: RefiCheckTrack[]) => void;
  market: MarketState;
  onRetry: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const averages = market.status === 'ready' ? market.averages : null;
  const update = (id: string, patch: Partial<RefiCheckTrack>) =>
    onTracks(tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const complete = tracks.filter((t) => t.balance > 0 && t.rate > 0 && t.months > 0);
  const totalBalance = complete.reduce((sum, t) => sum + t.balance, 0);
  const totalPayment = complete.reduce((sum, t) => sum + monthlyPayment(t.balance, t.rate, t.months), 0);
  const canCalculate = complete.length > 0 && complete.length === tracks.length && market.status === 'ready';

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-subtitle font-black text-slate-900">המסלולים במשכנתא היום</h2>
            <p className="mt-1 text-sm text-slate-500">
              מהדוח השנתי או מדוח יתרות לסילוק: סוג המסלול, היתרה, הריבית ומועד התשלום האחרון.
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          {tracks.map((track, index) => {
            const average = averages ? averageFor(track.type, averages) : null;
            const above = average !== null && track.rate > average + 0.1;
            const end = endOf(track.months);
            return (
              <CurrentTrackRow
                key={track.id}
                index={index}
                typeOptions={TRACK_TYPE_OPTIONS}
                value={{
                  type: track.type,
                  balance: track.balance,
                  rate: track.rate,
                  spread: track.spread,
                  variablePeriod: track.variablePeriod,
                  endYear: end.year,
                  endMonth: end.month,
                }}
                onChange={(patch) => {
                  const next: Partial<RefiCheckTrack> = {};
                  if (patch.type) next.type = patch.type as RefiCheckTrackType;
                  if (patch.balance !== undefined) next.balance = patch.balance;
                  if (patch.rate !== undefined) next.rate = patch.rate;
                  if (patch.spread !== undefined) next.spread = patch.spread ?? undefined;
                  if (patch.variablePeriod !== undefined) next.variablePeriod = patch.variablePeriod;
                  if (patch.endYear !== undefined || patch.endMonth !== undefined) {
                    next.months = clampMonths(
                      monthsUntil(patch.endYear ?? end.year, patch.endMonth ?? end.month, NOW)
                    );
                  }
                  update(track.id, next);
                }}
                onDelete={tracks.length > 1 ? () => onTracks(tracks.filter((t) => t.id !== track.id)) : undefined}
                footer={
                  <>
                    <span className="text-slate-500">נותרו {formatTerm(track.months)}</span>
                    {track.balance > 0 && track.rate > 0 && (
                      <span className="text-slate-500">
                        החזר {formatShekel(monthlyPayment(track.balance, track.rate, track.months))} בחודש
                      </span>
                    )}
                    {market.status === 'ready' && average !== null && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-bold',
                          track.rate > 0 && above ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/70 text-slate-600'
                        )}
                      >
                        ממוצע בנק ישראל {formatRate(average)}
                        {track.rate > 0 && above && ' · אתם מעל הממוצע'}
                      </span>
                    )}
                  </>
                }
              />
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => onTracks([...tracks, newTrack(nextType(tracks))])}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/60 py-3 text-button font-bold text-blue-700 transition-colors hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          הוספת מסלול
        </button>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-3xl bg-brand-dark p-5 text-white shadow-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-200">
            <Landmark className="h-4 w-4" />
            המשכנתא היום
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xs text-slate-300">יתרה</div>
              <div className="text-xl font-black tabular-nums">{formatShekel(totalBalance)}</div>
            </div>
            <div>
              <div className="text-2xs text-slate-300">החזר חודשי</div>
              <div className="text-xl font-black tabular-nums">{formatShekel(totalPayment)}</div>
            </div>
          </div>
          <div className="mt-4 border-t border-white/15 pt-3 text-2xs text-slate-300">
            {market.status === 'ready' && `ריביות ממוצעות: בנק ישראל, ${formatMonth(market.averages.asOf)}`}
            {market.status === 'loading' && 'טוען את הריביות הממוצעות מבנק ישראל…'}
            {market.status === 'error' && (
              <span className="text-amber-200">
                הריביות של בנק ישראל אינן זמינות כרגע.{' '}
                <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-bold underline">
                  <RefreshCw className="h-3 w-3" />
                  לנסות שוב
                </button>
              </span>
            )}
          </div>
        </div>
        <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!canCalculate} nextLabel="בדיקת אפשרויות המיחזור" />
        {!canCalculate && market.status !== 'error' && (
          <p className="text-center text-2xs text-slate-500">מלאו יתרה וריבית בכל מסלול כדי לחשב</p>
        )}
      </aside>
    </section>
  );
}

function nextType(tracks: RefiCheckTrack[]): RefiCheckTrackType {
  const used = new Set(tracks.map((t) => t.type));
  return TRACK_TYPE_ORDER.find((type) => !used.has(type)) ?? 'fixed_unlinked';
}

function clampMonths(months: number): number {
  return Math.min(MAX_TERM_MONTHS, Math.max(1, months));
}

// ───────────────────────────── שדות וכפתורים ─────────────────────────────

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-info font-semibold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        autoFocus={autoFocus}
        value={value > 0 ? formatNumberInput(String(value)) : ''}
        onChange={(e) => onChange(parseFormattedNumberInput(e.target.value))}
        placeholder={placeholder}
        className={cn(INPUT_CLASS, 'pl-8 text-right')}
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₪</span>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-cta font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {nextLabel}
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-button font-bold text-slate-600 transition-colors hover:bg-slate-50"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה
      </button>
      <Link href="/" className="text-center text-2xs font-bold text-slate-400 hover:text-slate-600">
        לעמוד הבית
      </Link>
    </div>
  );
}
