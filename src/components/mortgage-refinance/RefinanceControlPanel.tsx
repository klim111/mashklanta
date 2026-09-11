'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  Layers,
  Lock,
  Percent,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import type { MortgageTrack } from '@/components/mortgage-advisor/types';
import { AMORTIZATION_TYPES, TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { formatCurrency, formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import {
  clampRefiTermMonths,
  rateBoundsForRefinance,
  termBoundsForGoal,
  trackRemainingMonths,
} from '@/lib/refinance';
import type { MarketRates, RefinanceGoal } from '@/lib/refinance';
import { guidanceFor, trackGuidance } from '@/lib/refinance-guidance';
import type { GuidedParam, ParamGuidance, TrackDraft } from '@/lib/refinance-guidance';
import { RISK_META, trackRiskProfile } from '@/components/mortgage-refinance/riskAnalysis';
import { trackColor } from '@/components/mortgage-advisor/workspace/primitives';

/**
 * פאנל השליטה של המיחזור — כל הפרמטרים של כל מסלול במסך אחד.
 *
 * לכל מסלול: סוג המסלול, לוח הסילוקין, גובה הריבית והתקופה. כל שינוי מתעדכן
 * מיד בדאשבורד שמתחת, בלי שמירה ובלי מעבר מסך. הפרמטרים שמשרתים את המטרה
 * שנבחרה מסומנים עם כיוון השינוי המומלץ.
 */

export type RefinanceScope = 'whole' | 'single';

interface RefinanceControlPanelProps {
  tracks: MortgageTrack[];
  drafts: Record<string, TrackDraft>;
  onDraftChange: (trackId: string, patch: Partial<TrackDraft>) => void;
  goal: RefinanceGoal;
  market?: MarketRates | null;
  scope: RefinanceScope;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
}

export function RefinanceControlPanel({
  tracks,
  drafts,
  onDraftChange,
  goal,
  market,
  scope,
  selectedTrackId,
  onSelectTrack,
}: RefinanceControlPanelProps) {
  const singleMode = scope === 'single';
  const awaitingSelection = singleMode && !selectedTrackId;
  const visibleTracks = singleMode
    ? tracks.filter((track) => track.id === selectedTrackId)
    : tracks;

  /**
   * מספר העמודות נגזר ממספר המסלולים, כדי שהכרטיסים ימלאו את הרוחב ולא יישארו
   * עמודות ריקות. במיחזור מסלול בודד הכרטיס חולק את השורה עם כרטיס ההסבר.
   */
  const columns = singleMode
    ? 'sm:grid-cols-2'
    : tracks.length <= 1
      ? 'grid-cols-1'
      : tracks.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="space-y-2.5">
      {/* בחירת המסלול למיחזור — מופיעה מעל הפאנל במצב מסלול בודד */}
      {singleMode && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-2.5">
          <p className="mb-1.5 text-[11px] font-bold text-violet-900">
            איזה מסלול תרצו למחזר?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tracks.map((track) => {
              const active = track.id === selectedTrackId;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onSelectTrack(track.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                    active
                      ? 'border-violet-500 bg-white text-violet-900 shadow-sm ring-2 ring-violet-200'
                      : 'border-violet-200 bg-white/70 text-slate-600 hover:border-violet-400'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: trackColor(track.type) }}
                  />
                  {TRACK_TYPES[track.type]}
                  <span className="text-slate-400">{formatCurrency(track.amount)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative">
        <div
          className={`grid gap-2.5 ${columns} ${
            awaitingSelection ? 'pointer-events-none select-none blur-[3px] opacity-70' : ''
          }`}
        >
          {(awaitingSelection ? tracks : visibleTracks).map((track) => (
            <TrackControlCard
              key={track.id}
              track={track}
              draft={drafts[track.id]}
              onChange={(patch) => onDraftChange(track.id, patch)}
              goal={goal}
              market={market}
            />
          ))}

          {/* במיחזור מסלול בודד נשאר מקום לצד הכרטיס — ממלאים אותו במה שחשוב לדעת */}
          {singleMode && !awaitingSelection && visibleTracks[0] && (
            <TrackBriefCard track={visibleTracks[0]} market={market} />
          )}
        </div>

        {awaitingSelection && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-xl border border-violet-300 bg-white/95 px-4 py-2.5 shadow-lg">
              <Lock className="h-4 w-4 text-violet-600" />
              <p className="text-sm font-bold text-violet-900">
                בחרו למעלה את המסלול שתרצו למחזר
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** מה חשוב לדעת על המסלול שנבחר — סיכון, והשוואה לריבית הממוצעת בשוק */
function TrackBriefCard({
  track,
  market,
}: {
  track: MortgageTrack;
  market?: MarketRates | null;
}) {
  const risk = trackRiskProfile(track);
  const marketRate = market?.rates?.[track.type];
  const gap = typeof marketRate === 'number' ? track.interestRate - marketRate : null;
  const months = clampRefiTermMonths(trackRemainingMonths(track));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <p className="mb-1.5 text-[12px] font-bold text-slate-900">
        מה שכדאי לדעת על המסלול הזה
      </p>
      <p className={`mb-1.5 text-[10px] font-bold ${RISK_META[risk.level].text}`}>
        {RISK_META[risk.level].label}
      </p>
      <p className="text-[11px] leading-relaxed text-slate-600">{risk.description}</p>
      {risk.stationNote && (
        <p className="mt-1 text-[10px] text-slate-500">{risk.stationNote}</p>
      )}
      <ul className="mt-2 space-y-0.5 text-[10px] text-slate-600">
        <li>
          יתרה למיחזור: <span className="font-bold">{formatCurrency(track.amount)}</span> · נותרו{' '}
          <span className="font-bold">{formatDuration(months)}</span>
        </li>
        {gap !== null && (
          <li className={gap > 0.05 ? 'font-bold text-orange-700' : 'text-emerald-700'}>
            {gap > 0.05
              ? `הריבית גבוהה ב-${gap.toFixed(2)} נק׳ אחוז מהממוצע במשק — יש מה לשפר`
              : 'הריבית כאן כבר בסביבת הממוצע במשק'}
          </li>
        )}
      </ul>
    </div>
  );
}

/** כרטיס שליטה קומפקטי למסלול אחד */
function TrackControlCard({
  track,
  draft,
  onChange,
  goal,
  market,
}: {
  track: MortgageTrack;
  draft?: TrackDraft;
  onChange: (patch: Partial<TrackDraft>) => void;
  goal: RefinanceGoal;
  market?: MarketRates | null;
}) {
  const baseMonths = clampRefiTermMonths(trackRemainingMonths(track));
  const current: TrackDraft = draft ?? {
    interestRate: track.interestRate,
    months: baseMonths,
    type: track.type,
    amortizationType: track.amortizationType ?? 'spitzer',
  };

  const marketRate = market?.rates?.[current.type];
  const rateRange = rateBoundsForRefinance(track.interestRate, marketRate);
  const termRange = termBoundsForGoal(goal, baseMonths);
  const guidance = trackGuidance({ goal, track, draft: current, market });
  const risk = trackRiskProfile(track);
  const touched =
    Math.abs(current.interestRate - track.interestRate) > 0.001 ||
    Math.round(current.months) !== baseMonths ||
    current.type !== track.type ||
    current.amortizationType !== (track.amortizationType ?? 'spitzer');

  const sliderMonths = Math.min(termRange.max, Math.max(termRange.min, Math.round(current.months)));
  const sliderRate = Math.min(rateRange.max, Math.max(rateRange.min, current.interestRate));

  return (
    <div
      className={`rounded-xl border bg-white p-2.5 shadow-sm transition-colors ${
        touched ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200'
      }`}
    >
      {/* כותרת המסלול */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-7 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: trackColor(current.type) }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-900">
            {TRACK_TYPES[current.type]}
          </p>
          <p className="text-[10px] text-slate-500">
            {formatCurrency(track.amount)} · {track.percentage.toFixed(0)}% מהמשכנתא
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold ${RISK_META[risk.level].text}`}>
          {RISK_META[risk.level].label}
        </span>
      </div>

      {/* סוג מסלול + לוח סילוקין */}
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Field
          icon={Layers}
          label="סוג מסלול"
          guidance={guidanceFor(guidance, 'type')}
        >
          <Select
            value={current.type}
            onValueChange={(value) => onChange({ type: value as MortgageTrack['type'] })}
          >
            <SelectTrigger dir="rtl" className="h-8 text-[11px] [&>span:first-of-type]:text-right">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl" className="text-right">
              {Object.entries(TRACK_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key} className="pr-7 text-right text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          icon={Layers}
          label="לוח סילוקין"
          guidance={guidanceFor(guidance, 'amortization')}
        >
          <Select
            value={current.amortizationType}
            onValueChange={(value) =>
              onChange({ amortizationType: value as TrackDraft['amortizationType'] })
            }
          >
            <SelectTrigger dir="rtl" className="h-8 text-[11px] [&>span:first-of-type]:text-right">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl" className="text-right">
              {Object.entries(AMORTIZATION_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key} className="pr-7 text-right text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* גובה ריבית */}
      <Field icon={Percent} label="ריבית שנתית" guidance={guidanceFor(guidance, 'rate')}>
        <div className="flex items-center gap-2">
          <Slider
            dir="ltr"
            className="flex-1"
            value={[sliderRate]}
            onValueChange={([value]) => onChange({ interestRate: Number(value.toFixed(2)) })}
            min={rateRange.min}
            max={rateRange.max}
            step={0.05}
          />
          <span
            className={`w-14 shrink-0 rounded-md border px-1 py-0.5 text-center text-[12px] font-bold ${
              current.interestRate < track.interestRate - 0.001
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : current.interestRate > track.interestRate + 0.001
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            {current.interestRate.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>היום {formatPercentage(track.interestRate)}</span>
          {typeof marketRate === 'number' && (
            <button
              type="button"
              onClick={() => onChange({ interestRate: Number(marketRate.toFixed(2)) })}
              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
            >
              <Sparkles className="h-3 w-3" />
              ממוצע השוק {formatPercentage(marketRate)}
            </button>
          )}
        </div>
      </Field>

      {/* תקופה */}
      <Field icon={Calendar} label="תקופה שנותרה" guidance={guidanceFor(guidance, 'term')}>
        <div className="flex items-center gap-2">
          <Slider
            dir="ltr"
            className="flex-1"
            value={[sliderMonths]}
            onValueChange={([value]) => onChange({ months: value })}
            min={termRange.min}
            max={termRange.max}
            step={1}
          />
          <span
            className={`w-14 shrink-0 rounded-md border px-1 py-0.5 text-center text-[12px] font-bold ${
              Math.round(current.months) !== baseMonths
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            {Math.round(current.months)} ח׳
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>היום {formatDuration(baseMonths)}</span>
          <span>
            {formatDuration(Math.round(current.months))}
            {goal === 'reduce_interest' && termRange.max === baseMonths && ' · הארכה חסומה במטרה זו'}
          </span>
        </div>
      </Field>
    </div>
  );
}

/** שדה בפאנל, עם סימון ההכוונה של המטרה */
function Field({
  icon: Icon,
  label,
  guidance,
  children,
}: {
  icon: React.ElementType;
  label: string;
  guidance?: ParamGuidance;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
          <Icon className="h-3 w-3 text-slate-400" />
          {label}
        </span>
        {guidance && <GuidanceChip guidance={guidance} />}
      </div>
      {children}
    </div>
  );
}

/** תג ההכוונה: לאיזה כיוון לשנות, והאם השינוי שכבר בוצע עוזר */
function GuidanceChip({ guidance }: { guidance: ParamGuidance }) {
  const { direction, weight, satisfied, conflicting, label, hint } = guidance;

  const tone = conflicting
    ? 'border-red-300 bg-red-50 text-red-700'
    : satisfied
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : weight === 'primary'
        ? 'border-blue-300 bg-blue-50 text-blue-700'
        : 'border-slate-200 bg-slate-50 text-slate-500';

  const Icon = conflicting
    ? TriangleAlert
    : satisfied
      ? Check
      : direction === 'up'
        ? ArrowUp
        : direction === 'down'
          ? ArrowDown
          : Sparkles;

  const text = conflicting
    ? 'פועל נגד המטרה'
    : satisfied
      ? 'משרת את המטרה'
      : direction === 'up'
        ? 'להעלות'
        : direction === 'down'
          ? 'להוריד'
          : 'לשקול';

  return (
    <span
      title={`${label} — ${hint}`}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${tone}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {text}
    </span>
  );
}

/** שורת ההכוונה הכללית למטרה שנבחרה — מוצגת מעל הפאנל */
export function GoalGuidanceStrip({ goal }: { goal: RefinanceGoal }) {
  const items =
    goal === 'reduce_payment'
      ? [
          { icon: ArrowDown, text: 'ריבית — להוריד', tone: 'text-emerald-700' },
          { icon: ArrowUp, text: 'תקופה — להאריך', tone: 'text-blue-700' },
          { icon: Sparkles, text: 'לוח סילוקין — לשקול דחיית קרן', tone: 'text-slate-600' },
        ]
      : [
          { icon: ArrowDown, text: 'ריבית — להוריד', tone: 'text-emerald-700' },
          { icon: ArrowDown, text: 'תקופה — לקצר', tone: 'text-violet-700' },
          { icon: Sparkles, text: 'לוח סילוקין — לשקול קרן שווה', tone: 'text-slate-600' },
        ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[11px] font-bold text-slate-500">כדי להשיג את המטרה:</span>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.text} className={`inline-flex items-center gap-1 text-[11px] font-semibold ${item.tone}`}>
            <Icon className="h-3 w-3" />
            {item.text}
          </span>
        );
      })}
    </div>
  );
}
