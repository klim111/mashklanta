import type { MeetingParty, MeetingStatus } from '@/lib/advisor-crm';

/** פרטי הפגישה כפי שמסך השיחה מקבל אותם מ-`/api/meetings/[id]/call` */
export interface MeetingCallDetails {
  /**
   * פגישה עם לקוח רשום, או פגישת אורח בלינק חד-פעמי (src/lib/guest-meetings.ts).
   * בפגישת אורח הצ'אט והקבצים עוברים בערוץ של השיחה בלבד, ולא נשמרים
   */
  kind?: 'client' | 'guest';
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
  /** פגישת אורח: מתי הלינק פג — השיחה נסגרת אצל האורח ברגע הזה */
  endsAt?: string;
  guestState?: 'cancelled' | 'early' | 'open' | 'expired';
  /** פגישת אורח, אצל היועץ: הנתיב של הלינק, להעתקה */
  linkPath?: string;
  /** תיק הלקוח המתעניין שנפתח לאורח במהלך הפגישה */
  prospectClientId?: string | null;
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
  | { t: 'hello' }
  /** פגישת אורח: הודעת צ'אט שעוברת רק בערוץ של השיחה */
  | { t: 'msg'; id: string; by: string; text: string; at: string }
  /** פגישת אורח: לאיזו תיקייה בתיק לדוגמה שייך קובץ שעבר בשיחה */
  | { t: 'file'; id: string; category: string };

/** הכתובת שאליה חוזרים מהשיחה */
export function returnHref(details: Pick<MeetingCallDetails, 'role' | 'clientId' | 'kind'>): string {
  if (details.kind === 'guest') {
    if (details.role !== 'ADVISOR') return '/';
    return details.clientId ? `/advisor-dashboard/client/${details.clientId}` : '/advisor-dashboard?tab=calendar';
  }
  return details.role === 'ADVISOR' ? `/advisor-dashboard/client/${details.clientId}` : '/dashboard#agenda';
}
