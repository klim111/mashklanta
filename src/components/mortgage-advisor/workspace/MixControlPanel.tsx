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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Layers,
  Lock,
  MoreHorizontal,
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
  /**
   * מחזור מוצג רק בתמהיל שנבחר כסופי. בשלב התכנון אין לו משמעות — משנים את
   * המסלול עצמו במקום לתכנן מחזור עתידי של תמהיל שעוד לא נבחר.
   */
  allowRefinance?: boolean;
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
  allowRefinance = false,
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
    <div className="space-y-2 p-2">
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
          לחיצה על שורת מסלול מציגה אותו באזור הגרפים
        </p>
      </div>

      <div className="space-y-1.5">
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
            allowRefinance={allowRefinance}
            onAmortization={() => onAmortization(trackResult.track.id)}
          />
        ))}

        {/* הוספת מסלול מוצעת רק כשיש סכום שטרם שובץ — גם היא שורה, לא בלוק */}
        {remaining > 0 && !locked && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Plus className="h-4 w-4" />
            </span>
            <p className="min-w-[150px] flex-1 text-[11px] leading-tight text-amber-900">
              <span className="font-bold">הוספת מסלול</span> · {formatShekel(remaining)} טרם שובצו
            </p>
            <Select value={newType} onValueChange={(value) => setNewType(value as TrackType)}>
              <SelectTrigger dir="rtl" className="h-7 w-[150px] bg-white text-[11px]">
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
            <Button size="sm" className="h-7 text-[11px]" onClick={() => onAddTrack(newType)}>
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
  allowRefinance,
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
  allowRefinance: boolean;
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
    /*
      מסלול אחד = שורה אחת.
      כל מה שהיה בכרטיס נשאר כאן ופתוח לעריכה, אבל פרוש לרוחב במקום לגובה: כך
      כמה מסלולים תופסים את הגובה שכרטיס בודד תפס קודם, ומה שנחסך נשאר לדאשבורד
      באותו מסך. מה שנדרש לעתים רחוקות — שם המסלול, שער המט"ח והפעולות על
      המסלול — יושב בתפריט שנפתח מקצה השורה.
    */
    <div
      className={`rounded-lg border bg-white transition-colors ${
        focused ? 'border-violet-400 ring-1 ring-violet-200' : 'border-slate-200'
      }`}
    >
      <fieldset disabled={locked} className="disabled:opacity-70">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5 p-1.5">
          {/* זהות המסלול — לחיצה מציגה אותו באזור הגרפים */}
          <button
            type="button"
            disabled={false}
            onClick={onFocus}
            title="הצגת המסלול באזור הגרפים"
            className="flex min-w-[150px] flex-1 items-center gap-1.5 rounded-md px-1 py-0.5 text-right transition-colors hover:bg-slate-50"
          >
            <span
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: trackColor(track.type) }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold leading-tight text-slate-900">
                {TRACK_TYPES[track.type]}
              </span>
              <span className="block truncate text-[10px] leading-tight text-slate-500">
                {formatShekel(track.amount)} · {track.percentage.toFixed(1)}% ·{' '}
                {formatPercentage(effectiveRate)}
                {rateShifted && <span className="text-amber-600"> (בתרחיש)</span>} ·{' '}
                {formatDuration(result.months)}
              </span>
            </span>
            <span
              className={`flex shrink-0 items-center rounded p-1 ${
                focused ? 'bg-violet-100 text-violet-700' : 'text-slate-300'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </span>
          </button>

          <RowField label="לוח סילוקין" className="w-[118px]">
            <Select
              value={track.amortizationType || 'spitzer'}
              onValueChange={(value) =>
                patchWithName({ amortizationType: value as MortgageTrack['amortizationType'] })
              }
            >
              <SelectTrigger dir="rtl" className="h-7 text-[11px] [&>span:first-of-type]:text-right">
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
          </RowField>

          <RowField label="סוג מסלול" className="w-[134px]">
            <Select
              value={track.type}
              onValueChange={(value) => patchWithName({ type: value as MortgageTrack['type'] })}
            >
              <SelectTrigger dir="rtl" className="h-7 text-[11px] [&>span:first-of-type]:text-right">
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
          </RowField>

          {track.type.includes('variable') && (
            <RowField label="תחנת יציאה" className="w-[92px]">
              <Select
                value={String(track.variablePeriod ?? 5)}
                onValueChange={(value) => patchWithName({ variablePeriod: Number(value) })}
              >
                <SelectTrigger dir="rtl" className="h-7 text-[11px] [&>span:first-of-type]:text-right">
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
            </RowField>
          )}

          {/* ריבית — עוגן מבנק ישראל ועוד המרווח של הבנק */}
          <RowField
            label={rateBreakdown.anchor ? 'עוגן + מרווח = ריבית' : 'ריבית שנתית'}
            className={rateBreakdown.anchor ? 'w-[212px]' : 'w-[80px]'}
          >
            <AnchorSpreadRate
              compact
              anchor={rateBreakdown.anchor}
              spread={track.rateSpread ?? rateBreakdown.spread}
              rate={track.interestRate}
              onRefreshAnchor={refreshMarketRates}
              onChange={({ rate, spread }) =>
                patchWithName({ interestRate: rate, rateSpread: spread })
              }
            />
          </RowField>

          <RowField label="תקופה" className="w-[124px]">
            <div className="flex items-center gap-1">
              <Slider
                dir="ltr"
                className="min-w-0 flex-1"
                value={[months]}
                onValueChange={([value]) => patchWithName({ years: value / 12 })}
                min={TRACK_TERM_MONTHS_MIN}
                max={TRACK_TERM_MONTHS_MAX}
                step={1}
              />
              <InlineNumberBox
                value={months}
                suffix="ח׳"
                width="w-[58px]"
                onChange={(value) =>
                  patchWithName({ years: clampTrackTermMonths(value ?? months) / 12 })
                }
              />
            </div>
          </RowField>

          <RowField label="סכום במסלול" className="w-[168px]">
            <div className="flex items-center gap-1">
              <Slider
                dir="ltr"
                className="min-w-0 flex-1"
                value={[Math.min(maxAmount, Math.max(0, Math.round(track.amount)))]}
                onValueChange={([value]) => applyAmount(value)}
                min={0}
                max={Math.max(maxAmount, 1)}
                step={5000}
              />
              <InlineNumberBox
                value={Math.round(track.amount)}
                suffix="₪"
                width="w-[92px]"
                max={Math.max(maxAmount, 0)}
                onChange={(value) => applyAmount(value ?? 0)}
              />
            </div>
          </RowField>

          {/* מה שנוגעים בו לעתים רחוקות, ופעולות המסלול */}
          <div className="flex items-center gap-0.5 self-center pt-3">
            <TrackRowMenu
              track={track}
              months={months}
              maxAmount={maxAmount}
              locked={locked}
              allowRefinance={allowRefinance}
              onUpdate={onUpdate}
              onPatchWithName={patchWithName}
              onPrepay={onPrepay}
              onRefinance={onRefinance}
              onAmortization={onAmortization}
            />
            {removable && (
              <button
                type="button"
                onClick={onRemove}
                title="הסרת המסלול"
                className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* התרעות — מתחת לשורה, ברוחב מלא, ורק כשיש מה לומר */}
        {(notice || (isFixed && missingFixed > 0)) && (
          <div className="space-y-0.5 border-t border-slate-100 px-2 py-1">
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
          </div>
        )}
      </fieldset>
    </div>
  );
}

/** תווית קצרה מעל פקד בשורת המסלול */
function RowField({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`${className} min-w-0 shrink-0`}>
      <span className="mb-0.5 block truncate text-[9px] font-medium leading-none text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * התפריט שבקצה שורת המסלול.
 *
 * כאן יושב מה שלא נוגעים בו בכל שינוי — שם המסלול ושער המט"ח — ולצידו פעולות
 * המסלול. שום יכולת לא ירדה; היא רק יצאה מהשורה כדי שהשורה תישאר שורה.
 */
function TrackRowMenu({
  track,
  months,
  maxAmount,
  locked,
  allowRefinance,
  onUpdate,
  onPatchWithName,
  onPrepay,
  onRefinance,
  onAmortization,
}: {
  track: MortgageTrack;
  months: number;
  maxAmount: number;
  locked: boolean;
  allowRefinance: boolean;
  onUpdate: (patch: Partial<MortgageTrack>) => void;
  onPatchWithName: (patch: Partial<MortgageTrack>) => void;
  onPrepay: () => void;
  onRefinance: () => void;
  onAmortization: () => void;
}) {
  const isForeign = track.type === 'dollar' || track.type === 'euro';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="שם המסלול ופעולות נוספות"
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="end" className="w-64 space-y-2 p-2.5">
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-slate-500">שם המסלול</span>
          <Input
            disabled={locked}
            className="h-8 text-[11px]"
            value={track.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            placeholder={autoTrackName(track)}
          />
        </div>

        {isForeign && (
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-slate-500">
              שער {track.type === 'dollar' ? 'דולר' : 'יורו'}
            </span>
            <NumericInput
              disabled={locked}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px] shadow-sm"
              value={track.exchangeRate ?? null}
              onChange={(exchangeRate) => onUpdate({ exchangeRate: exchangeRate ?? 0 })}
            />
          </div>
        )}

        <p className="text-[10px] leading-snug text-slate-400">
          {formatDuration(months)} · עד {formatShekel(maxAmount)} לשיבוץ במסלול הזה
        </p>

        <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2">
          <ActionButton icon={Banknote} label="פרעון מוקדם" onClick={onPrepay} disabled={locked} />
          <ActionButton icon={Table2} label="לוח החזרים" onClick={onAmortization} />
          {allowRefinance && (
            <ActionButton icon={RefreshCcw} label="מחזור" onClick={onRefinance} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * תיבת מספר קומפקטית לצד סליידר.
 *
 * היא נראית כמו תווית הערך שהייתה כאן קודם, אבל לחיצה עליה פותחת אותה לעריכה:
 * הסליידר נוח לכוונון גס, וההקלדה היא הדרך היחידה להגיע לסכום מדויק. הפסיקים
 * נוספים כבר תוך כדי ההקלדה (`integer`), והסמן נשאר במקומו.
 */
function InlineNumberBox({
  value,
  suffix,
  width,
  max,
  onChange,
}: {
  value: number;
  suffix: string;
  width: string;
  max?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <span
      className={`${width} flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 focus-within:border-blue-400 focus-within:bg-white`}
    >
      <NumericInput
        integer
        max={max}
        className="min-w-0 flex-1 bg-transparent text-center text-[12px] font-bold text-slate-700 outline-none"
        value={value}
        onChange={onChange}
      />
      <span className="shrink-0 text-[10px] text-slate-400">{suffix}</span>
    </span>
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
