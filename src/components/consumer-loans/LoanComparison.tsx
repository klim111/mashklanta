'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeftRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Merge,
  PiggyBank,
  Percent,
  CalendarClock,
  X,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { formatILS } from '@/lib/currency';
import type { Loan } from './types';
import { buildAmortSchedule, calculateLoanSummary } from './loanMath';
import { loanColor, loanStats, portfolioStats } from './loanInsights';

/**
 * ההשוואה בין הלוואות.
 *
 * אותו רעיון של כלי המיחזור: מצב קיים למעלה, ומתחתיו התרחיש — עם ההפרש בכל
 * סעיף. שלושת התרחישים שהכלי יודע לבדוק הם איחוד ההלוואות הנבחרות להלוואה
 * אחת, הפניית מזומן לפירעון מוקדם של היקרה שבהן, וההשוואה הגרפית ביניהן.
 */

export type CompareView = 'summary' | 'consolidation' | 'prepayment' | 'charts';

const VIEWS: { id: CompareView; label: string; icon: React.ElementType }[] = [
  { id: 'summary', label: 'סיכום ההשוואה', icon: Calculator },
  { id: 'consolidation', label: 'איחוד הלוואות', icon: Merge },
  { id: 'prepayment', label: 'פירעון מוקדם', icon: PiggyBank },
  { id: 'charts', label: 'גרפים', icon: BarChart3 },
];

export function LoanComparison({
  loans,
  selectedIds,
  onClearSelection,
  onToggleSelect,
  view,
  onViewChange,
}: {
  loans: Loan[];
  selectedIds: string[];
  onClearSelection: () => void;
  onToggleSelect: (id: string) => void;
  view: CompareView;
  onViewChange: (view: CompareView) => void;
}) {
  const selected = loans.filter((loan) => selectedIds.includes(loan.id));
  const base = portfolioStats(selected);

  const [consolidationApr, setConsolidationApr] = React.useState(10);
  const [consolidationMonths, setConsolidationMonths] = React.useState(60);
  const [cash, setCash] = React.useState(0);

  if (selected.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ArrowLeftRight className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-info font-black text-slate-900">בחרו שתי הלוואות ומעלה להשוואה</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              סימון הלוואות בפאנל השליטה (או לחיצה על מקטע בפס הרכב התיק) פותח כאן את הסיכום
              המשותף, תרחיש איחוד, תרחיש פירעון מוקדם וההשוואה הגרפית.
            </p>
          </div>
        </div>

        {loans.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {loans.map((loan) => {
              const active = selectedIds.includes(loan.id);
              return (
                <button
                  key={loan.id}
                  type="button"
                  onClick={() => onToggleSelect(loan.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-2xs font-bold transition-all ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: loanColor(loan) }} />
                  {loan.name}
                  <span className="text-slate-400">{formatILS(loan.principal)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const consolidated: Loan = {
    id: 'consolidated',
    name: 'הלוואה מאוחדת',
    principal: base.totalPrincipal,
    apr: consolidationApr,
    months: consolidationMonths,
  };
  const consolidatedSummary = calculateLoanSummary(consolidated);

  const prepayment = buildPrepaymentScenario(selected, cash);

  return (
    <div className="space-y-2.5">
      {/* בחירת ההלוואות המושוות */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 p-2.5">
        <p className="text-2xs font-bold text-blue-900">מושוות כרגע:</p>
        {selected.map((loan) => (
          <button
            key={loan.id}
            type="button"
            onClick={() => onToggleSelect(loan.id)}
            title="הסרה מההשוואה"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-2xs font-bold text-slate-700 transition-colors hover:border-rose-300 hover:text-rose-700"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: loanColor(loan) }} />
            {loan.name}
            <X className="h-3 w-3 text-slate-400" />
          </button>
        ))}
        <button
          type="button"
          onClick={onClearSelection}
          className="mr-auto rounded-lg px-2.5 py-1 text-2xs font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
        >
          ניקוי הבחירה
        </button>
      </div>

      {/* הניווט בין התרחישים */}
      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-all ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* שורת המצב הקיים — תמיד למעלה, בדיוק כמו בכלי המיחזור */}
      <ScenarioRow
        title={`המצב הקיים (${selected.length} הלוואות)`}
        subtitle="סך הכל על ההלוואות שסימנתם"
        stats={{
          monthlyPayment: base.monthlyPayment,
          totalInterest: base.totalInterest,
          totalPaid: base.totalPaid,
          principal: base.totalPrincipal,
          months: base.payoffMonths,
        }}
        tone="current"
      />

      {view === 'summary' && (
        <div className="space-y-2.5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-2xs font-bold text-slate-500">
                <tr>
                  <th className="p-2 text-right">הלוואה</th>
                  <th className="p-2 text-right">קרן</th>
                  <th className="p-2 text-right">ריבית</th>
                  <th className="p-2 text-right">תקופה</th>
                  <th className="p-2 text-right">החזר חודשי</th>
                  <th className="p-2 text-right">סך ריבית</th>
                  <th className="p-2 text-right">ריבית מסך התשלום</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((loan) => {
                  const stats = loanStats(loan);
                  return (
                    <tr key={loan.id} className="border-t border-slate-100">
                      <td className="p-2 font-bold text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: loanColor(loan) }}
                          />
                          {loan.name}
                        </span>
                      </td>
                      <td className="p-2 text-slate-700">{formatILS(loan.principal)}</td>
                      <td className="p-2 text-slate-700">{loan.apr.toFixed(2)}%</td>
                      <td className="p-2 text-slate-700">{loan.months} ח׳</td>
                      <td className="p-2 font-bold text-blue-700">{formatILS(stats.monthlyPayment)}</td>
                      <td className="p-2 font-bold text-rose-600">{formatILS(stats.totalInterest)}</td>
                      <td className="p-2 text-slate-700">{Math.round(stats.interestShare * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-2xs leading-relaxed text-slate-600">
            ההלוואה שיש להתחיל ממנה היא זו עם הריבית הגבוהה, לא זו עם היתרה הגדולה: כל שקל שמופנה
            לריבית הגבוהה חוסך יותר. סימון ההלוואות כאן ומעבר לתרחיש איחוד או פירעון מוקדם מראה
            בדיוק כמה.
          </p>
        </div>
      )}

      {view === 'consolidation' && (
        <div className="space-y-2.5">
          <div className="grid gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 sm:grid-cols-2">
            <SliderField
              icon={Percent}
              label="ריבית ההלוואה המאוחדת"
              display={`${consolidationApr.toFixed(2)}%`}
              value={consolidationApr}
              min={2}
              max={25}
              step={0.05}
              onChange={setConsolidationApr}
              minLabel="2%"
              maxLabel="25%"
            />
            <SliderField
              icon={CalendarClock}
              label="תקופת ההלוואה המאוחדת"
              display={`${consolidationMonths} ח׳`}
              value={consolidationMonths}
              min={12}
              max={180}
              step={1}
              onChange={(value) => setConsolidationMonths(Math.round(value))}
              minLabel="12 ח׳"
              maxLabel="180 ח׳"
            />
          </div>

          <ScenarioRow
            title="אחרי איחוד להלוואה אחת"
            subtitle={`${formatILS(base.totalPrincipal)} בריבית ${consolidationApr.toFixed(2)}% ל-${consolidationMonths} חודשים`}
            stats={{
              monthlyPayment: consolidatedSummary.monthlyPayment,
              totalInterest: consolidatedSummary.totalInterest,
              totalPaid: consolidatedSummary.totalPaid,
              principal: consolidated.principal,
              months: consolidated.months,
            }}
            baseline={{
              monthlyPayment: base.monthlyPayment,
              totalInterest: base.totalInterest,
              totalPaid: base.totalPaid,
              principal: base.totalPrincipal,
              months: base.payoffMonths,
            }}
            tone="scenario"
          />

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-2xs leading-relaxed text-amber-900">
            שימו לב לשני הכיוונים: איחוד בריבית נמוכה חוסך ריבית, אבל פריסה לתקופה ארוכה יותר
            מקטינה את ההחזר החודשי ומגדילה את הריבית הכוללת. המספרים כאן מראים את שני הדברים
            במקביל, כדי שהבחירה תהיה מודעת.
          </p>
        </div>
      )}

      {view === 'prepayment' && (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-slate-700">סכום מזומן שאפשר להפנות עכשיו</p>
              <FormattedNumberValueInput
                value={cash || ''}
                onValueChange={setCash}
                placeholder="0"
                aria-label="סכום מזומן לפירעון מוקדם"
                className="h-8 w-32 text-xs"
              />
              <span className="text-2xs text-slate-500">
                הכלי מפנה אותו להלוואה עם הריבית הגבוהה — שיטת האוולנץ׳
              </span>
            </div>
          </div>

          {prepayment ? (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-2xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {formatILS(prepayment.payoffAmount)} מופנים ל{prepayment.target.name} (
                {prepayment.target.apr.toFixed(2)}%)
                {prepayment.closed ? ' — ההלוואה נסגרת במלואה' : ' — היתרה ממשיכה בתשלום קטן יותר'}
                {prepayment.cashLeft > 0 && ` · נשארו ${formatILS(prepayment.cashLeft)} להלוואה הבאה`}
              </div>

              <ScenarioRow
                title="אחרי הפירעון המוקדם"
                subtitle="אותן הלוואות, בלי הקרן שנפרעה"
                stats={{
                  monthlyPayment: prepayment.monthlyPayment,
                  totalInterest: prepayment.totalInterest,
                  totalPaid: prepayment.totalPaid,
                  principal: prepayment.principal,
                  months: prepayment.months,
                }}
                baseline={{
                  monthlyPayment: base.monthlyPayment,
                  totalInterest: base.totalInterest,
                  totalPaid: base.totalPaid,
                  principal: base.totalPrincipal,
                  months: base.payoffMonths,
                }}
                tone="scenario"
              />
            </>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              הזינו סכום מזומן כדי לראות לאיזו הלוואה כדאי להפנות אותו וכמה ריבית הוא חוסך.
            </p>
          )}
        </div>
      )}

      {view === 'charts' && (
        <div className="grid gap-2.5 lg:grid-cols-2">
          <ChartCard
            title="השוואה בין ההלוואות"
            hint="החזר חודשי, סך ריבית וסך תשלום זה מול זה"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={selected.map((loan) => {
                  const stats = loanStats(loan);
                  return {
                    name: loan.name,
                    'החזר חודשי': Math.round(stats.monthlyPayment),
                    'סך ריבית': Math.round(stats.totalInterest),
                    'סך תשלום': Math.round(stats.totalPaid),
                  };
                })}
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}K`}
                />
                <Tooltip content={<MoneyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="החזר חודשי" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="סך ריבית" fill="#e11d48" radius={[4, 4, 0, 0]} />
                <Bar dataKey="סך תשלום" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="קצב ירידת היתרה" hint="מי נסגרת ראשונה, ומי גוררת את החוב הלאה">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={balanceComparisonData(selected)}
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}K`}
                />
                <Tooltip content={<MoneyTooltip suffix="חודש" />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selected.map((loan) => (
                  <Line
                    key={loan.id}
                    type="monotone"
                    dataKey={loan.name}
                    stroke={loanColor(loan)}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* תרחיש הפירעון המוקדם                                                */
/* ------------------------------------------------------------------ */

interface PrepaymentScenario {
  target: Loan;
  payoffAmount: number;
  cashLeft: number;
  closed: boolean;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  principal: number;
  months: number;
}

/**
 * הפניית המזומן להלוואה היקרה ביותר. ההלוואה נסגרת אם המזומן מכסה אותה, ואחרת
 * היתרה ממשיכה לאותה תקופה בתשלום קטן יותר — בדיוק כמו מצב `reduce` בלוח
 * הסילוקין.
 */
function buildPrepaymentScenario(loans: Loan[], cash: number): PrepaymentScenario | null {
  if (cash <= 0 || loans.length === 0) return null;

  const target = loans.reduce((prev, current) => (current.apr > prev.apr ? current : prev));
  const payoffAmount = Math.min(cash, target.principal);
  const remainingPrincipal = target.principal - payoffAmount;

  const after = loans
    .map((loan) =>
      loan.id === target.id ? { ...loan, principal: remainingPrincipal } : loan
    )
    .filter((loan) => loan.principal > 0);

  const stats = portfolioStats(after);

  return {
    target,
    payoffAmount,
    cashLeft: cash - payoffAmount,
    closed: remainingPrincipal <= 0,
    monthlyPayment: stats.monthlyPayment,
    totalInterest: stats.totalInterest,
    totalPaid: stats.totalPaid,
    principal: stats.totalPrincipal,
    months: stats.payoffMonths,
  };
}

function balanceComparisonData(loans: Loan[]): Record<string, number>[] {
  const schedules = loans.map((loan) => ({
    loan,
    rows: buildAmortSchedule({
      principal: loan.principal,
      apr: loan.apr,
      months: loan.months,
    }).rows,
  }));

  const horizon = Math.max(0, ...schedules.map((item) => item.rows.length));
  /** דגימה חודשית לתיקים קצרים, ורבעונית לארוכים — כדי שהגרף יישאר קריא */
  const step = horizon > 72 ? 3 : 1;
  const data: Record<string, number>[] = [];

  for (let month = 1; month <= horizon; month += step) {
    const point: Record<string, number> = { month };
    for (const { loan, rows } of schedules) {
      const row = rows[month - 1];
      point[loan.name] = row ? Math.round(row.balEnd) : 0;
    }
    data.push(point);
  }

  return data;
}

/* ------------------------------------------------------------------ */
/* רכיבי תצוגה                                                         */
/* ------------------------------------------------------------------ */

export interface ScenarioStats {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  principal: number;
  months: number;
}

export function ScenarioRow({
  title,
  subtitle,
  stats,
  baseline,
  tone,
}: {
  title: string;
  subtitle?: string;
  stats: ScenarioStats;
  baseline?: ScenarioStats;
  tone: 'current' | 'scenario' | 'best';
}) {
  const tones = {
    current: 'border-slate-200 bg-white',
    scenario: 'border-emerald-300 bg-emerald-50',
    best: 'border-violet-300 bg-violet-50',
  } as const;
  const titleTones = {
    current: 'text-slate-900',
    scenario: 'text-emerald-900',
    best: 'text-violet-900',
  } as const;

  return (
    <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(150px,1.2fr)_repeat(5,1fr)] lg:items-center">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <p className={`text-sm font-bold leading-tight ${titleTones[tone]}`}>{title}</p>
          {subtitle && <p className="text-2xs text-slate-500">{subtitle}</p>}
        </div>
        <DeltaCell label="החזר חודשי" value={stats.monthlyPayment} baseline={baseline?.monthlyPayment} emphasized />
        <DeltaCell label="סך ריבית" value={stats.totalInterest} baseline={baseline?.totalInterest} />
        <DeltaCell label="סך תשלום" value={stats.totalPaid} baseline={baseline?.totalPaid} />
        <DeltaCell label="קרן" value={stats.principal} baseline={baseline?.principal} />
        <DeltaCell
          label="סיום"
          value={stats.months}
          baseline={baseline?.months}
          format="months"
        />
      </div>
    </div>
  );
}

function DeltaCell({
  label,
  value,
  baseline,
  format = 'currency',
  emphasized = false,
}: {
  label: string;
  value: number;
  baseline?: number;
  format?: 'currency' | 'months';
  emphasized?: boolean;
}) {
  const delta = typeof baseline === 'number' ? value - baseline : undefined;
  const threshold = format === 'months' ? 0.5 : 1;
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > threshold;
  const improved = (delta ?? 0) < 0;
  const deltaText = !hasDelta
    ? null
    : format === 'months'
      ? `${improved ? '−' : '+'}${Math.abs(Math.round(delta as number))} ח׳`
      : `${improved ? '−' : '+'}${formatILS(Math.abs(delta as number))}`;

  return (
    <div className="min-w-0">
      <p className="text-2xs text-slate-500">{label}</p>
      <p
        className={`truncate font-bold leading-tight ${
          emphasized ? 'text-info text-blue-700' : 'text-sm text-slate-900'
        }`}
      >
        {format === 'months' ? `${Math.round(value)} ח׳` : formatILS(value)}
      </p>
      {deltaText && (
        <p className={`text-2xs font-bold ${improved ? 'text-emerald-600' : 'text-rose-600'}`}>
          {deltaText}
        </p>
      )}
    </div>
  );
}

export function SliderField({
  icon: Icon,
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
  minLabel,
  maxLabel,
}: {
  icon: React.ElementType;
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-2xs font-bold text-slate-600">{label}</span>
        <span className="mr-auto text-xs font-black text-slate-900">{display}</span>
      </div>
      <div dir="ltr">
        <Slider
          dir="ltr"
          value={[Math.min(Math.max(value, min), max)]}
          onValueChange={([next]) => onChange(next)}
          min={min}
          max={max}
          step={step}
        />
        <div className="mt-0.5 flex justify-between text-2xs text-slate-400" dir="ltr">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
        <p className="text-xs font-bold text-slate-800">{title}</p>
        <p className="text-2xs text-slate-500">{hint}</p>
      </div>
      <div className="h-52 w-full" dir="ltr">
        {children}
      </div>
    </div>
  );
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
}

function MoneyTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number | string;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div dir="rtl" className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-2xs font-black text-slate-900">
        {suffix ? `${suffix} ${label}` : label}
      </p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-1.5 text-2xs">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600">
            {entry.name}: <strong className="text-slate-900">{formatILS(entry.value ?? 0)}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
