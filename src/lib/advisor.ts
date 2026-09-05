import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
  PLAN_STAGES,
  meetingIsLive,
  taskIsClosed,
} from './advisor-crm';
import type {
  AdvisorMeetingView,
  AdvisorNoteView,
  AdvisorRateDefaultView,
  AdvisorTaskStatus,
  AdvisorTaskView,
  MeetingStatus,
  MixCategoryView,
  NoteVisibility,
  PlanStageId,
} from './advisor-crm';
import type { PlanStageStatus } from './mortgage-plan';

/**
 * שכבת הגישה ללוח הבקרה של היועץ.
 *
 * כל פעולה כאן מאמתת קודם כול שהלקוח באמת מלווה על ידי היועץ שמבקש אותה, כדי
 * שלא תהיה דרך לכתוב או לקרוא משימה, הערה או פגישה של ליווי אחר.
 */

/** רשומת הליווי, אם וכשהיועץ הזה באמת מלווה את הלקוח הזה */
export async function advisorOwnsClient(advisorId: string, clientId: string): Promise<boolean> {
  const row = await prisma.client.findFirst({
    where: { id: clientId, advisorId },
    select: { id: true },
  });
  return row !== null;
}

// ───────────────────────────────── משימות ─────────────────────────────────

const taskSelect = {
  id: true,
  clientId: true,
  stage: true,
  title: true,
  details: true,
  dueDate: true,
  status: true,
  completedAt: true,
  createdAt: true,
  client: { select: { name: true } },
} satisfies Prisma.AdvisorTaskSelect;

type TaskRow = Prisma.AdvisorTaskGetPayload<{ select: typeof taskSelect }>;

function toTaskView(row: TaskRow): AdvisorTaskView {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client.name,
    stage: row.stage as PlanStageId,
    title: row.title,
    details: row.details,
    dueDate: row.dueDate?.toISOString() ?? null,
    status: row.status as AdvisorTaskStatus,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * המשימות של היועץ. משימות עם תאריך מסודרות לפי המועד שנקבע להן, ומשימות
 * בלי תאריך נדחקות לסוף — כך שהרשימה קוראת כמו סדר יום.
 */
export async function listAdvisorTasks(
  advisorId: string,
  filter: { clientId?: string; stage?: PlanStageId; includeClosed?: boolean } = {}
): Promise<AdvisorTaskView[]> {
  const rows = await prisma.advisorTask.findMany({
    where: {
      advisorId,
      ...(filter.clientId ? { clientId: filter.clientId } : {}),
      ...(filter.stage ? { stage: filter.stage } : {}),
      ...(filter.includeClosed ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
    },
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    select: taskSelect,
  });
  return rows.map(toTaskView);
}

export interface CreateTaskInput {
  advisorId: string;
  clientId: string;
  stage: PlanStageId;
  title: string;
  details?: string | null;
  dueDate?: Date | null;
}

export async function createAdvisorTask(input: CreateTaskInput): Promise<AdvisorTaskView | null> {
  if (!(await advisorOwnsClient(input.advisorId, input.clientId))) return null;

  const row = await prisma.advisorTask.create({
    data: {
      advisorId: input.advisorId,
      clientId: input.clientId,
      stage: input.stage,
      title: input.title,
      details: input.details ?? null,
      dueDate: input.dueDate ?? null,
    },
    select: taskSelect,
  });
  return toTaskView(row);
}

export interface UpdateTaskInput {
  title?: string;
  details?: string | null;
  dueDate?: Date | null;
  stage?: PlanStageId;
  status?: AdvisorTaskStatus;
}

/** עדכון משימה. סימון כהושלמה חותם גם את מועד הסגירה, וחזרה לפתוחה מנקה אותו */
export async function updateAdvisorTask(
  advisorId: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<AdvisorTaskView | null> {
  const existing = await prisma.advisorTask.findFirst({
    where: { id: taskId, advisorId },
    select: { id: true },
  });
  if (!existing) return null;

  const data: Prisma.AdvisorTaskUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.details !== undefined) data.details = input.details;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.stage !== undefined) data.stage = input.stage;
  if (input.status !== undefined) {
    data.status = input.status;
    data.completedAt = input.status === 'DONE' ? new Date() : null;
  }

  const row = await prisma.advisorTask.update({
    where: { id: taskId },
    data,
    select: taskSelect,
  });
  return toTaskView(row);
}

export async function deleteAdvisorTask(advisorId: string, taskId: string): Promise<boolean> {
  const result = await prisma.advisorTask.deleteMany({ where: { id: taskId, advisorId } });
  return result.count > 0;
}

// ───────────────────────────────── הערות ─────────────────────────────────

const noteSelect = {
  id: true,
  clientId: true,
  stage: true,
  body: true,
  visibility: true,
  createdAt: true,
  advisor: { select: { name: true, email: true } },
} satisfies Prisma.AdvisorNoteSelect;

type NoteRow = Prisma.AdvisorNoteGetPayload<{ select: typeof noteSelect }>;

function toNoteView(row: NoteRow): AdvisorNoteView {
  return {
    id: row.id,
    clientId: row.clientId,
    stage: row.stage as PlanStageId,
    body: row.body,
    visibility: row.visibility as NoteVisibility,
    advisorName: row.advisor.name || row.advisor.email || 'היועץ',
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * ההערות של לקוח. `sharedOnly` הוא ההפרדה שמונעת מהערה אישית להגיע ללקוח —
 * הלקוח מקבל אך ורק את מה שהיועץ בחר לשלוח אליו.
 */
export async function listClientNotes(
  clientId: string,
  options: { sharedOnly?: boolean } = {}
): Promise<AdvisorNoteView[]> {
  const rows = await prisma.advisorNote.findMany({
    where: {
      clientId,
      ...(options.sharedOnly ? { visibility: 'SHARED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: noteSelect,
  });
  return rows.map(toNoteView);
}

/** ההערות שנשלחו ללקוח בכל רשומות הליווי שלו — מה שהוא רואה בתהליך שלו */
export async function listSharedNotesForUser(userId: string): Promise<AdvisorNoteView[]> {
  const rows = await prisma.advisorNote.findMany({
    where: { visibility: 'SHARED', client: { userId } },
    orderBy: { createdAt: 'desc' },
    select: noteSelect,
  });
  return rows.map(toNoteView);
}

export async function createAdvisorNote(input: {
  advisorId: string;
  clientId: string;
  stage: PlanStageId;
  body: string;
  visibility: NoteVisibility;
}): Promise<AdvisorNoteView | null> {
  if (!(await advisorOwnsClient(input.advisorId, input.clientId))) return null;

  const row = await prisma.advisorNote.create({
    data: {
      advisorId: input.advisorId,
      clientId: input.clientId,
      stage: input.stage,
      body: input.body,
      visibility: input.visibility,
    },
    select: noteSelect,
  });
  return toNoteView(row);
}

/** שינוי החשיפה של הערה קיימת — שליחה ללקוח, או החזרה להערה אישית */
export async function setNoteVisibility(
  advisorId: string,
  noteId: string,
  visibility: NoteVisibility
): Promise<AdvisorNoteView | null> {
  const existing = await prisma.advisorNote.findFirst({
    where: { id: noteId, advisorId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.advisorNote.update({
    where: { id: noteId },
    data: { visibility },
    select: noteSelect,
  });
  return toNoteView(row);
}

export async function deleteAdvisorNote(advisorId: string, noteId: string): Promise<boolean> {
  const result = await prisma.advisorNote.deleteMany({ where: { id: noteId, advisorId } });
  return result.count > 0;
}

// ───────────────────────────────── פגישות ─────────────────────────────────

const meetingSelect = {
  id: true,
  clientId: true,
  stage: true,
  title: true,
  startsAt: true,
  durationMinutes: true,
  location: true,
  note: true,
  status: true,
  respondedAt: true,
  client: { select: { name: true, email: true } },
  advisor: { select: { name: true, email: true } },
} satisfies Prisma.AdvisorMeetingSelect;

type MeetingRow = Prisma.AdvisorMeetingGetPayload<{ select: typeof meetingSelect }>;

function toMeetingView(row: MeetingRow): AdvisorMeetingView {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client.name,
    clientEmail: row.client.email,
    advisorName: row.advisor.name || row.advisor.email || 'היועץ',
    stage: (row.stage as PlanStageId | null) ?? null,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    durationMinutes: row.durationMinutes,
    location: row.location,
    note: row.note,
    status: row.status as MeetingStatus,
    respondedAt: row.respondedAt?.toISOString() ?? null,
  };
}

/** כל הפגישות של היועץ, מהקרובה לרחוקה */
export async function listAdvisorMeetings(
  advisorId: string,
  filter: { clientId?: string; from?: Date } = {}
): Promise<AdvisorMeetingView[]> {
  const rows = await prisma.advisorMeeting.findMany({
    where: {
      advisorId,
      ...(filter.clientId ? { clientId: filter.clientId } : {}),
      ...(filter.from ? { startsAt: { gte: filter.from } } : {}),
    },
    orderBy: { startsAt: 'asc' },
    select: meetingSelect,
  });
  return rows.map(toMeetingView);
}

/** הפגישות שהוצעו למשתמש כלקוח — מה שמופיע לו באזור האישי */
export async function listMeetingsForUser(userId: string): Promise<AdvisorMeetingView[]> {
  const rows = await prisma.advisorMeeting.findMany({
    where: { client: { userId } },
    orderBy: { startsAt: 'asc' },
    select: meetingSelect,
  });
  return rows.map(toMeetingView);
}

export async function createMeeting(input: {
  advisorId: string;
  clientId: string;
  stage?: PlanStageId | null;
  title: string;
  startsAt: Date;
  durationMinutes?: number;
  location?: string | null;
  note?: string | null;
}): Promise<AdvisorMeetingView | null> {
  if (!(await advisorOwnsClient(input.advisorId, input.clientId))) return null;

  const row = await prisma.advisorMeeting.create({
    data: {
      advisorId: input.advisorId,
      clientId: input.clientId,
      stage: input.stage ?? null,
      title: input.title,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes ?? 45,
      location: input.location ?? null,
      note: input.note ?? null,
    },
    select: meetingSelect,
  });
  return toMeetingView(row);
}

/**
 * שינוי מועד או ביטול — פעולות של היועץ. שינוי מועד מחזיר את הפגישה למצב
 * "מתוכננת", כי האישור הקודם של הלקוח היה למועד אחר.
 */
export async function updateMeeting(
  advisorId: string,
  meetingId: string,
  input: {
    title?: string;
    startsAt?: Date;
    durationMinutes?: number;
    location?: string | null;
    note?: string | null;
    status?: MeetingStatus;
  }
): Promise<AdvisorMeetingView | null> {
  const existing = await prisma.advisorMeeting.findFirst({
    where: { id: meetingId, advisorId },
    select: { id: true },
  });
  if (!existing) return null;

  const data: Prisma.AdvisorMeetingUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
  if (input.location !== undefined) data.location = input.location;
  if (input.note !== undefined) data.note = input.note;
  if (input.startsAt !== undefined) {
    data.startsAt = input.startsAt;
    data.status = 'PROPOSED';
    data.respondedAt = null;
  }
  if (input.status !== undefined) data.status = input.status;

  const row = await prisma.advisorMeeting.update({
    where: { id: meetingId },
    data,
    select: meetingSelect,
  });
  return toMeetingView(row);
}

/**
 * תשובת הלקוח להצעת הפגישה. רק הלקוח שהפגישה נקבעה איתו יכול לענות, ולכן
 * הבדיקה היא מול חשבון המשתמש שמאחורי רשומת הליווי.
 */
export async function respondToMeeting(
  userId: string,
  meetingId: string,
  accepted: boolean
): Promise<AdvisorMeetingView | null> {
  const existing = await prisma.advisorMeeting.findFirst({
    where: { id: meetingId, client: { userId } },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.advisorMeeting.update({
    where: { id: meetingId },
    data: {
      status: accepted ? 'CONFIRMED' : 'DECLINED',
      respondedAt: new Date(),
    },
    select: meetingSelect,
  });
  return toMeetingView(row);
}

export async function deleteMeeting(advisorId: string, meetingId: string): Promise<boolean> {
  const result = await prisma.advisorMeeting.deleteMany({ where: { id: meetingId, advisorId } });
  return result.count > 0;
}

// ───────────────────────── הגדרות: ריביות וקטגוריות ─────────────────────────

export async function listRateDefaults(advisorId: string): Promise<AdvisorRateDefaultView[]> {
  const rows = await prisma.advisorRateDefault.findMany({
    where: { advisorId },
    orderBy: [{ bank: 'asc' }, { amortizationType: 'asc' }, { trackType: 'asc' }],
    select: { bank: true, amortizationType: true, trackType: true, rate: true },
  });
  return rows;
}

/**
 * שמירת ריביות ברירת המחדל. ריבית ריקה (null) מוחקת את הערך השמור, כדי
 * שהמסלול יחזור לריבית הכללית של המערכת במקום להיתקע על ערך ישן.
 */
export async function saveRateDefaults(
  advisorId: string,
  entries: Array<{ bank: string; amortizationType: string; trackType: string; rate: number | null }>
): Promise<AdvisorRateDefaultView[]> {
  const removals = entries.filter((entry) => entry.rate === null);
  const upserts = entries.filter(
    (entry): entry is typeof entry & { rate: number } =>
      typeof entry.rate === 'number' && Number.isFinite(entry.rate)
  );

  await prisma.$transaction([
    ...removals.map((entry) =>
      prisma.advisorRateDefault.deleteMany({
        where: {
          advisorId,
          bank: entry.bank,
          amortizationType: entry.amortizationType,
          trackType: entry.trackType,
        },
      })
    ),
    ...upserts.map((entry) =>
      prisma.advisorRateDefault.upsert({
        where: {
          advisorId_bank_amortizationType_trackType: {
            advisorId,
            bank: entry.bank,
            amortizationType: entry.amortizationType,
            trackType: entry.trackType,
          },
        },
        create: {
          advisorId,
          bank: entry.bank,
          amortizationType: entry.amortizationType,
          trackType: entry.trackType,
          rate: entry.rate,
        },
        update: { rate: entry.rate },
      })
    ),
  ]);

  return listRateDefaults(advisorId);
}

export async function listMixCategories(advisorId: string): Promise<MixCategoryView[]> {
  const rows = await prisma.mixCategory.findMany({
    where: { advisorId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      color: true,
      sortOrder: true,
      _count: { select: { mixes: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
    mixCount: row._count.mixes,
  }));
}

/** יצירת קטגוריה. קטגוריה בשם שכבר קיים מוחזרת כמו שהיא, בלי כפילות */
export async function createMixCategory(
  advisorId: string,
  name: string,
  color?: string | null
): Promise<MixCategoryView> {
  const trimmed = name.trim();
  const last = await prisma.mixCategory.findFirst({
    where: { advisorId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const row = await prisma.mixCategory.upsert({
    where: { advisorId_name: { advisorId, name: trimmed } },
    create: {
      advisorId,
      name: trimmed,
      color: color ?? null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
    update: color === undefined ? {} : { color },
    select: {
      id: true,
      name: true,
      color: true,
      sortOrder: true,
      _count: { select: { mixes: true } },
    },
  });

  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
    mixCount: row._count.mixes,
  };
}

/** מחיקת קטגוריה. התמהילים שבה נשארים, ועוברים ל"ללא קטגוריה" */
export async function deleteMixCategory(advisorId: string, categoryId: string): Promise<boolean> {
  const result = await prisma.mixCategory.deleteMany({ where: { id: categoryId, advisorId } });
  return result.count > 0;
}

// ───────────────────── חמשת השלבים של הלקוח, בעיני היועץ ─────────────────────

export interface ClientPlanSummary {
  id: string;
  name: string;
  propertyAddress: string | null;
  propertyValue: number | null;
  mortgageAmount: number | null;
  currentStage: PlanStageId;
  progress: number;
  updatedAt: string;
}

export interface ClientStageView {
  stage: PlanStageId;
  status: PlanStageStatus;
  completedAt: string | null;
  /**
   * השלב נסגר בתהליך של הלקוח עצמו. התהליך שייך ללקוח, ולכן כל שלב שסומן בו
   * כהושלם הוא שלב שהלקוח סגר לבד — וכך הוא מוצג ליועץ.
   */
  completedByClient: boolean;
  tasks: AdvisorTaskView[];
  notes: AdvisorNoteView[];
  meetings: AdvisorMeetingView[];
}

export interface ClientProcessView {
  /** התהליך שהלוח מוצג עבורו, אם ללקוח כבר יש תהליך פתוח */
  planId: string | null;
  planName: string | null;
  currentStage: PlanStageId;
  progress: number;
  plans: ClientPlanSummary[];
  stages: ClientStageView[];
}

/**
 * לוח השלבים של לקוח אצל היועץ.
 *
 * ההתקדמות נקראת מתהליך התכנון של הלקוח — אותם חמישה שלבים שהוא רואה אצלו —
 * ועליה מולבשות המשימות, ההערות והפגישות שהיועץ הוסיף לכל שלב.
 */
export async function getClientProcess(
  advisorId: string,
  clientId: string,
  planId?: string
): Promise<ClientProcessView | null> {
  if (!(await advisorOwnsClient(advisorId, clientId))) return null;

  const planRows = await prisma.mortgagePlan.findMany({
    where: { clientId, status: { not: 'ARCHIVED' } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      propertyAddress: true,
      propertyValue: true,
      mortgageAmount: true,
      currentStage: true,
      progress: true,
      updatedAt: true,
      stages: { select: { stage: true, status: true, completedAt: true } },
    },
  });

  const plans: ClientPlanSummary[] = planRows.map((row) => ({
    id: row.id,
    name: row.name,
    propertyAddress: row.propertyAddress,
    propertyValue: row.propertyValue,
    mortgageAmount: row.mortgageAmount,
    currentStage: row.currentStage as PlanStageId,
    progress: row.progress,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const active = planRows.find((row) => row.id === planId) ?? planRows[0] ?? null;
  const byStage = new Map(
    (active?.stages ?? []).map((item) => [item.stage as PlanStageId, item])
  );

  const [tasks, notes, meetings] = await Promise.all([
    listAdvisorTasks(advisorId, { clientId, includeClosed: true }),
    listClientNotes(clientId),
    listAdvisorMeetings(advisorId, { clientId }),
  ]);

  const stages: ClientStageView[] = PLAN_STAGES.map((stage) => {
    const found = byStage.get(stage);
    const status = (found?.status as PlanStageStatus) ?? 'PENDING';
    return {
      stage,
      status,
      completedAt: found?.completedAt?.toISOString() ?? null,
      completedByClient: status === 'COMPLETED',
      tasks: tasks.filter((task) => task.stage === stage),
      notes: notes.filter((note) => note.stage === stage),
      meetings: meetings.filter((meeting) => meeting.stage === stage),
    };
  });

  return {
    planId: active?.id ?? null,
    planName: active?.name ?? null,
    currentStage: (active?.currentStage as PlanStageId) ?? 'ANALYSIS',
    progress: active?.progress ?? 0,
    plans,
    stages,
  };
}

// ───────────────────────────── תמונת המצב של הלוח ─────────────────────────────

export interface AdvisorOverview {
  clients: number;
  /** לקוחות שנמצאים באמצע התהליך */
  activeClients: number;
  mixes: number;
  openDocuments: number;
  openTasks: number;
  overdueTasks: number;
  /** פגישות שהוצעו וממתינות לאישור הלקוח */
  awaitingConfirmation: number;
  /** המשימות שהיועץ קבע להיום */
  todayTasks: AdvisorTaskView[];
  /** משימות שעבר מועדן ועדיין פתוחות */
  overdue: AdvisorTaskView[];
  /** הפגישות הקרובות, מהיום והלאה */
  upcomingMeetings: AdvisorMeetingView[];
}

/** כל מה שראש לוח הבקרה מציג, בקריאה אחת */
export async function getAdvisorOverview(advisorId: string): Promise<AdvisorOverview> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [clientRows, tasks, meetings, mixes] = await Promise.all([
    prisma.client.findMany({
      where: { advisorId },
      select: {
        stage: true,
        documents: { select: { status: true, required: true } },
      },
    }),
    listAdvisorTasks(advisorId, { includeClosed: false }),
    listAdvisorMeetings(advisorId),
    prisma.mortgageMix.count({ where: { ownerId: advisorId } }),
  ]);

  const now = new Date();

  return {
    clients: clientRows.length,
    activeClients: clientRows.filter(
      (row) => row.stage !== 'INTAKE' && row.stage !== 'COMPLETED'
    ).length,
    mixes,
    openDocuments: clientRows.reduce(
      (total, row) =>
        total + row.documents.filter((doc) => doc.required && doc.status === 'PENDING').length,
      0
    ),
    openTasks: tasks.filter((task) => !taskIsClosed(task.status)).length,
    overdueTasks: tasks.filter(
      (task) => task.dueDate !== null && new Date(task.dueDate) < now
    ).length,
    awaitingConfirmation: meetings.filter(
      (meeting) => meeting.status === 'PROPOSED' && new Date(meeting.startsAt) >= now
    ).length,
    todayTasks: tasks.filter(
      (task) =>
        task.dueDate !== null &&
        new Date(task.dueDate) >= startOfToday &&
        new Date(task.dueDate) < endOfToday
    ),
    overdue: tasks.filter((task) => task.dueDate !== null && new Date(task.dueDate) < startOfToday),
    upcomingMeetings: meetings.filter(
      (meeting) => meetingIsLive(meeting.status) && new Date(meeting.startsAt) >= startOfToday
    ),
  };
}
