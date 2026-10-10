import { randomBytes } from 'crypto';
import { head } from '@vercel/blob';
import { MAX_DOCUMENT_BYTES, blobIsConfigured, isAllowedDocumentType } from './plan-documents';
import type { StoredAttachment } from './conversation';
import { LEAD_FILE_PREFIX, MAX_LEAD_FILES } from './lead-file-paths';
import type { LeadFileRef, LeadFileView } from './lead-file-paths';

export type ResolvedLeadFiles = { ok: true; files: StoredAttachment[] } | { ok: false; status: number; error: string };

/** הנתיבים שהדפדפן שלח, כפי שהגיעו בגוף הבקשה */
export function parseLeadFileRefs(value: unknown): LeadFileRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is LeadFileRef =>
        Boolean(item) && typeof item.pathname === 'string' && typeof item.fileName === 'string'
    )
    .map((item) => ({ pathname: item.pathname.trim(), fileName: item.fileName.trim().slice(0, 120) || 'קובץ' }));
}

/**
 * הקבצים שצורפו לפנייה, מוכנים לשמירה. הסוג והגודל נבדקים מול חנות הקבצים
 * עצמה ולא לפי מה שהדפדפן דיווח.
 */
export async function resolveLeadFiles(refs: readonly LeadFileRef[]): Promise<ResolvedLeadFiles> {
  if (refs.length === 0) return { ok: true, files: [] };
  if (refs.length > MAX_LEAD_FILES) {
    return { ok: false, status: 400, error: `אפשר לצרף עד ${MAX_LEAD_FILES} קבצים לפנייה` };
  }
  if (!blobIsConfigured()) return { ok: false, status: 503, error: 'אחסון הקבצים אינו מוגדר כרגע' };

  const files: StoredAttachment[] = [];
  for (const ref of refs) {
    if (!ref.pathname.startsWith(LEAD_FILE_PREFIX) || ref.pathname.includes('..')) {
      return { ok: false, status: 403, error: 'הקובץ אינו שייך לפנייה הזו' };
    }
    const blob = await head(ref.pathname).catch(() => null);
    if (!blob) return { ok: false, status: 404, error: `הקובץ ${ref.fileName} לא נמצא. נסו להעלות אותו שוב` };
    if (!isAllowedDocumentType(blob.contentType)) {
      return { ok: false, status: 415, error: `אפשר לצרף רק PDF או תמונה (${ref.fileName})` };
    }
    if (blob.size > MAX_DOCUMENT_BYTES) return { ok: false, status: 413, error: `${ref.fileName} גדול מ-15MB` };
    files.push({
      id: randomBytes(9).toString('hex'),
      fileName: ref.fileName,
      contentType: blob.contentType,
      size: blob.size,
      blob: blob.pathname,
    });
  }
  return { ok: true, files };
}

/** הקבצים כפי שנשמרו בעמודת הפנייה */
export function storedLeadFiles(value: unknown): StoredAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is StoredAttachment =>
      Boolean(item) &&
      typeof item.id === 'string' &&
      typeof item.fileName === 'string' &&
      typeof item.contentType === 'string' &&
      typeof item.size === 'number' &&
      typeof item.blob === 'string'
  );
}

export function leadFileViews(value: unknown): LeadFileView[] {
  return storedLeadFiles(value).map(({ id, fileName, contentType, size }) => ({ id, fileName, contentType, size }));
}
