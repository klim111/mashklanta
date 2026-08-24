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
  savedAt: true,
  mixJson: true,
  summaryJson: true,
  client: { select: { name: true } },
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
}

/**
 * שמירת תמהיל. שמירה חוזרת של אותו תמהיל מעדכנת את הרשומה הקיימת במקום ליצור
 * כפילות, ולכן המפתח הוא מזהה התמהיל בכלי יחד עם המשתמש ששמר אותו.
 */
export async function saveMix({ ownerId, mix, clientId }: SaveMixInput): Promise<SavedMix> {
  const summary = computeMix(mix).summary;
  const stored: WorkspaceMix = { ...mix, updatedAt: new Date().toISOString() };
  const columns = columnsFor(stored, summary);
  const savedAt = new Date();

  const row = await prisma.mortgageMix.upsert({
    where: { ownerId_mixKey: { ownerId, mixKey: mix.id } },
    create: {
      mixKey: mix.id,
      ownerId,
      clientId: clientId ?? null,
      savedAt,
      ...columns,
    },
    update: {
      // שיוך ללקוח נשמר כשלא נשלח שיוך חדש, כדי ששמירה מהאזור האישי לא תנתק אותו
      ...(clientId === undefined ? {} : { clientId }),
      savedAt,
      ...columns,
    },
    select: mixSelect,
  });

  const saved = fromRow(row);
  if (!saved) throw new Error('failed to read back the saved mix');
  return saved;
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
