'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarClock, Check, Merge, Percent, X } from 'lucide-react';
import { formatILS } from '@/lib/currency';
import type { ConsolidationPlan, Loan } from './types';
import { balanceComparisonSeries, consolidationOutcome, loanColor } from './loanInsights';
import { ParamRow } from './LoanFields';
import { RateInfoButton } from './RateInfoButton';
import { ScenarioRow } from './ScenarioRow';

/**
 * איחוד הלוואות.
 *
 * הכפתור שמתחת להלוואות פותח את בחירת ההלוואות לאיחוד; אחרי האישור נוצרים
 * טאב "איחוד הלוואות" בפאנל השליטה וטאב "איחוד" בדאשבורד, והתצוגה עוברת
 * אליהם. בפאנל מוצג הסכום הכולל ומזינים ריבית ותקופה (בלי ערכים מראש); בדאשבורד
 * מוצג התיק אחרי האיחוד מול התיק היום. הסרת האיחוד מעלימה את הטאבים.
 */

/* ------------------------------------------------------------------ */
/* בחירת ההלוואות לאיחוד                                               */
/* ------------------------------------------------------------------ */

export function ConsolidationPicker({
  open,
  loans,
  initial,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loans: Loan[];
  initial: string[];
  onCancel: () => void;
  onConfirm: (loanIds: string[]) => void;
}) {
  const [picked, setPicked] = React.useState<string[]>(initial);

  React.useEffect(() => {
    if (open) setPicked(initial);
  }, [open, initial]);

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const amount = loans.filter((loan) => picked.includes(loan.id)).reduce((sum, loan) => sum + loan.principal, 0);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="picker"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="space-y-2 rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
                <Merge className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-violet-950">אילו הלוואות לאחד?</p>
                <p className="text-2xs text-violet-800/80">בחרו שתיים לפחות — הן יוחלפו בהלוואה אחת</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                title="ביטול"
                className="rounded-md p-1 text-violet-400 transition-colors hover:bg-white hover:text-violet-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-1.5 sm:grid-cols-2">
              {loans.map((loan, index) => {
                const active = picked.includes(loan.id);
                return (
                  <motion.button
                    key={loan.id}
                    type="button"
                    onClick={() => toggle(loan.id)}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.06 * index + 0.1, duration: 0.25 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-right transition-colors ${
                      active
                        ? 'border-violet-500 bg-white shadow-sm ring-2 ring-violet-100'
                        : 'border-slate-200 bg-white/70 hover:border-violet-300'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        active ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: loanColor(loan) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-900">{loan.name}</span>
                      <span className="block text-2xs text-slate-500">
                        {formatILS(loan.principal)} · {loan.apr.toFixed(2)}%
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xs text-violet-900">
                {picked.length >= 2 ? `סך הכול לאיחוד: ${formatILS(amount)}` : 'נבחרו פחות משתי הלוואות'}
              </p>
              <button
                type="button"
                disabled={picked.length < 2}
                onClick={() => onConfirm(picked)}
                className="mr-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Merge className="h-3.5 w-3.5" />
                איחוד ההלוואות שנבחרו
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* טאב האיחוד בפאנל השליטה                                              */
/* ------------------------------------------------------------------ */

export function ConsolidationControl({
  loans,
  plan,
  onChange,
  onRemove,
}: {
  loans: Loan[];
  plan: ConsolidationPlan;
  onChange: (plan: ConsolidationPlan) => void;
  onRemove: () => void;
}) {
  const outcome = consolidationOutcome(loans, plan);

  const toggle = (id: string) => {
    const next = plan.loanIds.includes(id) ? plan.loanIds.filter((item) => item !== id) : [...plan.loanIds, id];
    if (next.length >= 2) onChange({ ...plan, loanIds: next });
  };

  return (
    <div className="space-y-2.5">
      <div className="space-y-2 rounded-xl border border-violet-200 bg-white p-2.5">
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Merge className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xs text-slate-500">הסכום הכולל לאיחוד</p>
            <p className="text-info font-black leading-tight text-violet-900">{formatILS(outcome.amount)}</p>
            <p className="text-2xs text-slate-500">{outcome.selected.length} הלוואות יוחלפו בהלוואה אחת</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-2xs font-bold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-700"
          >
            <X className="h-3 w-3" />
            הסרת האיחוד
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {loans.map((loan) => {
            const active = plan.loanIds.includes(loan.id);
            return (
              <button
                key={loan.id}
                type="button"
                onClick={() => toggle(loan.id)}
                title={active ? 'הוצאה מהאיחוד' : 'הכנסה לאיחוד'}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-2xs font-bold transition-all ${
                  active
                    ? 'border-violet-400 bg-violet-50 text-violet-900'
                    : 'border-dashed border-slate-300 bg-white text-slate-400 hover:border-violet-300'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: loanColor(loan) }} />
                {loan.name}
                <span className="font-normal">{formatILS(loan.principal)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2.5">
        <p className="text-xs font-bold text-slate-800">ההלוואה המאוחדת</p>
        <ParamRow
          icon={Percent}
          label="ריבית שנתית"
          info={<RateInfoButton />}
          value={plan.apr}
          onChange={(value) => onChange({ ...plan, apr: value === null ? null : Math.min(value, 99) })}
          min={0}
          max={25}
          step={0.05}
          suffix="%"
          integer={false}
        />
        <ParamRow
          icon={CalendarClock}
          label="תקופה"
          value={plan.months}
          onChange={(value) => onChange({ ...plan, months: value === null ? null : Math.min(value, 600) })}
          min={1}
          max={180}
          step={1}
          suffix="חודשים"
        />
        {!outcome.merged && (
          <p className="text-2xs text-slate-500">הזינו ריבית ותקופה — הדאשבורד יציג את התיק אחרי האיחוד.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* טאב האיחוד בדאשבורד                                                  */
/* ------------------------------------------------------------------ */

export function ConsolidationDashboard({ loans, plan }: { loans: Loan[]; plan: ConsolidationPlan }) {
  const outcome = consolidationOutcome(loans, plan);
  const { before, after, merged } = outcome;

  const chart = React.useMemo(() => {
    if (!outcome.afterLoans) return null;
    return balanceComparisonSeries({ today: loans, after: outcome.afterLoans });
  }, [loans, outcome.afterLoans]);

  const toStats = (value: typeof before) => ({
    monthlyPayment: value.monthlyPayment,
    totalInterest: value.totalInterest,
    totalPaid: value.totalPaid,
    principal: value.totalPrincipal,
    months: value.payoffMonths,
  });

  const saved = after ? before.totalInterest - after.totalInterest : null;
  const monthlyDelta = after ? after.monthlyPayment - before.monthlyPayment : null;

  return (
    <div className="space-y-2.5">
      <ScenarioRow
        title="התיק שלכם היום"
        subtitle={`${before.count} הלוואות · ריבית משוקללת ${before.weightedApr.toFixed(2)}%`}
        stats={toStats(before)}
        tone="current"
      />
      <ScenarioRow
        title="אחרי האיחוד"
        subtitle={
          merged
            ? `${outcome.selected.length} הלוואות → הלוואה אחת של ${formatILS(outcome.amount)} ב-${merged.apr.toFixed(2)}% ל-${merged.months} חודשים`
            : 'יתמלא כשתזינו ריבית ותקופה בטאב האיחוד בפאנל השליטה'
        }
        stats={after ? toStats(after) : null}
        baseline={toStats(before)}
        tone="scenario"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <Verdict
          label="הריבית שתשלמו עד הסוף"
          value={saved === null ? null : saved}
          positive="חיסכון של"
          negative="תוספת של"
        />
        <Verdict
          label="ההחזר החודשי"
          value={monthlyDelta === null ? null : -monthlyDelta}
          positive="יורד ב-"
          negative="עולה ב-"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <p className="mb-1 text-xs font-bold text-slate-800">יתרת החוב — היום מול אחרי האיחוד</p>
        <div className="h-52 w-full [&_svg]:[direction:ltr]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart ?? EMPTY_CHART} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis
                domain={chart ? [0, 'auto'] : [0, 100_000]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}K`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatILS(value), name]}
                labelFormatter={(label) => `חודש ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="today"
                name="היום"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.12}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="after"
                name="אחרי האיחוד"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-2xs text-slate-400">הציר האופקי: חודשים מהיום</p>
      </div>
    </div>
  );
}

const EMPTY_CHART = [0, 12, 24, 36, 48, 60].map((month) => ({ month, today: null, after: null }));

function Verdict({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: number | null;
  positive: string;
  negative: string;
}) {
  const good = value !== null && value > 1;
  const bad = value !== null && value < -1;
  return (
    <div
      className={`rounded-xl border p-2.5 ${
        good ? 'border-emerald-200 bg-emerald-50' : bad ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-2xs text-slate-500">{label}</p>
      <p
        className={`text-sm font-black ${good ? 'text-emerald-800' : bad ? 'text-rose-800' : 'text-slate-400'}`}
      >
        {value === null
          ? '—'
          : Math.abs(value) <= 1
            ? 'ללא שינוי'
            : `${value > 0 ? positive : negative} ${formatILS(Math.abs(value))}`}
      </p>
    </div>
  );
}
