import { meetingIsLive } from '@/lib/advisor-crm';
import type { AdvisorMeetingView } from '@/lib/advisor-crm';

type AlertableMeeting = Pick<AdvisorMeetingView, 'id' | 'startsAt' | 'durationMinutes' | 'status' | 'proposedBy'>;

/**
 * המפתח של התראה: הפגישה והמועד שלה. פגישה שהיועץ הזיז מקבלת מפתח חדש,
 * ולכן הלקוח מקבל עליה התראה שוב.
 */
export function meetingAlertKey(meeting: Pick<AlertableMeeting, 'id' | 'startsAt'>): string {
  return `${meeting.id}@${meeting.startsAt}`;
}

/**
 * הפגישות שהלקוח עוד לא ראה עליהן התראה, מהקרובה: פגישות פעילות שעוד לא
 * הסתיימו. מועד שהלקוח עצמו הציע ועוד לא אושר לא מתריע — הוא כבר יודע עליו.
 */
export function pendingMeetingAlerts<T extends AlertableMeeting>(
  meetings: T[],
  seen: ReadonlySet<string>,
  now = Date.now()
): T[] {
  return meetings
    .filter((meeting) => meetingIsLive(meeting.status))
    .filter((meeting) => !(meeting.status === 'PROPOSED' && meeting.proposedBy === 'CLIENT'))
    .filter((meeting) => new Date(meeting.startsAt).getTime() + meeting.durationMinutes * 60 * 1000 > now)
    .filter((meeting) => !seen.has(meetingAlertKey(meeting)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
