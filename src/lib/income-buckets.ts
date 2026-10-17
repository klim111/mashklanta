import type { IncomeBucket } from '@prisma/client';

/**
 * טווחי הכנסה חודשית של משק הבית, בשקלים. הערכים זהים ל-enum IncomeBucket
 * בסכימה, והקובץ הזה נפרד מההצפנה כדי שאפשר לייבא אותו גם בקומפוננטות דפדפן.
 */

export const INCOME_BUCKETS = [
  'UNDER_10K',
  'FROM_10K_TO_15K',
  'FROM_15K_TO_25K',
  'FROM_25K_TO_40K',
  'ABOVE_40K',
] as const;

export const INCOME_BUCKET_LABELS: Record<IncomeBucket, string> = {
  UNDER_10K: 'עד 10,000 ₪',
  FROM_10K_TO_15K: '10–15 אלף ₪',
  FROM_15K_TO_25K: '15–25 אלף ₪',
  FROM_25K_TO_40K: '25–40 אלף ₪',
  ABOVE_40K: 'מעל 40 אלף ₪',
};

const INCOME_BUCKET_THRESHOLDS: ReadonlyArray<readonly [number, IncomeBucket]> = [
  [10_000, 'UNDER_10K'],
  [15_000, 'FROM_10K_TO_15K'],
  [25_000, 'FROM_15K_TO_25K'],
  [40_000, 'FROM_25K_TO_40K'],
];

/**
 * טווח ההכנסה של משק הבית, שנשמר גלוי לצד הערכים המוצפנים כדי שאפשר יהיה לסנן
 * לקוחות בלי לפענח את כל הטבלה. כשאין נתוני הכנסה כלל אין טווח.
 */
export function incomeBucketFor(
  income: number | null,
  partnerIncome: number | null
): IncomeBucket | null {
  if (income === null && partnerIncome === null) return null;

  const total = (income ?? 0) + (partnerIncome ?? 0);
  const match = INCOME_BUCKET_THRESHOLDS.find(([ceiling]) => total < ceiling);
  return match ? match[1] : 'ABOVE_40K';
}
