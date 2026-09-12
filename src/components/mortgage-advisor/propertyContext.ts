import { DEAL_TYPES, MAX_LTV_PERCENT, MIN_FIXED_PERCENT, isFixedTrackType } from './types';
import type { DealType, MortgageTrack } from './types';
import type { WorkspaceMix } from './engine';

/** ברירת המחדל של סוג העסקה כשלא נבחר אחר — התרחיש הנפוץ ביותר */
export const DEFAULT_DEAL_TYPE: DealType = 'first_home';

export const DEAL_TYPE_KEYS = Object.keys(DEAL_TYPES) as DealType[];

export function dealTypeOf(mix: Pick<WorkspaceMix, 'dealType'>): DealType {
  return mix.dealType ?? DEFAULT_DEAL_TYPE;
}

export function maxLtvPercent(dealType: DealType): number {
  return MAX_LTV_PERCENT[dealType] ?? MAX_LTV_PERCENT[DEFAULT_DEAL_TYPE];
}

/** מצב משולב: אחוז מימון שהלקוח מזין ידנית, בין 1% לתקרת בנק ישראל המוחלטת */
export const COMBINED_LTV_MIN = 1;
export const COMBINED_LTV_MAX = 75;

export function clampCombinedLtv(percent: number): number {
  if (!Number.isFinite(percent)) return COMBINED_LTV_MIN;
  return Math.min(COMBINED_LTV_MAX, Math.max(COMBINED_LTV_MIN, Math.round(percent)));
}

/**
 * סוג העסקה המינימלי שמאפשר את אחוז המימון שנבחר. מעל 70% רק דירה ראשונה,
 * מעל 50% דירה ראשונה או חליפית.
 */
export function dealTypeForCombinedLtv(percent: number, current?: DealType | null): DealType {
  const pct = clampCombinedLtv(percent);
  if (pct > 70) return 'first_home';
  if (pct > 50) {
    if (current === 'first_home' || current === 'replacement_home') return current;
    return 'first_home';
  }
  return current ?? DEFAULT_DEAL_TYPE;
}

/** סכום המשכנתא מאחוז מימון ידני, בתוך תקרת סוג העסקה */
export function mortgageForLtvPercent(
  propertyValue: number,
  ltvPercent: number,
  dealType: DealType
): number {
  if (!Number.isFinite(propertyValue) || propertyValue <= 0) return 0;
  const capped = Math.min(clampCombinedLtv(ltvPercent), maxLtvPercent(dealType));
  return Math.round((propertyValue * capped) / 100);
}

/** סכום המשכנתא הגבוה ביותר שבנק ישראל מתיר לנכס ולעסקה האלה */
export function maxMortgageFor(propertyValue: number, dealType: DealType): number {
  if (!Number.isFinite(propertyValue) || propertyValue <= 0) return 0;
  return (propertyValue * maxLtvPercent(dealType)) / 100;
}

/** ההון העצמי המינימלי שנדרש כדי לקחת את סכום המשכנתא הזה בעסקה הזאת */
export function requiredEquityFor(mortgageAmount: number, dealType: DealType): number {
  const ltv = maxLtvPercent(dealType);
  if (!Number.isFinite(mortgageAmount) || mortgageAmount <= 0 || ltv <= 0) return 0;
  return (mortgageAmount * (100 - ltv)) / ltv;
}

/** ההון העצמי הוא ההפרש בין עלות הנכס לסכום המשכנתא */
export function equityOf(mix: Pick<WorkspaceMix, 'propertyValue' | 'totalAmount'>): number {
  const propertyValue = mix.propertyValue ?? 0;
  if (propertyValue <= 0) return 0;
  return Math.max(0, propertyValue - mix.totalAmount);
}

export function ltvOf(mix: Pick<WorkspaceMix, 'propertyValue' | 'totalAmount'>): number {
  const propertyValue = mix.propertyValue ?? 0;
  if (propertyValue <= 0) return 0;
  return (mix.totalAmount / propertyValue) * 100;
}

export function exceedsLtvLimit(
  mix: Pick<WorkspaceMix, 'propertyValue' | 'totalAmount' | 'dealType'>
): boolean {
  const propertyValue = mix.propertyValue ?? 0;
  if (propertyValue <= 0) return false;
  return mix.totalAmount > maxMortgageFor(propertyValue, dealTypeOf(mix)) + 1;
}

/** סוג הנכס בשפת מחשבון הכושר, לשימוש בחישוב ההחזר המקסימלי */
export function planningPropertyType(dealType: DealType): string {
  switch (dealType) {
    case 'first_home':
      return 'דירה ראשונה';
    case 'replacement_home':
      return 'דירה חליפית';
    case 'second_home':
      return 'דירה להשקעה';
    default:
      return 'משכנתא לכל מטרה';
  }
}

/**
 * סך הסכום שנלקח בריבית קבועה — צמודה ולא צמודה יחד.
 *
 * שני המסלולים נספרים באותה קופה, כי דרישת בנק ישראל היא על הריבית הקבועה
 * כולה ולא על סוג ההצמדה שלה.
 */
export function fixedAmount(tracks: MortgageTrack[]): number {
  return tracks
    .filter((track) => isFixedTrackType(track.type))
    .reduce((sum, track) => sum + track.amount, 0);
}

/** הסכום שדרישת בנק ישראל מחייבת לקחת בריבית קבועה */
export function minFixedAmount(totalAmount: number): number {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return 0;
  return (totalAmount * MIN_FIXED_PERCENT) / 100;
}

/** האם התמהיל עומד בדרישת שליש הריבית הקבועה */
export function meetsFixedRequirement(
  mix: Pick<WorkspaceMix, 'totalAmount' | 'tracks'>
): boolean {
  return fixedAmount(mix.tracks) >= minFixedAmount(mix.totalAmount) - 1;
}

/**
 * כמה עוד חסר בריבית קבועה כדי להגיע לשליש.
 *
 * זה מה שמוצג להתרעה במקום לחסום: כל מסלול קבוע יכול להיות קטן משליש בפני
 * עצמו, וההשלמה יכולה לבוא מכל מסלול קבוע אחר — צמוד או לא צמוד.
 */
export function missingFixedAmount(
  mix: Pick<WorkspaceMix, 'totalAmount' | 'tracks'>
): number {
  const missing = minFixedAmount(mix.totalAmount) - fixedAmount(mix.tracks);
  return missing > 1 ? missing : 0;
}

/** כתובת מנורמלת להשוואה — רווחים כפולים ואותיות רישיות לא הופכים נכס לשני נכסים */
function normalizeAddress(address?: string): string {
  return (address ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * המפתח שמאגד תמהילים יחד: כתובת הנכס אם צוינה, ואחרת סכום המשכנתא. כך כל
 * ההשוואות נעשות בין תמהילים לאותו נכס, או בין תמהילים לאותו סכום משכנתא כללי.
 */
export function propertyGroupKey(
  mix: Pick<WorkspaceMix, 'propertyAddress' | 'totalAmount'>
): string {
  const address = normalizeAddress(mix.propertyAddress);
  if (address) return `address:${address}`;
  return `amount:${Math.round(mix.totalAmount)}`;
}

export function sameProperty(
  a: Pick<WorkspaceMix, 'propertyAddress' | 'totalAmount'>,
  b: Pick<WorkspaceMix, 'propertyAddress' | 'totalAmount'>
): boolean {
  return propertyGroupKey(a) === propertyGroupKey(b);
}

/** האם כבר קיים תמהיל באותו שם לאותו נכס — חוץ מהתמהיל שבעריכה, אם צוין */
export function mixNameExistsForProperty(
  name: string,
  property: Pick<WorkspaceMix, 'propertyAddress' | 'totalAmount'>,
  mixes: Array<{ mix: Pick<WorkspaceMix, 'id' | 'name' | 'propertyAddress' | 'totalAmount'> }>,
  exceptId?: string
): boolean {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return false;
  return mixes.some(
    (item) =>
      item.mix.id !== exceptId &&
      sameProperty(item.mix, property) &&
      item.mix.name.trim().toLowerCase() === trimmed
  );
}

export interface MixGroup<T> {
  key: string;
  /** כתובת הנכס, אם הקבוצה מאוגדת סביב נכס ספציפי */
  address?: string;
  propertyValue?: number;
  dealType?: DealType;
  /** סכום המשכנתא של התמהיל העדכני בקבוצה */
  totalAmount: number;
  items: T[];
}

/**
 * מקבץ תמהילים לפי נכס. בכל קבוצה פרטי הנכס נלקחים מהתמהיל הראשון שיש בו
 * פרטים, כדי שכותרת הקבוצה תישאר מלאה גם אם תמהיל אחד נשמר בלי עלות נכס.
 */
export function groupByProperty<T>(
  items: T[],
  getMix: (item: T) => WorkspaceMix
): Array<MixGroup<T>> {
  const groups = new Map<string, MixGroup<T>>();

  items.forEach((item) => {
    const mix = getMix(item);
    const key = propertyGroupKey(mix);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        address: mix.propertyAddress?.trim() || undefined,
        propertyValue: mix.propertyValue,
        dealType: mix.dealType,
        totalAmount: mix.totalAmount,
        items: [item],
      });
      return;
    }

    existing.items.push(item);
    existing.propertyValue ??= mix.propertyValue;
    existing.dealType ??= mix.dealType;
    existing.address ??= mix.propertyAddress?.trim() || undefined;
  });

  return Array.from(groups.values());
}
