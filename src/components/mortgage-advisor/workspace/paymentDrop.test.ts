import { describe, expect, it } from 'vitest';
import { computeMix, createTrack, createWorkspaceMix } from '../engine';
import { describePaymentDrop } from './paymentDrop';

describe('describePaymentDrop', () => {
  it('hides the hint for equal-principal mixes with the same term', () => {
    const mix = createWorkspaceMix({
      tracks: [
        createTrack({
          id: 'a',
          type: 'fixed_unlinked',
          amount: 600_000,
          years: 20,
          amortizationType: 'equal_principal',
        }),
        createTrack({
          id: 'b',
          type: 'prime',
          amount: 400_000,
          years: 20,
          amortizationType: 'equal_principal',
        }),
      ],
    });
    const result = computeMix(mix);
    expect(result.summary.monthlyPayment - result.summary.lastMonthlyPayment).toBeGreaterThan(1);
    expect(describePaymentDrop(mix, result.summary, result)).toBeUndefined();
  });

  it('explains a drop when one track is shorter', () => {
    const mix = createWorkspaceMix({
      tracks: [
        createTrack({ id: 'short', name: 'קצר', type: 'prime', amount: 400_000, years: 10 }),
        createTrack({ id: 'long', name: 'ארוך', type: 'fixed_unlinked', amount: 600_000, years: 25 }),
      ],
    });
    const result = computeMix(mix);
    const hint = describePaymentDrop(mix, result.summary, result);
    expect(hint).toMatch(/יורד ל-/);
    expect(hint).toMatch(/סיום קצר/);
  });

  it('explains a drop after a reduce-payment prepayment', () => {
    const mix = createWorkspaceMix({
      tracks: [createTrack({ id: 'a', name: 'קל״צ', type: 'fixed_unlinked', amount: 1_000_000, years: 20 })],
      events: [
        {
          id: 'p1',
          kind: 'prepayment',
          amount: 200_000,
          month: 24,
          mode: 'reduce_payment',
          trackId: 'a',
        },
      ],
    });
    const result = computeMix(mix);
    const hint = describePaymentDrop(mix, result.summary, result);
    expect(hint).toMatch(/פרעון מוקדם/);
    expect(hint).toMatch(/הקטנת החזר/);
    expect(hint).toMatch(/קל״צ/);
  });
});
