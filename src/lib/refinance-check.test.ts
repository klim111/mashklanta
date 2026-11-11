import { describe, expect, it } from 'vitest';
import {
  analyzeRefinance,
  disposableIncome,
  monthlyPayment,
  monthsUntil,
  reviewTracks,
  type AverageRates,
  type RefiCheckTrack,
} from './refinance-check';

const AVERAGES: AverageRates = {
  fixed_unlinked: 4.9,
  fixed_linked: 3.3,
  variable_linked: 3.6,
  variable_linked_margin: 1.4,
  primeAnchor: 6.0,
  asOf: '2026-07',
};

const tracks: RefiCheckTrack[] = [
  { id: 'a', type: 'prime', balance: 400_000, rate: 5.5, months: 240 },
  { id: 'b', type: 'fixed_unlinked', balance: 400_000, rate: 6.2, months: 240 },
  { id: 'c', type: 'fixed_linked', balance: 200_000, rate: 3.0, months: 240 },
];

describe('refinance-check', () => {
  it('computes a Spitzer payment', () => {
    expect(monthlyPayment(1_000_000, 5, 360)).toBeCloseTo(5368.22, 1);
    expect(monthlyPayment(120_000, 0, 120)).toBe(1000);
  });

  it('marks only tracks above the Bank of Israel average and keeps prime at its own rate', () => {
    const reviews = reviewTracks(tracks, AVERAGES);
    expect(reviews.map((r) => r.aboveAverage)).toEqual([false, true, false]);
    expect(reviews[0].newRate).toBe(5.5);
    expect(reviews[0].average).toBeNull();
    expect(reviews[0].primeMargin).toBe(-0.5);
    expect(reviews[1].newRate).toBe(4.9);
    expect(reviews[2].newRate).toBe(3.0);
  });

  it('counts only loans with more than 18 months left', () => {
    expect(
      disposableIncome(20_000, [
        { id: '1', monthlyPayment: 1500, longTerm: true },
        { id: '2', monthlyPayment: 900, longTerm: false },
      ])
    ).toBe(18_500);
  });

  it('spreading to 30 years lowers the monthly payment', () => {
    const result = analyzeRefinance({ goal: 'reduce-payment', tracks, averages: AVERAGES });
    expect(result.improvement).toBe(true);
    expect(result.savings.monthly).toBeGreaterThan(1000);
    expect(result.proposed?.summary.months).toBe(360);
  });

  it('reduce interest never raises the payment and saves interest', () => {
    const result = analyzeRefinance({
      goal: 'reduce-interest',
      tracks,
      averages: AVERAGES,
      income: 30_000,
      loans: [],
    });
    expect(result.improvement).toBe(true);
    expect(result.proposed!.summary.payment).toBeLessThanOrEqual(result.current.payment + 1);
    expect(result.savings.interest).toBeGreaterThan(10_000);
  });

  it('fast payoff uses the payment-to-income limit', () => {
    const result = analyzeRefinance({
      goal: 'fast-payoff',
      tracks,
      averages: AVERAGES,
      income: 40_000,
      loans: [{ id: 'x', monthlyPayment: 2000, longTerm: true }],
    });
    expect(result.affordability?.maxPayment).toBeCloseTo(15_200);
    expect(result.proposed!.summary.payment).toBeLessThanOrEqual(15_200.5);
    expect(result.savings.months).toBeGreaterThanOrEqual(12);
    expect(result.improvement).toBe(true);
  });

  it('reports no room when the payment is already over the limit', () => {
    const result = analyzeRefinance({
      goal: 'fast-payoff',
      tracks,
      averages: AVERAGES,
      income: 10_000,
      loans: [],
    });
    expect(result.improvement).toBe(false);
    expect(result.affordability?.currentOverLimit).toBe(true);
    expect(result.reason).toBeTruthy();
  });

  it('needs a gap of at least 0.2% to count a rate as above the average', () => {
    const reviews = reviewTracks(
      [
        { id: 'a', type: 'fixed_unlinked', balance: 500_000, rate: 5.05, months: 240 },
        { id: 'b', type: 'fixed_unlinked', balance: 500_000, rate: 5.15, months: 240 },
      ],
      AVERAGES
    );
    expect(reviews.map((r) => r.aboveAverage)).toEqual([false, true]);
  });

  it('compares the spread of a linked variable track with the average spread', () => {
    const [high, close] = reviewTracks(
      [
        { id: 'a', type: 'variable_linked', balance: 500_000, rate: 4.5, months: 240, spread: 2.2, variablePeriod: 5 },
        { id: 'b', type: 'variable_linked', balance: 500_000, rate: 4.5, months: 240, spread: 1.5, variablePeriod: 5 },
      ],
      AVERAGES
    );
    expect(high.aboveAverage).toBe(true);
    expect(high.newRate).toBeCloseTo(3.7);
    expect(high.margin).toEqual({ own: 2.2, average: 1.4 });
    expect(close.aboveAverage).toBe(false);
    expect(close.newRate).toBe(4.5);
  });

  it('estimates a prepayment fee only for fixed tracks that are repriced', () => {
    const reviews = reviewTracks(tracks, AVERAGES);
    expect(reviews[0].prepaymentFee).toBe(0);
    expect(reviews[1].prepaymentFee).toBeGreaterThan(30_000);
    expect(reviews[2].prepaymentFee).toBe(0);
  });

  it('reduce interest finds nothing when no rate is above the average, even if the terms differ', () => {
    const result = analyzeRefinance({
      goal: 'reduce-interest',
      tracks: [
        { id: 'a', type: 'prime', balance: 400_000, rate: 5.5, months: 60 },
        { id: 'b', type: 'fixed_unlinked', balance: 400_000, rate: 4.9, months: 300 },
      ],
      averages: AVERAGES,
      income: 30_000,
      loans: [],
    });
    expect(result.improvement).toBe(false);
    expect(result.savings.interest).toBe(0);
    expect(result.reason).toContain('פריים');
  });

  it('says tracks without an average were not checked', () => {
    const result = analyzeRefinance({
      goal: 'reduce-interest',
      tracks: [{ id: 'a', type: 'variable_unlinked', balance: 500_000, rate: 7.5, months: 240 }],
      averages: AVERAGES,
      income: 30_000,
      loans: [],
    });
    expect(result.improvement).toBe(false);
    expect(result.unchecked).toEqual(['variable_unlinked']);
    expect(result.reason).toContain('אינו מפרסם');
  });

  it('marks a lower payment that comes only from spreading the term', () => {
    const result = analyzeRefinance({
      goal: 'reduce-payment',
      tracks: [{ id: 'a', type: 'fixed_unlinked', balance: 600_000, rate: 4.9, months: 240 }],
      averages: AVERAGES,
    });
    expect(result.improvement).toBe(true);
    expect(result.savings.fromRates).toBe(0);
    expect(result.mainlyFromTerm).toBe(true);
  });

  it('keeps below-average tracks at their own rate when spreading', () => {
    const result = analyzeRefinance({
      goal: 'reduce-payment',
      tracks: [{ id: 'a', type: 'fixed_linked', balance: 600_000, rate: 2.0, months: 240 }],
      averages: AVERAGES,
    });
    expect(result.proposed?.summary.payment).toBeCloseTo(monthlyPayment(600_000, 2.0, 360), 0);
  });

  it('counts months to the end date', () => {
    expect(monthsUntil(2046, 9, new Date(2026, 8, 26))).toBe(240);
  });
});
