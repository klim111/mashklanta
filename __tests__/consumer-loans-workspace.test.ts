import { describe, expect, it } from 'vitest';
import {
  buildLoanSchedule,
  calculateLoanSummary,
  isCompleteLoan,
  paymentDate,
  resolvePrepaymentTiming,
  toISODate,
} from '../src/components/consumer-loans/loanMath';
import {
  balanceComparisonSeries,
  consolidationOutcome,
  loanInsights,
  portfolioStats,
} from '../src/components/consumer-loans/loanInsights';
import type { Loan } from '../src/components/consumer-loans/types';

const loan = (patch: Partial<Loan> = {}): Loan => ({
  id: 'a',
  name: 'א',
  principal: 100_000,
  apr: 12,
  months: 36,
  ...patch,
});

describe('isCompleteLoan', () => {
  it('needs principal, rate and term — a new loan opens empty', () => {
    expect(isCompleteLoan({ id: 'x', name: 'x', principal: null, apr: null, months: null })).toBe(false);
    expect(isCompleteLoan({ id: 'x', name: 'x', principal: 1000, apr: null, months: 12 })).toBe(false);
    expect(isCompleteLoan({ id: 'x', name: 'x', principal: 1000, apr: 0, months: 12 })).toBe(true);
  });
});

describe('buildLoanSchedule', () => {
  it('matches the plain annuity without prepayments', () => {
    const schedule = buildLoanSchedule(loan());
    expect(schedule.monthsActual).toBe(36);
    expect(schedule.rows.at(-1)!.balEnd).toBeLessThan(0.01);
    expect(schedule.totalPaid).toBeCloseTo(calculateLoanSummary(loan()).totalPaid, 0);
  });

  it('shorten keeps the payment and ends the loan earlier', () => {
    const base = buildLoanSchedule(loan());
    const next = buildLoanSchedule(loan({ prepayments: [{ id: 'p', amount: 30_000, month: 6, mode: 'shorten' }] }));
    expect(next.rows[6].pay).toBeCloseTo(base.rows[6].pay, 6);
    expect(next.monthsActual).toBeLessThan(36);
    expect(next.totalInterest).toBeLessThan(base.totalInterest);
    expect(next.rows[5].prepay).toBe(30_000);
    // הקרן כולה נפרעת: תשלומי קרן + פירעון = הקרן
    const principalPaid = next.rows.reduce((sum, row) => sum + row.principal + (row.prepay ?? 0), 0);
    expect(principalPaid).toBeCloseTo(100_000, 4);
  });

  it('reduce keeps the term and lowers the payment', () => {
    const base = buildLoanSchedule(loan());
    const next = buildLoanSchedule(loan({ prepayments: [{ id: 'p', amount: 30_000, month: 6, mode: 'reduce' }] }));
    expect(next.monthsActual).toBe(36);
    expect(next.rows[6].pay).toBeLessThan(base.rows[6].pay);
    expect(next.totalInterest).toBeLessThan(base.totalInterest);
  });

  it('caps a prepayment at the remaining balance', () => {
    const next = buildLoanSchedule(loan({ prepayments: [{ id: 'p', amount: 1_000_000, month: 3, mode: 'shorten' }] }));
    expect(next.monthsActual).toBe(3);
    expect(next.rows[2].balEnd).toBe(0);
  });
});

describe('loanInsights', () => {
  it('shows no comparison alerts with a single loan', () => {
    const ids = loanInsights(portfolioStats([loan()])).map((item) => item.id);
    expect(ids).not.toContain('costliest');
    expect(ids).not.toContain('consolidation');
    expect(ids).not.toContain('freed-cash');
  });

  it('shows the costliest loan from two loans', () => {
    const ids = loanInsights(portfolioStats([loan(), loan({ id: 'b', apr: 18 })])).map((item) => item.id);
    expect(ids).toContain('costliest');
  });
});

describe('consolidationOutcome', () => {
  const loans = [loan(), loan({ id: 'b', principal: 50_000, apr: 18, months: 24 }), loan({ id: 'c', apr: 5 })];

  it('waits for rate and term before building the merged loan', () => {
    const outcome = consolidationOutcome(loans, { loanIds: ['a', 'b'], apr: null, months: null });
    expect(outcome.amount).toBe(150_000);
    expect(outcome.merged).toBeNull();
    expect(outcome.after).toBeNull();
  });

  it('replaces the selected loans and keeps the rest', () => {
    const outcome = consolidationOutcome(loans, { loanIds: ['a', 'b'], apr: 9, months: 48 });
    expect(outcome.merged).toMatchObject({ principal: 150_000, apr: 9, months: 48 });
    expect(outcome.afterLoans!.map((item) => item.id)).toEqual(['c', 'consolidated']);
    expect(outcome.after!.totalPrincipal).toBe(250_000);
  });

  it('builds a side-by-side balance series', () => {
    const outcome = consolidationOutcome(loans, { loanIds: ['a', 'b'], apr: 9, months: 48 });
    const series = balanceComparisonSeries({ today: loans, after: outcome.afterLoans! });
    expect(series[0]).toMatchObject({ month: 0, today: 250_000, after: 250_000 });
    expect(series.at(-1)!.month).toBe(48);
  });
});

describe('loan dates and prepayment by date', () => {
  const dated = loan({ principal: 100_000, apr: 12, months: 24, startDate: '2026-01-10', paymentDay: 15 });

  it('puts the first payment on the payment day of the next month', () => {
    expect(toISODate(paymentDate(dated, 1)!)).toBe('2026-02-15');
    expect(toISODate(paymentDate(dated, 24)!)).toBe('2028-01-15');
  });

  it('uses the last day of a short month', () => {
    const endOfMonth = { ...dated, startDate: '2026-01-05', paymentDay: 31 };
    expect(toISODate(paymentDate(endOfMonth, 1)!)).toBe('2026-02-28');
    expect(toISODate(paymentDate(endOfMonth, 2)!)).toBe('2026-03-31');
  });

  it('finds the payment before the date and the days since it', () => {
    expect(resolvePrepaymentTiming(dated, { month: 0, date: '2026-05-25' })).toEqual({ month: 4, days: 10 });
    expect(resolvePrepaymentTiming(dated, { month: 0, date: '2026-05-15' })).toEqual({ month: 4, days: 0 });
  });

  it('charges daily interest on the prepaid amount from the last payment to the date', () => {
    const byPayment = buildLoanSchedule({
      ...dated,
      prepayments: [{ id: 'p', amount: 10_000, month: 4, mode: 'shorten' }],
    });
    const byDate = buildLoanSchedule({
      ...dated,
      prepayments: [{ id: 'p', amount: 10_000, month: 4, mode: 'shorten', date: '2026-05-25' }],
    });
    const daily = (10_000 * 0.12) / 365 * 10;
    expect(byDate.totalInterest - byPayment.totalInterest).toBeCloseTo(daily, 6);
    expect(byDate.rows[3]).toMatchObject({ prepay: 10_000, date: '2026-05-15' });
    expect(byDate.rows[3].prepayInterest).toBeCloseTo(daily, 6);
  });

  it('keeps the payment number when the loan has no dates', () => {
    expect(resolvePrepaymentTiming(loan(), { month: 7, date: '2026-05-25' })).toEqual({ month: 7, days: 0 });
  });
});
