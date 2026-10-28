import type { MeetingParty, MeetingStatus } from '@/lib/advisor-crm';

/** פרטי הפגישה כפי שמסך השיחה מקבל אותם מ-`/api/meetings/[id]/call` */
export interface MeetingCallDetails {
  meetingId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  role: MeetingParty;
  advisorName: string;
  clientName: string;
  clientId: string;
  clientUserId: string;
  planId: string | null;
  /** משתני LIVEKIT מוגדרים בסביבה */
  configured: boolean;
}

/** מסמך מהתיק שמוצג לשני הצדדים בשיחה */
export interface PresentedDocument {
  id: string;
  name: string;
  fileName: string;
  contentType: string;
  /** שם מי שמציג */
  by: string;
}

/**
 * ההודעות הקטנות שעוברות בין שני הצדדים בערוץ הנתונים של החדר. התוכן עצמו
 * (הודעות הצ'אט, הקבצים) נשמר בשרת שלנו; כאן עובר רק "יש משהו חדש, רעננו".
 */
export type CallSignal =
  | { t: 'chat' }
  | { t: 'docs' }
  | { t: 'present'; doc: PresentedDocument }
  | { t: 'stop' }
  | { t: 'hello' };

/** הכתובת שאליה חוזרים מהשיחה */
export function returnHref(details: Pick<MeetingCallDetails, 'role' | 'clientId'>): string {
  return details.role === 'ADVISOR' ? `/advisor-dashboard/client/${details.clientId}` : '/dashboard#agenda';
}
