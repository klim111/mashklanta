import { randomBytes } from 'crypto';
import { copy, del, get, head } from '@vercel/blob';
import { prisma } from './db';
import { MAX_DOCUMENT_BYTES, blobIsConfigured, isAllowedDocumentType } from './plan-documents';
import { conversationFilePrefix } from './conversation';
import type { OutgoingFileRef, StoredAttachment } from './conversation';

/**
 * קבצים שמצרפים מההתכתבות — למייל או להודעת צ'אט.
 *
 * קובץ מהמחשב עולה מהדפדפן ישר לחנות הקבצים (כמו בתיק המסמכים), לנתיב
 * `conversation/<הלקוח>/…`, והשרת מקבל רק את הנתיב. מסמך מתיק המסמכים מועתק
 * לאותו מקום, כך שהקובץ נשאר בשיחה גם אם יימחק מהתיק. הסוג והגודל נבדקים
 * כאן מול חנות הקבצים עצמה, ולא לפי מה שהדפדפן דיווח.
 */

interface FileAccess {
  clientUserId: string;
  viewerId: string;
  viewerRole: 'CLIENT' | 'ADVISOR';
}

export type ResolvedFiles = { ok: true; files: StoredAttachment[] } | { ok: false; status: number; error: string };

function newFileId(): string {
  return randomBytes(9).toString('hex');
}

function safeName(fileName: string): string {
  const clean = fileName.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/-+/g, '-').slice(-80);
  return clean || 'file';
}

/** מסמך מתיק המסמכים של הלקוח — אם מי ששולח רשאי לראות אותו */
async function documentForViewer(access: FileAccess, documentId: string) {
  return prisma.planDocument.findFirst({
    where: {
      id: documentId,
      ownerId: access.clientUserId,
      ...(access.viewerRole === 'ADVISOR' ? { plan: { client: { advisorId: access.viewerId } } } : {}),
    },
    select: { blobPath: true, fileName: true, contentType: true, size: true },
  });
}

/**
 * הקבצים שהמשתמש צירף, מוכנים לשמירה עם ההודעה. `maxTotal` — הגודל המרבי של
 * כולם יחד (למייל יש מגבלה אצל ספק המיילים).
 */
export async function resolveOutgoingFiles(
  access: FileAccess,
  refs: readonly OutgoingFileRef[],
  maxTotal: number
): Promise<ResolvedFiles> {
  if (refs.length === 0) return { ok: true, files: [] };
  if (!blobIsConfigured()) return { ok: false, status: 503, error: 'אחסון הקבצים אינו מוגדר כרגע' };

  const prefix = conversationFilePrefix(access.clientUserId);
  const files: StoredAttachment[] = [];
  let total = 0;
  for (const ref of refs) {
    let file: StoredAttachment;
    if (ref.kind === 'upload') {
      if (!ref.pathname.startsWith(prefix)) return { ok: false, status: 403, error: 'הקובץ אינו שייך לשיחה הזו' };
      const blob = await head(ref.pathname).catch(() => null);
      if (!blob) return { ok: false, status: 404, error: `הקובץ ${ref.fileName} לא נמצא. נסו לצרף אותו שוב` };
      file = { id: newFileId(), fileName: ref.fileName, contentType: blob.contentType, size: blob.size, blob: blob.pathname };
    } else {
      const doc = await documentForViewer(access, ref.documentId);
      if (!doc) return { ok: false, status: 404, error: 'המסמך לא נמצא בתיק המסמכים' };
      const copied = await copy(doc.blobPath, `${prefix}${newFileId()}-${safeName(doc.fileName)}`, {
        access: 'private',
        contentType: doc.contentType,
      });
      file = { id: newFileId(), fileName: doc.fileName, contentType: doc.contentType, size: doc.size, blob: copied.pathname };
    }
    if (!isAllowedDocumentType(file.contentType)) {
      return { ok: false, status: 415, error: `אפשר לצרף רק PDF או תמונה (${file.fileName})` };
    }
    if (file.size > MAX_DOCUMENT_BYTES) return { ok: false, status: 413, error: `${file.fileName} גדול מ-15MB` };
    total += file.size;
    if (total > maxTotal) {
      return { ok: false, status: 413, error: `הקבצים יחד גדולים מ-${Math.round(maxTotal / (1024 * 1024))}MB` };
    }
    files.push(file);
  }
  return { ok: true, files };
}

/** תוכן הקובץ, לצירוף למייל יוצא */
export async function readStoredFile(pathname: string): Promise<Uint8Array | null> {
  const blob = await get(pathname, { access: 'private' }).catch(() => null);
  if (!blob?.stream) return null;
  return new Uint8Array(await new Response(blob.stream).arrayBuffer());
}

/** הקובץ כזרם, לצפייה דרך הפלטפורמה */
export async function streamStoredFile(pathname: string): Promise<ReadableStream | null> {
  const blob = await get(pathname, { access: 'private' }).catch(() => null);
  return blob?.stream ?? null;
}

/** מחיקת הקבצים של הודעה או מייל שנמחקו לגמרי */
export async function deleteStoredFiles(files: readonly StoredAttachment[]): Promise<void> {
  const paths = files.map((item) => item.blob).filter((path): path is string => Boolean(path));
  if (paths.length > 0) await del(paths).catch((error) => console.error('[conversation-files] delete failed:', error));
}
