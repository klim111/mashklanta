import { describe, expect, it } from 'vitest';
import {
  applyAffordChange,
  deriveAfford,
  isFrozen,
  type AffordEnv,
  type AffordLocks,
  type AffordState,
} from '@/lib/affordability-locks';
import { annuityPayment } from '@/lib/cash-flow';

const env: AffordEnv = { propertyInsurance: 187.5, healthPer100k: 12, minMonths: 48, maxMonths: 360 };
const base: AffordState = { loan: 1_200_000, equity: 500_000, months: 300, rate: 4.8 };

const ok = (result: ReturnType<typeof applyAffordChange>) => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

describe('derived values', () => {
  it('price, LTV and payment follow the loan, equity, term and rate', () => {
    const d = deriveAfford(base, env);
    expect(d.price).toBe(1_700_000);
    expect(d.ltv).toBeCloseTo((1_200_000 / 1_700_000) * 100, 6);
    const bank = annuityPayment(1_200_000, 4.8, 300);
    // 1.2M ב-4.8% ל-25 שנה: כ-6,876 ₪ בחודש
    expect(bank).toBeCloseTo(6876, 0);
    expect(d.payment).toBeCloseTo(bank + 187.5 + 144, 6);
  });
});

describe('no locks — the tool behaves as before', () => {
  it('loan change keeps the equity and moves the price', () => {
    const next = ok(applyAffordChange(base, env, {}, 'loan', 1_000_000));
    expect(next.equity).toBe(500_000);
    expect(deriveAfford(next, env).price).toBe(1_500_000);
  });

  it('LTV change solves the loan from the equity', () => {
    const next = ok(applyAffordChange(base, env, {}, 'ltv', 75));
    expect(next.loan).toBeCloseTo(1_500_000, 6);
    expect(deriveAfford(next, env).ltv).toBeCloseTo(75, 6);
  });

  it('payment change solves the loan, insurance included', () => {
    const next = ok(applyAffordChange(base, env, {}, 'payment', 6000));
    expect(deriveAfford(next, env).payment).toBeCloseTo(6000, 4);
    expect(next.months).toBe(300);
  });

  it('term change keeps the loan and recomputes the payment', () => {
    const next = ok(applyAffordChange(base, env, {}, 'term', 240));
    expect(next.loan).toBe(base.loan);
    expect(deriveAfford(next, env).bankPayment).toBeCloseTo(annuityPayment(1_200_000, 4.8, 240), 6);
  });
});

describe('payment locked', () => {
  const locks: AffordLocks = { payment: deriveAfford(base, env).payment };

  it('smaller loan shortens the term, never above the locked payment', () => {
    const next = ok(applyAffordChange(base, env, locks, 'loan', 1_000_000));
    expect(next.loan).toBe(1_000_000);
    expect(next.months).toBeLessThan(300);
    const payment = deriveAfford(next, env).payment;
    expect(payment).toBeLessThanOrEqual(locks.payment! + 0.01);
    // חודש אחד פחות כבר היה עובר את ההחזר הנעול
    const oneLess = deriveAfford({ ...next, months: next.months - 1 }, env).payment;
    expect(oneLess).toBeGreaterThan(locks.payment!);
  });

  it('lower price shortens the term (equity stays)', () => {
    const next = ok(applyAffordChange(base, env, locks, 'price', 1_500_000));
    expect(next.equity).toBe(500_000);
    expect(next.loan).toBe(1_000_000);
    expect(next.months).toBeLessThan(300);
  });

  it('shorter term lowers the loan to keep the payment', () => {
    const next = ok(applyAffordChange(base, env, locks, 'term', 240));
    expect(next.months).toBe(240);
    expect(next.loan).toBeLessThan(base.loan);
    expect(deriveAfford(next, env).payment).toBeCloseTo(locks.payment!, 4);
  });

  it('higher rate lowers the loan to keep the payment', () => {
    const next = ok(applyAffordChange(base, env, locks, 'rate', 5.5));
    expect(next.loan).toBeLessThan(base.loan);
    expect(deriveAfford(next, env).payment).toBeCloseTo(locks.payment!, 4);
  });

  it('payment and term locked: a loan change solves the rate', () => {
    const both = { ...locks, term: 300 };
    const next = ok(applyAffordChange(base, env, both, 'loan', 1_100_000));
    expect(next.months).toBe(300);
    expect(next.rate).toBeGreaterThan(4.8);
    expect(deriveAfford(next, env).payment).toBeCloseTo(locks.payment!, 4);
  });

  it('a loan too big for the payment within 30 years is refused', () => {
    const result = applyAffordChange(base, env, { ...locks, rate: 4.8 }, 'loan', 3_000_000);
    expect(result.ok).toBe(false);
  });

  it('the payment slider itself is frozen', () => {
    expect(isFrozen('payment', locks)).toBe(true);
    expect(applyAffordChange(base, env, locks, 'payment', 5000).ok).toBe(false);
  });
});

describe('price locked', () => {
  const locks: AffordLocks = { price: 1_700_000 };

  it('a bigger loan uses less equity and keeps the price', () => {
    const next = ok(applyAffordChange(base, env, locks, 'loan', 1_275_000));
    expect(next.equity).toBe(425_000);
    expect(deriveAfford(next, env).price).toBe(1_700_000);
    expect(deriveAfford(next, env).ltv).toBeCloseTo(75, 6);
  });

  it('LTV change moves the loan inside the same price', () => {
    const next = ok(applyAffordChange(base, env, locks, 'ltv', 60));
    expect(next.loan).toBeCloseTo(1_020_000, 6);
    expect(next.equity).toBeCloseTo(680_000, 6);
  });

  it('price and payment locked: the payment solves the loan, equity covers the rest', () => {
    const both = { ...locks, payment: 6000 };
    const next = ok(applyAffordChange(base, env, both, 'term', 360));
    expect(deriveAfford(next, env).payment).toBeCloseTo(6000, 4);
    expect(deriveAfford(next, env).price).toBeCloseTo(1_700_000, 6);
  });
});

describe('LTV locked', () => {
  it('a smaller loan lowers the price at the same LTV', () => {
    const ltv = deriveAfford(base, env).ltv;
    const next = ok(applyAffordChange(base, env, { ltv }, 'loan', 900_000));
    expect(deriveAfford(next, env).ltv).toBeCloseTo(ltv, 6);
    expect(deriveAfford(next, env).price).toBeCloseTo(900_000 / (ltv / 100), 4);
  });
});

describe('loan locked', () => {
  it('the payment slider moves the term instead', () => {
    const next = ok(applyAffordChange(base, env, { loan: base.loan }, 'payment', 8000));
    expect(next.loan).toBe(base.loan);
    expect(next.months).toBeLessThan(300);
    expect(deriveAfford(next, env).payment).toBeLessThanOrEqual(8000);
  });

  it('the price moves the equity', () => {
    const next = ok(applyAffordChange(base, env, { loan: base.loan }, 'price', 2_000_000));
    expect(next.loan).toBe(base.loan);
    expect(next.equity).toBe(800_000);
  });

  it('price, LTV and loan: two locked freeze the third', () => {
    expect(isFrozen('ltv', { loan: 1, price: 2 })).toBe(true);
    expect(isFrozen('loan', { ltv: 50, price: 2 })).toBe(true);
    expect(isFrozen('price', { ltv: 50, loan: 1 })).toBe(true);
  });
});
