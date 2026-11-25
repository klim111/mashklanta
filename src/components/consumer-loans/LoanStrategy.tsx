'use client';

import React from 'react';
import {
  Banknote,
  Coins,
  Gauge,
  Percent,
  ShoppingCart,
  Sparkles,
  Target,
  TriangleAlert,
  X,
} from 'lucide-react';
import { formatILS } from '@/lib/currency';
import type { Loan, Objective, OptimizationInput, ScenarioResult } from './types';
import { findBestPlan } from './optimizer';
import { portfolioStats } from './loanInsights';
import { ScenarioRow } from './ScenarioRow';
import { ParamRow } from './LoanFields';
import { RateInfoButton } from './RateInfoButton';

/**
 * האסטרטגיה — שילובים ואופטימיזציה, באותו מסך של הכלי.
 *
 * כמו האיחוד: כפתור שמתחת להלוואות יוצר טאב "אסטרטגיה" בפאנל השליטה ובדאשבורד.
 * בפאנל הלקוח מזין מה יש לו (מזומן פנוי), מה מחכה לו (הוצאה צפויה), את הריבית
 * להלוואה חדשה ואת מה שחשוב לו — בלי ערכים מראש. בדאשבורד הכלי בודק את כל
 * התרחישים — הפניית המזומן להלוואה היקרה עם או בלי הלוואה חדשה, ואיחוד מלא בכל
 * אחת מהתקופות שנבחרו — ומציג את הטוב שבהם מול המצב הקיים.
 */

const ALL_TERMS = [12, 24, 36, 48, 60, 72, 84, 120];

const OBJECTIVES: { id: Objective; label: string; hint: string }[] = [
  { id: 'minTotalInterest', label: 'מינימום ריבית', hint: 'לשלם כמה שפחות בסך הכל' },
  { id: 'minMonthly', label: 'מינימום החזר חודשי', hint: 'לפנות תזרים עכשיו' },
];

/** מה עוד חסר כדי להריץ את האסטרטגיה */
function missingInputs(input: Partial<OptimizationInput>): string[] {
  const missing: string[] = [];
  if (input.newLoanAPR === undefined || input.newLoanAPR === null) missing.push('ריבית להלוואה חדשה');
  if (!input.objective) missing.push('מה חשוב לכם');
  if (!input.candidateTerms?.length) missing.push('תקופה אחת לפחות');
  return missing;
}

export function StrategyControl({
  input,
  onInputChange,
  onRemove,
}: {
  input: Partial<OptimizationInput>;
  onInputChange: (patch: Partial<OptimizationInput>) => void;
  onRemove: () => void;
}) {
  const candidateTerms = input.candidateTerms ?? [];
  const missing = missingInputs(input);

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Target className="h-3.5 w-3.5" />
          </span>
          <p className="min-w-0 flex-1 text-xs font-bold text-slate-800">מה יש לכם ומה מחכה לכם</p>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-2xs font-bold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-700"
          >
            <X className="h-3 w-3" />
            סגירת האסטרטגיה
          </button>
        </div>
        <ParamRow
          icon={Coins}
          label="מזומן זמין"
          value={input.cashAvailable ?? null}
          onChange={(value) => onInputChange({ cashAvailable: value ?? undefined })}
          min={0}
          max={300_000}
          step={1_000}
          suffix="₪"
        />
        <ParamRow
          icon={ShoppingCart}
          label="הוצאה צפויה"
          value={input.upcomingExpense ?? null}
          onChange={(value) => onInputChange({ upcomingExpense: value ?? undefined })}
          min={0}
          max={300_000}
          step={1_000}
          suffix="₪"
        />
        <ParamRow
          icon={Percent}
          label="ריבית להלוואה חדשה"
          info={<RateInfoButton />}
          value={input.newLoanAPR ?? null}
          onChange={(value) =>
            onInputChange({ newLoanAPR: value === null ? undefined : Math.min(value, 99) })
          }
          min={0}
          max={25}
          step={0.05}
          suffix="%"
          integer={false}
        />
        <ParamRow
          icon={Gauge}
          label="תקרת החזר (רשות)"
          value={input.budgetMonthly ?? null}
          onChange={(value) => onInputChange({ budgetMonthly: value && value > 0 ? value : undefined })}
          min={0}
          max={20_000}
          step={100}
          suffix="₪"
        />
        <p className="text-2xs text-slate-500">
          המזומן נשלח קודם להלוואה עם הריבית הגבוהה; ההוצאה הצפויה היא מה שדורש מימון — שיפוץ, רכב,
          חתונה. תרחיש שחורג מהתקרה יסומן.
        </p>
      </div>

      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
        <div>
          <p className="mb-1 text-2xs font-bold text-slate-600">מה חשוב לכם?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {OBJECTIVES.map((item) => {
              const active = input.objective === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onInputChange({ objective: item.id })}
                  className={`rounded-xl border px-3 py-2 text-right transition-all ${
                    active
                      ? 'border-violet-500 bg-violet-50 text-violet-900 ring-2 ring-violet-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'
                  }`}
                >
                  <span className="block text-xs font-black">{item.label}</span>
                  <span className="block text-2xs text-slate-500">{item.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-2xs font-bold text-slate-600">תקופות לבדיקה להלוואה חדשה / לאיחוד</p>
          <div className="flex flex-wrap gap-1">
            {ALL_TERMS.map((term) => {
              const active = candidateTerms.includes(term);
              return (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? candidateTerms.filter((item) => item !== term)
                      : [...candidateTerms, term].sort((a, b) => a - b);
                    onInputChange({ candidateTerms: next });
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-2xs font-bold transition-all ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
                  }`}
                >
                  {term} ח׳
                </button>
              );
            })}
          </div>
        </div>

        {missing.length > 0 && (
          <p className="text-2xs text-slate-500">כדי לראות את התוכנית המובילה חסר: {missing.join(' · ')}.</p>
        )}
      </div>
    </div>
  );
}

export function StrategyDashboard({
  loans,
  input,
}: {
  loans: Loan[];
  input: Partial<OptimizationInput>;
}) {
  const cashAvailable = input.cashAvailable ?? 0;
  const upcomingExpense = input.upcomingExpense ?? 0;
  const objective = input.objective;
  const candidateTerms = input.candidateTerms ?? [];
  const budgetMonthly = input.budgetMonthly;
  const ready = missingInputs(input).length === 0 && loans.length > 0;

  const base = React.useMemo(() => portfolioStats(loans), [loans]);

  const result = React.useMemo(() => {
    if (!ready || !objective || input.newLoanAPR === undefined) return null;
    return findBestPlan({
      existingLoans: loans,
      cashAvailable,
      upcomingExpense,
      newLoanAPR: input.newLoanAPR,
      candidateTerms,
      objective,
      budgetMonthly,
    });
  }, [ready, loans, cashAvailable, upcomingExpense, input.newLoanAPR, candidateTerms, objective, budgetMonthly]);

  const best = result?.best;
  // התרחיש המוביל תמיד מוצג, גם כשתרחישים שחורגים מהתקרה מדורגים לפניו
  const scenarios =
    result && objective
      ? [best, ...rankScenarios(result.compared, objective).filter((item) => item !== best)]
          .filter((item): item is ScenarioResult => !!item)
          .slice(0, 8)
      : [];

  return (
    <div className="space-y-2.5">
      {/* המצב הקיים מול התוכנית המובילה */}
      <ScenarioRow
        title="המצב הקיים"
        subtitle={`${base.count} הלוואות · ריבית משוקללת ${base.weightedApr.toFixed(2)}%`}
        stats={{
          monthlyPayment: base.monthlyPayment,
          totalInterest: base.totalInterest,
          totalPaid: base.totalPaid,
          principal: base.totalPrincipal,
          months: base.payoffMonths,
        }}
        tone="current"
      />

      {!best && (
        <ScenarioRow
          title="התוכנית המובילה"
          subtitle="תופיע כשתמלאו את טאב האסטרטגיה בפאנל השליטה"
          stats={null}
          tone="best"
        />
      )}

      {best && (
        <>
          <ScenarioRow
            title={`התוכנית המובילה: ${best.description}`}
            subtitle={result?.reason}
            stats={{
              monthlyPayment: best.totalMonthlyPayment,
              totalInterest: best.totalInterest,
              totalPaid: best.totalPaid,
              principal: best.loans.reduce((sum, loan) => sum + loan.principal, 0),
              months: best.weightedEndTime,
            }}
            baseline={{
              monthlyPayment: base.monthlyPayment,
              totalInterest: base.totalInterest,
              totalPaid: base.totalPaid,
              principal: base.totalPrincipal,
              months: base.payoffMonths,
            }}
            tone="best"
          />

          {result?.budgetExceeded && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-2xs font-bold leading-relaxed text-amber-900">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              אף תרחיש אינו עומד בתקרת ההחזר שהגדרתם. מוצגים התרחישים הקרובים אליה — אפשר להאריך
              תקופה, להקטין את ההוצאה הצפויה או להפנות יותר מזומן.
            </p>
          )}

          {/* הרכב התוכנית */}
          <div className="rounded-xl border border-violet-200 bg-white p-2.5">
            <p className="mb-1.5 text-xs font-bold text-slate-800">
              איך התוכנית נראית בפועל
            </p>
            <div className="space-y-1">
              {best.loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-2xs"
                >
                  <span className="font-black text-slate-900">{loan.name}</span>
                  <span className="text-slate-600">{formatILS(loan.principal)}</span>
                  <span className="text-slate-600">{loan.apr.toFixed(2)}%</span>
                  <span className="text-slate-600">{loan.months} ח׳</span>
                </div>
              ))}
              {best.loans.length === 0 && (
                <p className="text-2xs font-bold text-emerald-700">
                  כל ההלוואות נסגרות — המזומן שהזנתם מכסה את החוב כולו.
                </p>
              )}
            </div>

            {best.cashAllocation && Object.keys(best.cashAllocation).length > 0 && (
              <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-2xs font-bold text-emerald-900">
                חלוקת המזומן:{' '}
                {Object.entries(best.cashAllocation)
                  .map(([loanId, amount]) => {
                    const loan = loans.find((item) => item.id === loanId);
                    return `${loan?.name ?? 'הלוואה'} — ${formatILS(amount)}`;
                  })
                  .join(' · ')}
              </p>
            )}
          </div>

          {/* כל התרחישים שנבדקו */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-2.5 py-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              <p className="text-xs font-bold text-slate-800">
                התרחישים שנבדקו ({result?.compared.length})
              </p>
              <p className="mr-auto text-2xs text-slate-500">
                מדורגים לפי {objective === 'minTotalInterest' ? 'סך הריבית' : 'ההחזר החודשי'}
              </p>
            </div>
            <table className="w-full text-2xs">
              <thead className="bg-slate-50 text-2xs font-bold text-slate-500">
                <tr>
                  <th className="p-2 text-right">תרחיש</th>
                  <th className="p-2 text-right">החזר חודשי</th>
                  <th className="p-2 text-right">סך ריבית</th>
                  <th className="p-2 text-right">סך תשלום</th>
                  <th className="p-2 text-right">סיום משוקלל</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario, index) => {
                  const isBest = scenario === best;
                  const overBudget = !!budgetMonthly && scenario.totalMonthlyPayment > budgetMonthly;
                  return (
                    <tr
                      key={`${scenario.type}-${scenario.description}-${index}`}
                      className={`border-t border-slate-100 ${
                        isBest ? 'bg-violet-50' : overBudget ? 'bg-rose-50' : ''
                      }`}
                    >
                      <td className="p-2 font-bold text-slate-900">
                        {scenario.description}
                        {isBest && (
                          <span className="mr-1.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-2xs font-black text-white">
                            מוביל
                          </span>
                        )}
                      </td>
                      <td className={`p-2 font-bold ${overBudget ? 'text-rose-600' : 'text-blue-700'}`}>
                        {formatILS(scenario.totalMonthlyPayment)}
                      </td>
                      <td className="p-2 text-slate-700">{formatILS(scenario.totalInterest)}</td>
                      <td className="p-2 text-slate-700">{formatILS(scenario.totalPaid)}</td>
                      <td className="p-2 text-slate-700">{Math.round(scenario.weightedEndTime)} ח׳</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-2xs leading-relaxed text-slate-600">
            <Banknote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            התרחישים מחושבים על הנתונים שהזנתם, בריביות שהזנתם. הריבית שתקבלו בפועל תלויה בבנק,
            בהיסטוריית האשראי ובמשא ומתן — וזה בדיוק המקום שבו יועץ כלכלת המשפחה מכניס את ההפרש.
          </p>
        </>
      )}
    </div>
  );
}

/** דירוג התרחישים לפי המטרה שנבחרה — כדי שהטבלה תציג קודם את המשתלמים */
function rankScenarios(scenarios: ScenarioResult[], objective: Objective): ScenarioResult[] {
  return [...scenarios].sort((a, b) =>
    objective === 'minTotalInterest'
      ? a.totalInterest - b.totalInterest
      : a.totalMonthlyPayment - b.totalMonthlyPayment
  );
}
