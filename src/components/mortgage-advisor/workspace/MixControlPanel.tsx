'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { AnchorSpreadRate } from '@/components/ui/anchor-spread-rate';
import { useMarketRates } from '@/hooks/use-market-rates';
import { trackRateBreakdown } from '../engine';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarClock,
  Coins,
  Layers,
  Lock,
  Percent,
  Plus,
  RefreshCcw,
  Table2,
  Trash2,
} from 'lucide-react';
import {
  AMORTIZATION_TYPES,
  MIN_FIXED_PERCENT,
  TRACK_TYPES,
  VARIABLE_PERIODS,
  isFixedTrackType,
} from '../types';
import type { MortgageTrack } from '../types';
import { formatPercentage } from '../mortgageCalculations';
import { allocatedAmount, autoTrackName, formatDuration, remainingAmount } from '../engine';
import type { MixResult, TrackResult, TrackType } from '../engine';
import { meetsFixedRequirement, minFixedAmount, missingFixedAmount } from '../propertyContext';
import {
  TRACK_TERM_MONTHS_MAX,
  TRACK_TERM_MONTHS_MIN,
  clampTrackTermMonths,
  formatShekel,
  trackColor,
} from './primitives';

/**
 * פאנל השליטה של התמהיל.
 *
 * כל המסלולים פרושים יחד, וכל הפרמטרים שלהם פתוחים לעריכה מיידית — בלי לפתוח
 * מסלול אחרי מסלול. הגרפים אינם כאן: לחיצה על כרטיס מסלול מעבירה את אזור
 * הגרפים להצגת אותו מסלול, בדיוק כמו בכלי המיחזור.
 */

interface MixControlPanelProps {
  result: MixResult;
  /** תמהיל נעול — מוצג לקריאה בלבד */
  locked?: boolean;
  onUpdateTrack: (id: string, patch: Partial<MortgageTrack>) => void;
  onTrackAmountChange: (id: string, amount: number) => void;
  onRemoveTrack: (id: string) => void;
  onAddTrack: (type: TrackType) => void;
  onPrepay: (trackId: string) => void;
  onRefinance: (trackId: string) => void;
  onAmortization: (trackId: string) => void;
  /** המסלול שמוצג כרגע באזור הגרפים */
  focusTrackId?: string | null;
  onFocusTrack?: (trackId: string | null) => void;
}

export function MixControlPanel({
  result,
  locked = false,
  onUpdateTrack,
  onTrackAmountChange,
  onRemoveTrack,
  onAddTrack,
  onPrepay,
  onRefinance,
  onAmortization,
  focusTrackId = null,
  onFocusTrack,
}: MixControlPanelProps) {
  const [newType, setNewType] = useState<TrackType>('fixed_unlinked');

  const { mix } = result;
  const fixedShareOk = meetsFixedRequirement(mix);
  const remaining = remainingAmount(mix);
  const allocated = allocatedAmount(mix);

  return (
    <div className="space-y-2.5 p-3">
      {locked && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900">
          <Lock className="h-4 w-4 shrink-0" />
          התמהיל ננעל כתמהיל הסופי למכרז מול הבנקים ואינו ניתן לשינוי.
        </div>
      )}

      {!fixedShareOk && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            דרישת בנק ישראל: לפחות {MIN_FIXED_PERCENT}% מהמשכנתא בריבית קבועה —{' '}
            {formatShekel(minFixedAmount(mix.totalAmount))}. הקבועה הצמודה והלא צמודה נספרות יחד.
            חסרים עוד <strong>{formatShekel(missingFixedAmount(mix))}</strong>.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <Layers className="h-3.5 w-3.5" />
          {mix.tracks.length} מסלולים · {formatShekel(allocated)} מתוך {formatShekel(mix.totalAmount)}
        </p>
        <p className="text-[10px] text-slate-500">
          לחיצה על כרטיס מסלול מציגה אותו באזור הגרפים
        </p>
      </div>

      <div className={`grid gap-2.5 sm:grid-cols-2 ${mix.tracks.length > 2 ? 'xl:grid-cols-3' : ''}`}>
        {result.tracks.map((trackResult) => (
          <TrackControlCard
            key={trackResult.track.id}
            result={trackResult}
            totalAmount={mix.totalAmount}
            maxAmount={trackResult.track.amount + remaining}
            removable={mix.tracks.length > 1 && !locked}
            locked={locked}
            missingFixed={missingFixedAmount(mix)}
            focused={focusTrackId === trackResult.track.id}
            onFocus={() =>
              onFocusTrack?.(focusTrackId === trackResult.track.id ? null : trackResult.track.id)
            }
            onUpdate={(patch) => onUpdateTrack(trackResult.track.id, patch)}
            onAmountChange={(amount) => onTrackAmountChange(trackResult.track.id, amount)}
            onRemove={() => onRemoveTrack(trackResult.track.id)}
            onPrepay={() => onPrepay(trackResult.track.id)}
            onRefinance={() => onRefinance(trackResult.track.id)}
            onAmortization={() => onAmortization(trackResult.track.id)}
          />
        ))}

        {/* הוספת מסלול מוצעת רק כשיש סכום שטרם שובץ */}
        {remaining > 0 && !locked && (
          <div className="flex min-h-[200px] flex-col justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3 text-center">
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow">
              <Plus className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-bold text-amber-900">הוספת מסלול</p>
            <p className="text-[11px] leading-snug text-amber-800">
              {formatShekel(remaining)} מסכום המשכנתא טרם שובצו במסלולים
            </p>
            <Select value={newType} onValueChange={(value) => setNewType(value as TrackType)}>
              <SelectTrigger dir="rtl" className="h-8 bg-white text-[11px]">
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
            <Button size="sm" className="h-8 text-[11px]" onClick={() => onAddTrack(newType)}>
              <Plus className="h-3.5 w-3.5 ml-1" />
              הוסף על {formatShekel(remaining)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** כרטיס שליטה למסלול אחד — כל הפרמטרים פתוחים */
function TrackControlCard({
  result,
  totalAmount,
  maxAmount,
  removable,
  locked,
  missingFixed,
  focused,
  onFocus,
  onUpdate,
  onAmountChange,
  onRemove,
  onPrepay,
  onRefinance,
  onAmortization,
}: {
  result: TrackResult;
  totalAmount: number;
  maxAmount: number;
  removable: boolean;
  locked: boolean;
  missingFixed: number;
  focused: boolean;
  onFocus: () => void;
  onUpdate: (patch: Partial<MortgageTrack>) => void;
  onAmountChange: (amount: number) => void;
  onRemove: () => void;
  onPrepay: () => void;
  onRefinance: () => void;
  onAmortization: () => void;
}) {
  const track = result.track;
  const [notice, setNotice] = useState<string | null>(null);
  const nameIsAuto = track.name === autoTrackName(track);
  const isFixed = isFixedTrackType(track.type);
  const isForeign = track.type === 'dollar' || track.type === 'euro';
  const effectiveRate = result.schedule[0]?.annualRate ?? track.interestRate;
  const rateShifted = Math.abs(effectiveRate - track.interestRate) > 0.001;
  const months = clampTrackTermMonths(Math.round(track.years * 12));

  /**
   * העוגן של המסלול לפי הנתונים שנמשכו מבנק ישראל. הוא נגזר מחדש בכל שינוי של
   * סוג המסלול, התקופה או תחנת השינוי, ולכן הוא תמיד מתאים למסלול שמוצג.
   */
  const { snapshot: marketRates, refresh: refreshMarketRates } = useMarketRates();
  const rateBreakdown = trackRateBreakdown(track, marketRates);

  /** שינוי סוג המסלול מרענן גם את השם האוטומטי, כדי שהכרטיס יישאר קריא */
  const patchWithName = (patch: Partial<MortgageTrack>) => {
    const merged = { ...track, ...patch };
    onUpdate(nameIsAuto ? { ...patch, name: autoTrackName(merged) } : patch);
  };

  /** הסכום במסלול נחתך לתקרה — מה שנותר מסכום המשכנתא אחרי המסלולים האחרים */
  const applyAmount = (amount: number) => {
    if (amount > maxAmount + 1) {
      setNotice(`הסכום הוגבל ל-${formatShekel(maxAmount)} — כל מה שנותר אחרי המסלולים האחרים.`);
      onAmountChange(maxAmount);
      return;
    }
    setNotice(null);
    onAmountChange(amount);
  };

  return (
    <div
      className={`rounded-xl border bg-white p-2.5 shadow-sm transition-colors ${
        focused ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'
      }`}
    >
      {/* כותרת — לחיצה עליה מציגה את המסלול באזור הגרפים */}
      <div className="mb-2 flex items-start gap-2">
        <button
          type="button"
          onClick={onFocus}
          className="flex min-w-0 flex-1 items-start gap-2 text-right"
          title="הצגת המסלול באזור הגרפים"
        >
          <span
            className="mt-0.5 h-7 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: trackColor(track.type) }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-slate-900">
              {TRACK_TYPES[track.type]}
            </span>
            <span className="block text-[10px] text-slate-500">
              {formatShekel(track.amount)} · {track.percentage.toFixed(1)}% ·{' '}
              {formatPercentage(effectiveRate)}
              {rateShifted && <span className="text-amber-600"> (בתרחיש)</span>}
            </span>
          </span>
          <span
            className={`flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-bold ${
              focused ? 'bg-violet-100 text-violet-700' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="h-3 w-3" />
            {focused ? 'בגרפים' : 'גרפים'}
          </span>
        </button>

        {removable && (
          <button
            type="button"
            onClick={onRemove}
            title="הסרת המסלול"
            className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <fieldset disabled={locked} className="space-y-2 disabled:opacity-70">
        {/* סוג מסלול + לוח סילוקין */}
        <div className="grid grid-cols-2 gap-2">
          <Field icon={Layers} label="סוג מסלול">
            <Select
              value={track.type}
              onValueChange={(value) => patchWithName({ type: value as MortgageTrack['type'] })}
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

          <Field icon={Layers} label="לוח סילוקין">
            <Select
              value={track.amortizationType || 'spitzer'}
              onValueChange={(value) =>
                patchWithName({ amortizationType: value as MortgageTrack['amortizationType'] })
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

          {track.type.includes('variable') && (
            <Field icon={CalendarClock} label="תחנת יציאה">
              <Select
                value={String(track.variablePeriod ?? 5)}
                onValueChange={(value) => patchWithName({ variablePeriod: Number(value) })}
              >
                <SelectTrigger dir="rtl" className="h-8 text-[11px] [&>span:first-of-type]:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl" className="text-right">
                  {Object.entries(VARIABLE_PERIODS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="pr-7 text-right text-xs">
                      כל {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {isForeign && (
            <Field icon={Coins} label={`שער ${track.type === 'dollar' ? 'דולר' : 'יורו'}`}>
              <NumericInput
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] shadow-sm"
                value={track.exchangeRate ?? null}
                onChange={(exchangeRate) => onUpdate({ exchangeRate: exchangeRate ?? 0 })}
              />
            </Field>
          )}
        </div>

        {/* ריבית — עוגן מבנק ישראל ועוד המרווח של הבנק */}
        <Field icon={Percent} label="ריבית שנתית">
          <AnchorSpreadRate
            anchor={rateBreakdown.anchor}
            spread={track.rateSpread ?? rateBreakdown.spread}
            rate={track.interestRate}
            onRefreshAnchor={refreshMarketRates}
            onChange={({ rate, spread }) =>
              patchWithName({ interestRate: rate, rateSpread: spread })
            }
          />
        </Field>

        {/* תקופה */}
        <Field icon={CalendarClock} label="תקופה">
          <div className="flex items-center gap-2">
            <Slider
              dir="ltr"
              className="flex-1"
              value={[months]}
              onValueChange={([value]) => patchWithName({ years: value / 12 })}
              min={TRACK_TERM_MONTHS_MIN}
              max={TRACK_TERM_MONTHS_MAX}
              step={1}
            />
            <span className="w-16 shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-center text-[12px] font-bold text-slate-700">
              {months} ח׳
            </span>
          </div>
          <p className="text-[10px] text-slate-400">{formatDuration(result.months)} בפועל</p>
        </Field>

        {/* סכום */}
        <Field icon={Coins} label="סכום במסלול">
          <div className="flex items-center gap-2">
            <Slider
              dir="ltr"
              className="flex-1"
              value={[Math.min(maxAmount, Math.max(0, Math.round(track.amount)))]}
              onValueChange={([value]) => applyAmount(value)}
              min={0}
              max={Math.max(maxAmount, 1)}
              step={5000}
            />
            <span className="w-[74px] shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-center text-[12px] font-bold text-slate-700">
              {formatShekel(track.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{track.percentage.toFixed(1)}% מהמשכנתא</span>
            <span>עד {formatShekel(maxAmount)}</span>
          </div>
          {isFixed && missingFixed > 0 && (
            <p className="text-[10px] text-amber-700">
              חסרים {formatShekel(missingFixed)} בריבית קבועה לדרישת בנק ישראל
            </p>
          )}
          {notice && (
            <p className="flex items-start gap-1 text-[10px] text-red-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {notice}
            </p>
          )}
        </Field>

        {/* שם המסלול */}
        <Field icon={Layers} label="שם המסלול">
          <Input
            className="h-8 text-[11px]"
            value={track.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={autoTrackName(track)}
          />
        </Field>
      </fieldset>

      {/* פעולות המסלול — זמינות כאן, בלי לפתוח אותו */}
      <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
        <ActionButton icon={Banknote} label="פרעון מוקדם" onClick={onPrepay} disabled={locked} />
        <ActionButton icon={Table2} label="לוח החזרים" onClick={onAmortization} />
        <ActionButton icon={RefreshCcw} label="מחזור" onClick={onRefinance} disabled={locked} />
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
        <Icon className="h-3 w-3 text-slate-400" />
        {label}
      </span>
      {children}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
