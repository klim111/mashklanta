import { del, get, put } from '@vercel/blob';
import { prisma } from './db';
import { buildZip, safeEntryName, uniqueEntryName } from './zip';
import type { ZipEntry } from './zip';

/**
 * המסמכים התומכים של תהליך משכנתא.
 *
 * הקבצים יושבים ב-Vercel Blob כאובייקטים פרטיים (`access: 'private'`), ולכן
 * אין להם כתובת ציבורית שאפשר לנחש או לשתף. גם הנתיב הפנימי אינו נמסר
 * לדפדפן: הצפייה עוברת דרך מסלול מאומת שקורא את הקובץ בשרת ומזרים אותו, אחרי
 * שווידא שהמבקש הוא בעל התהליך או היועץ שמלווה אותו.
 *
 * דרוש משתנה סביבה אחד: `BLOB_READ_WRITE_TOKEN`.
 */

/** סוגי קבצים שמותר להעלות — מסמכים וסריקות בלבד */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

/** 15MB — מספיק לסריקה של כמה עמודים, ורחוק מגבולות הפלטפורמה */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export function isAllowedDocumentType(contentType: string): boolean {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(contentType);
}

export interface PlanDocumentView {
  id: string;
  planId: string;
  key: string;
  name: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

const documentSelect = {
  id: true,
  planId: true,
  key: true,
  name: true,
  fileName: true,
  contentType: true,
  size: true,
  uploadedAt: true,
};

function toView(row: {
  id: string;
  planId: string;
  key: string;
  name: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
}): PlanDocumentView {
  return { ...row, uploadedAt: row.uploadedAt.toISOString() };
}

/**
 * התהליך, אם מי ששואל רשאי לגעת בו: בעליו, או היועץ שמלווה את הלקוch שלו.
 * זו נקודת הבקרה היחידה — כל פעולה על מסמך עוברת דרכה.
 */
async function planForViewer(userId: string, planId: string) {
  return prisma.mortgagePlan.findFirst({
    where: { id: planId, OR: [{ ownerId: userId }, { client: { advisorId: userId } }] },
    select: { id: true, ownerId: true, clientId: true },
  });
}

export async function listPlanDocuments(
  userId: string,
  planId: string
): Promise<PlanDocumentView[]> {
  if (!(await planForViewer(userId, planId))) return [];
  const rows = await prisma.planDocument.findMany({
    where: { planId },
    orderBy: { uploadedAt: 'desc' },
    select: documentSelect,
  });
  return rows.map(toView);
}

/** כל המסמכים של לקוח, לכל תהליכיו — תיק המסמכים שהיועץ רואה */
export async function listClientDocuments(
  advisorId: string,
  clientId: string
): Promise<PlanDocumentView[]> {
  const rows = await prisma.planDocument.findMany({
    where: { clientId, client: { advisorId } },
    orderBy: { uploadedAt: 'desc' },
    select: documentSelect,
  });
  return rows.map(toView);
}

/** התחילית שכל קובץ של התהליך חייב לשבת תחתיה */
export function planDocumentPrefix(planId: string): string {
  return `plans/${planId}/`;
}

/** האם אחסון הקבצים מוגדר בכלל בסביבה הזו */
export function blobIsConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * ההרשאה להעלות לתהליך, ועמה הנתונים שיירשמו אחר כך.
 *
 * זו נקודת הבדיקה של העלאת הלקוח: היא רצה לפני שנוצר טוקן ההעלאה, ובלעדיה
 * לא נכתב כלום.
 */
export async function canUploadToPlan(userId: string, planId: string): Promise<boolean> {
  const plan = await planForViewer(userId, planId);
  return Boolean(plan && plan.ownerId === userId);
}

export interface RecordInput {
  key: string;
  name: string;
  fileName: string;
  contentType: string;
  size: number;
  /** הנתיב שהתקבל מ-Blob אחרי ההעלאה */
  blobPath: string;
}

/**
 * רישום קובץ שהועלה.
 *
 * הקובץ עצמו כבר יושב ב-Blob — הלקוח העלה אותו ישירות עם טוקן מוגבל — וכאן
 * נשמרת הרשומה שמקשרת אותו לתהליך. הנתיב נבדק מול התחילית של התהליך, כדי
 * שאי אפשר יהיה לרשום קובץ של מישהו אחר. מסמך קודם לאותו מפתח מוחלף, וקובצו
 * נמחק מהאחסון.
 */
export async function recordPlanDocument(
  userId: string,
  planId: string,
  input: RecordInput
): Promise<PlanDocumentView | null> {
  const plan = await planForViewer(userId, planId);
  if (!plan || plan.ownerId !== userId) return null;
  if (!input.blobPath.startsWith(planDocumentPrefix(planId))) return null;
  if (!isAllowedDocumentType(input.contentType)) return null;

  const existing = await prisma.planDocument.findUnique({
    where: { planId_key: { planId, key: input.key } },
    select: { id: true, blobPath: true },
  });

  const data = {
    planId,
    ownerId: userId,
    clientId: plan.clientId,
    key: input.key,
    name: input.name,
    fileName: input.fileName,
    contentType: input.contentType,
    size: Math.max(0, Math.min(input.size, MAX_DOCUMENT_BYTES)),
    blobPath: input.blobPath,
    uploadedAt: new Date(),
  };

  const row = existing
    ? await prisma.planDocument.update({ where: { id: existing.id }, data, select: documentSelect })
    : await prisma.planDocument.create({ data, select: documentSelect });

  // הקובץ הישן כבר אינו מקושר לדבר — אין טעם להשאיר אותו באחסון
  if (existing && existing.blobPath !== input.blobPath) {
    await del(existing.blobPath).catch(() => undefined);
  }

  return toView(row);
}

/**
 * שמירת קובץ שהגיע מהשרת עצמו — למשל קובץ שצורף למייל — בתיק של התהליך.
 *
 * כאן הקובץ לא עבר דרך הדפדפן, ולכן השרת כותב אותו ל-Blob בעצמו. מי שקורא
 * לפונקציה כבר בדק שמותר לו; כאן נבדק רק שהתהליך שייך ללקוח ושהקובץ מסוג
 * ובגודל שהתיק מקבל.
 */
export async function storeFileInPlan(
  ownerId: string,
  planId: string,
  input: { key: string; name: string; fileName: string; contentType: string; bytes: Uint8Array }
): Promise<PlanDocumentView | null> {
  const plan = await prisma.mortgagePlan.findFirst({
    where: { id: planId, ownerId },
    select: { id: true, clientId: true },
  });
  if (!plan) return null;
  if (!isAllowedDocumentType(input.contentType) || input.bytes.byteLength > MAX_DOCUMENT_BYTES) return null;

  const safeKey = input.key.replace(/[^a-zA-Z0-9_-]/g, '-');
  const blob = await put(`${planDocumentPrefix(planId)}${safeKey}`, Buffer.from(input.bytes), {
    access: 'private',
    contentType: input.contentType,
    addRandomSuffix: true,
  });

  const existing = await prisma.planDocument.findUnique({
    where: { planId_key: { planId, key: input.key } },
    select: { id: true, blobPath: true },
  });
  const data = {
    planId,
    ownerId,
    clientId: plan.clientId,
    key: input.key,
    name: input.name,
    fileName: input.fileName,
    contentType: input.contentType,
    size: input.bytes.byteLength,
    blobPath: blob.pathname,
    uploadedAt: new Date(),
  };
  const row = existing
    ? await prisma.planDocument.update({ where: { id: existing.id }, data, select: documentSelect })
    : await prisma.planDocument.create({ data, select: documentSelect });
  if (existing && existing.blobPath !== blob.pathname) await del(existing.blobPath).catch(() => undefined);
  return toView(row);
}

/**
 * תרגום כשל לתשובה שאפשר לפעול לפיה.
 *
 * שני הכשלים הצפויים בפריסה חדשה הם טבלה שטרם נוצרה וטוקן אחסון שלא הוגדר,
 * ושניהם נראים בדפדפן כ-500 סתום. ההודעות כאן אומרות בדיוק מה חסר.
 */
export function planDocumentFailure(error: unknown): { status: number; message: string } {
  const code = (error as { code?: string })?.code;
  const text = error instanceof Error ? error.message : String(error);

  // P2021 — הטבלה אינה קיימת; P2022 — עמודה חסרה. שניהם: מיגרציה שלא רצה
  if (code === 'P2021' || code === 'P2022') {
    return {
      status: 503,
      message: 'מסד הנתונים עדיין לא עודכן לתמיכה בתיק המסמכים. יש להריץ prisma migrate deploy.',
    };
  }

  if (!blobIsConfigured() || /No token found|BLOB_READ_WRITE_TOKEN/i.test(text)) {
    return {
      status: 503,
      message: 'אחסון הקבצים אינו מוגדר. חסר BLOB_READ_WRITE_TOKEN בסביבה.',
    };
  }

  if (/store.*not.*found|suspended/i.test(text)) {
    return { status: 503, message: 'מאגר הקבצים לא נמצא או מושהה. בדקו את חיבור ה-Blob בפרויקט.' };
  }

  return { status: 500, message: `ההעלאה נכשלה: ${text}` };
}

/** הקובץ עצמו, לצפייה — רק למי שרשאי לראות את התהליך */
export async function readPlanDocument(
  userId: string,
  documentId: string
): Promise<{ stream: ReadableStream; contentType: string; fileName: string } | null> {
  const row = await prisma.planDocument.findUnique({
    where: { id: documentId },
    select: {
      blobPath: true,
      contentType: true,
      fileName: true,
      plan: { select: { ownerId: true, client: { select: { advisorId: true } } } },
    },
  });
  if (!row) return null;

  const allowed = row.plan.ownerId === userId || row.plan.client?.advisorId === userId;
  if (!allowed) return null;

  const blob = await get(row.blobPath, { access: 'private' });
  if (!blob?.stream) return null;

  return { stream: blob.stream, contentType: row.contentType, fileName: row.fileName };
}

/**
 * כל מסמכי התהליך כקובץ אחד להורדה.
 *
 * הקבצים נקראים בשרת ונארזים לארכיון — כך שההורדה עוברת דרך אותה בדיקת
 * הרשאה כמו הצפייה, ואף כתובת אחסון אינה נחשפת.
 */
export async function planDocumentsArchive(
  userId: string,
  planId: string
): Promise<{ archive: Uint8Array; count: number } | null> {
  if (!(await planForViewer(userId, planId))) return null;

  const rows = await prisma.planDocument.findMany({
    where: { planId },
    orderBy: { uploadedAt: 'asc' },
    select: { name: true, fileName: true, blobPath: true, uploadedAt: true },
  });

  const taken = new Set<string>();
  const entries: ZipEntry[] = [];

  for (const row of rows) {
    const blob = await get(row.blobPath, { access: 'private' }).catch(() => null);
    if (!blob?.stream) continue;
    const buffer = new Uint8Array(await new Response(blob.stream).arrayBuffer());
    const base = safeEntryName(row.fileName || row.name, 'מסמך');
    entries.push({ name: uniqueEntryName(base, taken), data: buffer, at: row.uploadedAt });
  }

  return { archive: buildZip(entries), count: entries.length };
}

/** מחיקת מסמך — רק בעל התהליך, ותמיד גם מה-Blob */
export async function deletePlanDocument(userId: string, documentId: string): Promise<boolean> {
  const row = await prisma.planDocument.findUnique({
    where: { id: documentId },
    select: { id: true, blobPath: true, ownerId: true },
  });
  if (!row || row.ownerId !== userId) return false;

  await prisma.planDocument.delete({ where: { id: row.id } });
  await del(row.blobPath).catch(() => undefined);
  return true;
}
