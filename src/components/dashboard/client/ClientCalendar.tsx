'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { dayKey, formatTime } from '@/lib/advisor-crm';
import type { CalendarEvent } from '@/lib/client-agenda';
import { demoId } from '@/demo/demo-attr';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const WEEKDAYS_LONG = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_FORMAT = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });
const LONG_DATE = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

export type CalendarView = 'month' | 'week' | 'day';

export const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = {
  day: 'יום',
  week: 'שבוע',
  month: 'חודש',
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** ראשון–שבת של השבוע שהתאריך נמצא בו */
function weekOf(date: Date): Date[] {
  const start = addDays(startOfDay(date), -date.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** ימי החודש המוצג, מושלמים לשבועות מלאים משני הצדדים */
function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

/** הצבע של אירוע בלוח: פגישה מאושרת, פגישה שממתינה, או מועד חשוב */
export function eventTone(event: CalendarEvent): { dot: string; chip: string; card: string } {
  if (event.kind === 'deadline') {
    return { dot: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800', card: 'border-rose-200 bg-rose-50/70' };
  }
  if (event.kind === 'task') {
    return { dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-800', card: 'border-blue-200 bg-blue-50/70' };
  }
  // תשלום מתוכנן מכלי תכנון ההוצאות
  if (event.kind === 'expense') {
    return {
      dot: 'bg-violet-500',
      chip: 'bg-violet-100 text-violet-800',
      card: 'border-violet-200 bg-violet-50/70',
    };
  }
  return event.confirmed
    ? { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800', card: 'border-emerald-200 bg-emerald-50/70' }
    : { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800', card: 'border-amber-200 bg-amber-50/70' };
}

function useEventsByDay(events: CalendarEvent[]) {
  return useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = dayKey(event.at);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    });
    map.forEach((bucket) => bucket.sort((a, b) => a.at.localeCompare(b.at)));
    return map;
  }, [events]);
}

/**
 * הלוח המוקטן של הסקירה — חודש אחד, נקודות צבע בלבד. לחיצה על יום פותחת את
 * הלוח המלא על אותו יום.
 */
export function MiniCalendar({
  events,
  onSelect,
}: {
  events: CalendarEvent[];
  onSelect: (key: string) => void;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const byDay = useEventsByDay(events);
  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const todayKey = dayKey(new Date());
  const shift = (direction: number) =>
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <NavButton label="החודש הקודם" onClick={() => shift(-1)}>
          <ChevronRight className="h-4 w-4" />
        </NavButton>
        <p className="text-[15px] font-black text-slate-900">{MONTH_FORMAT.format(anchor)}</p>
        <NavButton label="החודש הבא" onClick={() => shift(1)}>
          <ChevronLeft className="h-4 w-4" />
        </NavButton>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[13px] font-bold text-slate-400">
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
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              title={items.map((item) => item.title).join(', ') || undefined}
              className={`flex h-10 flex-col items-center justify-center rounded-lg text-[15px] font-bold transition-colors ${
                isToday
                  ? 'bg-blue-600 text-white'
                  : inMonth
                    ? 'text-slate-700 hover:bg-blue-50'
                    : 'text-slate-300'
              }`}
            >
              <span className="leading-none">{day.getDate()}</span>
              <span className="mt-1 flex h-1.5 gap-0.5">
                {items.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className={`h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white' : eventTone(item).dot}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * לוח השנה המלא — חודש, שבוע או יום.
 *
 * שלוש התצוגות מציגות את אותם אירועים: פגישות עם היועץ ומועדים חשובים בתהליך.
 * לחיצה על אירוע פותחת את הפרטים שלו; לחיצה על יום בוחרת אותו.
 */
export function ClientCalendar({
  events,
  view,
  onViewChange,
  selected,
  onSelect,
  onOpen,
}: {
  events: CalendarEvent[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  /** מפתח היום הנבחר (YYYY-MM-DD) */
  selected: string;
  onSelect: (key: string) => void;
  onOpen: (event: CalendarEvent) => void;
}) {
  const [anchor, setAnchor] = useState(() => new Date(`${selected}T12:00:00`));
  const byDay = useEventsByDay(events);
  const todayKey = dayKey(new Date());

  const shift = (direction: number) => {
    const next =
      view === 'month'
        ? new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
        : addDays(anchor, direction * (view === 'week' ? 7 : 1));
    setAnchor(next);
    if (view === 'day') onSelect(dayKey(next));
  };

  /** מעבר לתצוגת יום נפתח על היום שנבחר, לא על היום שהלוח עמד עליו */
  const changeView = (next: CalendarView) => {
    if (next === 'day') setAnchor(new Date(`${selected}T12:00:00`));
    onViewChange(next);
  };

  const goToday = () => {
    const now = new Date();
    setAnchor(now);
    onSelect(dayKey(now));
  };

  const pick = (key: string) => {
    onSelect(key);
    if (view === 'day') setAnchor(new Date(`${key}T12:00:00`));
  };

  const title =
    view === 'month'
      ? MONTH_FORMAT.format(anchor)
      : view === 'week'
        ? `${SHORT_DATE.format(weekOf(anchor)[0])} – ${SHORT_DATE.format(weekOf(anchor)[6])}`
        : `${dayKey(anchor) === todayKey ? 'היום · ' : ''}${WEEKDAYS_LONG[anchor.getDay()]}, ${LONG_DATE.format(anchor)}`;

  return (
    <div {...demoId('client-calendar')}>
      {/* סרגל הניווט: תצוגה, היום, וקדימה/אחורה */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1" {...demoId('calendar-views')}>
          {(['day', 'week', 'month'] as CalendarView[]).map((option) => (
            <button
              key={option}
              type="button"
              {...demoId(`calendar-view-${option}`)}
              onClick={() => changeView(option)}
              className={`rounded-lg px-4 py-1.5 text-sm font-black transition-colors ${
                view === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {CALENDAR_VIEW_LABELS[option]}
            </button>
          ))}
        </div>

        <p className="order-last w-full text-center text-lg font-black text-slate-900 sm:order-none sm:w-auto">
          {title}
        </p>

        <div className="flex items-center gap-1">
          <NavButton label="אחורה" onClick={() => shift(-1)}>
            <ChevronRight className="h-4 w-4" />
          </NavButton>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            היום
          </button>
          <NavButton label="קדימה" onClick={() => shift(1)}>
            <ChevronLeft className="h-4 w-4" />
          </NavButton>
        </div>
      </div>

      {view === 'month' && (
        <>
          <div className="mb-1 grid grid-cols-7 text-center text-[13px] font-bold text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(anchor).map((day) => {
              const key = dayKey(day);
              const items = byDay.get(key) ?? [];
              const inMonth = day.getMonth() === anchor.getMonth();
              const isSelected = key === selected;
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => pick(key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') pick(key);
                  }}
                  className={`flex min-h-[84px] cursor-pointer flex-col gap-1 rounded-xl border p-1.5 transition-colors ${
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
                  {items.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item);
                      }}
                      className={`truncate rounded-md px-1.5 py-0.5 text-right text-xs font-bold ${eventTone(item).chip}`}
                    >
                      {formatTime(item.at)} {item.title}
                    </button>
                  ))}
                  {items.length > 2 && (
                    <span className="text-xs font-bold text-slate-500">+{items.length - 2} נוספים</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-7 gap-1.5">
          {weekOf(anchor).map((day, index) => {
            const key = dayKey(day);
            const items = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selected;
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => pick(key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') pick(key);
                }}
                className={`flex min-h-[260px] cursor-pointer flex-col rounded-xl border transition-colors ${
                  isSelected ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div
                  className={`rounded-t-xl border-b px-1 py-2 text-center ${
                    isToday ? 'border-blue-200 bg-blue-600 text-white' : 'border-slate-100 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold opacity-80">{WEEKDAYS_LONG[index]}</p>
                  <p className="text-lg font-black leading-tight">{day.getDate()}</p>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-1.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item);
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-right transition-colors hover:brightness-95 ${eventTone(item).card}`}
                    >
                      <span className="block text-xs font-black text-slate-700">{formatTime(item.at)}</span>
                      <span className="block text-[13px] font-bold leading-snug text-slate-900">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'day' && (
        <DayList
          items={byDay.get(dayKey(anchor)) ?? []}
          onOpen={onOpen}
          empty="אין פגישות או מועדים ביום הזה"
        />
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] font-semibold text-slate-500">
        <Legend dot="bg-emerald-500" label="פגישה מאושרת" />
        <Legend dot="bg-amber-500" label="ממתינה לאישורכם" />
        <Legend dot="bg-rose-500" label="מועד חשוב" />
        <Legend dot="bg-blue-500" label="משימה שלי" />
      </div>
    </div>
  );
}

/** רשימת האירועים של יום אחד — בתצוגת היום ובפאנל היום הנבחר */
export function DayList({
  items,
  onOpen,
  empty,
}: {
  items: CalendarEvent[];
  onOpen: (event: CalendarEvent) => void;
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center">
        <CalendarDays className="h-7 w-7 text-slate-300" />
        <p className="text-[15px] text-slate-500">{empty}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const tone = eventTone(item);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-right transition-colors hover:brightness-95 ${tone.card}`}
          >
            <span className="w-14 shrink-0 text-center text-base font-black text-slate-800">{formatTime(item.at)}</span>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-black text-slate-900">{item.title}</span>
              <span className="block truncate text-[13px] text-slate-600">{item.subtitle}</span>
            </span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        );
      })}
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
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
