'use client';

import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { meetingIsLive } from '@/lib/advisor-crm';
import type { MeetingStatus } from '@/lib/advisor-crm';

/** כמה זמן לפני הפגישה הכפתור כבר מודגש כ"הצטרפות עכשיו" */
const EARLY_MS = 15 * 60 * 1000;

function joinableNow(startsAt: string, durationMinutes: number, now: number): boolean {
  const start = new Date(startsAt).getTime();
  return now >= start - EARLY_MS && now <= start + durationMinutes * 60 * 1000;
}

/**
 * הכניסה לשיחת הווידאו של פגישה, בכל מקום שהפגישה מוצגת — אצל היועץ ואצל
 * הלקוח. השיחה נפתחת בלשונית חדשה, כדי שהמסך שממנו נכנסו יישאר פתוח.
 * סמוך למועד הכפתור ירוק ובולט; לפני כן הוא שקט, אבל פעיל.
 */
export function VideoCallButton({
  meeting,
  size = 'sm',
}: {
  meeting: { id: string; startsAt: string; durationMinutes?: number; status: MeetingStatus };
  size?: 'sm' | 'md';
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!meetingIsLive(meeting.status)) return null;
  const soon = joinableNow(meeting.startsAt, meeting.durationMinutes ?? 45, now);

  return (
    <button
      type="button"
      onClick={(event) => {
        // השורה של היועץ היא קישור לכרטיס הלקוח — הלחיצה כאן לא מנווטת אליו
        event.preventDefault();
        event.stopPropagation();
        window.open(`/meeting/${encodeURIComponent(meeting.id)}`, '_blank', 'noopener');
      }}
      className={`inline-flex items-center gap-1.5 rounded-xl font-black transition-colors ${
        size === 'md' ? 'px-5 py-2.5 text-button' : 'h-8 px-3 text-[11px]'
      } ${
        soon
          ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      }`}
    >
      <Video className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {soon ? 'הצטרפות לשיחת וידאו' : 'פגישה בווידאו'}
    </button>
  );
}
