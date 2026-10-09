'use client';

/**
 * שורת מסלול של המשכנתא הקיימת — אותה שורה בבדיקת המיחזור לאורח ובהזנת
 * המשכנתא למיחזור של לקוח רשום: סוג המסלול, היתרה לסילוק, הריבית היום
 * (עוגן מבנק ישראל ועוד המרווח, כמו בכלי בניית התמהילים) ומועד התשלום האחרון.
 *
 * השורה אינה יודעת איך כל כלי שומר את המסלול. היא מקבלת ערכים מנורמלים
 * ומחזירה שינויים, וכל כלי ממפה אותם למבנה שלו.
 */

import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { AnchorSpreadRate } from '@/components/ui/anchor-spread-rate';
import { NumericInput } from '@/components/ui/numeric-input';
import { useMarketRates } from '@/hooks/use-market-rates';
import { anchorForTrack, roundRate } from '@/lib/rate-anchors';
import type { MortgageTrackType } from '@/lib/interest-rates';
import { VARIABLE_PERIODS } from '@/components/mortgage-advisor/types';
import { cn } from '@/lib/utils';

export interface CurrentTrackValue {
  type: MortgageTrackType;
  /** היתרה לסילוק, בש"ח */
  balance: number;
  /** הריבית השנתית הסופית */
  rate: number;
  /** המרווח מעל העוגן — רק כשהריבית פורקה לעוגן ולמרווח */
  spread?: number;
  /** תחנת היציאה של מסלול משתנה, בשנים */
  variablePeriod?: number;
  endYear: number;
  endMonth: number;
}

export interface CurrentTrackPatch {
  type?: MortgageTrackType;
  balance?: number;
  rate?: number;
  /** null — המרווח נמחק (סוג מסלול בלי עוגן, או סוג שהוחלף) */
  spread?: number | null;
  variablePeriod?: number;
  endYear?: number;
  endMonth?: number;
}

export const TRACK_SELECT_CLASS =
  'mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-info font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

const FIELD_CLASS =
  'mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-info font-semibold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const LABEL_CLASS = 'block text-2xs font-bold text-slate-500';

const NOW = new Date();
const YEARS = Array.from({ length: 31 }, (_, i) => NOW.getFullYear() + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function isVariableType(type: MortgageTrackType): boolean {
  return type === 'variable_linked' || type === 'variable_unlinked';
}

export function CurrentTrackRow({
  index,
  value,
  typeOptions,
  onChange,
  onDelete,
  footer,
}: {
  index: number;
  value: CurrentTrackValue;
  typeOptions: { value: MortgageTrackType; label: string }[];
  onChange: (patch: CurrentTrackPatch) => void;
  /** בלי פונקציה — אין כפתור מחיקה (המסלול היחיד) */
  onDelete?: () => void;
  /** שורת המידע שמתחת לשדות: כמה נותר, ההחזר, השוואה לשוק */
  footer?: ReactNode;
}) {
  const { snapshot, refresh } = useMarketRates();
  const anchor = anchorForTrack(value.type, snapshot, { variablePeriod: value.variablePeriod });
  const hasSpread = typeof value.spread === 'number' && Number.isFinite(value.spread);

  /*
    ריבית שפורקה לעוגן ולמרווח נגזרת מהעוגן החי, כמו בכלי בניית התמהילים: כשנתוני
    בנק ישראל נטענים או מתעדכנים, הריבית הסופית זזה איתם והמרווח נשאר.
  */
  const liveRate = anchor && hasSpread ? roundRate(anchor.rate + (value.spread as number)) : null;
  useEffect(() => {
    if (liveRate !== null && Math.abs(liveRate - value.rate) > 0.0001) onChange({ rate: liveRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRate]);

  const variable = isVariableType(value.type);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black text-slate-700">מסלול {index + 1}</span>
        {onDelete && (
          <button
            type="button"
            aria-label={`מחיקת מסלול ${index + 1}`}
            onClick={onDelete}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        className={cn(
          'grid gap-3 sm:grid-cols-2',
          // ריבית מפורקת היא שלושה שדות, ולכן שורה כזו נפרסת על שתי שורות: סוג
          // ויתרה למעלה, ריבית ומועד אחרון למטה. בלי עוגן הכול נכנס בשורה אחת.
          anchor ? '' : 'xl:grid-cols-[1fr_1.1fr_0.8fr_1.3fr]'
        )}
      >
        <div className="block">
          <span className={LABEL_CLASS}>סוג המסלול</span>
          <div className="flex gap-1.5">
            <select
              aria-label="סוג המסלול"
              value={value.type}
              onChange={(e) =>
                onChange({
                  type: e.target.value as MortgageTrackType,
                  // מרווח שייך לעוגן של הסוג הקודם — בסוג חדש הוא נגזר מחדש מהריבית
                  spread: null,
                  ...(isVariableType(e.target.value as MortgageTrackType) && !value.variablePeriod
                    ? { variablePeriod: 5 }
                    : {}),
                })
              }
              className={cn(TRACK_SELECT_CLASS, 'min-w-0 flex-1')}
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {variable && (
              <select
                aria-label="תחנת יציאה"
                title="תחנת יציאה: כל כמה זמן הריבית במסלול מתעדכנת"
                value={value.variablePeriod ?? 5}
                onChange={(e) => onChange({ variablePeriod: Number(e.target.value) })}
                className={cn(TRACK_SELECT_CLASS, 'w-[5.5rem] shrink-0 px-2')}
              >
                {Object.entries(VARIABLE_PERIODS).map(([key, label]) => (
                  <option key={key} value={key}>
                    כל {label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <label className="block">
          <span className={LABEL_CLASS}>יתרה לסילוק</span>
          <div className="relative">
            <NumericInput
              integer
              value={value.balance > 0 ? value.balance : null}
              onChange={(next) => onChange({ balance: Math.max(0, next ?? 0) })}
              placeholder="₪"
              aria-label="יתרה לסילוק"
              className={cn(FIELD_CLASS, 'pl-8 text-right')}
            />
            <span className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-slate-400">
              ₪
            </span>
          </div>
        </label>

        <div className="block">
          {!anchor && <span className={LABEL_CLASS}>ריבית היום</span>}
          <AnchorSpreadRate
            compact
            blankWhenZero
            anchor={anchor}
            spread={hasSpread ? (value.spread as number) : null}
            rate={value.rate}
            rateLabel="ריבית היום"
            onRefreshAnchor={refresh}
            fieldClassName={FIELD_CLASS}
            labelClassName={cn(LABEL_CLASS, 'truncate')}
            operatorClassName="mb-4"
            className={anchor ? '' : '[&_input]:text-right'}
            onChange={({ rate, spread }) =>
              onChange({ rate: Math.min(19.99, Math.max(0, rate)), spread: spread ?? null })
            }
          />
        </div>

        <div className="block">
          <span className={LABEL_CLASS}>תשלום אחרון</span>
          <div className="mt-1 flex gap-1.5">
            <select
              aria-label="חודש התשלום האחרון"
              value={value.endMonth}
              onChange={(e) => onChange({ endMonth: Number(e.target.value) })}
              className="h-11 w-[4.25rem] shrink-0 rounded-xl border border-slate-300 bg-white px-2 text-info font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              aria-label="שנת התשלום האחרון"
              value={value.endYear}
              onChange={(e) => onChange({ endYear: Number(e.target.value) })}
              className="h-11 min-w-[5.5rem] flex-1 rounded-xl border border-slate-300 bg-white px-2 text-info font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              {(YEARS.includes(value.endYear) ? YEARS : [value.endYear, ...YEARS]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {footer && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">{footer}</div>}
      {anchor && (
        <p className="mt-1 text-2xs text-slate-400">
          העוגן: {anchor.label}
          {anchor.source === 'boi' ? ' · נמשך מבנק ישראל' : ' · ערך נפילה, בנק ישראל לא זמין כרגע'}
        </p>
      )}
    </motion.li>
  );
}
