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
  /** תהליך המשכנתא שהתמהיל שייך לו. ריק — התמהיל אינו משויך לנכס */
  planId?: string | null;
  /** כתובת הנכס של התהליך שהתמהיל שויך אליו */
  planAddress?: string | null;
  /** הקטגוריה שהיועץ הגדיר, לתמהילים שאינם משויכים ללקוח */
  categoryId?: string | null;
  categoryName?: string | null;
  /** מי שמר את התמהיל — כדי שהלקוח יראה שהוא הוצע לו על ידי היועץ ובשמו */
  ownerName?: string | null;
  ownerIsAdvisor?: boolean;
  isFinal?: boolean;
  locked?: boolean;
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

/** סיכומים ישנים עלולים לחסור שדות הצמדה שנוספו אחריהם */
function withIndexationDefaults(summary: MixSummary): MixSummary {
  const { inflationCost: savedCost, totalIndexation: savedIndexation, ...rest } = summary;
  return {
    ...rest,
    inflationCost: Number.isFinite(savedCost) ? savedCost : 0,
    totalIndexation: Number.isFinite(savedIndexation) ? savedIndexation : 0,
  };
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

  const summary = summaryIsUsable(item.summary)
    ? withIndexationDefaults(item.summary)
    : computeMix(mix).summary;
  const savedAt = typeof item.savedAt === 'string' ? item.savedAt : mix.updatedAt;

  const locked = item.locked === true || mix.locked === true;
  const isFinal = item.isFinal === true;
  return {
    recordId: typeof item.recordId === 'string' ? item.recordId : undefined,
    mix: locked ? { ...mix, locked: true } : mix,
    summary,
    savedAt,
    clientId: typeof item.clientId === 'string' ? item.clientId : null,
    clientName: typeof item.clientName === 'string' ? item.clientName : null,
    planId: typeof item.planId === 'string' ? item.planId : null,
    planAddress: typeof item.planAddress === 'string' ? item.planAddress : null,
    categoryId: typeof item.categoryId === 'string' ? item.categoryId : null,
    categoryName: typeof item.categoryName === 'string' ? item.categoryName : null,
    ownerName: typeof item.ownerName === 'string' ? item.ownerName : null,
    ownerIsAdvisor: item.ownerIsAdvisor === true,
    isFinal,
    locked,
  };
}
