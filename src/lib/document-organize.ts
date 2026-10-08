/**
 * סידור תיק המסמכים: למי המסמך מיועד, ובאיזה שלב הוא הועלה.
 *
 * כל מסמך שייך לקטגוריה אחת — לבנק, לעורך הדין, למוכר או לעצמי — ולשלב אחד
 * בתהליך (או לאף שלב). מה שהלקוח קבע בעצמו נשמר על הרשומה; למסמך שלא נקבע לו
 * דבר, הקטגוריה והשלב נגזרים מהמפתח שלו, כך שגם מסמכים ישנים מסודרים מיד.
 *
 * הקובץ טהור: בלי React ובלי Prisma, כדי שאפשר יהיה לבדוק אותו ישירות.
 */

import { PLAN_STAGES } from './mortgage-plan';
import type { PlanStageId } from './mortgage-plan';
import { customDocumentStage } from './document-progress';

export const DOCUMENT_CATEGORIES = ['BANK', 'LAWYER', 'SELLER', 'SELF'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  BANK: 'לבנק',
  LAWYER: 'לעורך הדין',
  SELLER: 'למוכר',
  SELF: 'לעצמי',
};

export function isDocumentCategory(value: unknown): value is DocumentCategory {
  return typeof value === 'string' && (DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

export function isPlanStage(value: unknown): value is PlanStageId {
  return typeof value === 'string' && (PLAN_STAGES as readonly string[]).includes(value);
}

/** קטגוריה ושלב שהלקוח קבע למסמך */
export interface DocumentMeta {
  category?: string | null;
  stage?: string | null;
}

/** רק ערכים מוכרים נשמרים; ערך חסר אינו משנה את מה שכבר נשמר */
export function cleanDocumentMeta(meta: DocumentMeta | undefined): { category?: string; stage?: string } {
  const clean: { category?: string; stage?: string } = {};
  if (isDocumentCategory(meta?.category)) clean.category = meta.category;
  if (meta?.stage === 'NONE' || isPlanStage(meta?.stage)) clean.stage = meta.stage as string;
  return clean;
}

interface Organizable {
  key: string;
  name: string;
  category?: string | null;
  stage?: string | null;
}

/** הקטגוריה שנגזרת מהמפתח, למסמך שהלקוח לא שייך בעצמו */
function inferredCategory(document: Organizable): DocumentCategory {
  const { key } = document;
  if (key.startsWith('custom:') || key.startsWith('email:')) return 'SELF';
  if (key.startsWith('signing:')) return document.name.includes('מוכר') ? 'SELLER' : 'LAWYER';
  // אישורים עקרוניים, ייפויי כוח, תיק הבנק ומסמכי הפרופיל — כולם לבנק
  return 'BANK';
}

/** השלב שנגזר מהמפתח, למסמך שהלקוח לא שייך בעצמו */
function inferredStage(document: Organizable): PlanStageId | null {
  const { key } = document;
  if (key.startsWith('custom:')) return customDocumentStage(document);
  if (key.startsWith('email:')) return null;
  if (key.startsWith('preapproval-') || key.startsWith('authorization-letter:')) return 'APPLICATIONS';
  if (key.startsWith('signing:') || key.startsWith('bank-file:')) return 'SIGNING';
  // מסמכי הפרופיל מועלים בשלב הראשון
  return 'ANALYSIS';
}

export function documentCategory(document: Organizable): DocumentCategory {
  return isDocumentCategory(document.category) ? document.category : inferredCategory(document);
}

/** השלב שהמסמך משויך אליו, או null למסמך כללי */
export function documentStage(document: Organizable): PlanStageId | null {
  if (document.stage === 'NONE') return null;
  return isPlanStage(document.stage) ? document.stage : inferredStage(document);
}

export interface DocumentFilter {
  query?: string;
  category?: DocumentCategory | null;
  /** שלב מסוים, 'NONE' למסמכים שאינם משויכים לשלב, או null לכל השלבים */
  stage?: PlanStageId | 'NONE' | null;
}

/** חיפוש בשם המסמך ובשם הקובץ, וסינון לפי קטגוריה ושלב */
export function filterDocuments<T extends Organizable & { fileName?: string }>(
  documents: readonly T[],
  filter: DocumentFilter
): T[] {
  const words = (filter.query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return documents.filter((document) => {
    if (filter.category && documentCategory(document) !== filter.category) return false;
    if (filter.stage) {
      const stage = documentStage(document);
      if (filter.stage === 'NONE' ? stage !== null : stage !== filter.stage) return false;
    }
    if (words.length === 0) return true;
    const haystack = `${document.name} ${document.fileName ?? ''}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
