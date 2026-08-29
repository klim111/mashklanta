'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  ChevronDown,
  Coins,
  Percent,
  RefreshCcw,
  Shield,
  Table2,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  AMORTIZATION_TYPES,
  MIN_FIXED_UNLINKED_PERCENT,
  TRACK_TYPES,
  VARIABLE_PERIODS,
} from '../types';
import type { MortgageTrack } from '../types';
import { isIndexLinked, isRateVariable } from '../scenarioCalculations';
import { formatPercentage } from '../mortgageCalculations';
import { autoTrackName, formatDuration } from '../engine';
import type { TrackResult } from '../engine';
import type { Assumptions } from '../engine';
import { AmountAndPercent, SliderField, TermMonthsSlider, formatShekel, trackColor } from './primitives';
import {
  CURRENT_RATE_PAYMENT_NOTE,
  PrimeForwardChart,
  VariableForwardChart,
  usesForwardPricedRate,
} from './PrimeForwardChart';
import { InflationForecastChart } from './InflationForecastChart';

interface TrackEditorProps {
  result: TrackResult;
  totalAmount: number;
  removable: boolean;
  /** הסכום המינימלי המותר במסלול לפי דרישת בנק ישראל; 0 כשאין מגבלה */
  minAmount?: number;
  /** התקרה למסלול הזה — מה שנותר מסכום המשכנתא אחרי המסלולים האחרים */
  maxAmount: number;
  assumptions?: Assumptions;
  onUpdate: (patch: Partial<MortgageTrack>) => void;
  /** קובע את הסכום במסלול הזה בלבד; ההפרש נשאר סכום שיש להשלים */
  onAmountChange: (amount: number) => void;
  onRemove: () => void;
  onPrepay: () => void;
  onRefinance: () => void;
  /** פותח את לוח ההחזרים כשהוא מסונן למסלול הזה בלבד */
  onAmortization: () => void;
}

export function TrackEditor({
  result,
  totalAmount,
  removable,
  minAmount = 0,
  maxAmount,
  assumptions,
  onUpdate,
  onAmountChange,
  onRemove,
  onPrepay,
  onRefinance,
  onAmortization,
}: TrackEditorProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const track = result.track;

  const minPercentage = totalAmount > 0 ? (minAmount / totalAmount) * 100 : 0;
  const maxPercentage = totalAmount > 0 ? (maxAmount / totalAmount) * 100 : 100;

  /**
   * הסכום במסלול נקבע לעצמו ולא נלקח מהמסלולים האחרים. ירידה מתחת לשליש הקל"צ
   * שבנק ישראל דורש נדחית והערך חוזר למינימום המותר, ועלייה מעל מה שנותר מסכום
   * המשכנתא נחתכת לתקרה.
   */
  const applyAmount = (amount: number) => {
    if (minAmount > 0 && amount < minAmount - 1) {
      setNotice(
        `בנק ישראל מחייב לפחות ${MIN_FIXED_UNLINKED_PERCENT}% מהמשכנתא בריבית קבועה לא צמודה. ` +
          `הערך הוחזר למינימום המותר — ${formatShekel(minAmount)} (${minPercentage.toFixed(1)}%).`
      );
      onAmountChange(minAmount);
      return;
    }

    if (amount > maxAmount + 1) {
      setNotice(
        `אין מה לשבץ מעל סכום המשכנתא. הסכום הוגבל ל-${formatShekel(maxAmount)} — כל מה שנותר ` +
          'אחרי המסלולים האחרים.'
      );
      onAmountChange(maxAmount);
      return;
    }

    setNotice(null);
    onAmountChange(amount);
  };

  const applyPercentage = (percentage: number) =>
    applyAmount((Math.max(0, percentage) / 100) * totalAmount);

  const rateVariable = isRateVariable(track.type);
  const indexLinked = isIndexLinked(track.type);
  const isForeign = track.type === 'dollar' || track.type === 'euro';
  const isGrace = track.amortizationType === 'partial_grace' || track.amortizationType === 'full_grace';

  const nameIsAuto = useMemo(() => track.name === autoTrackName(track), [track]);
  const effectiveRate = result.schedule[0]?.annualRate ?? track.interestRate;
  const rateShifted = Math.abs(effectiveRate - track.interestRate) > 0.001;

  /**
   * ירידת מדרגה בהחזר של המסלול מוצגת רק כשיש פרעון מוקדם — לא בגלל קרן שווה.
   * ליד זה מוצגת הריבית ששולמה עד מועד הפרעון.
   */
  const prepayRow = result.schedule.find((row) => row.prepayment > 1);
  const contractualMonths = Math.max(1, Math.round(track.years * 12));
  /** אחרי קיצור תקופה מציגים את משך לוח הסילוקין, לא את השנים המקוריות בחוזה */
  const shortened = Boolean(prepayRow) && result.months < contractualMonths - 0.5;
  const durationLabel = formatDuration(result.months);
  const declining =
    Boolean(prepayRow) &&
    result.lastMonthlyPayment > 0 &&
    result.monthlyPayment - result.lastMonthlyPayment > 1;
  const equalPrincipalDecline =
    track.amortizationType === 'equal_principal' &&
    result.lastMonthlyPayment > 0 &&
    result.monthlyPayment - result.lastMonthlyPayment > 1;
  const hasBalloon = result.balloonPayment > 1;
  const noMonthlyPayment = result.monthlyPayment <= 0.01;

  /** שינוי סוג המסלול מרענן גם את השם האוטומטי, כדי שהכרטיס יישאר קריא. */
  const patchWithName = (patch: Partial<MortgageTrack>) => {
    const merged = { ...track, ...patch };
    onUpdate(nameIsAuto ? { ...patch, name: autoTrackName(merged) } : patch);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 items-stretch">
        <span className="w-1.5 shrink-0" style={{ backgroundColor: trackColor(track.type) }} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 min-w-0 flex items-center gap-2 p-3 text-right hover:bg-slate-50 transition-colors sm:gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-900 truncate">{track.name}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {formatShekel(track.amount)} · {track.percentage.toFixed(1)}% · {formatPercentage(effectiveRate)}
              {rateShifted && <span className="text-amber-600"> (בתרחיש)</span>} ·{' '}
              {durationLabel}
              {shortened && (
                <span className="text-emerald-700">
                  {' '}
                  · קוצר מ-{formatDuration(contractualMonths)}
                </span>
              )}
              {prepayRow && (
                <span className="text-emerald-700">
                  {' '}
                  · ריבית ששולמה עד הפרעון: {formatShekel(prepayRow.cumulativeInterest)}
                </span>
              )}
            </p>
          </div>
          <div className="text-center hidden sm:block min-w-[104px]">
            <p className="text-[10px] text-slate-400">החזר חודשי</p>
            <p className="text-sm font-bold text-slate-800">
              {noMonthlyPayment ? 'אין' : formatShekel(result.monthlyPayment)}
            </p>
            {declining && (
              <p className="text-[10px] text-slate-500">יורד ל-{formatShekel(result.lastMonthlyPayment)}</p>
            )}
            {prepayRow && (
              <p className="text-[10px] text-emerald-700 leading-tight">
                ריבית עד הפרעון: {formatShekel(prepayRow.cumulativeInterest)}
              </p>
            )}
            {hasBalloon && (
              <p className="text-[10px] text-amber-700">בלון {formatShekel(result.balloonPayment)}</p>
            )}
            {usesForwardPricedRate(track.type) && (
              <p className="text-[9px] text-slate-400 leading-tight mt-0.5 max-w-[140px]">
                לפי הריבית התקפה כעת
              </p>
            )}
          </div>
          <div className="text-center hidden md:block min-w-[86px]">
            <p className="text-[10px] text-slate-400">סך ריבית</p>
            <p className="text-sm font-bold text-slate-800">{formatShekel(result.totalInterest)}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        </div>

        {/* פעולות המסלול זמינות גם בשורה הסגורה, ומציגות את הנתונים של המסלול הזה בלבד */}
        <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-2 py-1.5 sm:border-t-0 sm:border-r sm:py-0 sm:pl-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-[11px] text-slate-600"
            title={`פרעון מוקדם ב${track.name}`}
            onClick={onPrepay}
          >
            <Banknote className="h-3.5 w-3.5 sm:ml-1" />
            <span className="hidden lg:inline">פרעון מוקדם</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-[11px] text-slate-600"
            title={`לוח החזרים של ${track.name}`}
            onClick={onAmortization}
          >
            <Table2 className="h-3.5 w-3.5 sm:ml-1" />
            <span className="hidden lg:inline">לוח החזרים</span>
          </Button>
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              title="הסר מסלול"
              className="px-2 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4 space-y-4">
          {/* לוח הסילוקין ראשון, סוג הריבית לצידו, וכל השאר מתחתיהם */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">לוח סילוקין</Label>
              <Select
                value={track.amortizationType || 'spitzer'}
                onValueChange={(value) => patchWithName({ amortizationType: value as MortgageTrack['amortizationType'] })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AMORTIZATION_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">סוג הריבית</Label>
              <Select value={track.type} onValueChange={(value) => patchWithName({ type: value as MortgageTrack['type'] })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRACK_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {track.type.includes('variable') && (
              <div className="space-y-1">
                <Label className="text-xs">תחנת יציאה / עדכון ריבית</Label>
                <Select
                  value={String(track.variablePeriod ?? 5)}
                  onValueChange={(value) => patchWithName({ variablePeriod: Number(value) })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VARIABLE_PERIODS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>כל {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isForeign && (
              <div className="space-y-1">
                <Label className="text-xs">שער {track.type === 'dollar' ? 'דולר' : 'יורו'}</Label>
                <NumericInput
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={track.exchangeRate ?? null}
                  onChange={(exchangeRate) => onUpdate({ exchangeRate: exchangeRate ?? 0 })}
                />
              </div>
            )}

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">סכום במסלול</Label>
              <AmountAndPercent
                amount={track.amount}
                totalAmount={totalAmount}
                onChange={applyAmount}
              />
              {minAmount > 0 && (
                <p className="text-[11px] text-blue-700">
                  מינימום נדרש לפי בנק ישראל בריבית קבועה לא צמודה: {MIN_FIXED_UNLINKED_PERCENT}%
                  מהמשכנתא — {formatShekel(minAmount)}.
                </p>
              )}
              {notice && (
                <p className="flex items-start gap-1.5 text-[11px] text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {notice}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">שם המסלול</Label>
              <Input
                className="h-9"
                value={track.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder={autoTrackName(track)}
              />
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 pt-1">
            {/* הגרירה קובעת את חלקו של המסלול הזה; היתר נשאר סכום שיש להשלים */}
            <SliderField
              label="חלק מהמשכנתא"
              icon={<Percent className="h-3.5 w-3.5 text-blue-600" />}
              value={Number(track.percentage.toFixed(1))}
              onChange={applyPercentage}
              min={0}
              max={100}
              step={0.5}
              display={`${track.percentage.toFixed(1)}% · ${formatShekel(track.amount)}`}
              minLabel={minAmount > 0 ? `מינימום ${minPercentage.toFixed(0)}%` : '0%'}
              maxLabel={
                maxPercentage < 99.5
                  ? `עד ${maxPercentage.toFixed(0)}% — כל מה שנותר לשבץ`
                  : '100% מסכום המשכנתא'
              }
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-amber-600" />
                  ריבית שנתית
                </span>
                <span className="text-sm font-bold text-slate-800">%</span>
              </div>
              <NumericInput
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={track.interestRate}
                onChange={(interestRate) => patchWithName({ interestRate: interestRate ?? 0 })}
              />
            </div>

            <div className="space-y-1">
              <TermMonthsSlider
                label="תקופה"
                icon={<CalendarClock className="h-3.5 w-3.5 text-violet-600" />}
                years={track.years}
                onChange={(years) => patchWithName({ years })}
              />
              {shortened && (
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  אחרי קיצור התקופה בפרעון המוקדם המסלול נפרע תוך {durationLabel}, במקום{' '}
                  {formatDuration(contractualMonths)}.
                </p>
              )}
            </div>

            <div className="flex flex-col justify-end gap-2">
              <div className="flex flex-wrap gap-1.5">
                {rateVariable ? (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]">רגיש לריבית</Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">ריבית קבועה</Badge>
                )}
                {indexLinked ? (
                  <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 text-[10px]">צמוד מדד</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">לא צמוד</Badge>
                )}
                {isGrace && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">גרייס</Badge>}
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onRefinance}>
                <RefreshCcw className="h-3.5 w-3.5 ml-1" />
                מחזור המסלול
              </Button>
            </div>
          </div>

          {track.type === 'prime' && result.schedule.length > 1 && (
            <PrimeForwardChart tracks={[result]} quotedRate={track.interestRate} height={180} />
          )}
          {track.type === 'variable_unlinked' && result.schedule.length > 1 && (
            <VariableForwardChart tracks={[result]} quotedRate={track.interestRate} height={180} />
          )}
          {indexLinked && result.schedule.length > 1 && (
            <InflationForecastChart
              assumptions={assumptions}
              years={track.years}
              height={180}
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {declining || equalPrincipalDecline ? (
              <>
                <TrackStat
                  label="החזר ראשון (הגבוה)"
                  value={formatShekel(result.monthlyPayment)}
                />
                <TrackStat label="החזר אחרון" value={formatShekel(result.lastMonthlyPayment)} />
              </>
            ) : (
              <TrackStat
                label="החזר חודשי"
                value={noMonthlyPayment ? 'אין החזר שוטף' : formatShekel(result.monthlyPayment)}
              />
            )}
            {hasBalloon && (
              <TrackStat
                label="תשלום בסוף התקופה"
                value={formatShekel(result.balloonPayment)}
                tone="warning"
              />
            )}
            <TrackStat label="סך ריבית" value={formatShekel(result.totalInterest)} />
            <TrackStat label="סך תשלום" value={formatShekel(result.totalPaid)} />
            <TrackStat label="משך בפועל" value={formatDuration(result.months)} />
          </div>

          {usesForwardPricedRate(track.type) && !noMonthlyPayment && (
            <p className="text-[11px] text-slate-500 leading-snug">{CURRENT_RATE_PAYMENT_NOTE}</p>
          )}

          {isGrace && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
              <Banknote className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 leading-relaxed">
                {track.amortizationType === 'full_grace' ? (
                  <>
                    בגרייס מלא אין החזר חודשי. הריבית מחושבת מדי חודש על החוב, נצברת וצוברת ריבית
                    בעצמה, ובסוף התקופה נפרעים בתשלום אחד הקרן ({formatShekel(track.amount)}) וכל
                    הריבית שנצברה ({formatShekel(result.totalInterest)}) — סך{' '}
                    {formatShekel(result.balloonPayment)}. זו הסיבה שהתשלום הסופי גבוה בהרבה מהקרן.
                  </>
                ) : (
                  <>
                    בגרייס חלקי משולמת מדי חודש הריבית בלבד ({formatShekel(result.monthlyPayment)}),
                    הקרן אינה קטנה לאורך התקופה, ובסופה היא נפרעת בתשלום אחד של{' '}
                    {formatShekel(result.balloonPayment)}.
                  </>
                )}
              </p>
            </div>
          )}

          {result.totalIndexation > 1 && (
            <div className="flex items-start gap-2 rounded-lg bg-violet-50 border border-violet-200 p-2.5">
              <TrendingUp className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-violet-800 leading-relaxed">
                לפי תחזית האינפלציה של בנק ישראל הקרן גדלה ב-{formatShekel(result.totalIndexation)} לאורך
                התקופה. בלוח ההחזרים אפשר לראות גם כמה כסף נשרף על אינפלציה לעומת מדד קפוא. הקרן מוגנת
                מירידת מדד ולא תקטן מתחת לסכום המקורי.
              </p>
            </div>
          )}

          {track.type === 'variable_unlinked' && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
              <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                הריבית מתעדכנת כל {track.variablePeriod ?? 5} שנים לפי הפורוורד לאותה תקופה מעקום התשואות
                השקלי של בנק ישראל, עם המרווח שצוטט מהבנק. בתחנות היציאה יש פטור מעמלת פירעון מוקדם.
                {result.schedule.length > 12 &&
                  Math.abs(
                    result.schedule[0].annualRate -
                      result.schedule[Math.min((track.variablePeriod ?? 5) * 12, result.schedule.length - 1)]
                        .annualRate
                  ) > 0.02 && (
                    <>
                      {' '}
                      חודש ראשון: {formatPercentage(result.schedule[0].annualRate)}, בתחנה הראשונה:{' '}
                      {formatPercentage(
                        result.schedule[
                          Math.min((track.variablePeriod ?? 5) * 12, result.schedule.length - 1)
                        ].annualRate
                      )}
                      , ובסוף התקופה:{' '}
                      {formatPercentage(result.schedule[result.schedule.length - 1].annualRate)}.
                    </>
                  )}
              </p>
            </div>
          )}

          {rateVariable && track.type === 'variable_linked' && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-2.5">
              <Shield className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 leading-relaxed">
                הריבית מתעדכנת כל {track.variablePeriod ?? 5} שנים. שינוי ריבית בתרחיש נכנס לתוקף בתחנה הראשונה
                ולא באופן מיידי.
              </p>
            </div>
          )}

          {track.type === 'prime' &&
            result.schedule.length > 12 &&
            Math.abs(
              result.schedule[0].annualRate -
                result.schedule[Math.min(119, result.schedule.length - 1)].annualRate
            ) > 0.02 && (
            <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 p-2.5">
              <TrendingUp className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-orange-900 leading-relaxed">
                ההחזרים וסך הריבית מחושבים לפי צפי הפריים שנגזר מעקום התשואות השקלי של בנק ישראל.
                בכל תשלום הריבית היא הפורוורד לאותו חודש, עם המרווח שצוטט מהבנק. חודש ראשון:{' '}
                {formatPercentage(result.schedule[0].annualRate)}, בעוד 10 שנים:{' '}
                {formatPercentage(result.schedule[Math.min(119, result.schedule.length - 1)].annualRate)},
                ובסוף התקופה:{' '}
                {formatPercentage(result.schedule[result.schedule.length - 1].annualRate)}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrackStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  const warning = tone === 'warning';
  return (
    <div
      className={`rounded-lg border p-2 text-center ${
        warning ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
      }`}
    >
      <p className={`text-[10px] ${warning ? 'text-amber-700' : 'text-slate-400'}`}>{label}</p>
      <p className={`text-xs font-bold ${warning ? 'text-amber-900' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
