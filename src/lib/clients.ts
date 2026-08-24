import type { Client, Prisma } from '@prisma/client';
import { prisma } from './db';
import { documentsUpToStage, stageProgress } from './client-process';
import type { ClientStage } from './client-process';
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
  mixCount: number;
  /** מסמכים שנותרו להגשה מתוך אלה שכבר נפתחו */
  openDocuments: number;
  updatedAt: string;
}

/** רשימת הלקוחות של היועץ, עם המספרים שמוצגים בשורת הלקוח */
export async function listAdvisorClients(advisorId: string): Promise<ClientListItem[]> {
  const rows = await prisma.client.findMany({
    where: { advisorId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { mixes: true } },
      documents: { select: { status: true, required: true } },
    },
  });

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
    mixCount: row._count.mixes,
    openDocuments: row.documents.filter((doc) => doc.required && doc.status === 'PENDING').length,
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
  client: Pick<Client, 'income' | 'partnerIncome' | 'expenses' | 'existingLoans'>,
  plannedMonthlyPayment: number | null
): number | null {
  const income = (client.income ?? 0) + (client.partnerIncome ?? 0);
  if (income <= 0) return null;
  return income - (client.expenses ?? 0) - (client.existingLoans ?? 0) - (plannedMonthlyPayment ?? 0);
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
    income: client.income,
    partnerIncome: client.partnerIncome,
    expenses: client.expenses,
    existingLoans: client.existingLoans,
    creditScore: client.creditScore,
    downPayment: client.downPayment,
    propertyValue: client.propertyValue,
    propertyAddress: client.propertyAddress,
    mortgageAmount: client.mortgageAmount,
    dealType: client.dealType,
    notes: client.notes,
    plannedMonthlyPayment,
    projectedCashFlow: projectCashFlow(client, plannedMonthlyPayment),
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

/** השדות שהיועץ יכול לעדכן בדף הלקוח */
export function clientUpdateData(input: Record<string, unknown>): Prisma.ClientUpdateInput {
  const data: Prisma.ClientUpdateInput = {};

  // שם הלקוח חייב להישאר מלא, ולכן שם ריק אינו נחשב עדכון
  if (typeof input.name === 'string' && input.name.trim()) data.name = input.name.trim();

  const nullableStrings = ['phone', 'address', 'partnerName', 'propertyAddress', 'notes'] as const;
  nullableStrings.forEach((key) => {
    const value = input[key];
    if (typeof value === 'string') data[key] = value.trim() || null;
  });

  const numbers = [
    'age',
    'partnerAge',
    'income',
    'partnerIncome',
    'expenses',
    'existingLoans',
    'creditScore',
    'downPayment',
    'propertyValue',
    'mortgageAmount',
  ] as const;
  numbers.forEach((key) => {
    const value = input[key];
    if (value === null) data[key] = null;
    else if (typeof value === 'number' && Number.isFinite(value)) {
      data[key] = key === 'age' || key === 'partnerAge' || key === 'creditScore' ? Math.round(value) : value;
    }
  });

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
