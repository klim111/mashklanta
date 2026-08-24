import { computeMix, sanitizeMix } from './engine';
import type { MixSummary, WorkspaceMix } from './engine';

/**
 * תמהיל שמור כפי שהוא עובר בין השרת לדפדפן.
 *
 * התמהיל עצמו נשמר כמו שהוא, ולצידו תמונת מצב של הסיכום כדי שרשימות ייטענו
 * בלי לחשב מחדש לוח סילוקין שלם.
 */
export interface SavedMix {
  /** מזהה הרשומה בבסיס הנתונים. חסר רק בתמהיל שעדיין לא נשמר */
  recordId?: string;
  mix: WorkspaceMix;
  summary: MixSummary;
  savedAt: string;
  /** הלקוח שהתמהיל שויך אליו, אם שויך */
  clientId?: string | null;
  clientName?: string | null;
}

/** האם הסיכום ששמור לצד התמהיל שלם, או שצריך לחשב אותו מחדש. */
function summaryIsUsable(summary: unknown): summary is MixSummary {
  if (!summary || typeof summary !== 'object') return false;
  const required: Array<keyof MixSummary> = [
    'monthlyPayment',
    'totalInterest',
    'totalPaid',
    'averageRate',
    'months',
    'costPerShekel',
  ];
  return required.every((key) => {
    const value = (summary as Record<string, unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value);
  });
}

/**
 * תיקון תמהיל שהגיע מאחסון כלשהו — בסיס נתונים, אחסון הדפדפן או גרסה ישנה של
 * הכלי. תמהיל שאין בו כלום שאפשר לשחזר מוחזר כ-null במקום להפיל את התצוגה.
 */
export function toSavedMix(raw: unknown): SavedMix | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const mix = sanitizeMix(item.mix);
  if (!mix) return null;

  const summary = summaryIsUsable(item.summary) ? item.summary : computeMix(mix).summary;
  const savedAt = typeof item.savedAt === 'string' ? item.savedAt : mix.updatedAt;

  return {
    recordId: typeof item.recordId === 'string' ? item.recordId : undefined,
    mix,
    summary,
    savedAt,
    clientId: typeof item.clientId === 'string' ? item.clientId : null,
    clientName: typeof item.clientName === 'string' ? item.clientName : null,
  };
}
