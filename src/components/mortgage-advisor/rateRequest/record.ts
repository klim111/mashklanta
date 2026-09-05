/**
 * בקשת ריביות שמורה, כפי שהיא עוברת בין השרת לדפדפן.
 *
 * נשמרים התמהיל עצמו והפרטים שהמשתמש מילא; המכתב עצמו נבנה מחדש בכל טעינה,
 * כדי שתמיד יהיה מקור אמת אחד — התמהיל — ולא עותק קפוא של המסמך.
 */

import { sanitizeMix } from '../engine';
import type { WorkspaceMix } from '../engine';
import { buildRateRequestDocument } from './document';
import type { RateRequestDetails, RateRequestDocument } from './document';

export interface SavedRateRequest {
  /** מזהה הרשומה בבסיס הנתונים. חסר בבקשה ששמורה בדפדפן בלבד */
  recordId?: string;
  /** מזהה הבקשה בכלי — יציב גם בין מכשירים */
  id: string;
  reference: string;
  createdAt: string;
  mix: WorkspaceMix;
  details: RateRequestDetails;
  /** המכתב המלא, נבנה מהתמהיל ומהפרטים */
  document: RateRequestDocument;
  clientId?: string | null;
  clientName?: string | null;
  ownerName?: string | null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function sanitizeRateRequestDetails(raw: unknown): RateRequestDetails {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const details: RateRequestDetails = {};
  const bankName = text(source.bankName);
  if (bankName) details.bankName = bankName;
  const applicantName = text(source.applicantName);
  if (applicantName) details.applicantName = applicantName;
  const contactPhone = text(source.contactPhone);
  if (contactPhone) details.contactPhone = contactPhone;
  const contactEmail = text(source.contactEmail);
  if (contactEmail) details.contactEmail = contactEmail;
  const replyBy = text(source.replyBy);
  if (replyBy) details.replyBy = replyBy;
  const notes = text(source.notes);
  if (notes) details.notes = notes;
  return details;
}

/** תיקון רשומה שהגיעה מהשרת או מאחסון הדפדפן. רשומה שבורה מוחזרת כ-null */
export function toSavedRateRequest(raw: unknown): SavedRateRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const mix = sanitizeMix(item.mix);
  if (!mix) return null;

  const details = sanitizeRateRequestDetails(item.details);
  const createdAt = text(item.createdAt) ?? mix.updatedAt ?? new Date().toISOString();
  const document = buildRateRequestDocument(mix, {
    details,
    id: text(item.id),
    reference: text(item.reference),
    createdAt,
  });

  return {
    recordId: text(item.recordId),
    id: document.id,
    reference: document.reference,
    createdAt,
    mix,
    details,
    document,
    clientId: typeof item.clientId === 'string' ? item.clientId : null,
    clientName: typeof item.clientName === 'string' ? item.clientName : null,
    ownerName: typeof item.ownerName === 'string' ? item.ownerName : null,
  };
}
