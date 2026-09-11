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
  disabled?: boolean;
  className?: string;
}

const FIELD_CLASS =
  'h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm';

export function AnchorSpreadRate({
  anchor,
  spread,
  rate,
  onChange,
  onRefreshAnchor,
  rateLabel = 'ריבית שנתית',
  disabled = false,
  className = '',
}: AnchorSpreadRateProps) {
  // בלי עוגן שוק (זכאות, מענק, מט"ח) אין מה לפרק — נשאר שדה ריבית אחד
  if (!anchor) {
    return (
      <div className={`space-y-1 ${className}`}>
        <span className="text-xs font-medium text-slate-700">{rateLabel} %</span>
        <NumericInput
          className={FIELD_CLASS}
          value={rate}
          disabled={disabled}
          onChange={(value) => onChange({ rate: value ?? 0 })}
        />
        <p className="text-[10px] leading-snug text-slate-500">
          למסלול הזה אין עוגן שוק של בנק ישראל — הריבית נקבעת בתקנות או מול הבנק ומוזנת ידנית.
        </p>
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

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1.5">
        <label className="space-y-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
            <Landmark className="h-3 w-3 text-blue-600" />
            עוגן %
          </span>
          <input
            readOnly
            dir="ltr"
            value={anchorRate.toFixed(2)}
            aria-label="עוגן"
            className={`${FIELD_CLASS} cursor-default bg-slate-100 text-left font-semibold text-slate-700`}
          />
        </label>

        <Plus className="mb-2.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />

        <label className="space-y-1">
          <span className="text-[11px] font-medium text-slate-600">מרווח %</span>
          <NumericInput
            className={`${FIELD_CLASS} text-left`}
            value={effectiveSpread}
            disabled={disabled}
            onChange={setSpread}
            aria-label="מרווח"
          />
        </label>

        <Equal className="mb-2.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />

        <label className="space-y-1">
          <span className="text-[11px] font-bold text-slate-700">{rateLabel} %</span>
          <NumericInput
            className={`${FIELD_CLASS} text-left font-bold`}
            value={rate}
            disabled={disabled}
            onChange={setRate}
            aria-label={rateLabel}
          />
        </label>
      </div>

      <p className="flex flex-wrap items-center gap-1 text-[10px] leading-snug text-slate-500">
        <span>{anchor.label}</span>
        {anchor.source === 'boi' ? (
          <span className="text-emerald-700">· נמשך מבנק ישראל{anchor.asOf ? ` · ${anchor.asOf}` : ''}</span>
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
    </div>
  );
}
