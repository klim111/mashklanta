'use client';

import React from 'react';
import { Banknote, Coins, Percent, Timer, Wallet } from 'lucide-react';
import type { MortgageCalculation, MortgageTrack, TrackCalculation } from '@/components/mortgage-advisor/types';
import { formatCurrency, formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import {
  NoChangeNotice,
  StateBlocksRow,
  TrackCompositionStrip,
  UnallocatedWarning,
  snapshotFromCalculation,
} from '@/components/mortgage-advisor/analysisDashboard';
import type { StateSnapshot } from '@/components/mortgage-advisor/analysisDashboard';
import {
  AnalysisCharts,
  ANALYSIS_COLORS,
  mergeSeries,
  mixYearlySeries,
  trackYearlySeries,
} from '@/components/mortgage-advisor/analysisCharts';

export {
  NoChangeNotice,
  StateBlocksRow,
  UnallocatedWarning,
  snapshotFromCalculation as snapshotOf,
};
export type { StateSnapshot };

/**
 * דאשבורד התוצאות.
 *
 * בראשו שורת הבלוקים של המצב הנוכחי, ומתחתיה — רק אחרי שינוי בפאנל — שורה
 * זהה למצב שלאחר המיחזור, עם החיסכון או התוספת בכל סעיף. מתחתיהן שורות
 * התמהיל: הפרטים המלאים והחלוקה הוויזואלית למסלולים, שלחיצה על כל אחד מהם
 * פותחת את ההשוואה והגרפים של אותו מסלול.
 */

/* ------------------------------------------------------------------ */
/* שורת התמהיל: הפרטים המלאים והחלוקה הוויזואלית למסלולים              */
/* ------------------------------------------------------------------ */

export interface MixRowStats {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  averageRate: number;
  months: number;
}

export function mixStatsOf(calc: MortgageCalculation): MixRowStats {
  return {
    monthlyPayment: calc.summary.totalMonthlyPayment,
    totalInterest: calc.summary.totalInterest,
    totalPaid: calc.summary.totalPaid,
    averageRate: calc.summary.averageRate,
    months: calc.trackCalculations.reduce((max, tc) => Math.max(max, tc.amortSchedule.length), 0),
  };
}

export function trackStatsOf(tc: TrackCalculation): MixRowStats {
  return {
    monthlyPayment: tc.monthlyPayment,
    totalInterest: tc.totalInterest,
    totalPaid: tc.totalPaid,
    averageRate: tc.track.interestRate,
    months: tc.amortSchedule.length,
  };
}

export function MixResultRow({
  title,
  subtitle,
  stats,
  baseline,
  tone,
  tracks,
  trackMonths,
  onTrackClick,
  activeTrackId,
  footer,
}: {
  title: string;
  subtitle?: string;
  stats: MixRowStats;
  baseline?: MixRowStats;
  tone: 'current' | 'refinanced' | 'track';
  /** המסלולים שמרכיבים את התמהיל — מוצגים כפס הרכב עם כיתוב מתחת לכל מסלול */
  tracks?: MortgageTrack[];
  /** התקופה בפועל לכל מסלול, לפי מזהה */
  trackMonths?: Record<string, number>;
  onTrackClick?: (trackId: string) => void;
  activeTrackId?: string | null;
  footer?: React.ReactNode;
}) {
  const tones = {
    current: 'border-slate-200 bg-white',
    refinanced: 'border-emerald-300 bg-emerald-50/50',
    track: 'border-violet-300 bg-violet-50/50',
  } as const;

  const titleTones = {
    current: 'text-slate-900',
    refinanced: 'text-emerald-900',
    track: 'text-violet-900',
  } as const;

  return (
    <div className={`space-y-2 rounded-xl border p-2.5 ${tones[tone]}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(150px,1.2fr)_repeat(5,1fr)] lg:items-center">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <p className={`text-[13px] font-bold leading-tight ${titleTones[tone]}`}>{title}</p>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>

        <Cell
          icon={Wallet}
          label="החזר חודשי"
          value={formatCurrency(stats.monthlyPayment)}
          delta={baseline ? stats.monthlyPayment - baseline.monthlyPayment : undefined}
          emphasized
        />
        <Cell
          icon={Banknote}
          label="סך ריבית"
          value={formatCurrency(stats.totalInterest)}
          delta={baseline ? stats.totalInterest - baseline.totalInterest : undefined}
        />
        <Cell
          icon={Coins}
          label="סך תשלום"
          value={formatCurrency(stats.totalPaid)}
          delta={baseline ? stats.totalPaid - baseline.totalPaid : undefined}
        />
        <Cell
          icon={Percent}
          label="ריבית ממוצעת"
          value={formatPercentage(stats.averageRate)}
          delta={baseline ? stats.averageRate - baseline.averageRate : undefined}
          deltaFormat="percent"
        />
        <Cell
          icon={Timer}
          label="תקופה"
          value={formatDuration(stats.months)}
          delta={baseline ? stats.months - baseline.months : undefined}
          deltaFormat="months"
        />
      </div>

      {tracks && tracks.length > 0 && (
        <TrackCompositionStrip
          tracks={tracks}
          trackMonths={trackMonths}
          onTrackClick={onTrackClick}
          activeTrackId={activeTrackId}
        />
      )}

      {footer}
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

/** כותרות העמודות של שורות התמהיל — במסכים רחבים בלבד */
export function MixRowsHeader() {
  return (
    <div className="hidden lg:grid lg:grid-cols-[minmax(150px,1.2fr)_repeat(5,1fr)] lg:gap-2 lg:px-2.5">
      <span />
      {['החזר חודשי', 'סך ריבית', 'סך תשלום', 'ריבית ממוצעת', 'תקופה'].map((label) => (
        <span key={label} className="text-[10px] font-bold text-slate-400">
          {label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* גרפים                                                               */
/* ------------------------------------------------------------------ */

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
