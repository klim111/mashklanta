import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
  PLAN_STAGES,
  analysisFromPlanning,
  emptyPlanData,
  parseStageData,
  planProgress,
  planSnapshot,
  propertyTypeForDeal,
  stageIsComplete,
  stageIndex,
} from './mortgage-plan';
import type {
  AnalysisData,
  PlanData,
  PlanStageDataMap,
  PlanStageId,
  PlanStageStatus,
  PlanStatus,
} from './mortgage-plan';
import { decryptFinancials } from './client-financials';
import { DEAL_TYPES } from '@/components/mortgage-advisor/types';
import type { DealType } from '@/components/mortgage-advisor/types';
import { defaultMortgagePlanningUserData } from './mortgage-affordability';
import { createEmptyLoan } from './borrower-loans';

/**
 * שכבת הגישה לתהליכי תכנון המשכנתא.
 *
 * התהליך נשמר תמיד כרשומת תוכנית ועוד חמש רשומות שלב — אחת לכל שלב — כך
 * שנתוני השלב זמינים גם אחרי שהלקוח התקדם הלאה, ואפשר לחזור אחורה ולערוך
 * בלי לאבד כלום.
 */

const planSelect = {
  id: true,
  ownerId: true,
  clientId: true,
  name: true,
  status: true,
  currentStage: true,
  progress: true,
  propertyValue: true,
  propertyAddress: true,
  mortgageAmount: true,
  monthlyPayment: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  stages: { select: { stage: true, status: true, dataJson: true, completedAt: true } },
} satisfies Prisma.MortgagePlanSelect;

type PlanRow = Prisma.MortgagePlanGetPayload<{ select: typeof planSelect }>;

export interface PlanStageView {
  stage: PlanStageId;
  status: PlanStageStatus;
  data: PlanStageDataMap[PlanStageId];
  completedAt: string | null;
}

export interface PlanView {
  id: string;
  name: string;
  status: PlanStatus;
  currentStage: PlanStageId;
  progress: number;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  monthlyPayment: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stages: PlanStageView[];
  /** נתוני כל השלבים יחד, כפי שהטפסים והחישובים צורכים אותם */
  data: PlanData;
}

/**
 * הצבת נתוני שלב במפה. הכתיבה עוברת דרך כאן כי המפתח הוא איחוד של כל השלבים,
 * ו-TypeScript אינו יכול לקשור בין המפתח לטיפוס הערך בכתיבה דינמית.
 */
function assignStage(data: PlanData, stage: PlanStageId, raw: unknown): void {
  (data as Record<PlanStageId, unknown>)[stage] = parseStageData(stage, raw);
}

/** נתוני כל השלבים, עם ברירות מחדל לשלבים שעדיין לא נגעו בהם */
function collectData(row: PlanRow): PlanData {
  const data = emptyPlanData();
  row.stages.forEach((stage) => assignStage(data, stage.stage as PlanStageId, stage.dataJson));
  return data;
}

function toView(row: PlanRow): PlanView {
  const data = collectData(row);
  const byStage = new Map(row.stages.map((stage) => [stage.stage as PlanStageId, stage]));

  return {
    id: row.id,
    name: row.name,
    status: row.status as PlanStatus,
    currentStage: row.currentStage as PlanStageId,
    progress: row.progress,
    propertyValue: row.propertyValue,
    propertyAddress: row.propertyAddress,
    mortgageAmount: row.mortgageAmount,
    monthlyPayment: row.monthlyPayment,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    stages: PLAN_STAGES.map((stage) => {
      const found = byStage.get(stage);
      return {
        stage,
        status: (found?.status as PlanStageStatus) ?? 'PENDING',
        data: data[stage],
        completedAt: found?.completedAt?.toISOString() ?? null,
      };
    }),
    data,
  };
}

export async function listPlansForUser(userId: string): Promise<PlanView[]> {
  const rows = await prisma.mortgagePlan.findMany({
    where: { ownerId: userId, status: { not: 'ARCHIVED' } },
    orderBy: { updatedAt: 'desc' },
    select: planSelect,
  });
  return rows.map(toView);
}

/** תוכנית נגישה לבעליה ולמי שמלווה אותו כיועץ */
export async function getPlanForUser(userId: string, planId: string): Promise<PlanView | null> {
  const row = await prisma.mortgagePlan.findFirst({
    where: {
      id: planId,
      OR: [{ ownerId: userId }, { client: { advisorId: userId } }],
    },
    select: planSelect,
  });
  return row ? toView(row) : null;
}

async function assertAccess(userId: string, planId: string): Promise<boolean> {
  const row = await prisma.mortgagePlan.findFirst({
    where: { id: planId, OR: [{ ownerId: userId }, { client: { advisorId: userId } }] },
    select: { id: true },
  });
  return row !== null;
}

/**
 * פתיחת תהליך חדש. חמש רשומות השלב נוצרות מיד, כדי שהתהליך יהיה שלם מרגע
 * היצירה ולא ייבנה בהדרגה תוך כדי עבודה.
 *
 * אם ללקוח כבר יש כרטיס ליווי אצל יועץ, נתוני הניתוח מגיעים משם — כדי שלא
 * יצטרך להזין שוב הכנסה, הון עצמי ושווי נכס שכבר נאספו.
 */
export async function createPlan(userId: string, name?: string): Promise<PlanView> {
  const client = await prisma.client.findFirst({
    where: { userId },
    select: {
      id: true,
      household: true,
      age: true,
      partnerAge: true,
      propertyValue: true,
      propertyAddress: true,
      dealType: true,
      incomeEnc: true,
      partnerIncomeEnc: true,
      expensesEnc: true,
      existingLoansEnc: true,
      downPaymentEnc: true,
    },
  });

  let analysisJson: Prisma.InputJsonValue | undefined;
  if (client) {
    try {
      analysisJson = seedAnalysisFromClient(client) as unknown as Prisma.InputJsonValue;
    } catch {
      // תהליך ריק עדיף על כשל בפתיחה בגלל פענוח
    }
  }

  const row = await prisma.mortgagePlan.create({
    data: {
      ownerId: userId,
      clientId: client?.id ?? null,
      name: name?.trim() || defaultPlanName(),
      stages: {
        create: PLAN_STAGES.map((stage, index) => ({
          stage,
          status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
          ...(stage === 'ANALYSIS' && analysisJson ? { dataJson: analysisJson } : {}),
        })),
      },
    },
    select: planSelect,
  });

  await refreshPlan(row.id);
  return (await getPlanForUser(userId, row.id)) ?? toView(row);
}

function money(value: number | null): string {
  return value != null && Number.isFinite(value) ? String(Math.round(value)) : '';
}

function seedAnalysisFromClient(client: {
  household: 'SINGLE' | 'COUPLE';
  age: number | null;
  partnerAge: number | null;
  propertyValue: number | null;
  propertyAddress: string | null;
  dealType: string | null;
  incomeEnc: string | null;
  partnerIncomeEnc: string | null;
  expensesEnc: string | null;
  existingLoansEnc: string | null;
  downPaymentEnc: string | null;
}): AnalysisData {
  const financials = decryptFinancials(client);
  const planning = defaultMortgagePlanningUserData();
  const couple = client.household === 'COUPLE';
  const dealType =
    client.dealType && client.dealType in DEAL_TYPES ? (client.dealType as DealType) : null;

  planning.applicationType = couple ? 'couple' : 'individual';
  planning.propertyType = propertyTypeForDeal(dealType);
  planning.ownCapital = money(financials.downPayment);
  planning.propertyPrice = money(client.propertyValue);

  if (couple) {
    planning.borrower1 = {
      age: client.age != null ? String(client.age) : '',
      monthlyIncome: money(financials.income),
      loans: financials.existingLoans
        ? [{ ...createEmptyLoan(), monthlyPayment: money(financials.existingLoans) }]
        : [],
    };
    planning.borrower2 = {
      age: client.partnerAge != null ? String(client.partnerAge) : '',
      monthlyIncome: money(financials.partnerIncome),
      loans: [],
    };
  } else {
    planning.age = client.age != null ? String(client.age) : '';
    planning.monthlyIncome = money(financials.income);
    if (financials.existingLoans) {
      planning.loans = [{ ...createEmptyLoan(), monthlyPayment: money(financials.existingLoans) }];
    }
  }

  return analysisFromPlanning(planning, 'property-type');
}

function defaultPlanName(): string {
  const now = new Date();
  const month = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(now);
  return `תכנון משכנתא · ${month}`;
}

export interface SaveStageInput {
  userId: string;
  planId: string;
  stage: PlanStageId;
  data: unknown;
  /** סגירת השלב ומעבר לשלב הבא */
  complete?: boolean;
}

export interface SaveStageResult {
  ok: boolean;
  /** מה חסר כדי לסגור את השלב, כשהסגירה נדחתה */
  blocked?: boolean;
  plan?: PlanView;
}

/**
 * שמירת נתוני שלב, ואם התבקש — סגירתו.
 *
 * הסגירה נבדקת גם כאן ולא רק בטופס, כדי שתוכנית לא תסומן כמושלמת בלי הנתונים
 * שהשלבים הבאים נשענים עליהם. אחרי כל שמירה מחושבים מחדש אחוז ההתקדמות
 * ועמודות הסיכום, כדי שכרטיס התהליך באזור האישי יהיה מעודכן.
 */
export async function saveStage({
  userId,
  planId,
  stage,
  data,
  complete = false,
}: SaveStageInput): Promise<SaveStageResult> {
  if (!(await assertAccess(userId, planId))) return { ok: false };

  const clean = parseStageData(stage, data);

  await prisma.mortgagePlanStage.upsert({
    where: { planId_stage: { planId, stage } },
    create: {
      planId,
      stage,
      status: 'IN_PROGRESS',
      dataJson: clean as unknown as Prisma.InputJsonValue,
    },
    // הסטטוס אינו חלק מהעדכון: שלב שנסגר ונערך שוב נשאר סגור, ועריכה אינה
    // מבטלת התקדמות שכבר הושגה
    update: { dataJson: clean as unknown as Prisma.InputJsonValue },
  });

  await prisma.mortgagePlanStage.updateMany({
    where: { planId, stage, status: 'PENDING' },
    data: { status: 'IN_PROGRESS' },
  });

  if (complete) {
    const current = await loadData(planId);
    if (!stageIsComplete(stage, current)) {
      return { ok: false, blocked: true, plan: await getPlanForUser(userId, planId) ?? undefined };
    }
    await closeStage(planId, stage);
  }

  await refreshPlan(planId);
  const plan = await getPlanForUser(userId, planId);
  return { ok: true, plan: plan ?? undefined };
}

async function loadData(planId: string): Promise<PlanData> {
  const rows = await prisma.mortgagePlanStage.findMany({
    where: { planId },
    select: { stage: true, dataJson: true },
  });
  const data = emptyPlanData();
  rows.forEach((row) => assignStage(data, row.stage as PlanStageId, row.dataJson));
  return data;
}

/** סגירת שלב ופתיחת הבא אחריו */
async function closeStage(planId: string, stage: PlanStageId): Promise<void> {
  await prisma.mortgagePlanStage.update({
    where: { planId_stage: { planId, stage } },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  const next = PLAN_STAGES[stageIndex(stage) + 1];
  if (next) {
    await prisma.mortgagePlanStage.updateMany({
      where: { planId, stage: next, status: 'PENDING' },
      data: { status: 'IN_PROGRESS' },
    });
    await prisma.mortgagePlan.update({
      where: { id: planId },
      data: { currentStage: next },
    });
  }
}

/** מעבר ידני בין שלבים — רק לשלב שכבר נפתח */
export async function setCurrentStage(
  userId: string,
  planId: string,
  stage: PlanStageId
): Promise<PlanView | null> {
  if (!(await assertAccess(userId, planId))) return null;

  const row = await prisma.mortgagePlanStage.findUnique({
    where: { planId_stage: { planId, stage } },
    select: { status: true },
  });
  if (!row || row.status === 'PENDING') return null;

  await prisma.mortgagePlan.update({ where: { id: planId }, data: { currentStage: stage } });
  return getPlanForUser(userId, planId);
}

export async function renamePlan(
  userId: string,
  planId: string,
  name: string
): Promise<PlanView | null> {
  if (!(await assertAccess(userId, planId))) return null;
  const clean = name.trim();
  if (!clean) return null;

  await prisma.mortgagePlan.update({ where: { id: planId }, data: { name: clean } });
  return getPlanForUser(userId, planId);
}

/** מחיקה היא ארכוב: התהליך יורד מהאזור האישי אך ההיסטוריה נשמרת */
export async function archivePlan(userId: string, planId: string): Promise<boolean> {
  const row = await prisma.mortgagePlan.findFirst({
    where: { id: planId, ownerId: userId },
    select: { id: true },
  });
  if (!row) return false;

  await prisma.mortgagePlan.update({ where: { id: planId }, data: { status: 'ARCHIVED' } });
  return true;
}

/**
 * חישוב מחדש של ההתקדמות ועמודות הסיכום מתוך נתוני השלבים.
 *
 * תוכנית שכל שלביה נסגרו מסומנת כמושלמת — זהו התנאי להצגתה כ"משכנתא שתוכננה"
 * באזור האישי.
 */
async function refreshPlan(planId: string): Promise<void> {
  const rows = await prisma.mortgagePlanStage.findMany({
    where: { planId },
    select: { stage: true, status: true, dataJson: true },
  });

  const data = emptyPlanData();
  const statuses = {} as Record<PlanStageId, PlanStageStatus>;
  PLAN_STAGES.forEach((stage) => {
    statuses[stage] = 'PENDING';
  });

  rows.forEach((row) => {
    const id = row.stage as PlanStageId;
    assignStage(data, id, row.dataJson);
    statuses[id] = row.status as PlanStageStatus;
  });

  const progress = planProgress(statuses);
  const snapshot = planSnapshot(data);
  const done = progress === 100;

  await prisma.mortgagePlan.update({
    where: { id: planId },
    data: {
      progress,
      propertyValue: snapshot.propertyValue,
      propertyAddress: snapshot.propertyAddress,
      mortgageAmount: snapshot.mortgageAmount,
      monthlyPayment: snapshot.monthlyPayment,
      status: done ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: done ? new Date() : null,
    },
  });
}
