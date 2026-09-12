/**
 * הזמנת ליווי יועץ לשלבים בתהליך.
 *
 * הלקוח עובר את חמשת השלבים לבד, ובכל שלב יכול להחליט שיועץ יעשה אותו במקומו.
 * ההזמנה היא לכל צירוף שלבים — שלב אחד, כמה שלבים, או כולם — והמחיר לכל שלב
 * הוא בדיוק המחיר שמופיע בעמוד התמחור לגולשים שאינם רשומים. הזמנה של שלב
 * כלשהו מקנה גם את הגישה לפלטפורמה, ולכן אין עליה תשלום חודשי נוסף.
 */

import { PLAN_STAGES } from './mortgage-plan';
import type { PlanStageId } from './mortgage-plan';
import { journeyStages } from '@/data/platform/journey';
import { STAGE_JOURNEY_ID } from './mortgage-plan';
import { FULL_SERVICE_PRICE, PLATFORM_MONTHLY_PRICE } from '@/data/platform/pricing';

const journeyPrice = new Map(journeyStages.map((stage) => [stage.id, stage.advisorPrice]));

/** המחיר של כל שלב כשיועץ מבצע אותו, לפי מודל התמחור של הפלטפורמה */
export const ADVISOR_STAGE_PRICE: Record<PlanStageId, number> = PLAN_STAGES.reduce(
  (map, stage) => {
    map[stage] = journeyPrice.get(STAGE_JOURNEY_ID[stage]) ?? 0;
    return map;
  },
  {} as Record<PlanStageId, number>
);

/** סכום המחירים של כל חמשת השלבים בנפרד */
export const ALL_STAGES_PRICE = PLAN_STAGES.reduce(
  (sum, stage) => sum + ADVISOR_STAGE_PRICE[stage],
  0
);

export type AdvisorOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';

export interface AdvisorOrder {
  id: string;
  planId: string;
  stages: PlanStageId[];
  /** הסכום לתשלום בשקלים, אחרי הנחת החבילה המלאה */
  amount: number;
  status: AdvisorOrderStatus;
  createdAt: string;
  paidAt: string | null;
  termsAcceptedAt: string | null;
  /** היועץ שקיבל את הבקשה, כשיש כזה */
  advisorName: string | null;
}

export interface OrderQuote {
  stages: PlanStageId[];
  /** סכום המחירים של השלבים שנבחרו, לפני הנחה */
  listPrice: number;
  /** הסכום לתשלום בפועל */
  total: number;
  /** ההנחה שהתקבלה מלקיחת כל חמשת השלבים יחד */
  saving: number;
  /** האם ההזמנה היא חבילת הליווי המלא */
  fullService: boolean;
  /** דמי הפלטפורמה שנחסכים — כל הזמנה כוללת את הגישה */
  platformMonthlyIncluded: number;
}

/**
 * המחיר של צירוף שלבים.
 *
 * כל חמשת השלבים יחד מתומחרים כחבילת הליווי המלא, ולא כסכום המחירים — זו אותה
 * הנחה שמוצגת בעמוד התמחור, ולא הגיוני שמי שמזמין את הכול מתוך התהליך ישלם
 * יותר ממי שמזמין אותו מבחוץ.
 */
export function quoteOrder(stages: readonly PlanStageId[]): OrderQuote {
  const unique = PLAN_STAGES.filter((stage) => stages.includes(stage));
  const listPrice = unique.reduce((sum, stage) => sum + ADVISOR_STAGE_PRICE[stage], 0);
  const fullService = unique.length === PLAN_STAGES.length;
  const total = fullService ? FULL_SERVICE_PRICE : listPrice;

  return {
    stages: unique,
    listPrice,
    total,
    saving: listPrice - total,
    fullService,
    platformMonthlyIncluded: unique.length > 0 ? PLATFORM_MONTHLY_PRICE : 0,
  };
}

/** הוספה או הסרה של שלב מהבחירה */
export function toggleStage(
  stages: readonly PlanStageId[],
  stage: PlanStageId
): PlanStageId[] {
  const next = stages.includes(stage)
    ? stages.filter((item) => item !== stage)
    : [...stages, stage];
  return PLAN_STAGES.filter((item) => next.includes(item));
}

/** קריאת רשימת שלבים שהגיעה מבחוץ — ערכים שאינם שלב נזרקים */
export function parseStages(value: unknown): PlanStageId[] {
  if (!Array.isArray(value)) return [];
  const wanted = new Set(value.filter((item): item is string => typeof item === 'string'));
  return PLAN_STAGES.filter((stage) => wanted.has(stage));
}

/**
 * השלבים שיועץ מבצע בפועל — אלה ששולמו.
 *
 * הזמנה שממתינה לתשלום אינה מעבירה את השלב ליועץ: עד שלא שולם, הלקוח ממשיך
 * לעבוד על השלב בעצמו.
 */
export function advisorStages(orders: readonly AdvisorOrder[]): PlanStageId[] {
  const paid = orders.filter((order) => order.status === 'PAID');
  return PLAN_STAGES.filter((stage) => paid.some((order) => order.stages.includes(stage)));
}

/** האם השלב מבוצע על ידי יועץ */
export function isAdvisorStage(orders: readonly AdvisorOrder[], stage: PlanStageId): boolean {
  return advisorStages(orders).includes(stage);
}

/** הזמנה שממתינה לתשלום, אם יש כזו */
export function pendingOrder(orders: readonly AdvisorOrder[]): AdvisorOrder | null {
  return orders.find((order) => order.status === 'PENDING_PAYMENT') ?? null;
}

export function formatOrderPrice(value: number): string {
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}
