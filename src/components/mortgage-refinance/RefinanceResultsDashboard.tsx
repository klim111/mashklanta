'use client';

import React from 'react';
import { Banknote, ChevronDown, Coins, Info, Layers, Percent, Timer, TriangleAlert, Wallet } from 'lucide-react';
import type { MortgageCalculation, MortgageTrack, TrackCalculation } from '@/components/mortgage-advisor/types';
import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { formatCurrency, formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import { trackColor } from '@/components/mortgage-advisor/workspace/primitives';
import {
  AnalysisCharts,
  ANALYSIS_COLORS,
  mergeSeries,
  mixYearlySeries,
  trackYearlySeries,
} from '@/components/mortgage-advisor/analysisCharts';

/**
 * דאשבורד התוצאות.
 *
 * בראשו שורת הבלוקים של המצב הנוכחי, ומתחתיה — רק אחרי שינוי בפאנל — שורה
 * זהה למצב שלאחר המיחזור, עם החיסכון או התוספת בכל סעיף. מתחתיהן שורות
 * התמהיל: הפרטים המלאים והחלוקה הוויזואלית למסלולים, שלחיצה על כל אחד מהם
 * פותחת את ההשוואה והגרפים של אותו מסלול.
 */

/* ------------------------------------------------------------------ */
/* שורת הבלוקים: מצב נוכחי ומצב לאחר המיחזור                           */
/* ------------------------------------------------------------------ */

export interface StateSnapshot {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  principal: number;
  months: number;
}

export function snapshotOf(calc: MortgageCalculation): StateSnapshot {
  return {
    monthlyPayment: calc.summary.totalMonthlyPayment,
    totalInterest: calc.summary.totalInterest,
    totalPaid: calc.summary.totalPaid,
    principal: calc.trackCalculations.reduce((sum, tc) => sum + tc.track.amount, 0),
    months: calc.trackCalculations.reduce((max, tc) => Math.max(max, tc.amortSchedule.length), 0),
  };
}

export function StateBlocksRow({
  title,
  caption,
  snapshot,
  baseline,
  tone,
}: {
  title: string;
  caption?: string;
  snapshot: StateSnapshot;
  /** המצב הנוכחי להשוואה — מוצג כחיסכון או כתוספת בכל סעיף */
  baseline?: StateSnapshot;
  tone: 'current' | 'refinanced';
}) {
  const current = tone === 'current';
  return (
    <div
      className={`rounded-2xl border p-2.5 ${
        current ? 'border-slate-200 bg-slate-50/70' : 'border-emerald-300 bg-emerald-50/70'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <p className={`text-[13px] font-bold ${current ? 'text-slate-900' : 'text-emerald-900'}`}>
          {title}
        </p>
        {caption && <p className="text-[11px] text-slate-500">{caption}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <StateBlock
          icon={Wallet}
          label="החזר חודשי"
          value={formatCurrency(snapshot.monthlyPayment)}
          delta={baseline ? snapshot.monthlyPayment - baseline.monthlyPayment : undefined}
          gradient={
            current
              ? 'bg-gradient-to-br from-slate-900 to-indigo-900'
              : 'bg-gradient-to-br from-emerald-900 to-teal-800'
          }
        />
        <StateBlock
          icon={Banknote}
          label="סך ריבית"
          value={formatCurrency(snapshot.totalInterest)}
          delta={baseline ? snapshot.totalInterest - baseline.totalInterest : undefined}
          gradient={
            current
              ? 'bg-gradient-to-br from-slate-900 to-blue-900'
              : 'bg-gradient-to-br from-emerald-900 to-emerald-700'
          }
        />
        <StateBlock
          icon={Coins}
          label="סך תשלום"
          value={formatCurrency(snapshot.totalPaid)}
          delta={baseline ? snapshot.totalPaid - baseline.totalPaid : undefined}
          gradient={
            current
              ? 'bg-gradient-to-br from-slate-900 to-slate-700'
              : 'bg-gradient-to-br from-emerald-900 to-slate-700'
          }
        />
        <StateBlock
          icon={Timer}
          label="תקופה"
          value={formatDuration(snapshot.months)}
          delta={baseline ? snapshot.months - baseline.months : undefined}
          deltaFormat="months"
          gradient={
            current
              ? 'bg-gradient-to-br from-slate-800 to-slate-600'
              : 'bg-gradient-to-br from-emerald-800 to-teal-700'
          }
        />
        <StateBlock
          icon={Layers}
          label="קרן במסלולים"
          value={formatCurrency(snapshot.principal)}
          delta={baseline ? snapshot.principal - baseline.principal : undefined}
          gradient={
            current
              ? 'bg-gradient-to-br from-slate-800 to-indigo-800'
              : 'bg-gradient-to-br from-emerald-800 to-emerald-600'
          }
        />
      </div>
    </div>
  );
}

function StateBlock({
  icon: Icon,
  label,
  value,
  gradient,
  delta,
  deltaFormat = 'currency',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  gradient: string;
  delta?: number;
  deltaFormat?: 'currency' | 'months';
}) {
  const threshold = deltaFormat === 'months' ? 0.5 : 1;
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > threshold;
  const improved = (delta ?? 0) < 0;
  const amount =
    deltaFormat === 'months'
      ? `${Math.abs(Math.round(delta ?? 0))} חודשים`
      : formatCurrency(Math.abs(delta ?? 0));

  return (
    <div className={`rounded-xl ${gradient} px-3 py-2 text-center text-white shadow-md`}>
      <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-300">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {hasDelta ? (
        <p className={`text-[11px] font-bold ${improved ? 'text-emerald-300' : 'text-red-300'}`}>
          {improved ? 'חסכתם' : 'תוספת של'} {amount}
        </p>
      ) : (
        <p className="text-[10px] text-slate-400">&nbsp;</p>
      )}
    </div>
  );
}

/** המסלולים לא מסתכמים לגובה המשכנתא — התוצאה חלקית עד שהיתרה תשובץ */
export function UnallocatedWarning({
  unallocated,
  totalAmount,
}: {
  unallocated: number;
  totalAmount: number;
}) {
  return (
    <p className="flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      המסלולים מסתכמים ב-{formatCurrency(totalAmount - unallocated)} מתוך{' '}
      {formatCurrency(totalAmount)}. התוצאה שלמטה חלקית — שבצו את{' '}
      {formatCurrency(unallocated)} שנותרו במסלול קיים או במסלול חדש כדי לראות את המיחזור המלא.
    </p>
  );
}

/** אין שינוי — שורה אחת שמסבירה איך רואים את המצב שלאחר המיחזור */
export function NoChangeNotice({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-600">
      <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {text}
    </p>
  );
}

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

/**
 * פס ההרכב של התמהיל. מתחת לקטע של כל מסלול מופיע הכיתוב שלו — סוג הריבית,
 * הסכום, הריבית והתקופה — ולחיצה על הקטע או על הכיתוב פותחת את ההשוואה
 * והגרפים של אותו מסלול.
 */
function TrackCompositionStrip({
  tracks,
  trackMonths,
  onTrackClick,
  activeTrackId,
}: {
  tracks: MortgageTrack[];
  trackMonths?: Record<string, number>;
  onTrackClick?: (trackId: string) => void;
  activeTrackId?: string | null;
}) {
  const total = tracks.reduce((sum, track) => sum + track.amount, 0) || 1;

  return (
    <div className="flex w-full flex-wrap gap-1.5">
      {tracks.map((track) => {
        const share = (track.amount / total) * 100;
        const months = trackMonths?.[track.id] ?? Math.round(track.years * 12);
        const active = activeTrackId === track.id;
        const clickable = !!onTrackClick;

        return (
          <button
            key={track.id}
            type="button"
            disabled={!clickable}
            onClick={() => onTrackClick?.(track.id)}
            style={{ width: `calc(${Math.max(share, 0)}% - 0.375rem)`, minWidth: '150px' }}
            title={clickable ? 'לחצו לפירוט המסלול והגרפים' : undefined}
            className={`group grow rounded-lg border p-1.5 text-right transition-all ${
              active
                ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100'
                : clickable
                  ? 'border-transparent hover:border-slate-300 hover:bg-slate-50'
                  : 'border-transparent'
            }`}
          >
            <span
              className="block h-2.5 w-full rounded-full"
              style={{ backgroundColor: trackColor(track.type) }}
            />
            <span className="mt-1 block text-[13px] font-bold leading-tight text-slate-900">
              {TRACK_TYPES[track.type]}
            </span>
            <span className="block text-[12px] leading-tight text-slate-600">
              {formatCurrency(track.amount)} · {formatPercentage(track.interestRate)} ·{' '}
              {formatDuration(months)}
            </span>
            {clickable && (
              <span
                className={`mt-0.5 flex items-center gap-0.5 text-[10px] font-bold ${
                  active ? 'text-violet-700' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${active ? 'rotate-180' : ''}`} />
                {active ? 'סגירת פירוט המסלול' : 'לפירוט ולגרפים של המסלול'}
              </span>
            )}
          </button>
        );
      })}
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
