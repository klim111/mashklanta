'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
 * הוא מרכז את כל מה שיש לו מועד: המשימות שקבע להן תאריך בשלבים של כל לקוח,
 * והפגישות שהציע — המתוכננות והמאושרות כאחד.
 */
export function CalendarPanel({
  clients,
  onChanged,
}: {
  clients: AdvisorClient[];
  onChanged?: () => void;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [meetingOpen, setMeetingOpen] = useState(false);

  const { tasks, ready: tasksReady, update } = useAdvisorTasks({ includeClosed: true });
  const { meetings, ready: meetingsReady, propose, cancel } = useMeetings();

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

  const shiftMonth = (direction: number) => {
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  return (
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
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setMeetingOpen(true)}>
            <CalendarPlus className="ml-1 h-3.5 w-3.5" />
            פגישה חדשה
          </Button>
        }
      >
        {selectedItems.meetings.length === 0 && selectedItems.tasks.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="אין כלום ביום הזה"
            hint="קבעו פגישה עם לקוח, או תנו תאריך למשימה בשלב שבו הוא נמצא."
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

      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
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
