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

import { journeyStageFor, planStageMeta } from '@/data/platform/planStages';
import type { AdvisorMeetingView, AdvisorNoteView } from './advisor-crm';
import { meetingIsLive } from './advisor-crm';
import {
  REPAYMENT_RATIO_COMFORT,
  analyzeProfile,
  flowStages,
  planFlowOf,
  planStageNumber,
  preApprovalDocuments,
  signingDocumentsProgress,
} from './mortgage-plan';
import type { PlanData, PlanStageId, PlanStageStatus } from './mortgage-plan';
import type { ClientTaskView } from './client-tasks';
import type { EquityCalendarExpense } from './equity-planning';

/** קידומת המזהה של משימה שהלקוח הוסיף לעצמו — כך הדאשבורד יודע שאפשר לסמן ולמחוק אותה */
export const CLIENT_TASK_PREFIX = 'client-task:';

export function clientTaskIdOf(id: string): string | null {
  return id.startsWith(CLIENT_TASK_PREFIX) ? id.slice(CLIENT_TASK_PREFIX.length) : null;
}

/** אזורי הדאשבורד — הניווט הראשי של האזור האישי */
export const DASHBOARD_SECTIONS = [
  'overview',
  'agenda',
  'expenses',
  'documents',
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
  /** המועד נקבע על ידי הלקוח, ולכן אפשר לשנות או לבטל אותו */
  scheduled: boolean;
  stage: PlanStageId | null;
  target: AgendaTarget;
}

/** מה שהלקוח קבע בעצמו למשימה: מועד ביצוע וסימון "בוצע" */
export interface ClientTaskState {
  due: string | null;
  done: boolean;
}

/** שלוש הקבוצות שהמשימות מוצגות בהן */
export type TaskBucket = 'overdue' | 'scheduled' | 'undated';

export interface TaskGroups {
  overdue: ClientTask[];
  scheduled: ClientTask[];
  undated: ClientTask[];
}

/**
 * חלוקת המשימות לקבוצות: מה שהמועד שלו עבר ולא בוצע, מה שנקבע לו מועד עתידי,
 * ומה שעדיין בלי תאריך. זה הסדר שבו הן מוצגות.
 */
export function groupTasks(tasks: ClientTask[], now = new Date()): TaskGroups {
  const groups: TaskGroups = { overdue: [], scheduled: [], undated: [] };
  tasks.forEach((task) => {
    if (!task.due) {
      groups.undated.push(task);
      return;
    }
    const at = new Date(task.due).getTime();
    if (Number.isNaN(at)) groups.undated.push(task);
    else if (at < now.getTime()) groups.overdue.push(task);
    else groups.scheduled.push(task);
  });
  const byDue = (a: ClientTask, b: ClientTask) => (a.due ?? '').localeCompare(b.due ?? '');
  groups.overdue.sort(byDue);
  groups.scheduled.sort(byDue);
  return groups;
}

export type CalendarEventKind = 'meeting' | 'deadline' | 'task' | 'expense';

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
  /** ההוצאות מכלי תכנון ההוצאות — מועד וסכום לכל תשלום מתוכנן */
  equityExpenses?: EquityCalendarExpense[];
  /** מועדים וסימונים שהלקוח קבע למשימות הנגזרות, לפי מזהה המשימה */
  taskStates: Record<string, ClientTaskState>;
}

export const EMPTY_AGENDA_INPUT: AgendaInput = {
  plans: [],
  meetings: [],
  rateRequests: [],
  unassignedMixes: 0,
  notes: [],
  advisorStages: {},
  clientTasks: [],
  equityExpenses: [],
  taskStates: {},
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
  plan: Pick<AgendaPlan, 'name' | 'propertyAddress' | 'mortgageAmount'> & { kind?: 'NEW' | 'REFINANCE' }
): string {
  const place = plan.propertyAddress?.trim();
  const amount =
    plan.mortgageAmount && plan.mortgageAmount > 0
      ? `משכנתא ₪${Math.round(plan.mortgageAmount).toLocaleString('he-IL')}`
      : null;
  // תהליך מיחזור אינו קשור לנכס חדש — שמו ("מיחזור משכנתא · בנק") הוא הכותרת
  if (plan.kind === 'REFINANCE') return amount ? `${plan.name} · ${amount}` : plan.name;
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
        scheduled: false,
        stage: meeting.stage,
        target: { kind: 'section', section: 'agenda' },
      });
    });

  activePlans(input.plans).forEach((plan) => {
    const label = planLabel(plan);
    const advisorOwned = new Set(input.advisorStages[plan.id] ?? []);
    const stage = plan.currentStage;
    const flow = planFlowOf(plan.data);
    const journey = planStageMeta(stage, flow);
    const stageNumber = planStageNumber(stage, flow);
    // במיחזור אין נכס חדש להשלים — הנכס והמשכנתא כבר קיימים
    const missingDeal =
      flow.kind !== 'REFINANCE' &&
      (!plan.propertyAddress || !plan.propertyValue || !plan.mortgageAmount);

    if (missingDeal) {
      tasks.push({
        id: `deal:${plan.id}`,
        title: `השלימו את פרטי הנכס — ${label}`,
        hint: 'כתובת, מחיר הנכס וגובה המשכנתא. בלעדיהם התהליך לא יכול להתקדם לבנק.',
        tone: 'action',
        due: null,
        scheduled: false,
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
          scheduled: false,
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
          scheduled: false,
          stage: 'APPLICATIONS',
          target: { kind: 'href', href: planHref(plan, 'AUCTION') },
        });
      }
    }

    /*
      הגדיר את בעלות הנכס כבר בפרופיל — מרגע זה רשימת המסמכים של החתימה ידועה,
      והמשימה לאסוף אותם נפתחת בלי תאריך: איסוף מוקדם מקצר את מועד החתימה.
    */
    const signingDocs = signingDocumentsProgress(plan.data.SIGNING);
    if (signingDocs && signingDocs.open > 0) {
      tasks.push({
        id: `signing-documents:${plan.id}`,
        title: `השלימו את המסמכים לטובת החתימה הסופית בבנק — ${label}`,
        hint: `${signingDocs.open} מתוך ${signingDocs.total} מסמכים בתרחיש הבעלות שהגדרתם עדיין חסרים. איסוף מוקדם מקצר את הזמנים בחתימה.`,
        tone: 'action',
        due: null,
        scheduled: false,
        stage: 'SIGNING',
        target: { kind: 'href', href: planHref(plan, 'SIGNING') },
      });
    }

    /*
      שלב שהיועץ מטפל בו אינו משימה של הלקוח — אין מה לעשות מצדו — ולכן הוא
      אינו נכנס לרשימת המשימות אלא מוצג כהודעה בכרטיס «המשכנתא שלי».
      ראו advisorStageNotices.
    */
    if (advisorOwned.has(stage)) {
      // אין משימות ללקוח בשלב הזה
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
            scheduled: false,
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
          scheduled: false,
          stage: 'AUCTION',
          target: { kind: 'href', href: planHref(plan, 'AUCTION') },
        });
      }

      tasks.push({
        id: `continue:${plan.id}`,
        title: `המשיכו בשלב ${stageNumber} · ${journey.shortTitle} — ${label}`,
        hint: flow.kind === 'REFINANCE' ? journey.hint : journeyStageFor(stage).tagline,
        tone: 'action',
        due: null,
        scheduled: false,
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
        /* משימה שהלקוח הוסיף נושאת את המועד שהוא קבע לה מלכתחילה */
        scheduled: Boolean(task.dueAt),
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
        scheduled: false,
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
      scheduled: false,
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
      scheduled: false,
      stage: latestNote.stage,
      target: plan
        ? { kind: 'href', href: planHref(plan, latestNote.stage) }
        : { kind: 'section', section: 'overview' },
    });
  }

  /*
    מועד שהלקוח קבע גובר על המועד הנגזר, ומשימה שהוא סימן כבוצעה יורדת
    מהרשימה — גם אם הנתונים שממנה היא נגזרה עדיין פתוחים.
  */
  const scheduled = tasks.flatMap((task) => {
    const state = input.taskStates[task.id];
    if (state?.done) return [];
    if (!state || state.due === undefined || state.due === null) return [task];
    return [{ ...task, due: state.due, scheduled: true }];
  });

  const rank: Record<AgendaTone, number> = { urgent: 0, action: 1, info: 2 };
  return scheduled.sort((a, b) => {
    if (rank[a.tone] !== rank[b.tone]) return rank[a.tone] - rank[b.tone];
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
}

/** המלצה אחת שמוצגת מתחת לשורת המשכנתא */
export interface PlanRecommendation {
  /** מפתח יציב לשמירת הסימון "בוצע" */
  key: string;
  title: string;
  hint: string;
  tone: 'info' | 'warning';
}

/** קרוב לתקרה — בטווח של חמש נקודות אחוז ממנה, או מעליה */
const NEAR_LIMIT_POINTS = 5;

/**
 * ההערות שמוצגות ללקוח מתחת למשכנתא שלו.
 *
 * הראשונה קבועה — ליווי עורך דין מקרקעין נדרש בכל עסקה. השאר נגזרות
 * מהפרופיל: קרוב לתקרת המימון כדאי שמאות מוקדמת, וקרוב ליחס ההחזר המרבי כדאי
 * לבדוק הגדלת ההכנסה הפנויה לפני שפונים לבנק.
 */
export function planRecommendations(plan: AgendaPlan): PlanRecommendation[] {
  const recommendations: PlanRecommendation[] = [
    {
      key: `${plan.id}:lawyer`,
      title: 'פנו לעורך דין מקרקעין לליווי העסקה',
      hint: 'עורך הדין בודק את הזכויות בנכס, מנסח את החוזה ומלווה את הרישום מול הבנק.',
      tone: 'info',
    },
  ];

  const analysis = analyzeProfile(plan.data.ANALYSIS);

  if (analysis.ltv !== null && analysis.ltv >= analysis.maxLtv - NEAR_LIMIT_POINTS) {
    recommendations.push({
      key: `${plan.id}:appraisal`,
      title: 'קבעו שמאות מוקדמת לנכס',
      hint: `אחוז המימון שלכם (${Math.round(analysis.ltv)}%) קרוב לתקרה של ${analysis.maxLtv}%. שמאות נמוכה מהמחיר תקטין את המשכנתא — עדיף לדעת מראש.`,
      tone: 'warning',
    });
  }

  if (analysis.repaymentRatio !== null && analysis.repaymentRatio >= REPAYMENT_RATIO_COMFORT) {
    recommendations.push({
      key: `${plan.id}:free-income`,
      title: 'בדקו אפשרות להגדלת ההכנסה הפנויה לפני הפנייה לבנק',
      hint: `יחס ההחזר שלכם (${Math.round(analysis.repaymentRatio)}%) קרוב לתקרה. סגירת הלוואה קיימת או הוספת מקור הכנסה משפרות את התיק בעיני החיתום.`,
      tone: 'warning',
    });
  }

  return recommendations;
}

/**
 * כל מה שיש לו מועד: פגישות, תוקף אישור עקרוני, מועד חתימה — ובנוסף כל משימה
 * שהלקוח קבע לה מועד בעצמו, כדי שהיא תשובץ בלוח השנה לצד הפגישות.
 */
export function buildCalendarEvents(input: AgendaInput, tasks: ClientTask[] = []): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  /* משימות שהלקוח הוסיף כבר נכנסות ללוח מ-`input.clientTasks`, ולכן מדולגות */
  tasks
    .filter((task) => task.scheduled && task.due && !clientTaskIdOf(task.id))
    .forEach((task) => {
      events.push({
        id: `task:${task.id}`,
        kind: 'task',
        at: task.due as string,
        title: task.title,
        subtitle: 'משימה שקבעתם',
        confirmed: true,
        target: task.target,
      });
    });

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

  // ההוצאות המתוכננות מכלי תכנון ההוצאות — מועד תשלום הוא מועד שצריך להיערך אליו
  (input.equityExpenses ?? []).forEach((expense) => {
    events.push({
      id: `equity-expense:${expense.id}`,
      kind: 'expense',
      at: `${expense.date}T09:00:00`,
      title: expense.title,
      subtitle: [
        expense.categoryName,
        `₪${Math.round(expense.amount).toLocaleString('he-IL')}`,
        expense.status === 'paid' ? 'שולם' : 'תשלום מתוכנן',
      ]
        .filter(Boolean)
        .join(' · '),
      confirmed: expense.status === 'paid',
      target: { kind: 'section', section: 'expenses' },
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
  /** מצב כל אחד מהשלבים לפי הסדר של סוג התהליך */
  stages: PlanStageStatus[];
  /** השלבים של התהליך, עם הכותרת הקצרה של כל אחד — לפס השלבים בכרטיס */
  stageIds: PlanStageId[];
  stageTitles: string[];
  /** משכנתא חדשה או מיחזור */
  kind: 'NEW' | 'REFINANCE';
  completedStages: number;
  advisorStage: boolean;
  href: string;
}

export function summarizePlan(plan: AgendaPlan, advisorStages: PlanStageId[] = []): PlanStatusSummary {
  const byStage = new Map(plan.stages.map((row) => [row.stage, row.status]));
  const flow = planFlowOf(plan.data);
  const order = [...flowStages(flow)];
  const stages = order.map((stage) => byStage.get(stage) ?? 'PENDING');
  return {
    id: plan.id,
    label: planHeadline({ ...plan, kind: flow.kind }),
    createdAt: plan.createdAt,
    currentStage: plan.currentStage,
    stageNumber: planStageNumber(plan.currentStage, flow),
    stages,
    stageIds: order,
    stageTitles: order.map((stage) => planStageMeta(stage, flow).shortTitle),
    kind: flow.kind,
    completedStages: stages.filter((status) => status === 'COMPLETED').length,
    advisorStage: advisorStages.includes(plan.currentStage),
    href: planHref(plan),
  };
}


// ───────────────────────── מה שהיועץ מטפל בו ─────────────────────────

/**
 * הודעה על שלב שהיועץ מטפל בו — לכרטיס «המשכנתא שלי».
 *
 * זו אינה משימה של הלקוח, ולכן היא אינה יושבת ברשימת המשימות: אין מה לעשות
 * מצדו. כשהשלב נסגר ההודעה נשארת, בנוסח «היועץ סיים לטפל», ומצביעה על השלב
 * שהלקוח עומד בו עכשיו.
 */
export interface AdvisorStageNotice {
  id: string;
  planId: string;
  /** שם התהליך, כשיש יותר ממשכנתא אחת */
  planLabel: string;
  stage: PlanStageId;
  stageNumber: number;
  stageTitle: string;
  /** היועץ כבר סיים את השלב */
  done: boolean;
  /** השלב שהלקוח נמצא בו עכשיו */
  currentStage: PlanStageId;
  currentStageNumber: number;
  currentStageTitle: string;
  href: string;
}

export function advisorStageNotices(input: AgendaInput): AdvisorStageNotice[] {
  const notices: AdvisorStageNotice[] = [];

  activePlans(input.plans).forEach((plan) => {
    const owned = input.advisorStages[plan.id] ?? [];
    if (owned.length === 0) return;
    const label = planLabel(plan);
    const current = plan.currentStage;
    const flow = planFlowOf(plan.data);
    const currentJourney = planStageMeta(current, flow);

    flowStages(flow).filter((stage) => owned.includes(stage)).forEach((stage) => {
      const journey = planStageMeta(stage, flow);
      notices.push({
        id: `advisor-stage:${plan.id}:${stage}`,
        planId: plan.id,
        planLabel: label,
        stage,
        stageNumber: planStageNumber(stage, flow),
        stageTitle: journey.shortTitle,
        done: plan.stages.some((row) => row.stage === stage && row.status === 'COMPLETED'),
        currentStage: current,
        currentStageNumber: planStageNumber(current, flow),
        currentStageTitle: currentJourney.shortTitle,
        href: planHref(plan, stage),
      });
    });
  });

  return notices;
}
