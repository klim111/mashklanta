'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { AnchorSpreadRate } from '@/components/ui/anchor-spread-rate';
import { InfoTip, RATE_EXPLANATIONS } from '@/components/ui/info-tip';
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
  Pencil,
  Check,
  Plus,
  RefreshCcw,
  Save,
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
import { demoId } from '@/demo/demo-attr';

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
  /** כפתורי התצוגה בכותרת הפאנל — הגדלה למסך מלא, מזעור, מעבר לניתוח */
  layoutActions?: React.ReactNode;
  /**
   * שמירת התמהיל כפי שהוא באזור העבודה. הכפתור מופיע בתחתית הפאנל כשכל סכום
   * המשכנתא חולק בין המסלולים ויש מה לשמור.
   */
  onSaveMix?: () => void;
  /** הבהוב חד-פעמי של כפתור השמירה אחרי שינוי */
  flashSave?: boolean;
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
  layoutActions,
  onSaveMix,
  flashSave = false,
}: MixControlPanelProps) {
  const { mix } = result;
  const fixedShareOk = meetsFixedRequirement(mix);
  const remaining = remainingAmount(mix);
  const allocated = allocatedAmount(mix);

  return (
    <div className="space-y-2 p-2">
      {locked && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          <Lock className="h-4 w-4 shrink-0" />
          התמהיל ננעל כתמהיל הסופי למכרז מול הבנקים ואינו ניתן לשינוי.
        </div>
      )}

      {!fixedShareOk && mix.tracks.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-2xs leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            דרישת בנק ישראל: לפחות {MIN_FIXED_PERCENT}% מהמשכנתא בריבית קבועה —{' '}
            {formatShekel(minFixedAmount(mix.totalAmount))}. הקבועה הצמודה והלא צמודה נספרות יחד.
            חסרים עוד <strong>{formatShekel(missingFixedAmount(mix))}</strong>.
          </span>
        </p>
      )}

      {/* סכום המשכנתא וכמה ממנו כבר חולק — מה שהלקוח מחלק בין המסלולים */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
        <div className="min-w-0">
          <p className="text-2xs font-bold text-slate-500">סכום המשכנתא</p>
          <p className="text-lg font-black leading-tight text-blue-700">{formatShekel(mix.totalAmount)}</p>
        </div>
        <p className="flex min-w-[160px] flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-2xs font-bold text-slate-600">
          <Layers className="h-3.5 w-3.5 shrink-0" />
          {mix.tracks.length} מסלולים · שובצו {formatShekel(allocated)}
          {remaining > 0 ? (
            <span className="text-amber-700">· נותרו {formatShekel(remaining)}</span>
          ) : (
            mix.tracks.length > 0 && <span className="text-emerald-700">· כל הסכום חולק</span>
          )}
        </p>
        {layoutActions && <div className="flex flex-wrap items-center gap-1.5">{layoutActions}</div>}
      </div>

      {mix.tracks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs leading-relaxed text-slate-600">
          עדיין אין מסלולים בתמהיל. הוסיפו מסלול, בחרו לו סוג ריבית ופרמטרים, וקבעו כמה
          מהמשכנתא הוא מממן — בסכום או באחוזים.
        </p>
      ) : (
        <p className="text-2xs text-slate-500">
          לחיצה על שם המסלול מציגה אותו באזור הגרפים. אפשר לקבוע לכל מסלול סכום או אחוז
          מהמשכנתא, והשני מתעדכן בהתאם.
        </p>
      )}

      <div className="space-y-1.5">
        {result.tracks.map((trackResult, index) => (
          <TrackControlCard
            key={trackResult.track.id}
            index={index}
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

        {/*
          הוספת מסלול פותחת שורה ריקה: הלקוח בוחר בה את סוג הריבית ואת שאר
          הפרמטרים, וקובע כמה מהמשכנתא המסלול מממן — בסכום או באחוז. כשכל הסכום
          חולק אין מה להוסיף, ובמקום הכפתור מופיעה שמירת התמהיל.
        */}
        {!locked && (remaining > 0 || mix.tracks.length === 0) && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-white p-1.5">
            <Button size="sm" className="h-8 text-xs" onClick={() => onAddTrack('fixed_unlinked')} {...demoId('ws-add-track')}>
              <Plus className="h-3.5 w-3.5 ml-1" />
              הוסף מסלול
            </Button>
            <p className="min-w-[150px] flex-1 text-2xs leading-tight text-slate-600">
              {formatShekel(remaining)} מהמשכנתא עדיין לא חולקו בין המסלולים
            </p>
          </div>
        )}
      </div>

      {!locked && mix.tracks.length > 0 && remaining === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-2xs font-bold text-emerald-900">כל סכום המשכנתא חולק בין המסלולים.</p>
          {onSaveMix ? (
            <Button
              size="sm"
              className={`h-9 bg-emerald-600 text-xs hover:bg-emerald-700 ${flashSave ? 'save-flash' : ''}`}
              onClick={onSaveMix}
              {...demoId('ws-save-state')}
            >
              <Save className="h-3.5 w-3.5 ml-1" />
              שמור תמהיל
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              התמהיל שמור
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** כרטיס שליטה למסלול אחד — כל הפרמטרים פתוחים */
function TrackControlCard({
  index,
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
  /** מיקום המסלול ברשימה — לעוגני ההדגמה */
  index: number;
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
      מסלול אחד = כרטיס בשורות מלאות, באותו סדר בכל רוחב (גם בחלון המוגדל):
      לוח סילוקין וסוג ריבית; סכום ואחוז מהתמהיל; עוגן, מרווח וריבית; תקופה
      ולצידה הכפתורים לוח סילוקין ופרעון מוקדם. השדות מתפרסים שווה לאורך
      השורה, וכפתור המחיקה יושב למטה בצד שמאל.
    */
    <div
      className={`rounded-lg border bg-white transition-colors ${
        focused ? 'border-violet-400 ring-1 ring-violet-200' : 'border-slate-200'
      }`}
      {...demoId(`ws-track-${index}`)}
    >
      <fieldset disabled={locked} className="space-y-2 p-2 text-right disabled:opacity-70">
        {/* כותרת ותת-כותרת — לחיצה מציגה את המסלול באזור הגרפים */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={false}
            onClick={onFocus}
            title="הצגת המסלול באזור הגרפים"
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-0.5 text-right transition-colors hover:bg-slate-50"
          >
            <span
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: trackColor(track.type) }}
            />
            <span className="min-w-0 flex-1 !text-right">
              <span className="block truncate text-xs font-bold leading-tight text-slate-900 !text-right">
                {track.name || TRACK_TYPES[track.type]}
              </span>
              <span className="block truncate text-2xs leading-tight text-slate-500 !text-right">
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
          <div className="flex flex-wrap items-center gap-1 text-2xs leading-none text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5">
              ממוצעת <b className="text-slate-900">{formatPercentage(result.averageRate)}</b>
              <InfoTip text={RATE_EXPLANATIONS.trackAverage} label="הסבר על הריבית הממוצעת" align="start" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5">
              מתואמת IRR <b className="text-slate-900">{formatPercentage(result.irr)}</b>
              <InfoTip text={RATE_EXPLANATIONS.trackIrr} label="הסבר על הריבית המתואמת" align="start" />
            </span>
          </div>
        </div>

        {/* לוח סילוקין וסוג ריבית */}
        <div className={`grid gap-2 ${track.type.includes('variable') ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <RowField label="לוח סילוקין">
            <Select
              value={track.amortizationType || 'spitzer'}
              onValueChange={(value) =>
                patchWithName({ amortizationType: value as MortgageTrack['amortizationType'] })
              }
            >
              <SelectTrigger dir="rtl" className="h-8 text-xs [&>span:first-of-type]:text-right">
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

          <RowField label="סוג ריבית">
            <Select
              value={track.type}
              onValueChange={(value) => patchWithName({ type: value as MortgageTrack['type'] })}
            >
              <SelectTrigger dir="rtl" className="h-8 text-xs [&>span:first-of-type]:text-right">
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
            <RowField label="תחנת יציאה">
              <Select
                value={String(track.variablePeriod ?? 5)}
                onValueChange={(value) => patchWithName({ variablePeriod: Number(value) })}
              >
                <SelectTrigger dir="rtl" className="h-8 text-xs [&>span:first-of-type]:text-right">
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
        </div>

        {/* הסכום במסלול והאחוז שלו מכלל התמהיל — עריכה של אחד מעדכנת את השני */}
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-2">
          <RowField label="סכום במסלול">
            <div className="flex items-center gap-2">
              <Slider
                {...demoId(`ws-track-${index}-amount`)}
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
                width="w-[110px]"
                max={Math.max(maxAmount, 0)}
                onChange={(value) => applyAmount(value ?? 0)}
              />
            </div>
          </RowField>

          <RowField label="אחוז מהתמהיל">
            <InlineNumberBox
              value={Math.round(track.percentage * 10) / 10}
              suffix="%"
              width="w-full"
              integer={false}
              onChange={(value) => {
                if (totalAmount <= 0) return;
                const percent = Math.max(0, Math.min(100, value ?? 0));
                applyAmount(Math.round((totalAmount * percent) / 100));
              }}
            />
          </RowField>
        </div>

        {/* ריבית — עוגן מבנק ישראל ועוד המרווח של הבנק */}
        <div className={`grid gap-2 ${isForeign ? 'grid-cols-[minmax(0,3fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
          <RowField label={rateBreakdown.anchor ? undefined : 'ריבית שנתית'}>
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
          {isForeign && (
            <RowField label={`שער ${track.type === 'dollar' ? 'דולר' : 'יורו'}`}>
              <NumericInput
                className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-2xs shadow-sm"
                value={track.exchangeRate ?? null}
                onChange={(exchangeRate) => onUpdate({ exchangeRate: exchangeRate ?? 0 })}
              />
            </RowField>
          )}
        </div>

        {/* תקופה, ולצידה הפעולות על המסלול — ככפתורים גלויים */}
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2">
          <RowField label="תקופה">
            <div className="flex items-center gap-2">
              <Slider
                {...demoId(`ws-track-${index}-term`)}
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
                width="w-[64px]"
                onChange={(value) =>
                  patchWithName({ years: clampTrackTermMonths(value ?? months) / 12 })
                }
              />
            </div>
          </RowField>
          <div className={`grid gap-1.5 ${allowRefinance ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <ActionButton icon={Table2} label="לוח סילוקין" onClick={onAmortization} />
            <ActionButton icon={Banknote} label="פרעון מוקדם" onClick={onPrepay} disabled={locked} />
            {allowRefinance && (
              <ActionButton icon={RefreshCcw} label="מחזור" onClick={onRefinance} />
            )}
          </div>
        </div>

        {/* התרעות — ברוחב מלא, ורק כשיש מה לומר */}
        {(notice || (isFixed && missingFixed > 0)) && (
          <div className="space-y-0.5 border-t border-slate-100 pt-1">
            {isFixed && missingFixed > 0 && (
              <p className="text-2xs text-amber-700">
                חסרים {formatShekel(missingFixed)} בריבית קבועה לדרישת בנק ישראל
              </p>
            )}
            {notice && (
              <p className="flex items-start gap-1 text-2xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {notice}
              </p>
            )}
          </div>
        )}

        {/* שם המסלול מימין, מחיקה למטה בצד שמאל */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
          <TrackNameMenu track={track} locked={locked} onUpdate={onUpdate} />
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              title="הסרת המסלול"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-bold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              מחק מסלול
            </button>
          )}
        </div>
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
  /** בלי כותרת — כשלשדה שבפנים יש כותרות משלו (עוגן/מרווח/ריבית) */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`${className} min-w-0 shrink-0`}>
      {label && (
        <span className="mb-0.5 block truncate text-2xs font-medium leading-none text-slate-500 !text-right">
          {label}
        </span>
      )}
      {children}
    </label>
  );
}

/**
 * שם המסלול — נפתח לעריכה מהשורה התחתונה של הכרטיס. ברירת המחדל היא שם
 * שנגזר מסוג המסלול ומלוח הסילוקין.
 */
function TrackNameMenu({
  track,
  locked,
  onUpdate,
}: {
  track: MortgageTrack;
  locked: boolean;
  onUpdate: (patch: Partial<MortgageTrack>) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={locked}
          title="שינוי שם המסלול"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          שם המסלול
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" className="w-64 space-y-1 p-2.5">
        <span className="text-2xs font-medium text-slate-500">שם המסלול</span>
        <Input
          disabled={locked}
          className="h-8 text-2xs"
          value={track.name}
          onChange={(event) => onUpdate({ name: event.target.value })}
          placeholder={autoTrackName(track)}
        />
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
  integer = true,
  onChange,
}: {
  value: number;
  suffix: string;
  width: string;
  max?: number;
  /** false — אחוזים עם ספרה אחרי הנקודה */
  integer?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <span
      className={`${width} flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 focus-within:border-blue-400 focus-within:bg-white`}
    >
      <NumericInput
        integer={integer}
        max={max}
        className="min-w-0 flex-1 bg-transparent text-center text-xs font-bold text-slate-700 outline-none"
        value={value}
        onChange={onChange}
      />
      <span className="shrink-0 text-2xs text-slate-400">{suffix}</span>
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
      className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-2xs font-bold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
