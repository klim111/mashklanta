'use client';

import React from 'react';
import { Banknote, Coins, Percent, Timer, Wallet } from 'lucide-react';
import type { MortgageCalculation, MortgageTrack, TrackCalculation } from '@/components/mortgage-advisor/types';
import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { CompositionBar, trackColor } from '@/components/mortgage-advisor/workspace/primitives';
import { formatCurrency, formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import { AnalysisCharts, ANALYSIS_COLORS, mergeSeries, mixYearlySeries, trackYearlySeries } from '@/components/mortgage-advisor/analysisCharts';

/**
 * דאשבורד התוצאות — שורה לכל מצב, ומתחתיהן הגרפים המשווים.
 *
 * כל שורה מציגה את אותם הסעיפים: החזר חודשי, סך ריבית, סך תשלום, ריבית
 * ממוצעת ותקופה. השורה הראשונה היא המצב הנוכחי, ומתחתיה המצב שלאחר המיחזור
 * לפי מה שהוזן בפאנל השליטה. במיחזור מסלול בודד נוספת שורה למסלול עצמו.
 */

export interface ResultRowData {
  id: string;
  title: string;
  subtitle?: string;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  averageRate: number;
  months: number;
  /** מצב הייחוס להשוואה; כשאין — זו שורת הבסיס */
  baseline?: {
    monthlyPayment: number;
    totalInterest: number;
    totalPaid: number;
    averageRate: number;
    months: number;
  };
  tone: 'current' | 'refinanced' | 'track';
  /** הרכב המסלולים — מוצג כפס ההרכב של כלי התמהילים מתחת לשורה */
  composition?: MortgageTrack[];
}

/** שורת תוצאה מתמהיל מחושב */
export function rowFromCalculation(
  calc: MortgageCalculation,
  meta: Pick<ResultRowData, 'id' | 'title' | 'subtitle' | 'tone' | 'composition'> & {
    baseline?: ResultRowData['baseline'];
  }
): ResultRowData {
  const months = calc.trackCalculations.reduce(
    (max, tc) => Math.max(max, tc.amortSchedule.length),
    0
  );
  return {
    ...meta,
    monthlyPayment: calc.summary.totalMonthlyPayment,
    totalInterest: calc.summary.totalInterest,
    totalPaid: calc.summary.totalPaid,
    averageRate: calc.summary.averageRate,
    months,
  };
}

/** שורת תוצאה ממסלול בודד */
export function rowFromTrack(
  tc: TrackCalculation,
  meta: Pick<ResultRowData, 'id' | 'title' | 'subtitle' | 'tone'> & { baseline?: ResultRowData['baseline'] }
): ResultRowData {
  return {
    ...meta,
    monthlyPayment: tc.monthlyPayment,
    totalInterest: tc.totalInterest,
    totalPaid: tc.totalPaid,
    averageRate: tc.track.interestRate,
    months: tc.amortSchedule.length,
  };
}

export function baselineOf(row: ResultRowData): NonNullable<ResultRowData['baseline']> {
  return {
    monthlyPayment: row.monthlyPayment,
    totalInterest: row.totalInterest,
    totalPaid: row.totalPaid,
    averageRate: row.averageRate,
    months: row.months,
  };
}

const TONES: Record<ResultRowData['tone'], { wrap: string; title: string }> = {
  current: { wrap: 'border-slate-200 bg-slate-50/70', title: 'text-slate-900' },
  refinanced: { wrap: 'border-emerald-300 bg-emerald-50/70', title: 'text-emerald-900' },
  track: { wrap: 'border-violet-300 bg-violet-50/60', title: 'text-violet-900' },
};

export function ResultsDashboard({
  rows,
  charts,
}: {
  rows: ResultRowData[];
  charts: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      {/* כותרות העמודות — במסכים רחבים בלבד; בצר כל תא נושא את התווית שלו */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(150px,1.2fr)_repeat(5,1fr)] lg:gap-2 lg:px-2">
        <span />
        {['החזר חודשי', 'סך ריבית', 'סך תשלום', 'ריבית ממוצעת', 'תקופה'].map((label) => (
          <span key={label} className="text-[10px] font-bold text-slate-400">
            {label}
          </span>
        ))}
      </div>

      {rows.map((row) => (
        <ResultRow key={row.id} row={row} />
      ))}

      {charts}
    </div>
  );
}

function ResultRow({ row }: { row: ResultRowData }) {
  const tone = TONES[row.tone];
  return (
    <div
      className={`grid grid-cols-2 gap-2 rounded-xl border p-2.5 sm:grid-cols-3 lg:grid-cols-[minmax(150px,1.2fr)_repeat(5,1fr)] lg:items-center ${tone.wrap}`}
    >
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <p className={`text-[13px] font-bold leading-tight ${tone.title}`}>{row.title}</p>
        {row.subtitle && <p className="text-[10px] text-slate-500">{row.subtitle}</p>}
      </div>

      <Cell
        icon={Wallet}
        label="החזר חודשי"
        value={formatCurrency(row.monthlyPayment)}
        delta={row.baseline ? row.monthlyPayment - row.baseline.monthlyPayment : undefined}
        emphasized
      />
      <Cell
        icon={Banknote}
        label="סך ריבית"
        value={formatCurrency(row.totalInterest)}
        delta={row.baseline ? row.totalInterest - row.baseline.totalInterest : undefined}
      />
      <Cell
        icon={Coins}
        label="סך תשלום"
        value={formatCurrency(row.totalPaid)}
        delta={row.baseline ? row.totalPaid - row.baseline.totalPaid : undefined}
      />
      <Cell
        icon={Percent}
        label="ריבית ממוצעת"
        value={formatPercentage(row.averageRate)}
        delta={row.baseline ? row.averageRate - row.baseline.averageRate : undefined}
        deltaFormat="percent"
      />
      <Cell
        icon={Timer}
        label="תקופה"
        value={formatDuration(row.months)}
        delta={row.baseline ? row.months - row.baseline.months : undefined}
        deltaFormat="months"
      />

      {/* הרכב המסלולים — אותה תצוגה שבכלי התמהילים */}
      {row.composition && row.composition.length > 0 && (
        <div className="col-span-2 sm:col-span-3 lg:col-span-6">
          <CompositionBar tracks={row.composition} height={6} />
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {row.composition.map((track) => (
              <span key={track.id} className="flex items-center gap-1 text-[9px] text-slate-500">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: trackColor(track.type) }}
                />
                {TRACK_TYPES[track.type]} {track.percentage.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({
  icon: Icon,
  label,
  value,
  delta,
  deltaFormat = 'currency',
  emphasized = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta?: number;
  deltaFormat?: 'currency' | 'percent' | 'months';
  emphasized?: boolean;
}) {
  const threshold = deltaFormat === 'currency' ? 1 : deltaFormat === 'months' ? 0.5 : 0.005;
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > threshold;
  const improved = (delta ?? 0) < 0;

  const deltaText = !hasDelta
    ? null
    : deltaFormat === 'currency'
      ? `${improved ? '−' : '+'}${formatCurrency(Math.abs(delta as number))}`
      : deltaFormat === 'percent'
        ? `${improved ? '−' : '+'}${Math.abs(delta as number).toFixed(2)} נק׳`
        : `${improved ? '−' : '+'}${Math.abs(Math.round(delta as number))} ח׳`;

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] text-slate-500 lg:hidden">
        <Icon className="h-3 w-3 text-slate-400" />
        {label}
      </p>
      <p
        className={`truncate font-bold leading-tight ${
          emphasized ? 'text-[15px] text-blue-700' : 'text-[13px] text-slate-900'
        }`}
      >
        {value}
      </p>
      {deltaText && (
        <p className={`text-[10px] font-bold ${improved ? 'text-emerald-600' : 'text-red-600'}`}>
          {deltaText}
        </p>
      )}
    </div>
  );
}

/** הגרפים המשווים — אותה ערכה שבשאר כלי הניתוח, בלי שינוי בלוגיקה */
export function ComparisonCharts({
  title,
  hint,
  baseCalc,
  refinedCalc,
  scenarioName = 'לאחר מיחזור',
}: {
  title: string;
  hint: string;
  baseCalc: MortgageCalculation;
  refinedCalc: MortgageCalculation;
  scenarioName?: string;
}) {
  const lineData = mergeSeries(mixYearlySeries(baseCalc), mixYearlySeries(refinedCalc));
  const changed =
    Math.abs(refinedCalc.summary.totalMonthlyPayment - baseCalc.summary.totalMonthlyPayment) > 1 ||
    Math.abs(refinedCalc.summary.totalInterest - baseCalc.summary.totalInterest) > 1;
  const worse = refinedCalc.summary.totalInterest > baseCalc.summary.totalInterest + 1;

  return (
    <ChartsBlock
      title={title}
      hint={hint}
      lineData={lineData}
      changed={changed}
      worse={worse}
      scenarioName={scenarioName}
      principal={refinedCalc.trackCalculations.reduce((sum, tc) => sum + tc.track.amount, 0)}
      interest={refinedCalc.summary.totalInterest}
    />
  );
}

/** אותם גרפים, למסלול בודד */
export function TrackComparisonCharts({
  title,
  hint,
  baseTrack,
  refinedTrack,
}: {
  title: string;
  hint: string;
  baseTrack: TrackCalculation;
  refinedTrack: TrackCalculation;
}) {
  const lineData = mergeSeries(trackYearlySeries(baseTrack), trackYearlySeries(refinedTrack));
  const changed =
    Math.abs(refinedTrack.monthlyPayment - baseTrack.monthlyPayment) > 1 ||
    Math.abs(refinedTrack.totalInterest - baseTrack.totalInterest) > 1;
  const worse = refinedTrack.totalInterest > baseTrack.totalInterest + 1;

  return (
    <ChartsBlock
      title={title}
      hint={hint}
      lineData={lineData}
      changed={changed}
      worse={worse}
      scenarioName="המסלול לאחר מיחזור"
      principal={refinedTrack.track.amount}
      interest={refinedTrack.totalInterest}
    />
  );
}

function ChartsBlock({
  title,
  hint,
  lineData,
  changed,
  worse,
  scenarioName,
  principal,
  interest,
}: {
  title: string;
  hint: string;
  lineData: ReturnType<typeof mergeSeries>;
  changed: boolean;
  worse: boolean;
  scenarioName: string;
  principal: number;
  interest: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="text-[12px] font-bold text-slate-800">{title}</p>
        <p className="text-[10px] text-slate-500">{hint}</p>
      </div>
      <AnalysisCharts
        lineData={lineData}
        changed={changed}
        scenarioColor={worse ? ANALYSIS_COLORS.worse : ANALYSIS_COLORS.better}
        scenarioName={scenarioName}
        principal={principal}
        interest={interest}
      />
    </div>
  );
}
