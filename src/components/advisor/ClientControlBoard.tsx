'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  History,
  ListChecks,
  Mail,
  MessageCircle,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dayKey, formatTime, meetingIsLive, relativeDayLabel } from '@/lib/advisor-crm';
import type { AdvisorMeetingView, AdvisorTaskView, MeetingReply } from '@/lib/advisor-crm';
import type { ClientActivity } from '@/lib/client-activity';
import { EmptyState, SectionCard } from './ui';
import { MeetingRow } from './MeetingRow';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_FORMAT = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
const WHEN = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

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

const meetingEnd = (meeting: AdvisorMeetingView) =>
  new Date(meeting.startsAt).getTime() + meeting.durationMinutes * 60 * 1000;

/**
 * לוח הבקרה של לקוח אחד: השיחות שנקבעו איתו — כל אחת עם כפתור הצטרפות משלה,
 * כך שכשנקבעו כמה שיחות בוחרים לאיזו להתחבר — לוח שנה עם הפגישות והמשימות
 * שלו, וההודעות האחרונות ממנו.
 */
export function ClientControlBoard({
  activity,
  meetings,
  tasks,
  onOpenChat,
  onScheduleMeeting,
  onCancelMeeting,
  onAnswerMeeting,
}: {
  activity: ClientActivity | null;
  meetings: AdvisorMeetingView[];
  tasks: AdvisorTaskView[];
  onOpenChat?: () => void;
  onScheduleMeeting: () => void;
  onCancelMeeting: (meetingId: string) => void;
  onAnswerMeeting: (meetingId: string, reply: MeetingReply) => Promise<string | null | void> | void;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [showPast, setShowPast] = useState(false);

  const now = Date.now();
  const live = useMemo(() => meetings.filter((meeting) => meetingIsLive(meeting.status)), [meetings]);
  const upcoming = useMemo(
    () => live.filter((meeting) => meetingEnd(meeting) >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [live, now]
  );
  const past = useMemo(
    () =>
      meetings
        .filter((meeting) => !meetingIsLive(meeting.status) || meetingEnd(meeting) < now)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [meetings, now]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, { meetings: AdvisorMeetingView[]; tasks: AdvisorTaskView[] }>();
    const bucket = (key: string) => {
      const found = map.get(key);
      if (found) return found;
      const created = { meetings: [] as AdvisorMeetingView[], tasks: [] as AdvisorTaskView[] };
      map.set(key, created);
      return created;
    };
    live.forEach((meeting) => bucket(dayKey(meeting.startsAt)).meetings.push(meeting));
    tasks.forEach((task) => {
      if (task.dueDate && task.status !== 'CANCELLED') bucket(dayKey(task.dueDate)).tasks.push(task);
    });
    return map;
  }, [live, tasks]);

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const todayKey = dayKey(new Date());
  const selectedItems = byDay.get(selected) ?? { meetings: [], tasks: [] };
  const shiftMonth = (delta: number) =>
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <div className="space-y-5">
      <SectionCard
        title={`השיחות שנקבעו${upcoming.length ? ` (${upcoming.length})` : ''}`}
        icon={<Video className="h-4 w-4 text-blue-600" />}
        action={
          <Button size="sm" variant="outline" className="text-button" onClick={onScheduleMeeting}>
            <CalendarPlus className="ml-1 h-4 w-4" />
            קביעת פגישה
          </Button>
        }
      >
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<Video className="h-6 w-6" />}
            title="אין שיחות קרובות"
            hint="שיחת וידאו תמיד שייכת לפגישה. קבעו פגישה, והכפתור להצטרפות יופיע כאן."
          />
        ) : (
          <div className="space-y-2">
            {upcoming.length > 1 && (
              <p className="text-2xs text-slate-500">נקבעו כמה שיחות — בחרו לאיזו להתחבר בכפתור שבשורה שלה.</p>
            )}
            {upcoming.map((meeting) => (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                viewer="advisor"
                linkToClient={false}
                onCancel={() => onCancelMeeting(meeting.id)}
                onAnswer={(reply) => onAnswerMeeting(meeting.id, reply)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          title="לוח שנה"
          icon={<CalendarDays className="h-4 w-4 text-violet-600" />}
          action={
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => shiftMonth(-1)} aria-label="החודש הקודם">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="min-w-[7rem] text-center text-info font-bold text-slate-800">
                {MONTH_FORMAT.format(anchor)}
              </span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => shiftMonth(1)} aria-label="החודש הבא">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-2xs font-bold text-slate-400">
                {day}
              </span>
            ))}
            {days.map((day) => {
              const key = dayKey(day);
              const items = byDay.get(key);
              const inMonth = day.getMonth() === anchor.getMonth();
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`flex min-h-[3.25rem] flex-col items-center gap-1 rounded-lg border p-1 transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : key === todayKey
                        ? 'border-blue-200 bg-white'
                        : 'border-transparent hover:bg-slate-50'
                  } ${inMonth ? 'text-slate-800' : 'text-slate-300'}`}
                >
                  <span className="text-2xs font-bold">{day.getDate()}</span>
                  <span className="flex gap-0.5">
                    {items?.meetings.length ? <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> : null}
                    {items?.tasks.length ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-2xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              פגישה
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              משימה
            </span>
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            <p className="text-2xs font-bold text-slate-500">{relativeDayLabel(selected + 'T12:00:00')}</p>
            {selectedItems.meetings.length === 0 && selectedItems.tasks.length === 0 ? (
              <p className="text-info text-slate-500">אין פגישות או משימות ביום הזה.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedItems.meetings.map((meeting) => (
                  <li key={meeting.id} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-info">
                    <Video className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="font-bold text-slate-900">{formatTime(meeting.startsAt)}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{meeting.title}</span>
                  </li>
                ))}
                {selectedItems.tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-info">
                    <ListChecks className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="font-bold text-slate-900">{task.dueDate ? formatTime(task.dueDate) : ''}</span>
                    <span
                      className={`min-w-0 flex-1 truncate ${
                        task.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}
                    >
                      {task.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={`הודעות ממנו${activity?.counts.unread ? ` · ${activity.counts.unread} שלא נקראו` : ''}`}
          icon={<MessageCircle className="h-4 w-4 text-violet-600" />}
          action={
            onOpenChat ? (
              <Button size="sm" variant="outline" className="text-button" onClick={onOpenChat}>
                <MessageCircle className="ml-1 h-4 w-4" />
                לשיחה
              </Button>
            ) : undefined
          }
        >
          {!activity || activity.messages.length === 0 ? (
            <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="עדיין אין הודעות מהלקוח" />
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {activity.messages.map((message) => (
                <li
                  key={`${message.kind}-${message.id}`}
                  className={`rounded-xl border p-3 ${message.read ? 'border-slate-200' : 'border-violet-300 bg-violet-50/50'}`}
                >
                  <p className="flex items-center gap-1.5 text-2xs text-slate-500">
                    {message.kind === 'EMAIL' ? <Mail className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                    {message.kind === 'EMAIL' ? 'מייל' : "צ'אט"} · {WHEN.format(new Date(message.at))}
                    {!message.read && <span className="font-bold text-violet-700">· חדש</span>}
                  </p>
                  {message.subject && <p className="mt-1 text-info font-bold text-slate-900">{message.subject}</p>}
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-info text-slate-700">{message.body}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={`פגישות קודמות (${past.length})`}
        icon={<History className="h-4 w-4 text-slate-500" />}
        action={
          past.length > 0 ? (
            <Button size="sm" variant="ghost" className="text-button" onClick={() => setShowPast((open) => !open)}>
              {showPast ? 'הסתרה' : 'הצגה'}
            </Button>
          ) : undefined
        }
      >
        {past.length === 0 ? (
          <p className="text-info text-slate-500">עדיין אין פגישות שהסתיימו או בוטלו.</p>
        ) : showPast ? (
          <div className="space-y-2">
            {past.map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} viewer="advisor" linkToClient={false} />
            ))}
          </div>
        ) : (
          <p className="text-info text-slate-500">
            האחרונה: {past[0].title} · {relativeDayLabel(past[0].startsAt)} {formatTime(past[0].startsAt)}
          </p>
        )}
      </SectionCard>
    </div>
  );
}
