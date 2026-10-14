import { describe, expect, it } from 'vitest';
import { computeMix, createTrack, createWorkspaceMix } from '@/components/mortgage-advisor/engine';
import { buildQuotedMix } from '@/components/mortgage-advisor/bankQuote/quote';
import type { MortgageBank } from '@/components/mortgage-advisor/types';
import { pricedMixesFor } from './pricedMixes';
import { EMPTY_NEGOTIATION } from '@/lib/mortgage-plan';
import {
  awaitingBanks,
  everyoneDeclined,
  latestOfBank,
  nextRoundDue,
  withResponse,
  bestOfBank,
  cheapestByWeightedRate,
  negotiationBanks,
  negotiationEmail,
  weightedRateOf,
} from './negotiation';

const source = createWorkspaceMix({
  id: 'mix-final',
  name: 'התמהיל הסופי',
  totalAmount: 1_000_000,
  tracks: [
    createTrack({ id: 't1', type: 'fixed_unlinked', amount: 600_000, years: 25, interestRate: 4.5 }),
    createTrack({ id: 't2', type: 'prime', amount: 400_000, years: 20, interestRate: 5.5 }),
  ],
});

function offer(bank: MortgageBank, t1: number, t2: number, receivedAt = '2026-10-01') {
  const mix = buildQuotedMix({ source, bank, receivedAt, rates: { t1, t2 } });
  return { mix, summary: computeMix(mix).summary, savedAt: mix.updatedAt };
}

describe('negotiation', () => {
  it('weighted rate is the amount-weighted average of track rates', () => {
    const [item] = pricedMixesFor([offer('לאומי', 4, 6)], 'mix-final');
    expect(weightedRateOf(item)).toBeCloseTo(4 * 0.6 + 6 * 0.4, 6);
  });

  it('cheapest offer is chosen by weighted rate', () => {
    const items = pricedMixesFor(
      [offer('לאומי', 4.0, 6.0), offer('מזרחי', 4.4, 5.0), offer('הפועלים', 4.2, 5.8)],
      'mix-final'
    );
    // לאומי 4.8, מזרחי 4.64, הפועלים 4.84
    expect(cheapestByWeightedRate(items)?.bank).toBe('מזרחי');
    expect(cheapestByWeightedRate([])).toBeNull();
  });

  it('an updated offer from a bank replaces its best one', () => {
    const items = pricedMixesFor(
      [offer('לאומי', 4.0, 6.0, '2026-10-01'), offer('לאומי', 3.9, 5.2, '2026-10-05')],
      'mix-final'
    );
    expect(weightedRateOf(bestOfBank(items, 'לאומי')!)).toBeCloseTo(3.9 * 0.6 + 5.2 * 0.4, 6);
    expect(bestOfBank(items, 'מזרחי')).toBeNull();
  });

  it('banks in the negotiation are the approved ones, then banks with offers', () => {
    const items = pricedMixesFor([offer('דיסקונט', 4, 5)], 'mix-final');
    expect(negotiationBanks(['לאומי', 'מזרחי'], items)).toEqual(['לאומי', 'מזרחי', 'דיסקונט']);
  });

  it('the email to a banker lists the cheapest offer track by track', () => {
    const [item] = pricedMixesFor([offer('מזרחי', 4.4, 5.0)], 'mix-final');
    const email = negotiationEmail(item, { bank: 'לאומי', bankerName: 'דנה' });
    expect(email.subject).toContain('מזרחי');
    expect(email.text).toContain('שלום דנה,');
    expect(email.text).toContain('4.64%');
    expect(email.text).toContain('4.40%');
  });

  it('the previous round rates are the bank\'s latest offer', () => {
    const items = pricedMixesFor(
      [offer('לאומי', 4.0, 6.0, '2026-10-01'), offer('לאומי', 3.9, 5.2, '2026-10-05')],
      'mix-final'
    );
    expect(latestOfBank(items, 'לאומי')?.receivedAt).toContain('2026-10-05');
  });

  it('a round moves on once every asked bank answered and one improved', () => {
    const items = pricedMixesFor(
      [offer('לאומי', 4.0, 6.0), offer('מזרחי', 4.4, 5.0), offer('הפועלים', 4.2, 5.8)],
      'mix-final'
    );
    // מזרחי הזולה — לאומי והפועלים נשאלים
    let state = EMPTY_NEGOTIATION;
    expect(awaitingBanks(state, items).sort()).toEqual(['הפועלים', 'לאומי'].sort());
    state = withResponse(state, 'לאומי', 'DECLINED');
    expect(nextRoundDue(state, items)).toBe(false);
    state = withResponse(state, 'הפועלים', 'UPDATED');
    expect(nextRoundDue(state, items)).toBe(true);
    expect(everyoneDeclined(state, items)).toBe(false);
  });

  it('when every asked bank declines, the round stays and the end is suggested', () => {
    const items = pricedMixesFor([offer('לאומי', 4.0, 6.0), offer('מזרחי', 4.4, 5.0)], 'mix-final');
    const state = withResponse(EMPTY_NEGOTIATION, 'לאומי', 'DECLINED');
    expect(nextRoundDue(state, items)).toBe(false);
    expect(everyoneDeclined(state, items)).toBe(true);
  });

  it('with a single bank, that bank is the one asked to improve', () => {
    const items = pricedMixesFor([offer('לאומי', 4.0, 6.0)], 'mix-final');
    expect(awaitingBanks(EMPTY_NEGOTIATION, items)).toEqual(['לאומי']);
  });
});
