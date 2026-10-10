/**
 * הזנת הריביות שהתקבלו מבנק על תמהיל שהוגש לו.
 *
 * התמהיל נשלח לבנקים בלי ריביות, וכשבנק מחזיר תמחור נרשמות הריביות על עותק
 * של אותו תמהיל — עם שם הבנק ותאריך קבלת ההצעה. המקור נשאר כמו שהוא, ולכן
 * אפשר להזין ריביות לאותו תמהיל שוב ושוב, לכל בנק ולכל סבב, ולהשוות ביניהם.
 */

import { cloneWorkspaceMix } from '../engine';
import type { BankQuote, WorkspaceMix } from '../engine';
import type { MortgageBank } from '../types';

export interface BankQuoteInput {
  /** התמהיל שהוגש לבנק */
  source: WorkspaceMix;
  bank: MortgageBank;
  /** תאריך קבלת הריביות (ISO, או yyyy-mm-dd משדה תאריך) */
  receivedAt: string;
  /** הריבית שהתקבלה לכל מסלול, לפי מזהה המסלול */
  rates: Record<string, number>;
  /** שם התמהיל החדש. ריק — נגזר מהמקור, מהבנק ומהתאריך */
  name?: string;
  notes?: string;
  /** בקשת הריביות שממנה נפתחה ההזנה */
  requestId?: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatQuoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return DATE_FORMAT.format(date);
}

/** yyyy-mm-dd משדה תאריך → ISO מלא. ערך לא תקין נופל להיום */
export function quoteDateToIso(value: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return new Date().toISOString();
  const parsed = new Date(trimmed.length <= 10 ? `${trimmed}T12:00:00` : trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/** ISO → yyyy-mm-dd, לערך של שדה תאריך */
export function isoToQuoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** הכיתוב שמופיע על הכרטיסייה של תמהיל שהתקבלו לו ריביות */
export function quoteLabel(quote: BankQuote): string {
  return `התקבלו ריביות · בנק ${quote.bank}`;
}

/** שם ברירת המחדל לתמהיל של הבנק — שם המקור, הבנק ותאריך ההצעה */
export function defaultQuoteName(
  source: Pick<WorkspaceMix, 'name'>,
  bank: MortgageBank,
  receivedAt: string
): string {
  const base = source.name?.trim() || 'תמהיל';
  return `${base} · ריביות ${bank} ${formatQuoteDate(receivedAt)}`;
}

/**
 * שם ייחודי לנכס. הזנה חוזרת מאותו בנק באותו יום מקבלת מספר סבב, כדי ששתי
 * ההצעות יישמרו זו לצד זו ולא ייבלעו זו בזו.
 */
export function uniqueQuoteName(base: string, taken: string[]): string {
  const used = new Set(taken.map((name) => name.trim().toLowerCase()));
  if (!used.has(base.trim().toLowerCase())) return base;
  for (let round = 2; round < 100; round += 1) {
    const candidate = `${base} (${round})`;
    if (!used.has(candidate.trim().toLowerCase())) return candidate;
  }
  return `${base} (${Date.now()})`;
}

/** האם כל מסלול קיבל ריבית — הצעה חלקית אינה ניתנת להשוואה */
export function missingQuoteRates(
  source: Pick<WorkspaceMix, 'tracks'>,
  rates: Record<string, number>
): number {
  return source.tracks.filter((track) => {
    const rate = rates[track.id];
    return !Number.isFinite(rate) || rate <= 0;
  }).length;
}

/**
 * התמהיל של הבנק: אותו מבנה בדיוק — מסלולים, סכומים, תקופות ולוחות סילוקין —
 * עם הריביות שהתקבלו, ועם סימון הבנק והתאריך.
 */
export function buildQuotedMix(input: BankQuoteInput): WorkspaceMix {
  const { source, bank, rates } = input;
  const receivedAt = quoteDateToIso(input.receivedAt);
  const quote: BankQuote = {
    bank,
    receivedAt,
    sourceMixId: source.quote?.sourceMixId ?? source.id,
    requestId: input.requestId,
    notes: input.notes?.trim() || undefined,
  };

  return cloneWorkspaceMix(source, {
    name: input.name?.trim() || defaultQuoteName(source, bank, receivedAt),
    tracks: source.tracks.map((track) => {
      const rate = rates[track.id];
      return {
        ...track,
        interestRate: Number.isFinite(rate) && rate > 0 ? rate : track.interestRate,
      };
    }),
    // ההצעה נמדדת מול ריביות הבנק כפי שהן, בלי תרחיש שהיה פתוח בעבודה
    assumptions: {
      ...source.assumptions,
      rateDeltas: {},
    },
    quote,
  });
}
