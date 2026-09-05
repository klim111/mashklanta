'use client';

import { CalendarDays } from 'lucide-react';
import { meetingIsLive } from '@/lib/advisor-crm';
import { MeetingRow } from '@/components/advisor/MeetingRow';
import { useMeetings } from '@/components/advisor/useAdvisorCrm';

/**
 * הפגישות שהיועץ הציע ללקוח.
 *
 * אישור המועד כאן הוא מה שהופך את הפגישה למאושרת בלוח השנה של היועץ — ולכן
 * הכרטיס מופיע רק כשיש פגישה פעילה, ולא כרעש קבוע באזור האישי.
 */
export function ClientMeetings() {
  const { meetings, ready, respond } = useMeetings();
  const live = meetings.filter((meeting) => meetingIsLive(meeting.status));

  if (!ready || live.length === 0) return null;

  const awaiting = live.filter((meeting) => meeting.status === 'PROPOSED').length;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <CalendarDays className="h-4 w-4 text-blue-600" />
          פגישות עם היועץ
        </h2>
        {awaiting > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            {awaiting} ממתינות לאישור שלכם
          </span>
        )}
      </header>

      <div className="space-y-2 p-4">
        {live.map((meeting) => (
          <MeetingRow
            key={meeting.id}
            meeting={meeting}
            viewer="client"
            onRespond={(accepted) => void respond(meeting.id, accepted)}
          />
        ))}
      </div>
    </section>
  );
}
