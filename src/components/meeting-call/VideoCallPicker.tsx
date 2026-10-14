'use client';

import { useState } from 'react';
import { CalendarPlus, Video } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatTime, meetingIsLive, relativeDayLabel } from '@/lib/advisor-crm';
import type { MeetingStatus } from '@/lib/advisor-crm';

export interface PickableMeeting {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  status: MeetingStatus;
}

/** כמה זמן לפני המועד פגישה מסומנת "עכשיו" */
const EARLY_MS = 15 * 60 * 1000;

function openCall(meetingId: string) {
  window.open(`/meeting/${encodeURIComponent(meetingId)}`, '_blank', 'noopener');
}

/** הפגישות שאפשר להיכנס לשיחה שלהן: לא בוטלו ועוד לא הסתיימו, מהקרובה */
export function joinableMeetings<T extends PickableMeeting>(meetings: T[], now = Date.now()): T[] {
  return meetings
    .filter((meeting) => meetingIsLive(meeting.status))
    .filter((meeting) => new Date(meeting.startsAt).getTime() + meeting.durationMinutes * 60 * 1000 >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * כפתור "שיחת וידאו" ללקוח אחד. השיחה תמיד שייכת לפגישה:
 *
 * - פגישה אחת שנקבעה: הכפתור פותח את השיחה שלה.
 * - כמה פגישות: נפתחת רשימה, ובוחרים לאיזו שיחה להיכנס. הקרובה למועד מסומנת.
 * - אף פגישה: `onSchedule` — בדרך כלל פתיחת קביעת פגישה.
 *
 * הרכיב לא טוען כלום בעצמו, כך שאפשר לשים אותו בכל מסך שכבר מחזיק את
 * הפגישות של הלקוח.
 */
export function VideoCallPicker({
  meetings,
  onSchedule,
  className = 'inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20',
  label = 'שיחת וידאו',
}: {
  meetings: PickableMeeting[];
  onSchedule: () => void;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const now = Date.now();
  const options = joinableMeetings(meetings, now);

  if (options.length <= 1) {
    return (
      <button
        type="button"
        onClick={() => (options[0] ? openCall(options[0].id) : onSchedule())}
        className={className}
      >
        <Video className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={className}>
          <Video className="h-4 w-4" />
          {label}
          <span className="rounded-full bg-white/20 px-1.5 text-2xs font-black">{options.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" className="w-80 p-2">
        <p className="px-2 pb-2 pt-1 text-sm font-black text-slate-900">לאיזו שיחה להתחבר?</p>
        <ul className="space-y-1">
          {options.map((meeting) => {
            const start = new Date(meeting.startsAt).getTime();
            const live = now >= start - EARLY_MS;
            return (
              <li key={meeting.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openCall(meeting.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-right transition-colors hover:bg-slate-50"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      live ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Video className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-900">{meeting.title}</span>
                    <span className="block text-xs text-slate-500">
                      {relativeDayLabel(meeting.startsAt)} · {formatTime(meeting.startsAt)} ·{' '}
                      {meeting.status === 'PROPOSED' ? 'ממתינה לאישור' : 'מאושרת'}
                    </span>
                  </span>
                  {live && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-black text-emerald-800">
                      עכשיו
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onSchedule();
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <CalendarPlus className="h-4 w-4" />
          קביעת פגישה חדשה
        </button>
      </PopoverContent>
    </Popover>
  );
}
