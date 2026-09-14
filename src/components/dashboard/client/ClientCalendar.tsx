'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dayKey } from '@/lib/advisor-crm';
import type { CalendarEvent } from '@/lib/client-agenda';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_FORMAT = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

/** ימי החודש המוצג, מושלמים לשבועות מלאים משני הצדדים */
function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/** הצבע של אירוע בלוח: פגישה מאושרת, פגישה שממתינה, או מועד חשוב */
export function eventTone(event: CalendarEvent): { dot: string; chip: string } {
  if (event.kind === 'deadline') {
    return { dot: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800' };
  }
  return event.confirmed
    ? { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' }
    : { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' };
}

/**
 * לוח השנה של הלקוח.
 *
 * אותו לוח משמש בשני גדלים: מוקטן בסקירה — נקודות בלבד, כדי לראות במבט אחד
 * אילו ימים תפוסים — ומלא באזור המשימות, עם שם האירוע בתוך היום.
 */
export function ClientCalendar({
  events,
  compact = false,
  selected,
  onSelect,
}: {
  events: CalendarEvent[];
  compact?: boolean;
  /** מפתח היום הנבחר (YYYY-MM-DD) */
  selected?: string;
  onSelect?: (key: string) => void;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const todayKey = dayKey(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = dayKey(event.at);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    });
    return map;
  }, [events]);

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const shiftMonth = (direction: number) =>
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));

  const navButton =
    'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="החודש הקודם" className={navButton} onClick={() => shiftMonth(-1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className={`font-black text-slate-900 ${compact ? 'text-sm' : 'text-lg'}`}>
            {MONTH_FORMAT.format(anchor)}
          </p>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setAnchor(now);
              onSelect?.(dayKey(now));
            }}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            היום
          </button>
        </div>
        <button type="button" aria-label="החודש הבא" className={navButton} onClick={() => shiftMonth(1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = dayKey(day);
          const items = byDay.get(key) ?? [];
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = key === todayKey;
          const isSelected = key === selected;

          if (compact) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect?.(key)}
                title={items.map((item) => item.title).join(', ') || undefined}
                className={`flex h-9 flex-col items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : isToday
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300'
                      : inMonth
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300'
                }`}
              >
                <span className="leading-none">{day.getDate()}</span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : eventTone(item).dot}`}
                    />
                  ))}
                </span>
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect?.(key)}
              className={`flex min-h-[76px] flex-col items-start gap-1 rounded-xl border p-1.5 text-right transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : inMonth
                    ? 'border-slate-200 bg-white hover:border-blue-300'
                    : 'border-transparent bg-slate-50/70'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${
                  isToday ? 'bg-blue-600 text-white' : inMonth ? 'text-slate-800' : 'text-slate-300'
                }`}
              >
                {day.getDate()}
              </span>
              <span className="flex w-full flex-col gap-0.5">
                {items.slice(0, 2).map((item) => (
                  <span
                    key={item.id}
                    className={`truncate rounded px-1 py-0.5 text-[11px] font-bold ${eventTone(item).chip}`}
                  >
                    {item.title}
                  </span>
                ))}
                {items.length > 2 && (
                  <span className="text-[11px] font-bold text-slate-500">+{items.length - 2}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
        <Legend dot="bg-emerald-500" label="פגישה מאושרת" />
        <Legend dot="bg-amber-500" label="ממתינה לאישורכם" />
        <Legend dot="bg-rose-500" label="מועד חשוב" />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
