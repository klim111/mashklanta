'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HE_MONTH, WEEKDAYS, dayKey } from './theme';

export interface DayMarker {
  /** כמה תשלומים ביום */
  count: number;
  /** סכום התשלומים ביום */
  amount: number;
  /** הגוון של הקטגוריה הדומיננטית ביום */
  hex: string;
}

/**
 * לוח חודשי אחד, שמשרת גם את בחירת תאריך היעד וגם את לוח התשלומים.
 *
 * הימים שיש בהם תשלום מסומנים בנקודה בצבע הקטגוריה הדומיננטית ובמספר
 * התשלומים, ולחיצה עליהם מסננת את הטבלה לאותו יום.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  markers,
  selected,
  onSelect,
  compact = false,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  markers?: Map<string, DayMarker>;
  selected: string | null;
  onSelect: (key: string) => void;
  compact?: boolean;
}) {
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const todayKey = dayKey(new Date());
  const shift = (direction: number) =>
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + direction, 1));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="החודש הקודם"
          onClick={() => shift(-1)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="text-sm font-black text-slate-900">{HE_MONTH.format(month)}</p>
        <button
          type="button"
          aria-label="החודש הבא"
          onClick={() => shift(1)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const key = dayKey(date);
          const marker = markers?.get(key);
          const inMonth = date.getMonth() === month.getMonth();
          const isSelected = selected === key;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              title={marker ? `${marker.count} תשלומים · ₪${Math.round(marker.amount).toLocaleString('he-IL')}` : undefined}
              className={`relative flex flex-col items-center justify-center rounded-xl border text-[13px] font-bold transition-all ${
                compact ? 'h-9' : 'h-11'
              } ${
                isSelected
                  ? 'border-transparent bg-slate-900 text-white shadow-md'
                  : marker
                    ? 'border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
                    : `border-transparent bg-slate-50 hover:bg-slate-100 ${inMonth ? 'text-slate-600' : 'text-slate-300'}`
              }`}
            >
              <span className={isToday && !isSelected ? 'text-blue-600' : undefined}>
                {date.getDate()}
              </span>
              {marker && (
                <span
                  className="mt-0.5 block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: isSelected ? '#ffffff' : marker.hex }}
                />
              )}
              {marker && marker.count > 1 && (
                <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white">
                  {marker.count}
                </span>
              )}
              {isToday && !isSelected && !marker && (
                <span className="mt-0.5 block h-1 w-1 rounded-full bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
