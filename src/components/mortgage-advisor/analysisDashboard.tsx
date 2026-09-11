'use client';

import React from 'react';
import { Banknote, ChevronDown, Coins, Info, Layers, Timer, TriangleAlert, Wallet } from 'lucide-react';
import type { MortgageCalculation, MortgageTrack } from './types';
import { TRACK_TYPES } from './types';
import { formatCurrency, formatPercentage } from './mortgageCalculations';
import { formatDuration } from './engine';
import type { MixResult } from './engine';
import { trackColor } from './workspace/primitives';

/**
 * ============================================================================
 *  אזור הניתוח המשותף — כלי המיחזור וכלי תכנון התמהילים
 * ============================================================================
 *
 *  שני הכלים מציגים את אותו סיפור: מה המצב היום, מה השתנה אחרי מה שהוזן
 *  בפאנל השליטה, ואיך התמהיל מתחלק בין המסלולים. הרכיבים כאן הם התצוגה
 *  האחידה לשניהם, כדי שהלוגיקה והעיצוב יישארו זהים בכל מקום.
 * ============================================================================
 */

/* ------------------------------------------------------------------ */
/* שורת הבלוקים: מצב נתון, ומה השתנה ביחס אליו                         */
/* ------------------------------------------------------------------ */

export interface StateSnapshot {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  principal: number;
  months: number;
}

/** מצב מתוך חישוב התמהיל הקלאסי (כלי המיחזור) */
export function snapshotFromCalculation(calc: MortgageCalculation): StateSnapshot {
  return {
    monthlyPayment: calc.summary.totalMonthlyPayment,
    totalInterest: calc.summary.totalInterest,
    totalPaid: calc.summary.totalPaid,
    principal: calc.trackCalculations.reduce((sum, tc) => sum + tc.track.amount, 0),
    months: calc.trackCalculations.reduce((max, tc) => Math.max(max, tc.amortSchedule.length), 0),
  };
}

/** מצב מתוך מנוע אזור העבודה (כלי תכנון התמהילים) */
export function snapshotFromMixResult(result: MixResult): StateSnapshot {
  return {
    monthlyPayment: result.summary.monthlyPayment,
    totalInterest: result.summary.totalInterest,
    totalPaid: result.summary.totalPaid,
    principal: result.mix.tracks.reduce((sum, track) => sum + track.amount, 0),
    months: result.summary.months,
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
  /** מצב הייחוס — ההפרש מולו מוצג בכל בלוק */
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

/** אין שינוי — שורה אחת שמסבירה איך רואים את המצב שאחרי */
export function NoChangeNotice({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-600">
      <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {text}
    </p>
  );
}

/** התרעה על סכום שלא שובץ לאף מסלול */
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
      {formatCurrency(unallocated)} שנותרו במסלול קיים או במסלול חדש כדי לראות את התמונה המלאה.
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* פס ההרכב: כל מסלול עם הכיתוב שלו מתחתיו, ולחיצה פותחת אותו          */
/* ------------------------------------------------------------------ */

/**
 * פס ההרכב של התמהיל. מתחת לקטע של כל מסלול מופיע הכיתוב שלו — סוג הריבית,
 * הסכום, הריבית והתקופה — ולחיצה על הקטע או על הכיתוב מעבירה את אזור הגרפים
 * להצגת אותו מסלול.
 */
export function TrackCompositionStrip({
  tracks,
  trackMonths,
  onTrackClick,
  activeTrackId,
  actionLabel = 'לפירוט ולגרפים של המסלול',
  activeActionLabel = 'סגירת פירוט המסלול',
}: {
  tracks: MortgageTrack[];
  trackMonths?: Record<string, number>;
  onTrackClick?: (trackId: string) => void;
  activeTrackId?: string | null;
  actionLabel?: string;
  activeActionLabel?: string;
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
            title={clickable ? actionLabel : undefined}
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
                {active ? activeActionLabel : actionLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
