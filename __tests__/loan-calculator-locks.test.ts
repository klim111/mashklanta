import { describe, expect, it } from 'vitest';
import { recalcLoanTerms } from '@/components/cash-flow/LoanCalculator';
import { annuityPayment } from '@/lib/cash-flow';

const start = { amount: 200_000, months: 24, rate: 4.75, payment: annuityPayment(200_000, 4.75, 24) };

describe('quick loan calculator locks', () => {
  it('amount and rate locked: a new term recalculates the payment', () => {
    const { terms, computed } = recalcLoanTerms(start, 'months', 36, ['amount', 'rate'], 'payment', ['amount', 'rate', 'months']);
    expect(computed).toBe('payment');
    expect(terms.payment).toBeCloseTo(annuityPayment(200_000, 4.75, 36), 6);
    expect(terms.amount).toBe(200_000);
  });

  it('amount and rate locked: a new payment recalculates the term', () => {
    const { terms, computed } = recalcLoanTerms(start, 'payment', 5000, ['amount', 'rate'], 'payment', ['amount', 'rate', 'months']);
    expect(computed).toBe('months');
    // החודש השלם הראשון שבו ההחזר לא עובר 5,000 ₪
    expect(annuityPayment(200_000, 4.75, terms.months!)).toBeLessThanOrEqual(5000);
    expect(annuityPayment(200_000, 4.75, terms.months! - 1)).toBeGreaterThan(5000);
  });

  it('payment and rate locked: a smaller amount shortens the term', () => {
    const { terms, computed } = recalcLoanTerms(start, 'amount', 150_000, ['payment', 'rate'], 'months', ['rate', 'payment', 'months']);
    expect(computed).toBe('months');
    expect(terms.months).toBe(18);
    expect(terms.payment).toBe(start.payment);
  });

  it('only rate locked: the previously computed parameter moves first', () => {
    const { terms, computed } = recalcLoanTerms(start, 'amount', 100_000, ['rate'], 'payment', ['rate', 'months', 'amount']);
    expect(computed).toBe('payment');
    expect(terms.months).toBe(24);
  });

  it('no solution clears the computed value', () => {
    const { terms } = recalcLoanTerms(start, 'payment', 100, ['amount', 'rate'], 'payment', ['amount', 'rate', 'months']);
    expect(terms.months).toBeNull();
  });
});
