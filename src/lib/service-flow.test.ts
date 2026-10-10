import { describe, expect, it } from 'vitest';
import {
  FULL_SERVICE_PRICE,
  PLATFORM_PROCESS_PRICE,
  STAGES_TOTAL_PRICE,
  platformMonthsSince,
  quoteAdvisory,
  serviceNeedsAdvisor,
} from './service-flow';
import { journeyStages } from '@/data/platform/journey';

describe('quoteAdvisory', () => {
  it('שלב בודד — מחיר השלב, והגישה לפלטפורמה כלולה', () => {
    const quote = quoteAdvisory({ stageIds: ['mix'] });
    const mix = journeyStages.find((stage) => stage.id === 'mix')!;
    expect(quote.total).toBe(mix.advisorPrice);
    expect(quote.platformIncluded).toBe(true);
    expect(quote.bundleApplied).toBe(false);
  });

  it('כל השלבים — תמיד המחיר הנמוך, כלומר ליווי מלא', () => {
    const quote = quoteAdvisory({ stageIds: journeyStages.map((stage) => stage.id) });
    expect(quote.stagesPrice).toBe(STAGES_TOTAL_PRICE);
    expect(quote.advisoryPrice).toBe(FULL_SERVICE_PRICE);
    expect(quote.bundleApplied).toBe(true);
    expect(quote.total).toBe(FULL_SERVICE_PRICE);
  });

  it('מה ששולם על הגישה לפלטפורמה מקוזז ממחיר הליווי', () => {
    const quote = quoteAdvisory({ stageIds: ['auction'], platformPaid: 2 * PLATFORM_PROCESS_PRICE });
    const auction = journeyStages.find((stage) => stage.id === 'auction')!;
    expect(quote.platformCredit).toBe(2 * PLATFORM_PROCESS_PRICE);
    expect(quote.total).toBe(auction.advisorPrice - 2 * PLATFORM_PROCESS_PRICE);
  });

  it('הקיזוז לעולם אינו מוריד את המחיר מתחת לאפס', () => {
    const quote = quoteAdvisory({ stageIds: ['signing'], platformPaid: 100000 });
    expect(quote.total).toBe(0);
  });

  it('בלי שלבים אין ליווי ואין קיזוז', () => {
    const quote = quoteAdvisory({ stageIds: [], platformPaid: 4 * PLATFORM_PROCESS_PRICE });
    expect(quote.total).toBe(0);
    expect(quote.platformIncluded).toBe(false);
  });
});

describe('platformMonthsSince', () => {
  it('חודש הרכישה נספר גם אם עברו רק ימים', () => {
    expect(platformMonthsSince('2026-09-01T00:00:00Z', new Date('2026-09-15T00:00:00Z'))).toBe(1);
  });

  it('סופר חודשים קלנדריים', () => {
    expect(platformMonthsSince('2026-06-20T00:00:00Z', new Date('2026-09-15T00:00:00Z'))).toBe(4);
  });

  it('בלי רכישה — אפס', () => {
    expect(platformMonthsSince(null)).toBe(0);
  });
});

describe('serviceNeedsAdvisor', () => {
  it('רק המסלול העצמאי לא פותח בקשת ליווי', () => {
    expect(serviceNeedsAdvisor('SELF')).toBe(false);
    expect(serviceNeedsAdvisor('HYBRID')).toBe(true);
    expect(serviceNeedsAdvisor('FULL')).toBe(true);
    expect(serviceNeedsAdvisor('GUIDANCE')).toBe(true);
  });
});
