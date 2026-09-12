'use client';

import React from 'react';
import { Landmark, Plus, Equal, RefreshCcw } from 'lucide-react';
import { NumericInput } from '@/components/ui/numeric-input';
import { roundRate, type RateAnchor } from '@/lib/rate-anchors';

/**
 * שדה ריבית מפורק: עוגן + מרווח = ריבית סופית.
 *
 * העוגן אינו ניתן לעריכה — הוא נתון שנמשך מבנק ישראל ומוצג אוטומטית ברגע
 * שנבחר סוג המסלול. המרווח מוזן ידנית, והריבית הסופית היא סכומם. אפשר גם
 * להזין את הריבית הסופית ישירות, ואז המרווח מתעדכן כדי לשמור על הזהות
 * `עוגן + מרווח = ריבית` — העוגן עצמו נשאר נתון השוק ולא זז.
 */
export interface AnchorSpreadRateProps {
  /** העוגן העדכני, או null למסלול שאין לו עוגן שוק */
  anchor: RateAnchor | null;
  /** המרווח הנוכחי מעל העוגן */
  spread: number | null;
  /** הריבית הסופית */
  rate: number;
  onChange: (next: { rate: number; spread?: number }) => void;
  /** רענון יזום של נתוני בנק ישראל */
  onRefreshAnchor?: () => void;
  /** תווית לשדה הריבית הסופית */
  rateLabel?: string;
  /**
   * תצוגה לשורה: בלי פסקת ההסבר שמתחת ובלי תוויות המשנה. ההסבר ומקור הנתון
   * עוברים ל-`title` של תיבת העוגן, כדי שהם יישארו זמינים בלי להוסיף שתי
   * שורות טקסט לכל מסלול.
   */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

const FIELD_CLASS =
  'h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm';
const COMPACT_FIELD_CLASS =
  'h-7 w-full rounded-md border border-input bg-transparent px-1 py-0.5 text-[11px] shadow-sm';

export function AnchorSpreadRate({
  anchor,
  spread,
  rate,
  onChange,
  onRefreshAnchor,
  rateLabel = 'ריבית שנתית',
  compact = false,
  disabled = false,
  className = '',
}: AnchorSpreadRateProps) {
  /*
    מסלול בלי עוגן — קבועה, זכאות, מענק ומט"ח — מקבל שדה ריבית אחד ותו לא.
    הריבית בהם נסגרת מול הבנק או נקבעת בתקנות, ואין מה לפרק לעוגן ולמרווח;
    הצגת שלושה שדות שאחד מהם ריק הייתה מרמזת על פירוק שלא קיים.
  */
  if (!anchor) {
    return (
      <div className={`relative ${className}`}>
        <NumericInput
          className={`${compact ? COMPACT_FIELD_CLASS : FIELD_CLASS} pl-7 text-left font-bold`}
          value={rate}
          disabled={disabled}
          onChange={(value) => onChange({ rate: value ?? 0 })}
          aria-label={rateLabel}
        />
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          %
        </span>
      </div>
    );
  }

  const anchorRate = roundRate(anchor.rate);
  const effectiveSpread = spread ?? roundRate(rate - anchor.rate);

  const setSpread = (value: number | null) => {
    const next = value ?? 0;
    onChange({ rate: roundRate(anchor.rate + next), spread: next });
  };

  const setRate = (value: number | null) => {
    const next = value ?? 0;
    onChange({ rate: next, spread: roundRate(next - anchor.rate) });
  };

  const field = compact ? COMPACT_FIELD_CLASS : FIELD_CLASS;
  const sourceNote =
    anchor.source === 'boi'
      ? `${anchor.label} · נמשך מבנק ישראל${anchor.asOf ? ` · ${anchor.asOf}` : ''}`
      : `${anchor.label} · לא נמשך מבנק ישראל — ערך נפילה`;

  return (
    <div className={`${compact ? '' : 'space-y-1.5'} ${className}`}>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1">
        <label className={compact ? '' : 'space-y-1'} title={compact ? sourceNote : undefined}>
          {!compact && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
              <Landmark className="h-3 w-3 text-blue-600" />
              עוגן %
            </span>
          )}
          <input
            readOnly
            dir="ltr"
            value={anchorRate.toFixed(2)}
            aria-label="עוגן"
            className={`${field} cursor-default bg-slate-100 text-left font-semibold text-slate-700`}
          />
        </label>

        <Plus
          className={`h-3 w-3 shrink-0 text-slate-400 ${compact ? 'mb-2' : 'mb-2.5'}`}
          aria-hidden
        />

        <label className={compact ? '' : 'space-y-1'}>
          {!compact && <span className="text-[11px] font-medium text-slate-600">מרווח %</span>}
          <NumericInput
            className={`${field} text-left`}
            value={effectiveSpread}
            disabled={disabled}
            onChange={setSpread}
            aria-label="מרווח"
            title={compact ? 'מרווח מעל העוגן' : undefined}
          />
        </label>

        <Equal
          className={`h-3 w-3 shrink-0 text-slate-400 ${compact ? 'mb-2' : 'mb-2.5'}`}
          aria-hidden
        />

        <label className={compact ? '' : 'space-y-1'}>
          {!compact && <span className="text-[11px] font-bold text-slate-700">{rateLabel} %</span>}
          <NumericInput
            className={`${field} text-left font-bold`}
            value={rate}
            disabled={disabled}
            onChange={setRate}
            aria-label={rateLabel}
            title={compact ? rateLabel : undefined}
          />
        </label>
      </div>

      {!compact && (
        <p className="flex flex-wrap items-center gap-1 text-[10px] leading-snug text-slate-500">
          <span>{anchor.label}</span>
          {anchor.source === 'boi' ? (
            <span className="text-emerald-700">
              · נמשך מבנק ישראל{anchor.asOf ? ` · ${anchor.asOf}` : ''}
            </span>
          ) : (
            <span className="text-amber-700">· לא נמשך מבנק ישראל — ערך נפילה</span>
          )}
          {onRefreshAnchor && (
            <button
              type="button"
              onClick={onRefreshAnchor}
              className="inline-flex items-center gap-1 rounded px-1 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCcw className="h-3 w-3" />
              רענון
            </button>
          )}
        </p>
      )}
    </div>
  );
}
