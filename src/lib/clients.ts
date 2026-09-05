import type { Client, Prisma } from '@prisma/client';
import { prisma } from './db';
import { documentsUpToStage, stageProgress } from './client-process';
import type { ClientStage } from './client-process';
import type { PlanStageId } from './mortgage-plan';
import {
  ENCRYPTED_FINANCIAL_FIELDS,
  decryptFinancials,
  encryptFinancialField,
  encryptedColumnFor,
  incomeBucketFor,
} from './client-financials';
import type { ClientFinancials, EncryptedFinancialField } from './client-financials';
import { listMixesForClient } from './mixes';
import type { SavedMix } from '@/components/mortgage-advisor/mixRecord';

/**
 * לקוח נגיש ליועץ שמלווה אותו ולמשתמש שהוא הלקוח עצמו. כל מסלול שנוגע בלקוח
 * עובר דרך כאן, כדי שלא תהיה דרך לקרוא נתוני לקוח בלי אחת משתי הזכויות האלה.
 */
export async function findAccessibleClient(userId: string, clientId: string): Promise<Client | null> {
  return prisma.client.findFirst({
    where: { id: clientId, OR: [{ advisorId: userId }, { userId }] },
  });
}

export interface ClientListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: Client['status'];
  stage: ClientStage;
  progress: number;
  propertyValue: number | null;
  mortgageAmount: number | null;
  incomeBucket: Client['incomeBucket'];
  mixCount: number;
  /** מסמכים שנותרו להגשה מתוך אלה שכבר נפתחו */
  openDocuments: number;
  /** משימות של היועץ שעדיין פתוחות עבור הלקוח */
  openTasks: number;
  /** הפגישה הקרובה שנקבעה עם הלקוח, אם יש כזו */
  nextMeetingAt: string | null;
  /**
   * השלב של הלקוח בכלי תכנון המשכנתא — אותם חמישה שלבים שהוא רואה אצלו.
   * ריק כשעדיין לא פתח תהליך.
   */
  planStage: PlanStageId | null;
  planProgress: number;
  updatedAt: string;
}

/** שגיאת Prisma על טבלה או עמודה שאינן קיימות — סימן שמיגרציה עוד לא רצה */
function isMissingSchema(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === 'P2021' || code === 'P2022';
}

interface CrmCounters {
  openTasks: Map<string, number>;
  nextMeetingAt: Map<string, Date>;
}

/**
 * המונים שמגיעים מטבלאות ה-CRM של היועץ.
 *
 * הם נשלפים בנפרד ולא כצירוף לשאילתת הלקוחות, כי הטבלאות האלה נוספו אחרי
 * רשימת הלקוחות: כשהמיגרציה עוד לא רצה בסביבה מסוימת, הרשימה נטענת בלי
 * המונים — במקום שהמסך המרכזי של היועץ ייפול בגללן.
 */
async function crmCounters(advisorId: string, now: Date): Promise<CrmCounters> {
  const openTasks = new Map<string, number>();
  const nextMeetingAt = new Map<string, Date>();

  try {
    const [tasks, meetings] = await Promise.all([
      prisma.advisorTask.groupBy({
        by: ['clientId'],
        where: { advisorId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        _count: { _all: true },
      }),
      prisma.advisorMeeting.findMany({
        where: {
          advisorId,
          startsAt: { gte: now },
          status: { in: ['PROPOSED', 'CONFIRMED'] },
        },
        orderBy: { startsAt: 'asc' },
        select: { clientId: true, startsAt: true },
      }),
    ]);

    tasks.forEach((row) => openTasks.set(row.clientId, row._count._all));
    // הפגישות ממוינות לפי מועד, ולכן הראשונה שנרשמת לכל לקוח היא הקרובה שלו
    meetings.forEach((row) => {
      if (!nextMeetingAt.has(row.clientId)) nextMeetingAt.set(row.clientId, row.startsAt);
    });
  } catch (error) {
    if (!isMissingSchema(error)) throw error;
    console.warn('advisor CRM tables are missing — run prisma migrate deploy');
  }

  return { openTasks, nextMeetingAt };
}

/** רשימת הלקוחות של היועץ, עם המספרים שמוצגים בשורת הלקוח */
export async function listAdvisorClients(advisorId: string): Promise<ClientListItem[]> {
  const now = new Date();
  const [rows, counters] = await Promise.all([
    prisma.client.findMany({
      where: { advisorId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { mixes: true } },
        documents: { select: { status: true, required: true } },
        plans: {
          where: { status: { not: 'ARCHIVED' } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { currentStage: true, progress: true },
        },
      },
    }),
    crmCounters(advisorId, now),
  ]);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    stage: row.stage as ClientStage,
    progress: row.progress,
    propertyValue: row.propertyValue,
    mortgageAmount: row.mortgageAmount,
    incomeBucket: row.incomeBucket,
    mixCount: row._count.mixes,
    openDocuments: row.documents.filter((doc) => doc.required && doc.status === 'PENDING').length,
    openTasks: counters.openTasks.get(row.id) ?? 0,
    nextMeetingAt: counters.nextMeetingAt.get(row.id)?.toISOString() ?? null,
    planStage: (row.plans[0]?.currentStage as PlanStageId | undefined) ?? null,
    planProgress: row.plans[0]?.progress ?? 0,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/**
 * פתיחת המסמכים של השלב הנוכחי ושל השלבים שלפניו.
 *
 * הפעולה בטוחה לקריאה חוזרת: מסמך שכבר נוצר נשאר עם הסטטוס וההערות שלו, ורק
 * מסמכים חדשים מתווספים — כך שקידום שלב לא מוחק היסטוריה.
 */
export async function syncStageDocuments(clientId: string, stage: ClientStage): Promise<void> {
  const catalog = documentsUpToStage(stage);
  if (catalog.length === 0) return;

  const existing = await prisma.clientDocument.findMany({
    where: { clientId },
    select: { key: true },
  });
  const known = new Set(existing.map((doc) => doc.key));

  const missing = catalog.filter((doc) => !known.has(doc.key));
  if (missing.length === 0) return;

  await prisma.clientDocument.createMany({
    data: missing.map((doc) => ({
      clientId,
      key: doc.key,
      name: doc.name,
      stage: doc.stage,
      required: doc.required ?? true,
    })),
    skipDuplicates: true,
  });
}

export interface ClientDocumentView {
  id: string;
  key: string;
  name: string;
  stage: ClientStage;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  required: boolean;
  note: string | null;
  submittedAt: string | null;
}

export interface ClientDetail {
  id: string;
  advisorId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: Client['status'];
  stage: ClientStage;
  progress: number;
  household: Client['household'];
  age: number | null;
  partnerName: string | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  expenses: number | null;
  existingLoans: number | null;
  creditScore: number | null;
  downPayment: number | null;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  dealType: Client['dealType'];
  incomeBucket: Client['incomeBucket'];
  notes: string | null;
  /** ההחזר החודשי של התמהיל האחרון שנשמר ללקוח */
  plannedMonthlyPayment: number | null;
  /** הכנסות פחות הוצאות, הלוואות קיימות וההחזר המתוכנן */
  projectedCashFlow: number | null;
  documents: ClientDocumentView[];
  mixes: SavedMix[];
  updatedAt: string;
}

/**
 * צפי התזרים החודשי אחרי המשכנתא: מה שנשאר למשק הבית כשההחזר המתוכנן וההחזרים
 * על הלוואות קיימות יורדים מההכנסות. בלי נתוני הכנסה אין מה לחשב.
 */
function projectCashFlow(
  financials: ClientFinancials,
  plannedMonthlyPayment: number | null
): number | null {
  const income = (financials.income ?? 0) + (financials.partnerIncome ?? 0);
  if (income <= 0) return null;
  return (
    income - (financials.expenses ?? 0) - (financials.existingLoans ?? 0) - (plannedMonthlyPayment ?? 0)
  );
}

/** כל מה שדף הלקוח מציג, בקריאה אחת */
export async function getClientDetail(clientId: string): Promise<ClientDetail | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { documents: { orderBy: [{ stage: 'asc' }, { createdAt: 'asc' }] } },
  });
  if (!client) return null;

  const mixes = await listMixesForClient(clientId);
  const plannedMonthlyPayment = mixes[0]?.summary.monthlyPayment ?? null;
  const financials = decryptFinancials(client);

  return {
    id: client.id,
    advisorId: client.advisorId,
    userId: client.userId,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    status: client.status,
    stage: client.stage as ClientStage,
    progress: client.progress,
    household: client.household,
    age: client.age,
    partnerName: client.partnerName,
    partnerAge: client.partnerAge,
    income: financials.income,
    partnerIncome: financials.partnerIncome,
    expenses: financials.expenses,
    existingLoans: financials.existingLoans,
    creditScore: financials.creditScore,
    downPayment: financials.downPayment,
    propertyValue: client.propertyValue,
    propertyAddress: client.propertyAddress,
    mortgageAmount: client.mortgageAmount,
    dealType: client.dealType,
    incomeBucket: client.incomeBucket,
    notes: client.notes,
    plannedMonthlyPayment,
    projectedCashFlow: projectCashFlow(financials, plannedMonthlyPayment),
    documents: client.documents.map((doc) => ({
      id: doc.id,
      key: doc.key,
      name: doc.name,
      stage: doc.stage as ClientStage,
      status: doc.status,
      required: doc.required,
      note: doc.note,
      submittedAt: doc.submittedAt?.toISOString() ?? null,
    })),
    mixes,
    updatedAt: client.updatedAt.toISOString(),
  };
}

/** ערך מספרי שהתקבל מהלקוח: מספר תקין, null מפורש, או כלום — כלומר "אל תיגע" */
function readNumberInput(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

/**
 * השדות שהיועץ יכול לעדכן בדף הלקוח.
 *
 * currentFinancials נדרש כי טווח ההכנסה מחושב מההכנסה של שני בני הזוג יחד, וגם
 * עדכון של אחד מהם לבדו מחייב את הערך הנוכחי של השני כדי לגזור אותו מחדש.
 */
export function clientUpdateData(
  input: Record<string, unknown>,
  currentFinancials: ClientFinancials
): Prisma.ClientUpdateInput {
  const data: Prisma.ClientUpdateInput = {};

  // שם הלקוח חייב להישאר מלא, ולכן שם ריק אינו נחשב עדכון
  if (typeof input.name === 'string' && input.name.trim()) data.name = input.name.trim();

  const nullableStrings = ['phone', 'address', 'partnerName', 'propertyAddress', 'notes'] as const;
  nullableStrings.forEach((key) => {
    const value = input[key];
    if (typeof value === 'string') data[key] = value.trim() || null;
  });

  const numbers = ['age', 'partnerAge', 'propertyValue', 'mortgageAmount'] as const;
  numbers.forEach((key) => {
    const value = readNumberInput(input[key]);
    if (value === undefined) return;
    data[key] = value === null || (key !== 'age' && key !== 'partnerAge') ? value : Math.round(value);
  });

  const nextFinancials: ClientFinancials = { ...currentFinancials };
  let financialsChanged = false;

  ENCRYPTED_FINANCIAL_FIELDS.forEach((field: EncryptedFinancialField) => {
    const value = readNumberInput(input[field]);
    if (value === undefined) return;

    financialsChanged = true;
    nextFinancials[field] = value;
    data[encryptedColumnFor(field)] = encryptFinancialField(field, value);
  });

  if (financialsChanged) {
    data.incomeBucket = incomeBucketFor(nextFinancials.income, nextFinancials.partnerIncome);
  }

  if (input.household === 'SINGLE' || input.household === 'COUPLE') data.household = input.household;
  if (input.status === 'POTENTIAL' || input.status === 'ACTIVE' || input.status === 'IN_PROCESS') {
    data.status = input.status;
  }
  if (
    input.dealType === 'first_home' ||
    input.dealType === 'replacement_home' ||
    input.dealType === 'second_home' ||
    input.dealType === 'any_purpose' ||
    input.dealType === null
  ) {
    data.dealType = input.dealType;
  }

  return data;
}

/**
 * השלמת פרטי העסקה של הלקוח מתוך תמהיל שנשמר עבורו.
 *
 * רק שדות ריקים מתמלאים, כדי שמה שהיועץ הזין ידנית לא ידרס בכל שמירת תמהיל.
 */
export async function fillClientDealFromMix(
  clientId: string,
  mix: {
    totalAmount: number;
    propertyValue?: number;
    propertyAddress?: string;
    dealType?: 'first_home' | 'replacement_home' | 'second_home' | 'any_purpose';
  }
): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { propertyValue: true, propertyAddress: true, mortgageAmount: true, dealType: true },
  });
  if (!client) return;

  const data: Prisma.ClientUpdateInput = {};
  if (client.mortgageAmount === null && mix.totalAmount > 0) data.mortgageAmount = mix.totalAmount;
  if (client.propertyValue === null && mix.propertyValue) data.propertyValue = mix.propertyValue;
  if (client.propertyAddress === null && mix.propertyAddress?.trim()) {
    data.propertyAddress = mix.propertyAddress.trim();
  }
  if (client.dealType === null && mix.dealType) data.dealType = mix.dealType;

  if (Object.keys(data).length > 0) {
    await prisma.client.update({ where: { id: clientId }, data });
  }
}

/** קידום או החזרה של שלב, כולל עדכון אחוז ההתקדמות ופתיחת מסמכי השלב */
export async function setClientStage(clientId: string, stage: ClientStage): Promise<void> {
  await prisma.client.update({
    where: { id: clientId },
    data: { stage, progress: stageProgress(stage) },
  });
  await syncStageDocuments(clientId, stage);
}
