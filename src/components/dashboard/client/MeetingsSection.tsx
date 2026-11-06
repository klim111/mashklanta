'use client';

import { CalendarCheck2, CalendarDays, Clock, History, MapPin, UserRound } from 'lucide-react';
import {
  formatDate,
  formatTime,
  meetingAwaits,
  meetingIsLive,
  meetingStatusLabel,
  relativeDayLabel,
} from '@/lib/advisor-crm';
import type { AdvisorMeetingView } from '@/lib/advisor-crm';
import { StageChip } from '@/components/advisor/ui';
import type { useMeetings } from '@/components/advisor/useAdvisorCrm';
import { ClientMeetingAnswer } from '@/components/plan/advisor/ClientMeetingAnswer';
import { DashCard } from './ui';

type MeetingsState = ReturnType<typeof useMeetings>;

function endsAt(meeting: AdvisorMeetingView): number {
  return new Date(meeting.startsAt).getTime() + meeting.durationMinutes * 60 * 1000;
}

/** פגישות פעילות שעוד לא הסתיימו, מהקרובה */
export function upcomingClientMeetings(meetings: AdvisorMeetingView[], now = Date.now()): AdvisorMeetingView[] {
  return meetings
    .filter((meeting) => meetingIsLive(meeting.status) && endsAt(meeting) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * "הפגישות שלי": כל הפגישות עם היועץ במקום אחד. בקרובות אפשר לאשר מועד,
 * להציע מועד אחר ולהיכנס לשיחת הווידאו; למטה — מה שכבר התקיים או בוטל.
 */
export function MeetingsSection({ meetingsState }: { meetingsState: MeetingsState }) {
  const { meetings, ready, answer } = meetingsState;
  const now = Date.now();
  const upcoming = upcomingClientMeetings(meetings, now);
  const upcomingIds = new Set(upcoming.map((meeting) => meeting.id));
  const past = meetings
    .filter((meeting) => !upcomingIds.has(meeting.id))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <DashCard title="פגישות קרובות" icon={<CalendarCheck2 className="h-5 w-5 text-emerald-600" />}>
        <div className="space-y-3 p-4">
          {!ready ? (
            <p className="py-6 text-center text-sm text-slate-500">טוען את הפגישות…</p>
          ) : upcoming.length === 0 ? (
            <p className="py-6 text-center text-info text-slate-500">
              אין כרגע פגישות קרובות. כשהיועץ יקבע פגישה, היא תופיע כאן ובלוח השנה.
            </p>
          ) : (
            upcoming.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} onAnswer={(reply) => answer(meeting.id, reply)} />
            ))
          )}
        </div>
      </DashCard>

      {past.length > 0 && (
        <DashCard title="פגישות קודמות" icon={<History className="h-5 w-5 text-slate-500" />}>
          <ul className="divide-y divide-slate-100">
            {past.map((meeting) => (
              <li key={meeting.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-right">
                <span className="min-w-0 flex-1 truncate font-bold text-slate-800">{meeting.title}</span>
                <span className="text-sm text-slate-500">
                  {formatDate(meeting.startsAt)} · {formatTime(meeting.startsAt)}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {meetingIsLive(meeting.status) ? 'התקיימה' : meetingStatusLabel(meeting, 'CLIENT')}
                </span>
              </li>
            ))}
          </ul>
        </DashCard>
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  onAnswer,
}: {
  meeting: AdvisorMeetingView;
  onAnswer: Parameters<typeof ClientMeetingAnswer>[0]['onAnswer'];
}) {
  const awaitsMe = meetingAwaits(meeting, 'CLIENT');
  return (
    <article
      className={`rounded-2xl border p-4 text-right ${awaitsMe ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-emerald-700">
            {relativeDayLabel(meeting.startsAt)}, {formatDate(meeting.startsAt)} · {formatTime(meeting.startsAt)}
          </p>
          <h3 className="mt-0.5 text-subtitle font-black text-slate-900">{meeting.title}</h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
            awaitsMe ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {meetingStatusLabel(meeting, 'CLIENT')}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <UserRound className="h-4 w-4" />
          {meeting.advisorName}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {meeting.durationMinutes} דקות
        </span>
        {meeting.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {meeting.location}
          </span>
        )}
        {meeting.stage && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <StageChip stage={meeting.stage} />
          </span>
        )}
      </div>
      {meeting.note && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{meeting.note}</p>}

      <div className="mt-3">
        <ClientMeetingAnswer meeting={meeting} allowDecline onAnswer={onAnswer} />
      </div>
    </article>
  );
}
