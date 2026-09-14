'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Check, ListChecks, MessageSquare } from 'lucide-react';
import { MeetingRow } from '@/components/advisor/MeetingRow';
import { dayKey, formatDate, formatTime, meetingIsLive, relativeDayLabel } from '@/lib/advisor-crm';
import { planStageNumber } from '@/lib/mortgage-plan';
import type { AgendaTarget, DashboardSection } from '@/lib/client-agenda';
import { ClientCalendar, eventTone } from './ClientCalendar';
import { TaskItem } from './TaskItem';
import { DashCard } from './ui';
import type { ClientDashboardData } from './useClientDashboard';

/**
 * משימות ולוח שנה — הפירוט המלא של מה שמופיע בסקירה בתמצית.
 *
 * מימין כל המשימות הפתוחות; משמאל הלוח החודשי, מה שיש ביום שנבחר, ומתחתיו
 * הפגישות עם היועץ — כאן מאשרים או דוחים מועד שהוצע.
 */
export function AgendaSection({
  data,
  initialDay,
  onNavigate,
}: {
  data: ClientDashboardData;
  /** היום שנבחר בלוח המוקטן בסקירה, אם הגיעו משם */
  initialDay?: string;
  onNavigate: (section: DashboardSection) => void;
}) {
  const { tasks, events, meetingsState, notes } = data;
  const [selected, setSelected] = useState(() => initialDay ?? dayKey(new Date()));

  const selectedEvents = useMemo(
    () => events.filter((event) => dayKey(event.at) === selected),
    [events, selected]
  );
  const live = meetingsState.meetings
    .filter((meeting) => meetingIsLive(meeting.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const awaiting = live.filter((meeting) => meeting.status === 'PROPOSED').length;
  const sortedNotes = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const go = (target: AgendaTarget) => {
    if (target.kind === 'section') onNavigate(target.section);
    else window.location.assign(target.href);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <div className="space-y-4">
        <DashCard
          title="המשימות שלי"
          icon={<ListChecks className="h-5 w-5 text-blue-600" />}
          action={
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-slate-700">
              {tasks.length}
            </span>
          }
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-6 w-6" />
              </span>
              <p className="text-base font-black text-slate-800">אין משימות פתוחות</p>
              <p className="text-sm text-slate-500">כשיהיה משהו לעשות — הוא יופיע כאן וגם בסקירה.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} onOpen={go} />
              ))}
            </div>
          )}
        </DashCard>

        {sortedNotes.length > 0 && (
          <DashCard title="הערות מהיועץ" icon={<MessageSquare className="h-5 w-5 text-blue-600" />}>
            <div className="space-y-2">
              {sortedNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{note.body}</p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    <span className="font-bold text-blue-700">{note.advisorName}</span> · שלב{' '}
                    {planStageNumber(note.stage)} · {formatDate(note.createdAt)} {formatTime(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </DashCard>
        )}
      </div>

      <div className="space-y-4">
        <DashCard title="לוח השנה" icon={<CalendarDays className="h-5 w-5 text-blue-600" />}>
          <ClientCalendar events={events} selected={selected} onSelect={setSelected} />

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-center text-sm font-black text-slate-700">
              {relativeDayLabel(new Date(`${selected}T12:00:00`))}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="mt-1 text-center text-sm text-slate-500">אין פגישות או מועדים ביום הזה</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {selectedEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => go(event.target)}
                    className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-right text-sm transition-colors hover:bg-blue-50"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${eventTone(event).dot}`} />
                    <span className="w-12 shrink-0 font-black text-slate-800">{formatTime(event.at)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-bold text-slate-900">{event.title}</span>
                      <span className="text-slate-500"> · {event.subtitle}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DashCard>

        <DashCard
          title="פגישות עם היועץ"
          icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
          action={
            awaiting > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                {awaiting} ממתינות לאישורכם
              </span>
            ) : undefined
          }
        >
          {live.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              אין פגישות פעילות. כשיועץ יציע מועד — הוא יופיע כאן, ותוכלו לאשר אותו בלחיצה.
            </p>
          ) : (
            <div className="space-y-2">
              {live.map((meeting) => (
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  viewer="client"
                  onRespond={(accepted) => void meetingsState.respond(meeting.id, accepted)}
                />
              ))}
            </div>
          )}
        </DashCard>
      </div>
    </div>
  );
}
