/**
 * המשימות המתוכננות של הלקוח — הטיפוסים, התבניות והעזרים המשותפים לשרת
 * ולדפדפן.
 *
 * הקובץ טהור בכוונה (בלי Prisma ובלי React): הוא נטען במסלולי ה-API לאימות,
 * ברכיבי השלבים להצעת משימות, ובסדר היום כדי להפוך משימה לאירוע בלוח השנה.
 *
 * התבניות עוזרות ללקוח לתכנן אבל אינן מגבילות אותו: בכל שלב אפשר להוסיף גם
 * משימה או פגישה בניסוח חופשי.
 */

import { PLAN_STAGES } from './mortgage-plan';
import type { PlanStageId } from './mortgage-plan';

export const CLIENT_TASK_KINDS = ['TASK', 'MEETING', 'DOCUMENT'] as const;
export type ClientTaskKind = (typeof CLIENT_TASK_KINDS)[number];

export const CLIENT_TASK_KIND_LABELS: Record<ClientTaskKind, string> = {
  TASK: 'משימה',
  MEETING: 'פגישה',
  DOCUMENT: 'העלאת מסמך',
};

export function isClientTaskKind(value: unknown): value is ClientTaskKind {
  return typeof value === 'string' && (CLIENT_TASK_KINDS as readonly string[]).includes(value);
}

export const CLIENT_TASK_STATUSES = ['OPEN', 'DONE'] as const;
export type ClientTaskStatus = (typeof CLIENT_TASK_STATUSES)[number];

export function isClientTaskStatus(value: unknown): value is ClientTaskStatus {
  return typeof value === 'string' && (CLIENT_TASK_STATUSES as readonly string[]).includes(value);
}

/** משימה כפי שהיא עוברת בין השרת לדפדפן */
export interface ClientTaskView {
  id: string;
  planId: string | null;
  stage: PlanStageId | null;
  kind: ClientTaskKind;
  /** מפתח התבנית שממנה נוצרה, אם נוצרה מתבנית */
  templateKey: string | null;
  title: string;
  details: string | null;
  /** הבנק, כשהמשימה היא פגישה עם יועץ בבנק */
  bank: string | null;
  /** ISO — תאריך ושעה */
  dueAt: string | null;
  status: ClientTaskStatus;
  /** המסמך שהועלה, כשמשימת המסמך בוצעה */
  documentId: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ───────────────────────────── התבניות לפי שלב ─────────────────────────────

export interface ClientTaskTemplate {
  key: string;
  title: string;
  kind: ClientTaskKind;
  /** הסבר קצר למה המשימה עוזרת */
  hint: string;
  /** התבנית דורשת בחירת בנק — הכותרת מקבלת את שם הבנק */
  needsBank?: boolean;
}

/**
 * המשימות המוצעות בכל שלב. אלה נקודת פתיחה בלבד — בכל שלב אפשר להוסיף
 * משימה, פגישה או מסמך בניסוח חופשי.
 */
export const STAGE_TASK_TEMPLATES: Record<PlanStageId, ClientTaskTemplate[]> = {
  ANALYSIS: [
    {
      key: 'bank-statements',
      title: 'קחו תדפיס עו״ש של 3 חודשים עוקבים מהבנק',
      kind: 'DOCUMENT',
      hint: 'הבנק בוחן את שלושת החודשים האחרונים — זה המסמך הראשון שיבקשו',
    },
    {
      key: 'payslips',
      title: 'שמרו את תלושי השכר האחרונים',
      kind: 'DOCUMENT',
      hint: 'שלושה תלושים אחרונים לכל לווה שכיר',
    },
    {
      key: 'account-approval',
      title: 'בקשו מהבנק אישור ניהול חשבון',
      kind: 'TASK',
      hint: 'מסמך שהבנק מנפיק בסניף או באזור האישי — לוקח כמה ימים',
    },
  ],
  MIX: [
    {
      key: 'advice-meeting',
      title: 'קבעו פגישת ייעוץ והכוונה מקצועית',
      kind: 'MEETING',
      hint: 'שיחה על התמהיל שבניתם לפני שנועלים אותו',
    },
    {
      key: 'second-opinion',
      title: 'קבלת חוות דעת מקצועית על התמהיל',
      kind: 'TASK',
      hint: 'להראות את התמהיל למישהו שמבין לפני שממשיכים לבנקים',
    },
  ],
  // שלב האישור העקרוני — רק משימות בניסוח חופשי
  APPLICATIONS: [],
  AUCTION: [
    {
      key: 'bank-meeting',
      title: 'קבעו פגישה עם יועץ מבנק',
      kind: 'MEETING',
      hint: 'בחרו את הבנק — המשימה תישמר עם שמו',
      needsBank: true,
    },
  ],
  SIGNING: [
    {
      key: 'lawyer-meeting',
      title: 'פגישה עם עורך דין',
      kind: 'MEETING',
      hint: 'בדיקת הסכם ההלוואה והנספחים לפני החתימה',
    },
    {
      key: 'advice-call',
      title: 'שיחת ייעוץ לפני החתימה',
      kind: 'MEETING',
      hint: 'לוודא שכל מה שסוכם במכרז נכנס לחוזה',
    },
    {
      key: 'upload-document',
      title: 'העלאת מסמך מהבנק לתיק',
      kind: 'DOCUMENT',
      hint: 'הסכם ההלוואה, לוח הסילוקין הרשמי או נספח — שיהיו זמינים תמיד',
    },
  ],
};

/** כל התבניות, לכל השלבים — לרשימת ההוספה מלוח השנה */
export const ALL_TASK_TEMPLATES: Array<ClientTaskTemplate & { stage: PlanStageId }> = PLAN_STAGES.flatMap(
  (stage) => STAGE_TASK_TEMPLATES[stage].map((template) => ({ ...template, stage }))
);

export function templateByKey(stage: PlanStageId | null, key: string | null): ClientTaskTemplate | null {
  if (!key) return null;
  const pool = stage ? STAGE_TASK_TEMPLATES[stage] : ALL_TASK_TEMPLATES;
  return pool.find((template) => template.key === key) ?? null;
}

/** הכותרת של משימה מתבנית שדורשת בנק — עם שם הבנק שנבחר */
export function bankTaskTitle(template: ClientTaskTemplate, bank: string): string {
  return `${template.title.replace(/ מבנק$/, '')} מבנק ${bank}`;
}

/** האם משימת מסמך כבר בוצעה — המסמך הועלה לתיק */
export function taskIsDone(task: Pick<ClientTaskView, 'status'>): boolean {
  return task.status === 'DONE';
}
