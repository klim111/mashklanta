/**
 * סדר היום של הלקוח באזור האישי.
 *
 * ללקוח אין טבלת משימות משלו: המשימות שלו הן הפעולות שהמערכת כבר יודעת
 * שממתינות לו — פגישה שצריך לאשר, שלב שנעצר באמצע, מסמכים שטרם נאספו, בקשת
 * ריביות שעדיין בלי הצעות. הקובץ הזה גוזר אותן מהנתונים הקיימים, כדי שהדאשבורד
 * יציג רשימה אחת ולוח שנה אחד בלי לשמור דבר נוסף.
 *
 * הקובץ טהור — בלי React ובלי Prisma — כדי שאפשר יהיה לבדוק אותו ישירות.
 */

import { journeyStageFor } from '@/data/platform/planStages';
import type { AdvisorMeetingView, AdvisorNoteView } from './advisor-crm';
import { meetingIsLive } from './advisor-crm';
import { planStageNumber, preApprovalDocuments, stageIndex } from './mortgage-plan';
import type { PlanData, PlanStageId, PlanStageStatus } from './mortgage-plan';
import type { ClientTaskView } from './client-tasks';

/** קידומת המזהה של משימה שהלקוח הוסיף לעצמו — כך הדאשבורד יודע שאפשר לסמן ולמחוק אותה */
export const CLIENT_TASK_PREFIX = 'client-task:';

export function clientTaskIdOf(id: string): string | null {
  return id.startsWith(CLIENT_TASK_PREFIX) ? id.slice(CLIENT_TASK_PREFIX.length) : null;
}

/** אזורי הדאשבורד — הניווט הראשי של האזור האישי */
export const DASHBOARD_SECTIONS = [
  'overview',
  'agenda',
  'rate-requests',
  'tools',
  'settings',
] as const;
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

export function isDashboardSection(value: unknown): value is DashboardSection {
  return typeof value === 'string' && (DASHBOARD_SECTIONS as readonly string[]).includes(value);
}

/** לאן מובילה לחיצה על משימה או על פריט בלוח */
export type AgendaTarget =
  | { kind: 'section'; section: DashboardSection }
  | { kind: 'href'; href: string };

export type AgendaTone = 'urgent' | 'action' | 'info';

export interface ClientTask {
  id: string;
  title: string;
  hint: string;
  tone: AgendaTone;
  /** מועד, כשיש — ISO */
  due: string | null;
  stage: PlanStageId | null;
  target: AgendaTarget;
}

export type CalendarEventKind = 'meeting' | 'deadline' | 'task';

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  /** ISO */
  at: string;
  title: string;
  subtitle: string;
  /** פגישה מאושרת נצבעת אחרת מפגישה שממתינה לאישור */
  confirmed: boolean;
  target: AgendaTarget;
}

/** מה שהדאשבורד צריך לדעת על תהליך אחד כדי לגזור ממנו משימות ומועדים */
export interface AgendaPlan {
  id: string;
  name: string;
  createdAt: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  currentStage: PlanStageId;
  propertyAddress: string | null;
  propertyValue: number | null;
  mortgageAmount: number | null;
  stages: Array<{ stage: PlanStageId; status: PlanStageStatus }>;
  data: PlanData;
}

export interface AgendaRateRequest {
  id: string;
  mixName: string;
  bankName: string | null;
  /** כמה הצעות כבר התקבלו על הבקשה */
  offers: number;
}

export interface AgendaInput {
  plans: AgendaPlan[];
  meetings: AdvisorMeetingView[];
  rateRequests: AgendaRateRequest[];
  /** תמהילים שנשמרו בלי שיוך לנכס */
  unassignedMixes: number;
  /** הערות שהיועץ שלח ללקוח */
  notes: AdvisorNoteView[];
  /** השלבים שיועץ מטפל בהם, לכל תהליך */
  advisorStages: Record<string, PlanStageId[]>;
  /** המשימות המתוכננות שהלקוח הוסיף לעצמו (פתוחות) */
  clientTasks?: ClientTaskView[];
}

export const EMPTY_AGENDA_INPUT: AgendaInput = {
  plans: [],
  meetings: [],
  rateRequests: [],
  unassignedMixes: 0,
  notes: [],
  advisorStages: {},
  clientTasks: [],
};

const KIND_HINTS: Record<ClientTaskView['kind'], string> = {
  TASK: 'משימה שהוספתם לעצמכם',
  MEETING: 'פגישה שקבעתם',
  DOCUMENT: 'מסמך להעלאה לתיק — נסגר כשהקובץ עולה',
};

/** לאן מובילה משימה של הלקוח: לשלב שממנו נוספה, או ללוח השנה */
function clientTaskTarget(task: ClientTaskView, plans: AgendaPlan[]): AgendaTarget {
  const plan = task.planId ? plans.find((item) => item.id === task.planId) : null;
  if (plan) return { kind: 'href', href: planHref(plan, task.stage ?? undefined) };
  return { kind: 'section', section: 'agenda' };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** ימים שלמים עד המועד — שלילי כשהוא עבר */
export function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(iso);
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfNow.getTime()) / DAY_MS);
}

function planLabel(plan: AgendaPlan): string {
  return plan.propertyAddress?.trim() || plan.name;
}

/**
 * הכותרת של תהליך ברשימה: הכתובת של הנכס וגובה המשכנתא.
 *
 * "תכנון משכנתא" הוא שם שנוצר אוטומטית ואינו אומר דבר — שני תהליכים נראים בו
 * זהים. הכתובת והסכום הם מה שמבדיל ביניהם, ולכן הם הכותרת עצמה, ושם התהליך
 * משמש רק כשעדיין אין אף אחד מהם.
 */
export function planHeadline(
  plan: Pick<AgendaPlan, 'name' | 'propertyAddress' | 'mortgageAmount'>
): string {
  const place = plan.propertyAddress?.trim();
  const amount =
    plan.mortgageAmount && plan.mortgageAmount > 0
      ? `משכנתא ₪${Math.round(plan.mortgageAmount).toLocaleString('he-IL')}`
      : null;
  if (place && amount) return `${place} · ${amount}`;
  return place || amount || plan.name;
}

const CREATED_FORMAT = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** מועד פתיחת התהליך, ליום ולדקה — כדי להבדיל בין תהליכים שנפתחו באותו יום */
export function planCreatedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `נפתח ב-${CREATED_FORMAT.format(date)}`;
}

function planHref(plan: AgendaPlan, stage?: PlanStageId): string {
  return stage ? `/dashboard/plans/${plan.id}?stage=${stage}` : `/dashboard/plans/${plan.id}`;
}

function activePlans(plans: AgendaPlan[]): AgendaPlan[] {
  return plans.filter((plan) => plan.status === 'IN_PROGRESS');
}

/**
 * המשימות הפתוחות של הלקוח, לפי דחיפות: קודם מה שדוחק בזמן, אחר כך הפעולה
 * הבאה בכל תהליך, ובסוף מידע שכדאי לדעת.
 */
export function buildClientTasks(input: AgendaInput, now = new Date()): ClientTask[] {
  const tasks: ClientTask[] = [];

  // פגישות שממתינות לאישור הלקוח — זה הדבר היחיד שהיועץ תקוע בלעדיו
  input.meetings
    .filter((meeting) => meeting.status === 'PROPOSED')
    .forEach((meeting) => {
      tasks.push({
        id: `meeting:${meeting.id}`,
        title: `אשרו את מועד הפגישה: ${meeting.title}`,
        hint: `${meeting.advisorName} הציע/ה מועד. אישור כאן מכניס את הפגישה ליומן של שניכם.`,
        tone: 'urgent',
        due: meeting.startsAt,
        stage: meeting.stage,
        target: { kind: 'section', section: 'agenda' },
      });
    });

  activePlans(input.plans).forEach((plan) => {
    const label = planLabel(plan);
    const advisorOwned = new Set(input.advisorStages[plan.id] ?? []);
    const stage = plan.currentStage;
    const journey = journeyStageFor(stage);
    const stageNumber = planStageNumber(stage);
    const missingDeal = !plan.propertyAddress || !plan.propertyValue || !plan.mortgageAmount;

    if (missingDeal) {
      tasks.push({
        id: `deal:${plan.id}`,
        title: `השלימו את פרטי הנכס — ${label}`,
        hint: 'כתובת, מחיר הנכס וגובה המשכנתא. בלעדיהם התהליך לא יכול להתקדם לבנק.',
        tone: 'action',
        due: null,
        stage: 'ANALYSIS',
        target: { kind: 'href', href: planHref(plan) },
      });
    }

    // תוקף האישור העקרוני — הדדליין החשוב ביותר בתהליך
    const validUntil = plan.data.APPLICATIONS.validUntil;
    if (plan.data.APPLICATIONS.approved && validUntil) {
      const days = daysUntil(validUntil, now);
      if (days < 0) {
        tasks.push({
          id: `approval-expired:${plan.id}`,
          title: `האישור העקרוני של ${label} פג תוקף`,
          hint: 'צריך להגיש בקשה מחודשת לבנק לפני שממשיכים למכרז או לחתימה.',
          tone: 'urgent',
          due: validUntil,
          stage: 'APPLICATIONS',
          target: { kind: 'href', href: planHref(plan, 'APPLICATIONS') },
        });
      } else if (days <= 21) {
        tasks.push({
          id: `approval-expiring:${plan.id}`,
          title: `האישור העקרוני של ${label} פג בעוד ${days === 0 ? 'היום' : `${days} ימים`}`,
          hint: 'סגרו את המכרז והחתימה לפני שהאישור פג — או בקשו הארכה מהבנק.',
          tone: 'urgent',
          due: validUntil,
          stage: 'APPLICATIONS',
          target: { kind: 'href', href: planHref(plan, 'AUCTION') },
        });
      }
    }

    if (advisorOwned.has(stage)) {
      tasks.push({
        id: `advisor:${plan.id}:${stage}`,
        title: `היועץ מטפל בשלב ${stageNumber} · ${journey.shortTitle} — ${label}`,
        hint: 'אין מה לעשות מצדכם עכשיו. כשהיועץ יסיים או יקבע פגישה, זה יופיע כאן.',
        tone: 'info',
        due: null,
        stage,
        target: { kind: 'href', href: planHref(plan, stage) },
      });
    } else {
      if (stage === 'APPLICATIONS') {
        const open = preApprovalDocuments(plan.data).filter(
          (doc) => doc.required !== false && !plan.data.APPLICATIONS.documents[doc.key]
        ).length;
        if (open > 0) {
          tasks.push({
            id: `documents:${plan.id}`,
            title: `אספו ${open} מסמכי חובה לאישור העקרוני — ${label}`,
            hint: 'הבנק לא פותח בקשה בלי התיק המלא. סמנו כל מסמך שאספתם בשלב 3.',
            tone: 'action',
            due: null,
            stage: 'APPLICATIONS',
            target: { kind: 'href', href: planHref(plan, 'APPLICATIONS') },
          });
        }
      }

      if (stage === 'AUCTION' && plan.data.AUCTION.offers.length > 0 && plan.data.AUCTION.offers.length < 3) {
        tasks.push({
          id: `offers:${plan.id}`,
          title: `הזינו הצעות נוספות למכרז — ${label}`,
          hint: `יש ${plan.data.AUCTION.offers.length} הצעות. עם פחות משלוש קשה להתמחר באמת.`,
          tone: 'action',
          due: null,
          stage: 'AUCTION',
          target: { kind: 'href', href: planHref(plan, 'AUCTION') },
        });
      }

      tasks.push({
        id: `continue:${plan.id}`,
        title: `המשיכו בשלב ${stageNumber} · ${journey.shortTitle} — ${label}`,
        hint: journey.tagline,
        tone: 'action',
        due: null,
        stage,
        target: { kind: 'href', href: planHref(plan) },
      });
    }
  });

  // המשימות שהלקוח הוסיף לעצמו — מתוך השלבים או מלוח השנה
  (input.clientTasks ?? [])
    .filter((task) => task.status === 'OPEN')
    .forEach((task) => {
      const overdue = task.dueAt !== null && daysUntil(task.dueAt, now) < 0;
      tasks.push({
        id: `${CLIENT_TASK_PREFIX}${task.id}`,
        title: task.title,
        hint: [KIND_HINTS[task.kind], task.details ?? ''].filter(Boolean).join(' · '),
        tone: overdue ? 'urgent' : 'action',
        due: task.dueAt,
        stage: task.stage,
        target: clientTaskTarget(task, input.plans),
      });
    });

  input.rateRequests
    .filter((request) => request.offers === 0)
    .forEach((request) => {
      tasks.push({
        id: `rate-request:${request.id}`,
        title: `הזינו את הריביות שהתקבלו על "${request.mixName}"`,
        hint: request.bankName
          ? `הבקשה נשלחה לבנק ${request.bankName}. כשההצעה מגיעה, מזינים אותה כאן ומשווים.`
          : 'כשהבנק מחזיר הצעה, מזינים אותה כאן ומשווים מול שאר ההצעות.',
        tone: 'action',
        due: null,
        stage: 'AUCTION',
        target: { kind: 'section', section: 'rate-requests' },
      });
    });

  if (input.unassignedMixes > 0) {
    tasks.push({
      id: 'unassigned-mixes',
      title:
        input.unassignedMixes === 1
          ? 'שייכו את התמהיל השמור לנכס'
          : `שייכו ${input.unassignedMixes} תמהילים שמורים לנכס`,
      hint: 'תמהיל שמשויך לנכס הופך למשכנתא בתהליך, עם כל חמשת השלבים.',
      tone: 'info',
      due: null,
      stage: 'MIX',
      target: { kind: 'section', section: 'rate-requests' },
    });
  }

  const latestNote = [...input.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latestNote) {
    const plan = activePlans(input.plans)[0];
    tasks.push({
      id: `note:${latestNote.id}`,
      title: `הערה מהיועץ ${latestNote.advisorName} בשלב ${planStageNumber(latestNote.stage)}`,
      hint: latestNote.body.length > 90 ? `${latestNote.body.slice(0, 90)}…` : latestNote.body,
      tone: 'info',
      due: latestNote.createdAt,
      stage: latestNote.stage,
      target: plan
        ? { kind: 'href', href: planHref(plan, latestNote.stage) }
        : { kind: 'section', section: 'overview' },
    });
  }

  const rank: Record<AgendaTone, number> = { urgent: 0, action: 1, info: 2 };
  return tasks.sort((a, b) => {
    if (rank[a.tone] !== rank[b.tone]) return rank[a.tone] - rank[b.tone];
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
}

/** כל מה שיש לו מועד: פגישות, תוקף אישור עקרוני, מועד חתימה */
export function buildCalendarEvents(input: AgendaInput): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  input.meetings
    .filter((meeting) => meetingIsLive(meeting.status))
    .forEach((meeting) => {
      events.push({
        id: `meeting:${meeting.id}`,
        kind: 'meeting',
        at: meeting.startsAt,
        title: meeting.title,
        subtitle: [
          `עם ${meeting.advisorName}`,
          `${meeting.durationMinutes} דק׳`,
          meeting.location ?? '',
        ]
          .filter(Boolean)
          .join(' · '),
        confirmed: meeting.status === 'CONFIRMED',
        target: { kind: 'section', section: 'agenda' },
      });
    });

  input.plans
    .filter((plan) => plan.status !== 'ARCHIVED')
    .forEach((plan) => {
      const label = planLabel(plan);
      const validUntil = plan.data.APPLICATIONS.validUntil;
      if (plan.data.APPLICATIONS.approved && validUntil) {
        events.push({
          id: `valid-until:${plan.id}`,
          kind: 'deadline',
          at: validUntil,
          title: 'תוקף האישור העקרוני',
          subtitle: label,
          confirmed: true,
          target: { kind: 'href', href: planHref(plan, 'APPLICATIONS') },
        });
      }
      const signingDate = plan.data.SIGNING.signingDate;
      if (signingDate) {
        events.push({
          id: `signing:${plan.id}`,
          kind: 'deadline',
          at: signingDate,
          title: 'חתימה בבנק',
          subtitle: [plan.data.SIGNING.bank ? `בנק ${plan.data.SIGNING.bank}` : '', label]
            .filter(Boolean)
            .join(' · '),
          confirmed: true,
          target: { kind: 'href', href: planHref(plan, 'SIGNING') },
        });
      }
    });

  // משימות ופגישות של הלקוח עצמו, כשיש להן מועד
  (input.clientTasks ?? [])
    .filter((task) => task.status === 'OPEN' && task.dueAt)
    .forEach((task) => {
      events.push({
        id: `${CLIENT_TASK_PREFIX}${task.id}`,
        kind: task.kind === 'MEETING' ? 'meeting' : 'task',
        at: task.dueAt as string,
        title: task.title,
        subtitle: [
          task.kind === 'MEETING' ? 'פגישה שקבעתם' : task.kind === 'DOCUMENT' ? 'מסמך להעלאה' : 'משימה שלי',
          task.bank ? `בנק ${task.bank}` : '',
          task.stage ? journeyStageFor(task.stage).shortTitle : '',
        ]
          .filter(Boolean)
          .join(' · '),
        confirmed: true,
        target: clientTaskTarget(task, input.plans),
      });
    });

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

/** האירועים הקרובים — מהיום והלאה, לפי סדר */
export function upcomingEvents(events: CalendarEvent[], now = new Date(), limit = 3): CalendarEvent[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return events.filter((event) => new Date(event.at).getTime() >= startOfToday).slice(0, limit);
}

/** תמונת המצב של תהליך אחד בדאשבורד: איזה שלב, כמה הושלם, ומי מטפל */
export interface PlanStatusSummary {
  id: string;
  label: string;
  createdAt: string;
  currentStage: PlanStageId;
  stageNumber: number;
  /** מצב כל אחד מחמשת השלבים לפי הסדר */
  stages: PlanStageStatus[];
  completedStages: number;
  advisorStage: boolean;
  href: string;
}

export function summarizePlan(plan: AgendaPlan, advisorStages: PlanStageId[] = []): PlanStatusSummary {
  const byStage = new Map(plan.stages.map((row) => [row.stage, row.status]));
  const order = (['ANALYSIS', 'MIX', 'APPLICATIONS', 'AUCTION', 'SIGNING'] as PlanStageId[]).sort(
    (a, b) => stageIndex(a) - stageIndex(b)
  );
  const stages = order.map((stage) => byStage.get(stage) ?? 'PENDING');
  return {
    id: plan.id,
    label: planHeadline(plan),
    createdAt: plan.createdAt,
    currentStage: plan.currentStage,
    stageNumber: planStageNumber(plan.currentStage),
    stages,
    completedStages: stages.filter((status) => status === 'COMPLETED').length,
    advisorStage: advisorStages.includes(plan.currentStage),
    href: planHref(plan),
  };
}
