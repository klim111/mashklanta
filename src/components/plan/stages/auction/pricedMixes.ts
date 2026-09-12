/**
 * התמהילים המתומחרים של שלב 4.
 *
 * בשלב הזה מבנה התמהיל כבר נעול — הוא נבחר בשלב 3 כתמהיל הסופי. מה שמשתנה בין
 * הבנקים הוא הריביות בלבד, ולכן כל הצעה שנשמרת היא עותק של אותו מבנה בדיוק עם
 * הריביות שאותו בנק נתן. המודול הזה מחזיק את הלוגיקה הטהורה: מי מתומחר על
 * התמהיל הסופי, איך מסננים לפי בנק, ומי מנצח.
 */

import { MORTGAGE_BANKS } from '@/components/mortgage-advisor/types';
import type { MortgageBank } from '@/components/mortgage-advisor/types';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';

export interface PricedMix extends SavedMix {
  bank: MortgageBank;
  /** מתי התקבלו הריביות מהבנק (ISO) */
  receivedAt: string;
}

/**
 * צבע לכל בנק. ההפרדה הוויזואלית היא מה שמאפשר לזהות בסריקה מהירה איזה בנק
 * תמחר איזה תמהיל, בלי לקרוא את הכותרת של כל שורה.
 */
export interface BankTone {
  /** רקע רך לשורה */
  surface: string;
  /** מסגרת */
  border: string;
  /** טקסט הסימון */
  text: string;
  /** הצבע המלא, לגרפים ולנקודת הצבע */
  dot: string;
}

const BANK_TONES: Record<MortgageBank, BankTone> = {
  לאומי: {
    surface: 'bg-indigo-50',
    border: 'border-indigo-300',
    text: 'text-indigo-800',
    dot: '#4f46e5',
  },
  הפועלים: {
    surface: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-800',
    dot: '#e11d48',
  },
  מזרחי: {
    surface: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    dot: '#d97706',
  },
  דיסקונט: {
    surface: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    dot: '#059669',
  },
  מרכנטיל: {
    surface: 'bg-sky-50',
    border: 'border-sky-300',
    text: 'text-sky-800',
    dot: '#0284c7',
  },
  הבינלאומי: {
    surface: 'bg-violet-50',
    border: 'border-violet-300',
    text: 'text-violet-800',
    dot: '#7c3aed',
  },
  ירושלים: {
    surface: 'bg-teal-50',
    border: 'border-teal-300',
    text: 'text-teal-800',
    dot: '#0d9488',
  },
};

const NEUTRAL_TONE: BankTone = {
  surface: 'bg-slate-50',
  border: 'border-slate-300',
  text: 'text-slate-700',
  dot: '#64748b',
};

export function bankTone(bank: string | null | undefined): BankTone {
  if (!bank) return NEUTRAL_TONE;
  return BANK_TONES[bank as MortgageBank] ?? NEUTRAL_TONE;
}

/** הסימון בכיתוב שמופיע בכותרת של תמהיל מתומחר */
export function pricedMixLabel(bank: string): string {
  return `תומחר ע"י ${bank}`;
}

/**
 * ההצעות שהתקבלו על התמהיל הסופי.
 *
 * הזיהוי הוא לפי `sourceMixId` שנשמר על ההצעה — התמהיל שממנו הועתק המבנה —
 * ולכן הצעות שהתקבלו על תמהיל אחר של אותו נכס אינן נכנסות לכאן.
 */
export function pricedMixesFor(items: SavedMix[], finalMixKey: string | null): PricedMix[] {
  if (!finalMixKey) return [];
  return items
    .flatMap((item) => {
      const quote = item.mix.quote;
      if (!quote) return [];
      if ((quote.sourceMixId ?? item.mix.id) !== finalMixKey) return [];
      return [{ ...item, bank: quote.bank, receivedAt: quote.receivedAt }];
    })
    .sort((a, b) => {
      // הזול קודם: ההשוואה בשלב הזה היא על עלות, לא על סדר ההזנה
      const diff = a.summary.totalPaid - b.summary.totalPaid;
      if (diff !== 0) return diff;
      return a.receivedAt.localeCompare(b.receivedAt);
    });
}

/** הבנקים שכבר תמחרו, לפי סדר הרשימה הקבועה — לשורת הסינון */
export function banksWithOffers(items: PricedMix[]): MortgageBank[] {
  const present = new Set(items.map((item) => item.bank));
  return MORTGAGE_BANKS.filter((bank) => present.has(bank));
}

/**
 * סינון לפי בנקים. בחירה ריקה פירושה "הכול" — זו הציפייה הטבעית משורת סינון,
 * ולא רשימה ריקה שמסתירה את כל מה שנשמר.
 */
export function filterByBanks(items: PricedMix[], banks: readonly string[]): PricedMix[] {
  if (banks.length === 0) return items;
  const wanted = new Set(banks);
  return items.filter((item) => wanted.has(item.bank));
}

/** הוספה או הסרה של בנק מהבחירה, בלי הגבלה על מספר הבנקים */
export function toggleBank<T extends string>(banks: readonly T[], bank: T): T[] {
  return banks.includes(bank) ? banks.filter((item) => item !== bank) : [...banks, bank];
}

/**
 * התמהיל המנצח — הזול ביותר בסך התשלומים.
 *
 * סך התשלומים הוא המספר היחיד שמשקלל ריבית, תקופה וסוג לוח יחד, ולכן הוא
 * ההשוואה הנכונה בין הצעות שכולן על אותו מבנה בדיוק.
 */
export function winningPricedMix(items: PricedMix[]): PricedMix | null {
  if (items.length === 0) return null;
  return items.reduce((best, item) => (item.summary.totalPaid < best.summary.totalPaid ? item : best));
}

/** הפער בין ההצעה הזולה ליקרה — מה שההתמחרות שווה ללקוח */
export function offersSpread(items: PricedMix[]): number {
  if (items.length < 2) return 0;
  const totals = items.map((item) => item.summary.totalPaid);
  return Math.max(...totals) - Math.min(...totals);
}
