/**
 * קבצים שמצרפים לפנייה ליועץ — החלק שגם הדפדפן צריך.
 *
 * הקובץ עולה מהדפדפן ישר לחנות הקבצים, לנתיב `leads/<מזהה אקראי>/…`. גם אורח בלי
 * חשבון יכול להעלות, ולכן השרת מקבל רק נתיבים מתחת ל-`leads/` ובודק כל קובץ מחדש.
 */
export const LEAD_FILE_PREFIX = 'leads/';
export const MAX_LEAD_FILES = 3;

/** מה שהדפדפן שולח עם הפנייה על כל קובץ שהעלה */
export interface LeadFileRef {
  pathname: string;
  fileName: string;
}

/** מה שהיועץ רואה על קובץ מצורף — בלי הנתיב בחנות הקבצים */
export interface LeadFileView {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
}

/** מזהה אקראי לקבוצת הקבצים של פנייה אחת */
export function newLeadUploadBatch(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function leadUploadPath(batch: string, fileName: string): string {
  const safe = fileName.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/-+/g, '-').slice(-80) || 'file';
  return `${LEAD_FILE_PREFIX}${batch}/${safe}`;
}
