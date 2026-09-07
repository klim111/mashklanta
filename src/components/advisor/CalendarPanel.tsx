'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dayKey, relativeDayLabel, meetingIsLive } from '@/lib/advisor-crm';
import type { AdvisorMeetingView, AdvisorTaskView } from '@/lib/advisor-crm';
import { EmptyState, SectionCard } from './ui';
import { MeetingRow } from './MeetingRow';
import { TaskRow } from './TaskRow';
import { MeetingDialog } from './MeetingDialog';
import { useAdvisorTasks, useMeetings } from './useAdvisorCrm';
import type { AdvisorClient } from './useAdvisorClients';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_FORMAT = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

/** הערך שמסמן בבורר הלקוח את הפריטים שאינם משויכים לאף לקוח */
const UNASSIGNED = 'none';

/** טווח התאריכים של הרשימה שמתחת ללוח */
type Range = 'upcoming' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  upcoming: 'מכאן והלאה',
  week: 'השבוע הקרוב',
  month: 'החודש המוצג',
  all: 'הכול',
};

/** ימי החודש המוצג, כולל ההשלמה לשבועות שלמים משני הצדדים */
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

/**
 * לוח השנה של היועץ.
 *
 * הוא מרכז את כל מה שיש לו מועד: המשימות שקבע להן תאריך — של לקוחות ושל עצמו,
 * בלי שיוך — והפגישות שהציע, המתוכננות והמאושרות כאחד. אותם נתונים מוצגים
 * בשתי צורות: בלוח החודשי, ומתחתיו כרשימה לפי מועד; והסינון לפי לקוח ולפי טווח
 * תאריכים חל על שתיהן יחד.
 */
export function CalendarPanel({
  clients,
  onChanged,
  initialClientId,
}: {
  clients: AdvisorClient[];
  onChanged?: () => void;
  /** לקוח שהגיעו אליו מדף הלקוח — הלוח נפתח מסונן אליו */
  initialClientId?: string;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState(initialClientId ?? '');
  const [range, setRange] = useState<Range>('upcoming');

  useEffect(() => {
    if (initialClientId) setClientFilter(initialClientId);
  }, [initialClientId]);

  const { tasks, ready: tasksReady, update } = useAdvisorTasks({
    includeClosed: true,
    clientId: clientFilter || undefined,
  });
  const { meetings: allMeetings, ready: meetingsReady, propose, cancel } = useMeetings();

  // פגישה תמיד שייכת ללקוח, ולכן סינון ל"בלי שיוך" משאיר משימות בלבד
  const meetings = useMemo(() => {
    if (clientFilter === UNASSIGNED) return [];
    if (!clientFilter) return allMeetings;
    return allMeetings.filter((meeting) => meeting.clientId === clientFilter);
  }, [allMeetings, clientFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, { tasks: AdvisorTaskView[]; meetings: AdvisorMeetingView[] }>();
    const bucket = (key: string) => {
      const found = map.get(key);
      if (found) return found;
      const created = { tasks: [] as AdvisorTaskView[], meetings: [] as AdvisorMeetingView[] };
      map.set(key, created);
      return created;
    };

    tasks.forEach((task) => {
      if (task.dueDate) bucket(dayKey(task.dueDate)).tasks.push(task);
    });
    meetings.forEach((meeting) => {
      if (meetingIsLive(meeting.status)) bucket(dayKey(meeting.startsAt)).meetings.push(meeting);
    });

    return map;
  }, [tasks, meetings]);

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const todayKey = dayKey(new Date());
  const selectedItems = byDay.get(selected) ?? { tasks: [], meetings: [] };
  const ready = tasksReady && meetingsReady;

  /** כל הפריטים שיש להם מועד, בטווח שנבחר, ממוינים לפי זמן */
  const listed = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekEnd = new Date(startOfToday);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const inRange = (value: string) => {
      const at = new Date(value);
      if (range === 'all') return true;
      if (range === 'upcoming') return at >= startOfToday;
      if (range === 'week') return at >= startOfToday && at < weekEnd;
      return at.getFullYear() === anchor.getFullYear() && at.getMonth() === anchor.getMonth();
    };

    const items: Array<
      { at: string } & ({ kind: 'task'; task: AdvisorTaskView } | { kind: 'meeting'; meeting: AdvisorMeetingView })
    > = [];

    tasks.forEach((task) => {
      if (task.dueDate && inRange(task.dueDate)) items.push({ at: task.dueDate, kind: 'task', task });
    });
    meetings.forEach((meeting) => {
      if (meetingIsLive(meeting.status) && inRange(meeting.startsAt)) {
        items.push({ at: meeting.startsAt, kind: 'meeting', meeting });
      }
    });

    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [tasks, meetings, range, anchor]);

  const listedByDay = useMemo(() => {
    const map = new Map<string, typeof listed>();
    listed.forEach((item) => {
      const key = dayKey(item.at);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    });
    return Array.from(map.entries());
  }, [listed]);

  const shiftMonth = (direction: number) => {
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={clientFilter}
        onChange={(event) => setClientFilter(event.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
        aria-label="סינון לפי לקוח"
      >
        <option value="">כל הלקוחות</option>
        <option value={UNASSIGNED}>ללא שיוך ללקוח</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
      <select
        value={range}
        onChange={(event) => setRange(event.target.value as Range)}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
        aria-label="סינון לפי תאריך"
      >
        {(Object.keys(RANGE_LABELS) as Range[]).map((option) => (
          <option key={option} value={option}>
            {RANGE_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black text-slate-900">
          <CalendarDays className="h-4 w-4 text-blue-600" />
          לוח השנה שלי
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
            {listed.length} פריטים בטווח
          </span>
        </p>
        {filters}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard
          title={MONTH_FORMAT.format(anchor)}
          icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
          action={
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="החודש הקודם"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  const now = new Date();
                  setAnchor(now);
                  setSelected(dayKey(now));
                }}
              >
                היום
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="החודש הבא"
                onClick={() => shiftMonth(1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          {!ready ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = dayKey(day);
                  const items = byDay.get(key);
                  const inMonth = day.getMonth() === anchor.getMonth();
                  const isSelected = key === selected;
                  const isToday = key === todayKey;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      className={`flex min-h-[68px] flex-col items-start gap-1 rounded-xl border p-1.5 text-right transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : inMonth
                            ? 'border-slate-200 bg-white hover:border-blue-300'
                            : 'border-transparent bg-slate-50/60'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : inMonth
                              ? 'text-slate-700'
                              : 'text-slate-300'
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      <span className="flex w-full flex-col gap-0.5">
                        {items?.meetings.slice(0, 2).map((meeting) => (
                          <span
                            key={meeting.id}
                            className={`truncate rounded px-1 py-0.5 text-[9px] font-bold ${
                              meeting.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {meeting.clientName}
                          </span>
                        ))}
                        {items && items.tasks.length > 0 && (
                          <span className="truncate rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-800">
                            {items.tasks.length} משימות
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title={relativeDayLabel(new Date(`${selected}T12:00:00`))}
          icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
          action={
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setMeetingOpen(true)}
            >
              <CalendarPlus className="ml-1 h-3.5 w-3.5" />
              פגישה חדשה
            </Button>
          }
        >
          {selectedItems.meetings.length === 0 && selectedItems.tasks.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="אין כלום ביום הזה"
              hint="קבעו פגישה עם לקוח, או תנו תאריך למשימה — גם למשימה שלכם, בלי שיוך ללקוח."
            />
          ) : (
            <div className="space-y-3">
              {selectedItems.meetings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500">פגישות</p>
                  {selectedItems.meetings.map((meeting) => (
                    <MeetingRow
                      key={meeting.id}
                      meeting={meeting}
                      viewer="advisor"
                      onCancel={async () => {
                        await cancel(meeting.id);
                        onChanged?.();
                      }}
                    />
                  ))}
                </div>
              )}

              {selectedItems.tasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500">משימות</p>
                  {selectedItems.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      showClient
                      onToggle={async (status) => {
                        await update(task.id, { status });
                        onChanged?.();
                      }}
                      onReschedule={async (dueDate) => {
                        await update(task.id, { dueDate });
                        onChanged?.();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* אותם נתונים כרשימה — כשרוצים לקרוא את סדר היום ברצף ולא בלוח */}
      <SectionCard
        title={`הרשימה · ${RANGE_LABELS[range]}`}
        icon={<ListChecks className="h-4 w-4 text-blue-600" />}
      >
        {listedByDay.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="אין פריטים בטווח שנבחר"
            hint="שנו את הסינון, או הוסיפו משימה ופגישה עם מועד."
          />
        ) : (
          <div className="space-y-4">
            {listedByDay.map(([key, items]) => (
              <div key={key} className="space-y-2">
                <p className="text-[11px] font-black text-slate-500">
                  {relativeDayLabel(new Date(`${key}T12:00:00`))}
                </p>
                {items.map((item) =>
                  item.kind === 'meeting' ? (
                    <MeetingRow
                      key={item.meeting.id}
                      meeting={item.meeting}
                      viewer="advisor"
                      onCancel={async () => {
                        await cancel(item.meeting.id);
                        onChanged?.();
                      }}
                    />
                  ) : (
                    <TaskRow
                      key={item.task.id}
                      task={item.task}
                      showClient
                      onToggle={async (status) => {
                        await update(item.task.id, { status });
                        onChanged?.();
                      }}
                      onReschedule={async (dueDate) => {
                        await update(item.task.id, { dueDate });
                        onChanged?.();
                      }}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        clientId={clientFilter && clientFilter !== UNASSIGNED ? clientFilter : undefined}
        clients={clients.map((client) => ({ id: client.id, name: client.name }))}
        onSubmit={async (input) => {
          const failure = await propose(input);
          if (!failure) onChanged?.();
          return failure;
        }}
      />
    </div>
  );
}
