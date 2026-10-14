/**
 * לוח הבקרה של היועץ — הטיפוסים, התוויות והעזרים המשותפים לשרת ולדפדפן.
 *
 * הקובץ טהור בכוונה, בדיוק כמו `client-process.ts`: הוא נטען גם במסלולי ה-API
 * וגם ברכיבי הלקוח, ולכן אינו מייבא את Prisma.
 *
 * השלבים כאן הם חמשת השלבים של כלי תכנון המשכנתא (`PLAN_STAGES`) — לא רצף
 * נפרד ליועץ. כך כל משימה, הערה או פגישה של היועץ יושבת על אותו שלב שהלקוח
 * רואה אצלו בתהליך.
 */

import { PLAN_STAGES } from './mortgage-plan';
import type { PlanStageId } from './mortgage-plan';

export { PLAN_STAGES };
export type { PlanStageId };

// ───────────────────────────────── משימות ─────────────────────────────────

export const ADVISOR_TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export type AdvisorTaskStatus = (typeof ADVISOR_TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<AdvisorTaskStatus, string> = {
  OPEN: 'פתוחה',
  IN_PROGRESS: 'בטיפול',
  DONE: 'הושלמה',
  CANCELLED: 'בוטלה',
};

/** משימה שכבר אינה דורשת פעולה — לא נספרת במונים ולא מוצגת כפתוחה */
export function taskIsClosed(status: AdvisorTaskStatus): boolean {
  return status === 'DONE' || status === 'CANCELLED';
}

export interface AdvisorTaskView {
  id: string;
  /** הלקוח שהמשימה שייכת לו, או null כשהיא משימה של היועץ בלי שיוך */
  clientId: string | null;
  clientName: string | null;
  stage: PlanStageId;
  title: string;
  details: string | null;
  /** ISO. התאריך והשעה שהיועץ קבע — זה מה שמציב את המשימה בלוח השנה */
  dueDate: string | null;
  status: AdvisorTaskStatus;
  completedAt: string | null;
  createdAt: string;
}

/**
 * המשימות שהיועץ עושה בכל שלב, כפי שהן מוצעות לו בלחיצה אחת.
 *
 * זו רק נקודת פתיחה: היועץ יכול לכתוב כל משימה שירצה, והתבניות רק חוסכות
 * הקלדה של הדברים שחוזרים אצל כל לקוח.
 */
export const STAGE_TASK_TEMPLATES: Record<PlanStageId, string[]> = {
  ANALYSIS: [
    'שיחת היכרות ואיסוף פרטי משק הבית',
    'בדיקת יכולת ההחזר וההון העצמי',
    'בקשת דוח נתוני אשראי ותדפיסי בנק',
    'אימות ההכנסות מול תלושים או שומות',
  ],
  APPLICATIONS: [
    'השלמת תיק המסמכים להגשה',
    'בחירת הבנקים שאליהם מגישים',
    'הגשת הבקשה לאישור עקרוני',
    'מעקב אחרי קבלת האישור העקרוני',
  ],
  MIX: [
    'בניית תמהיל ראשוני ללקוח',
    'הצגת חלופות והשוואה מול הלקוח',
    'התאמת התמהיל להחזר החודשי שנבחר',
  ],
  AUCTION: [
    'הזנת ההצעות שהתקבלו מהבנקים',
    'משא ומתן על הריביות',
    'בחירת ההצעה הזוכה יחד עם הלקוח',
  ],
  SIGNING: [
    'בדיקת מסמכי המשכנתא לפני החתימה',
    'תיאום מועד החתימה בבנק',
    'וידוא ביטוח חיים, ביטוח מבנה ורישום בטוחות',
    'מעקב אחרי הביצוע והעברת הכספים',
  ],
};

// ───────────────────────────────── הערות ─────────────────────────────────

export const NOTE_VISIBILITIES = ['PRIVATE', 'SHARED'] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];

export const NOTE_VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  PRIVATE: 'הערה אישית',
  SHARED: 'נשלחה ללקוח',
};

export interface AdvisorNoteView {
  id: string;
  clientId: string;
  stage: PlanStageId;
  body: string;
  visibility: NoteVisibility;
  /** שם היועץ שכתב את ההערה — מוצג ללקוח לצד ההערה */
  advisorName: string;
  createdAt: string;
}

// ───────────────────────────────── פגישות ─────────────────────────────────

export const MEETING_STATUSES = ['PROPOSED', 'CONFIRMED', 'DECLINED', 'CANCELLED'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  PROPOSED: 'ממתינה לאישור',
  CONFIRMED: 'פגישה מאושרת',
  DECLINED: 'המועד נדחה',
  CANCELLED: 'הפגישה בוטלה',
};

/** פגישה שעדיין תופסת מקום ביומן */
export function meetingIsLive(status: MeetingStatus): boolean {
  return status === 'PROPOSED' || status === 'CONFIRMED';
}

/** שני הצדדים לפגישה */
export type MeetingParty = 'ADVISOR' | 'CLIENT';

/**
 * הצד שהפגישה ממתינה לו — מי שלא הציע את המועד הנוכחי. ריק כשהפגישה כבר
 * מאושרת, נדחתה או בוטלה.
 */
export function meetingAwaiting(meeting: Pick<AdvisorMeetingView, 'status' | 'proposedBy'>): MeetingParty | null {
  if (meeting.status !== 'PROPOSED') return null;
  return meeting.proposedBy === 'CLIENT' ? 'ADVISOR' : 'CLIENT';
}

/** הפגישה ממתינה לתשובה של הצד הזה */
export function meetingAwaits(
  meeting: Pick<AdvisorMeetingView, 'status' | 'proposedBy'>,
  party: MeetingParty
): boolean {
  return meetingAwaiting(meeting) === party;
}

/** הסטטוס כפי שכל צד רואה אותו: למי הפגישה ממתינה, ומי הציע את המועד */
export function meetingStatusLabel(
  meeting: Pick<AdvisorMeetingView, 'status' | 'proposedBy'>,
  viewer: MeetingParty
): string {
  const awaiting = meetingAwaiting(meeting);
  if (!awaiting) return MEETING_STATUS_LABELS[meeting.status];
  if (viewer === 'ADVISOR') {
    return awaiting === 'ADVISOR' ? 'הלקוח הציע מועד · ממתינה לאישורך' : 'ממתינה לאישור הלקוח';
  }
  return awaiting === 'CLIENT' ? 'ממתינה לאישורכם' : 'הצעתם מועד · ממתינה לאישור היועץ';
}

/** תשובה של אחד הצדדים לפגישה */
export type MeetingAnswer =
  | { action: 'accept' }
  | { action: 'propose'; startsAt: Date }
  | { action: 'decline' };

/** אותה תשובה כפי שהמסך שולח אותה לשרת — המועד כמחרוזת ISO */
export type MeetingReply =
  | { action: 'accept' }
  | { action: 'propose'; startsAt: string }
  | { action: 'decline' };

export interface MeetingTransition {
  status: MeetingStatus;
  proposedBy: MeetingParty;
  startsAt?: Date;
  /** null — מנקה את מועד התשובה הקודם, כי יש הצעה חדשה */
  respondedAt: Date | null;
}

/**
 * המעבר של פגישה אחרי תשובה של אחד הצדדים — אותו כלל לכל סוגי הפגישות:
 *
 * - אישור: רק הצד שההצעה ממתינה לו יכול לאשר, והפגישה נעשית מאושרת אצל שניהם.
 * - מועד אחר: כל צד יכול להציע מועד אחר לפגישה פעילה (ממתינה או מאושרת), והיא
 *   עוברת לאישור הצד השני. כך הלוך ושוב, עד שהצד שקיבל את ההצעה מאשר.
 * - דחייה: רק הצד שההצעה ממתינה לו.
 *
 * מחזיר null כשהתשובה לא מתאימה למצב הפגישה (למשל אישור של הצעה שלכם עצמכם).
 */
export function answerMeeting(
  meeting: Pick<AdvisorMeetingView, 'status' | 'proposedBy'>,
  party: MeetingParty,
  answer: MeetingAnswer,
  now: Date = new Date()
): MeetingTransition | null {
  if (!meetingIsLive(meeting.status)) return null;

  if (answer.action === 'propose') {
    if (Number.isNaN(answer.startsAt.getTime())) return null;
    return { status: 'PROPOSED', proposedBy: party, startsAt: answer.startsAt, respondedAt: null };
  }

  if (!meetingAwaits(meeting, party)) return null;
  return {
    status: answer.action === 'accept' ? 'CONFIRMED' : 'DECLINED',
    proposedBy: meeting.proposedBy,
    respondedAt: now,
  };
}

export interface AdvisorMeetingView {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  advisorName: string;
  stage: PlanStageId | null;
  title: string;
  /** ISO — תאריך ושעה */
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  note: string | null;
  status: MeetingStatus;
  /** מי הציע את המועד הנוכחי — כשהפגישה ממתינה, הצד השני הוא שמאשר */
  proposedBy: MeetingParty;
  respondedAt: string | null;
}

// ───────────────────────────── הגדרות היועץ ─────────────────────────────

/** ריבית ברירת מחדל לצירוף בנק + לוח סילוקין + סוג מסלול */
export interface AdvisorRateDefaultView {
  bank: string;
  amortizationType: string;
  trackType: string;
  /** הריבית הסופית שהיועץ שמר */
  rate: number;
  /**
   * המרווח מעל העוגן, כשהיועץ הזין אותו. כשהוא קיים הוא מנצח את הריבית
   * השמורה, כי הריבית הסופית נגזרת מהעוגן החי ועוד המרווח.
   */
  spread?: number | null;
}

export interface MixCategoryView {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  /** כמה תמהילים משויכים לקטגוריה כרגע */
  mixCount: number;
}

export interface AdvisorSettingsView {
  rates: AdvisorRateDefaultView[];
  categories: MixCategoryView[];
}

/** המפתח שמזהה ריבית ברירת מחדל אחת */
export function rateKey(bank: string, amortizationType: string, trackType: string): string {
  return `${bank}|${amortizationType}|${trackType}`;
}

/**
 * הריבית שתיטען למסלול חדש: מה שהיועץ שמר לצירוף המדויק, ואם אין — מה ששמר
 * לאותו בנק בלוח שפיצר, שהוא לוח הסילוקין הרווח.
 */
export function defaultRateFrom(
  rates: AdvisorRateDefaultView[],
  bank: string | undefined,
  amortizationType: string,
  trackType: string
): number | null {
  if (!bank) return null;
  const exact = rates.find(
    (item) =>
      item.bank === bank &&
      item.amortizationType === amortizationType &&
      item.trackType === trackType
  );
  if (exact) return exact.rate;
  const spitzer = rates.find(
    (item) =>
      item.bank === bank && item.amortizationType === 'spitzer' && item.trackType === trackType
  );
  return spitzer ? spitzer.rate : null;
}

// ───────────────────────────── לוח שנה ─────────────────────────────

/** מפתח יום מקומי (YYYY-MM-DD) — הבסיס לקיבוץ פריטים בלוח השנה */
export function dayKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** משימה שעבר זמנה ועדיין לא נסגרה */
export function taskIsOverdue(
  task: Pick<AdvisorTaskView, 'dueDate' | 'status'>,
  now = new Date()
): boolean {
  if (!task.dueDate || taskIsClosed(task.status)) return false;
  return new Date(task.dueDate).getTime() < now.getTime();
}

const TIME_FORMAT = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
const DATE_FORMAT = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatTime(value: string | Date): string {
  return TIME_FORMAT.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatDate(value: string | Date): string {
  return DATE_FORMAT.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatWeekday(value: string | Date): string {
  return WEEKDAY_FORMAT.format(typeof value === 'string' ? new Date(value) : value);
}

/** "היום", "מחר" או התאריך — הניסוח שמופיע בכותרת של יום בלוח */
export function relativeDayLabel(value: string | Date, now = new Date()): string {
  const key = dayKey(value);
  if (key === dayKey(now)) return 'היום';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === dayKey(tomorrow)) return 'מחר';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return 'אתמול';
  return formatWeekday(value);
}

/** מזהה תקין של שלב, או null — לאימות קלט שהגיע מהדפדפן */
export function asPlanStage(value: unknown): PlanStageId | null {
  return typeof value === 'string' && (PLAN_STAGES as readonly string[]).includes(value)
    ? (value as PlanStageId)
    : null;
}
