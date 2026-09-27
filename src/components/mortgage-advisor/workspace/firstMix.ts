'use client';

import { DEFAULT_INTEREST_RATES } from '../types';
import type { DealType } from '../types';
import { createEmptyMix, createTrack, normalizeMix } from '../engine';
import type { WorkspaceMix } from '../engine';
import { DEFAULT_DEAL_TYPE, maxMortgageFor, mixNameExistsForProperty } from '../propertyContext';

/** פרטי הנכס והעסקה שכל תמהיל נבנה עליהם */
export interface PropertySetup {
  propertyValue: number;
  dealType: DealType;
  totalAmount: number;
  maxMonthlyPayment: number;
  propertyAddress: string;
  /** הון עצמי מהפרופיל — ברירת המחדל של סכום המשכנתא היא מחיר הנכס פחות הסכום הזה */
  equity?: number;
}

/**
 * סכום המשכנתא שהכלי נפתח איתו כשאין עדיין נתוני נכס. הוא ניתן לעריכה מיד
 * בכותרת הנכס, וכל המסלולים מתעדכנים יחסית אליו.
 */
export const DEFAULT_TOTAL_AMOUNT = 1_000_000;

/** התמהיל נפתח עם מסלול קבועה לא צמודה בשליש מהמשכנתא — נקודת הפתיחה המקובלת */
export const FIRST_TRACK_SHARE = 1 / 3;

/** תקופת ברירת המחדל של המסלול הראשון, בשנים */
export const FIRST_TRACK_YEARS = 25;

type PropertyKey = Pick<WorkspaceMix, 'propertyAddress' | 'totalAmount'>;
type NamedMix = { mix: Pick<WorkspaceMix, 'id' | 'name' | 'propertyAddress' | 'totalAmount'> };

/**
 * סכום המשכנתא שהתמהיל הראשון נפתח איתו: מה שהוזן בשלבים הקודמים, ואם לא הוזן —
 * עלות הנכס פחות ההון העצמי, בתוך תקרת המימון של בנק ישראל לסוג העסקה.
 */
export function seedTotalAmount(seed: Partial<PropertySetup> | undefined, dealType: DealType): number {
  const requested = seed?.totalAmount;
  if (requested && requested > 0) return Math.round(requested);

  const propertyValue = seed?.propertyValue ?? 0;
  const equity = seed?.equity;
  if (propertyValue > 0 && equity != null && equity >= 0) {
    const fromEquity = Math.min(maxMortgageFor(propertyValue, dealType), propertyValue - equity);
    if (fromEquity > 0) return Math.round(fromEquity);
  }
  if (propertyValue > 0) return Math.round(maxMortgageFor(propertyValue, dealType));

  return DEFAULT_TOTAL_AMOUNT;
}

/** השם הפנוי הבא לתמהיל של אותו נכס — "תמהיל 1", "תמהיל 2" וכן הלאה */
export function nextFreeMixName(property: PropertyKey, existingMixes: NamedMix[] = []): string {
  for (let index = 1; index <= existingMixes.length + 1; index += 1) {
    const candidate = `תמהיל ${index}`;
    if (!mixNameExistsForProperty(candidate, property, existingMixes)) return candidate;
  }
  return `תמהיל ${existingMixes.length + 2}`;
}

/**
 * התמהיל שהכלי נפתח איתו: פרטי הנכס והעסקה כפי שהגיעו מהשלבים הקודמים, ומסלול
 * אחד — קבועה לא צמודה בלוח שפיצר, בשליש מסכום המשכנתא. שאר הסכום נשאר גלוי
 * כסכום שנותר לשבץ, כך שהמשתמש ממשיך משם בהוספת מסלולים בתוך הכלי עצמו.
 */
export function createFirstMix(options: {
  seed?: Partial<PropertySetup>;
  existingMixes?: NamedMix[];
} = {}): WorkspaceMix {
  const { seed, existingMixes = [] } = options;
  const dealType = seed?.dealType ?? DEFAULT_DEAL_TYPE;
  const totalAmount = seedTotalAmount(seed, dealType);
  const propertyAddress = seed?.propertyAddress?.trim() || undefined;
  const propertyValue =
    seed?.propertyValue && seed.propertyValue > 0 ? Math.round(seed.propertyValue) : undefined;
  const maxMonthlyPayment =
    seed?.maxMonthlyPayment && seed.maxMonthlyPayment > 0
      ? Math.round(seed.maxMonthlyPayment)
      : undefined;

  return normalizeMix(
    createEmptyMix({
      name: nextFreeMixName({ propertyAddress, totalAmount }, existingMixes),
      totalAmount,
      dealType,
      propertyValue,
      propertyAddress,
      maxMonthlyPayment,
      tracks: [
        createTrack({
          type: 'fixed_unlinked',
          amortizationType: 'spitzer',
          amount: Math.round(totalAmount * FIRST_TRACK_SHARE),
          years: FIRST_TRACK_YEARS,
          interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
        }),
      ],
    })
  );
}
