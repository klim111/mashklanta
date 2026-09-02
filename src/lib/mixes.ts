import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { computeMix } from '@/components/mortgage-advisor/engine';
import type { MixSummary, WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { toSavedMix } from '@/components/mortgage-advisor/mixRecord';
import type { SavedMix } from '@/components/mortgage-advisor/mixRecord';

/** השדות שנדרשים כדי להציג תמהיל ברשימה, בלי לטעון את כל הלוח */
const mixSelect = {
  id: true,
  mixKey: true,
  ownerId: true,
  clientId: true,
  planId: true,
  categoryId: true,
  isFinal: true,
  locked: true,
  savedAt: true,
  mixJson: true,
  summaryJson: true,
  client: { select: { name: true } },
  plan: { select: { propertyAddress: true, name: true } },
  category: { select: { name: true } },
  owner: { select: { name: true, email: true, role: true } },
} satisfies Prisma.MortgageMixSelect;

type MixRow = Prisma.MortgageMixGetPayload<{ select: typeof mixSelect }>;

/**
 * העמודות שנגזרות מהתמהיל. הן משוכפלות מתוך ה-JSON כדי שאפשר יהיה למיין,
 * לסנן ולקבץ תמהילים בבסיס הנתונים בלי לפרש את ה-JSON בכל שאילתה.
 */
function columnsFor(mix: WorkspaceMix, summary: MixSummary) {
  return {
    name: mix.name,
    totalAmount: mix.totalAmount,
    propertyValue: mix.propertyValue ?? null,
    propertyAddress: mix.propertyAddress?.trim() || null,
    dealType: mix.dealType ?? null,
    monthlyPayment: summary.monthlyPayment,
    totalInterest: summary.totalInterest,
    totalPaid: summary.totalPaid,
    averageRate: summary.averageRate,
    months: summary.months,
    mixJson: mix as unknown as Prisma.InputJsonValue,
    summaryJson: summary as unknown as Prisma.InputJsonValue,
  };
}

function fromRow(row: MixRow): SavedMix | null {
  return toSavedMix({
    recordId: row.id,
    mix: row.mixJson,
    summary: row.summaryJson,
    savedAt: row.savedAt.toISOString(),
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
    planId: row.planId,
    planAddress: row.plan?.propertyAddress ?? row.plan?.name ?? null,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    ownerIsAdvisor: row.owner?.role === 'ADVISOR',
    isFinal: row.isFinal,
    locked: row.locked,
  });
}

function fromRows(rows: MixRow[]): SavedMix[] {
  return rows.flatMap((row) => {
    const saved = fromRow(row);
    return saved ? [saved] : [];
  });
}

/** רשומות הליווי שבהן המשתמש הוא הלקוח */
async function clientIdsOf(userId: string): Promise<string[]> {
  const rows = await prisma.client.findMany({ where: { userId }, select: { id: true } });
  return rows.map((row) => row.id);
}

/**
 * כל התמהילים שהמשתמש רשאי לראות: אלה שהוא שמר, ואלה ששויכו אליו כלקוח —
 * כך שתמהיל שהיועץ בנה עבורו מופיע גם באזור האישי שלו.
 */
export async function listMixesForUser(userId: string): Promise<SavedMix[]> {
  const clientIds = await clientIdsOf(userId);
  const rows = await prisma.mortgageMix.findMany({
    where: clientIds.length > 0 ? { OR: [{ ownerId: userId }, { clientId: { in: clientIds } }] } : { ownerId: userId },
    orderBy: { savedAt: 'desc' },
    select: mixSelect,
  });
  return fromRows(rows);
}

/** התמהילים של לקוח מסוים — אותה רשימה שהיועץ והלקוח רואים */
export async function listMixesForClient(clientId: string): Promise<SavedMix[]> {
  const rows = await prisma.mortgageMix.findMany({
    where: { clientId },
    orderBy: { savedAt: 'desc' },
    select: mixSelect,
  });
  return fromRows(rows);
}

export interface SaveMixInput {
  ownerId: string;
  mix: WorkspaceMix;
  /** הלקוח שהתמהיל נשמר עבורו. null מנתק שיוך קיים */
  clientId?: string | null;
  /** תהליך המשכנתא שהתמהיל שייך לו. null מנתק שיוך לנכס */
  planId?: string | null;
  /**
   * הקטגוריה שהיועץ בחר בעת היצירה. רלוונטית לתמהילים שאינם משויכים ללקוח —
   * הם מסודרים לפיה באזור התמהילים השמורים.
   */
  categoryId?: string | null;
}

/**
 * שמירת תמהיל. שמירה חוזרת של אותו תמהיל מעדכנת את הרשומה הקיימת במקום ליצור
 * כפילות, ולכן המפתח הוא מזהה התמהיל בכלי יחד עם המשתמש ששמר אותו.
 */
export async function saveMix({
  ownerId,
  mix,
  clientId,
  planId,
  categoryId,
}: SaveMixInput): Promise<SavedMix> {
  const existing = await prisma.mortgageMix.findUnique({
    where: { ownerId_mixKey: { ownerId, mixKey: mix.id } },
    select: mixSelect,
  });

  if (existing?.locked) {
    const saved = fromRow(existing);
    if (!saved) throw new Error('failed to read back the locked mix');
    return saved;
  }

  const summary = computeMix(mix).summary;
  const stored: WorkspaceMix = { ...mix, locked: false, updatedAt: new Date().toISOString() };
  const columns = columnsFor(stored, summary);
  const savedAt = new Date();

  const row = await prisma.mortgageMix.upsert({
    where: { ownerId_mixKey: { ownerId, mixKey: mix.id } },
    create: {
      mixKey: mix.id,
      ownerId,
      clientId: clientId ?? null,
      planId: planId ?? null,
      categoryId: categoryId ?? null,
      savedAt,
      ...columns,
    },
    update: {
      ...(clientId === undefined ? {} : { clientId }),
      ...(planId === undefined ? {} : { planId }),
      ...(categoryId === undefined ? {} : { categoryId }),
      savedAt,
      ...columns,
    },
    select: mixSelect,
  });

  const saved = fromRow(row);
  if (!saved) throw new Error('failed to read back the saved mix');
  return saved;
}

export async function getMixForUser(userId: string, recordId: string): Promise<SavedMix | null> {
  if (!(await canEditMix(userId, recordId))) return null;
  const row = await prisma.mortgageMix.findUnique({ where: { id: recordId }, select: mixSelect });
  return row ? fromRow(row) : null;
}

/**
 * בחירת תמהיל כסופי לתהליך: הוא ננעל, שאר תמהילי התהליך מפסיקים להיות סופיים,
 * ונתוני השלב נשמרים כדי שייטענו במכרז ובחתימה.
 */
export async function markMixAsFinal(userId: string, recordId: string, planId: string): Promise<SavedMix | null> {
  if (!(await canEditMix(userId, recordId))) return null;

  const row = await prisma.mortgageMix.findUnique({
    where: { id: recordId },
    select: { ...mixSelect, mixJson: true },
  });
  if (!row) return null;

  await prisma.$transaction([
    prisma.mortgageMix.updateMany({
      where: { planId, id: { not: recordId } },
      data: { isFinal: false },
    }),
    prisma.mortgageMix.update({
      where: { id: recordId },
      data: {
        planId,
        isFinal: true,
        locked: true,
        mixJson: {
          ...((row.mixJson && typeof row.mixJson === 'object' ? row.mixJson : {}) as object),
          locked: true,
        } as Prisma.InputJsonValue,
      },
    }),
  ]);

  const updated = await prisma.mortgageMix.findUnique({ where: { id: recordId }, select: mixSelect });
  return updated ? fromRow(updated) : null;
}

/** שיוך תמהיל ללא נכס לכתובת ולתהליך */
export async function assignMixDeal(
  userId: string,
  recordId: string,
  deal: { planId?: string | null; propertyAddress?: string; propertyValue?: number | null; totalAmount?: number }
): Promise<SavedMix | null> {
  if (!(await canEditMix(userId, recordId))) return null;

  const current = await prisma.mortgageMix.findUnique({
    where: { id: recordId },
    select: { mixJson: true, locked: true },
  });
  if (!current) return null;
  if (current.locked) return getMixForUser(userId, recordId);

  const mixJson =
    current.mixJson && typeof current.mixJson === 'object'
      ? { ...(current.mixJson as object) }
      : {};

  await prisma.mortgageMix.update({
    where: { id: recordId },
    data: {
      ...(deal.planId !== undefined ? { planId: deal.planId } : {}),
      ...(deal.propertyAddress !== undefined
        ? { propertyAddress: deal.propertyAddress.trim() || null }
        : {}),
      ...(deal.propertyValue !== undefined ? { propertyValue: deal.propertyValue } : {}),
      ...(deal.totalAmount !== undefined ? { totalAmount: deal.totalAmount } : {}),
      mixJson: {
        ...mixJson,
        ...(deal.propertyAddress !== undefined ? { propertyAddress: deal.propertyAddress.trim() || undefined } : {}),
        ...(deal.propertyValue !== undefined ? { propertyValue: deal.propertyValue ?? undefined } : {}),
        ...(deal.totalAmount !== undefined ? { totalAmount: deal.totalAmount } : {}),
      } as Prisma.InputJsonValue,
    },
  });

  return getMixForUser(userId, recordId);
}

/**
 * שיוך תמהיל לקטגוריה של היועץ, או ניתוקו ממנה.
 *
 * רק מי ששמר את התמהיל יכול לשייך אותו, כי הקטגוריות שייכות ליועץ עצמו ולא
 * לעסקה — ולכן אין משמעות לקטגוריה של יועץ אחר על אותו תמהיל.
 */
export async function setMixCategory(
  ownerId: string,
  recordId: string,
  categoryId: string | null
): Promise<SavedMix | null> {
  if (categoryId) {
    const category = await prisma.mixCategory.findFirst({
      where: { id: categoryId, advisorId: ownerId },
      select: { id: true },
    });
    if (!category) return null;
  }

  const updated = await prisma.mortgageMix.updateMany({
    where: { id: recordId, ownerId },
    data: { categoryId },
  });
  if (updated.count === 0) return null;

  const row = await prisma.mortgageMix.findUnique({ where: { id: recordId }, select: mixSelect });
  return row ? fromRow(row) : null;
}

/** התמהילים ששמורים אצל היועץ ואינם משויכים ללקוח — הם שמסודרים לפי קטגוריה */
export async function listUnassignedMixes(ownerId: string): Promise<SavedMix[]> {
  const rows = await prisma.mortgageMix.findMany({
    where: { ownerId, clientId: null },
    orderBy: { savedAt: 'desc' },
    select: mixSelect,
  });
  return fromRows(rows);
}

/** האם המשתמש רשאי לגעת ברשומת התמהיל: הוא שמר אותה, הוא הלקוח, או שהוא היועץ */
export async function canEditMix(userId: string, recordId: string): Promise<boolean> {
  const row = await prisma.mortgageMix.findUnique({
    where: { id: recordId },
    select: { ownerId: true, client: { select: { userId: true, advisorId: true } } },
  });
  if (!row) return false;
  return (
    row.ownerId === userId || row.client?.userId === userId || row.client?.advisorId === userId
  );
}

