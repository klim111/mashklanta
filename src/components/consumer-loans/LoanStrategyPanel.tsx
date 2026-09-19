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
} from 'lucide-react';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { formatILS } from '@/lib/currency';
import type { Loan, Objective, OptimizationInput, ScenarioResult } from './types';
import { findBestPlan } from './optimizer';
import { portfolioStats } from './loanInsights';
import { ScenarioRow, SliderField } from './LoanComparison';

/**
 * פאנל האסטרטגיה — שילובים ואופטימיזציה.
 *
 * הלקוח מזין מה יש לו (מזומן פנוי) ומה מחכה לו (הוצאה צפויה), ובוחר מה חשוב
 * לו: ריבית מינימלית או החזר חודשי מינימלי. הכלי בודק את כל התרחישים — הפניית
 * המזומן בשיטת האוולנץ׳ עם או בלי הלוואה חדשה, ואיחוד מלא בכל אחת מהתקופות
 * המועמדות — ומציג את הטוב שבהם מול המצב הקיים. החישוב חי: כל שינוי בפאנל
 * מריץ אותו מחדש.
 */

const ALL_TERMS = [12, 24, 36, 48, 60, 72, 84, 120];

const OBJECTIVES: { id: Objective; label: string; hint: string }[] = [
  { id: 'minTotalInterest', label: 'מינימום ריבית', hint: 'לשלם כמה שפחות בסך הכל' },
  { id: 'minMonthly', label: 'מינימום החזר חודשי', hint: 'לפנות תזרים עכשיו' },
];

export function LoanStrategyPanel({
  loans,
  input,
  onInputChange,
}: {
  loans: Loan[];
  input: Partial<OptimizationInput>;
  onInputChange: (patch: Partial<OptimizationInput>) => void;
}) {
  const cashAvailable = input.cashAvailable ?? 0;
  const upcomingExpense = input.upcomingExpense ?? 0;
  const newLoanAPR = input.newLoanAPR ?? 12;
  const objective: Objective = input.objective ?? 'minTotalInterest';
  const candidateTerms = input.candidateTerms?.length ? input.candidateTerms : ALL_TERMS;
  const budgetMonthly = input.budgetMonthly;

  const base = React.useMemo(() => portfolioStats(loans), [loans]);

  const result = React.useMemo(() => {
    if (loans.length === 0) return null;
    return findBestPlan({
      existingLoans: loans,
      cashAvailable,
      upcomingExpense,
      newLoanAPR,
      candidateTerms,
      objective,
      budgetMonthly,
    });
  }, [loans, cashAvailable, upcomingExpense, newLoanAPR, candidateTerms, objective, budgetMonthly]);

  if (loans.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Target className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-[15px] font-black text-slate-900">
              הוסיפו הלוואות כדי לבנות אסטרטגיה
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              הפאנל בודק מה עדיף: להפנות את המזומן הפנוי להלוואה היקרה, לקחת הלוואה חדשה להוצאה
              שמחכה, או לאחד את כל החוב להלוואה אחת — ובאיזו תקופה.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const best = result?.best;
  // התרחיש המוביל תמיד מוצג, גם כשתרחישים שחורגים מהתקרה מדורגים לפניו
  const scenarios = result
    ? [best, ...rankScenarios(result.compared, objective).filter((item) => item !== best)]
        .filter((item): item is ScenarioResult => !!item)
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-2.5">
      {/* הפרמטרים */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <NumberField
            icon={Coins}
            label="מזומן זמין להפניה עכשיו"
            value={cashAvailable}
            onChange={(value) => onInputChange({ cashAvailable: value })}
            hint="נשלח קודם להלוואה עם הריבית הגבוהה"
          />
          <NumberField
            icon={ShoppingCart}
            label="הוצאה צפויה שצריך לממן"
            value={upcomingExpense}
            onChange={(value) => onInputChange({ upcomingExpense: value })}
            hint="שיפוץ, רכב, חתונה — מה שדורש מימון"
          />
          <SliderField
            icon={Percent}
            label="ריבית להלוואה חדשה / איחוד"
            display={`${newLoanAPR.toFixed(2)}%`}
            value={newLoanAPR}
            min={2}
            max={25}
            step={0.05}
            onChange={(value) => onInputChange({ newLoanAPR: value })}
            minLabel="2%"
            maxLabel="25%"
          />
          <NumberField
            icon={Gauge}
            label="תקרת החזר חודשי (רשות)"
            value={budgetMonthly ?? 0}
            onChange={(value) => onInputChange({ budgetMonthly: value > 0 ? value : undefined })}
            hint="תרחיש שחורג מהתקרה יסומן"
          />
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">מה חשוב לכם?</p>
            <div className="flex flex-wrap gap-1.5">
              {OBJECTIVES.map((item) => {
                const active = objective === item.id;
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
                    <span className="block text-[12px] font-black">{item.label}</span>
                    <span className="block text-[10px] text-slate-500">{item.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">
              תקופות מועמדות להלוואה חדשה / לאיחוד
            </p>
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
                      // תמיד נשארת תקופה אחת לבדיקה, אחרת אין מה להשוות
                      onInputChange({ candidateTerms: next.length > 0 ? next : [term] });
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
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
        </div>
      </div>

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
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-bold leading-relaxed text-amber-900">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              אף תרחיש אינו עומד בתקרת ההחזר שהגדרתם. מוצגים התרחישים הקרובים אליה — אפשר להאריך
              תקופה, להקטין את ההוצאה הצפויה או להפנות יותר מזומן.
            </p>
          )}

          {/* הרכב התוכנית */}
          <div className="rounded-xl border border-violet-200 bg-white p-2.5">
            <p className="mb-1.5 text-[12px] font-bold text-slate-800">
              איך התוכנית נראית בפועל
            </p>
            <div className="space-y-1">
              {best.loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11.5px]"
                >
                  <span className="font-black text-slate-900">{loan.name}</span>
                  <span className="text-slate-600">{formatILS(loan.principal)}</span>
                  <span className="text-slate-600">{loan.apr.toFixed(2)}%</span>
                  <span className="text-slate-600">{loan.months} ח׳</span>
                </div>
              ))}
              {best.loans.length === 0 && (
                <p className="text-[11.5px] font-bold text-emerald-700">
                  כל ההלוואות נסגרות — המזומן שהזנתם מכסה את החוב כולו.
                </p>
              )}
            </div>

            {best.cashAllocation && Object.keys(best.cashAllocation).length > 0 && (
              <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900">
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
              <p className="text-[12px] font-bold text-slate-800">
                התרחישים שנבדקו ({result?.compared.length})
              </p>
              <p className="mr-auto text-[10px] text-slate-500">
                מדורגים לפי {objective === 'minTotalInterest' ? 'סך הריבית' : 'ההחזר החודשי'}
              </p>
            </div>
            <table className="w-full text-[11.5px]">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500">
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
                        isBest ? 'bg-violet-50/70' : overBudget ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="p-2 font-bold text-slate-900">
                        {scenario.description}
                        {isBest && (
                          <span className="mr-1.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">
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

          <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px] leading-relaxed text-slate-600">
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

function NumberField({
  icon: Icon,
  label,
  value,
  onChange,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-[11px] font-bold text-slate-600">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <FormattedNumberValueInput
          value={value || ''}
          onValueChange={onChange}
          placeholder="0"
          aria-label={label}
          className="h-8 w-32 text-[12px]"
        />
        <span className="text-[10px] text-slate-500">{hint}</span>
      </div>
    </div>
  );
}
