import { describe, expect, it } from 'vitest';
import { PLAN_STAGES } from './mortgage-plan';
import type { PlanStageId } from './mortgage-plan';
import { FULL_SERVICE_PRICE, PLATFORM_MONTHLY_PRICE } from '@/data/platform/pricing';
import {
  ADVISOR_STAGE_PRICE,
  ALL_STAGES_PRICE,
  advisorStages,
  isAdvisorStage,
  parseStages,
  pendingOrder,
  quoteOrder,
  toggleStage,
} from './advisor-orders';
import type { AdvisorOrder } from './advisor-orders';

function order(overrides: Partial<AdvisorOrder>): AdvisorOrder {
  return {
    id: 'order-1',
    planId: 'plan-1',
    stages: [],
    amount: 0,
    status: 'PENDING_PAYMENT',
    createdAt: '2026-09-12T10:00:00.000Z',
    paidAt: null,
    termsAcceptedAt: null,
    advisorName: null,
    ...overrides,
  };
}

describe('מחיר ההזמנה', () => {
  it('לכל שלב יש מחיר חיובי, כמו בעמוד התמחור', () => {
    for (const stage of PLAN_STAGES) {
      expect(ADVISOR_STAGE_PRICE[stage]).toBeGreaterThan(0);
    }
    expect(ALL_STAGES_PRICE).toBe(
      PLAN_STAGES.reduce((sum, stage) => sum + ADVISOR_STAGE_PRICE[stage], 0)
    );
  });

  it('שלב בודד נגבה במחירו', () => {
    const quote = quoteOrder(['AUCTION']);
    expect(quote.total).toBe(ADVISOR_STAGE_PRICE.AUCTION);
    expect(quote.saving).toBe(0);
    expect(quote.fullService).toBe(false);
  });

  it('כמה שלבים נגבים כסכום המחירים', () => {
    const quote = quoteOrder(['MIX', 'AUCTION']);
    expect(quote.total).toBe(ADVISOR_STAGE_PRICE.MIX + ADVISOR_STAGE_PRICE.AUCTION);
  });

  it('כל חמשת השלבים מתומחרים כחבילת הליווי המלא, עם ההנחה שלה', () => {
    const quote = quoteOrder(PLAN_STAGES);
    expect(quote.fullService).toBe(true);
    expect(quote.total).toBe(FULL_SERVICE_PRICE);
    expect(quote.saving).toBe(ALL_STAGES_PRICE - FULL_SERVICE_PRICE);
    expect(quote.saving).toBeGreaterThan(0);
  });

  it('החבילה המלאה זולה מכל צירוף של ארבעה שלבים ועוד אחד בנפרד', () => {
    const four = quoteOrder(PLAN_STAGES.slice(0, 4) as PlanStageId[]);
    expect(quoteOrder(PLAN_STAGES).total).toBeLessThan(four.total + ADVISOR_STAGE_PRICE.SIGNING);
  });

  it('כל הזמנה כוללת את הגישה לפלטפורמה', () => {
    expect(quoteOrder(['SIGNING']).platformMonthlyIncluded).toBe(PLATFORM_MONTHLY_PRICE);
    expect(quoteOrder([]).platformMonthlyIncluded).toBe(0);
    expect(quoteOrder([]).total).toBe(0);
  });

  it('שלב כפול נספר פעם אחת, והסדר תמיד סדר השלבים', () => {
    const quote = quoteOrder(['AUCTION', 'ANALYSIS', 'AUCTION']);
    expect(quote.stages).toEqual(['ANALYSIS', 'AUCTION']);
    expect(quote.total).toBe(ADVISOR_STAGE_PRICE.ANALYSIS + ADVISOR_STAGE_PRICE.AUCTION);
  });
});

describe('בחירת השלבים', () => {
  it('לחיצה מוסיפה ומסירה, והרשימה נשארת בסדר השלבים', () => {
    expect(toggleStage([], 'AUCTION')).toEqual(['AUCTION']);
    expect(toggleStage(['AUCTION'], 'ANALYSIS')).toEqual(['ANALYSIS', 'AUCTION']);
    expect(toggleStage(['ANALYSIS', 'AUCTION'], 'ANALYSIS')).toEqual(['AUCTION']);
  });

  it('ערכים שאינם שלב נזרקים', () => {
    expect(parseStages(['AUCTION', 'NOPE', 7, null])).toEqual(['AUCTION']);
    expect(parseStages('AUCTION')).toEqual([]);
    expect(parseStages(undefined)).toEqual([]);
  });
});

describe('השלבים שהיועץ מבצע', () => {
  it('רק הזמנה ששולמה מעבירה שלב ליועץ', () => {
    const orders = [order({ stages: ['AUCTION'], status: 'PENDING_PAYMENT' })];
    expect(advisorStages(orders)).toEqual([]);
    expect(isAdvisorStage(orders, 'AUCTION')).toBe(false);

    const paid = [order({ stages: ['AUCTION'], status: 'PAID', paidAt: '2026-09-12' })];
    expect(advisorStages(paid)).toEqual(['AUCTION']);
    expect(isAdvisorStage(paid, 'AUCTION')).toBe(true);
    expect(isAdvisorStage(paid, 'MIX')).toBe(false);
  });

  it('כמה הזמנות מצטברות, בלי כפילות ובסדר השלבים', () => {
    const orders = [
      order({ id: 'a', stages: ['SIGNING'], status: 'PAID' }),
      order({ id: 'b', stages: ['ANALYSIS', 'SIGNING'], status: 'PAID' }),
      order({ id: 'c', stages: ['MIX'], status: 'CANCELLED' }),
    ];
    expect(advisorStages(orders)).toEqual(['ANALYSIS', 'SIGNING']);
  });

  it('הזמנה שממתינה לתשלום נמצאת, וכשאין — null', () => {
    const waiting = order({ id: 'w', stages: ['MIX'] });
    expect(pendingOrder([waiting])?.id).toBe('w');
    expect(pendingOrder([order({ status: 'PAID' })])).toBeNull();
    expect(pendingOrder([])).toBeNull();
  });
});
