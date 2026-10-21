import { describe, expect, it } from 'vitest';
import {
  applyKnownMortgage,
  mortgagePayment,
  mortgagePaymentAt,
  mortgageSchedule,
  amountForPayment,
  annuityPayment,
  cashFlowAlerts,
  emptyCashFlow,
  monthsForPayment,
  parseCashFlow,
  rateForPayment,
  seedCashFlow,
  solveLoan,
  summarize,
  timeline,
} from './cash-flow';
import type { CashFlowState } from './cash-flow';

function state(): CashFlowState {
  const base = emptyCashFlow();
  base.incomes.borrower = [{ id: 'a', label: 'משכורת', amount: 20000 }];
  base.mortgage = { amount: 1_000_000, rate: 5, years: 25, payment: null };
  base.loans = [
    { id: 'long', name: 'רכב', amount: 100_000, rate: 6, months: 48, payment: null },
    { id: 'short', name: 'קצרה', amount: 200_000, rate: 4.75, months: 12, payment: null },
  ];
  return base;
}

describe('loan math', () => {
  it('matches the example from the request: 200k, 24 months, 4.75%', () => {
    expect(Math.round(annuityPayment(200_000, 4.75, 24))).toBe(8752);
  });

  it('solves each parameter back from the other three', () => {
    const payment = annuityPayment(200_000, 4.75, 24);
    expect(amountForPayment(payment, 4.75, 24)).toBeCloseTo(200_000, 0);
    expect(monthsForPayment(200_000, 4.75, payment)).toBe(24);
    expect(rateForPayment(200_000, 24, payment)).toBeCloseTo(4.75, 3);
    expect(solveLoan({ amount: 200_000, months: 24, rate: 4.75, payment: null }, 'payment')).toBeCloseTo(payment, 6);
  });

  it('the same payment over 18 months buys a smaller loan', () => {
    const payment = annuityPayment(200_000, 4.75, 24);
    const amount18 = amountForPayment(payment, 4.75, 18);
    expect(amount18).toBeLessThan(200_000);
    expect(Math.round(amount18 / 1000)).toBe(152);
  });

  it('returns null when the payment does not cover interest', () => {
    expect(monthsForPayment(100_000, 12, 900)).toBeNull();
  });
});

describe('summary', () => {
  it('only loans longer than 18 months reduce the income for the mortgage', () => {
    const s = summarize(state());
    const long = annuityPayment(100_000, 6, 48);
    expect(s.longLoansPayment).toBeCloseTo(long, 6);
    expect(s.incomeForMortgage).toBeCloseTo(20000 - long, 6);
    expect(s.maxMortgagePayment).toBeCloseTo((20000 - long) * 0.4, 6);
    expect(s.freeMoney).toBeCloseTo(20000 - s.totalPayment, 6);
  });

  it('the timeline drops each loan when it ends', () => {
    const points = timeline(state());
    expect(points[0].loans.short).toBeGreaterThan(0);
    expect(points[12].loans.short).toBe(0);
    expect(points[47].loans.long).toBeGreaterThan(0);
    expect(points[48].loans.long).toBe(0);
    // אחרי 30 חודשים נותרו להלוואה הארוכה 18 — היא כבר לא נוגסת בהכנסה
    expect(points[30].mortgageRatio!).toBeLessThan(points[29].mortgageRatio!);
  });

  it('warns when the mortgage ratio is above 40%', () => {
    const s = state();
    s.incomes.borrower[0].amount = 12000;
    expect(cashFlowAlerts(s).some((alert) => alert.id === 'mortgage-over')).toBe(true);
  });
});

describe('storage', () => {
  it('parses what it saves and drops junk', () => {
    const s = state();
    expect(parseCashFlow(JSON.parse(JSON.stringify(s)))).toEqual({ ...s, updatedAt: null });
    expect(parseCashFlow('x')).toBeNull();
  });

  it('seeds from the client profile and derives the mortgage rate', () => {
    const payment = annuityPayment(900_000, 4.5, 300);
    const seeded = seedCashFlow({
      household: 'COUPLE',
      income: 15000,
      partnerIncome: 9000,
      mortgageAmount: 900_000,
      mortgagePayment: payment,
      years: 25,
      loans: [{ monthlyPayment: 1200, remainingMonths: 30, owner: 'partner' }],
    });
    expect(seeded.mortgage.rate).toBeCloseTo(4.5, 2);
    expect(summarize(seeded).income).toBe(24000);
    expect(summarize(seeded).longLoansPayment).toBe(1200);
  });
});

describe('mortgage tracks', () => {
  const tracks = [
    { id: 'a', name: 'קבועה', amount: 600_000, rate: 4.5, months: 300 },
    { id: 'b', name: 'פריים', amount: 400_000, rate: 6, months: 120 },
  ];
  const known = { tracks, source: { kind: 'mix' as const, key: 'mix:1:final', label: 'התמהיל הסופי שבחרתם' } };

  it('computes the payment per track and drops a track when it ends', () => {
    const state = applyKnownMortgage(emptyCashFlow(), known);
    expect(state.mortgage.amount).toBe(1_000_000);
    expect(state.mortgage.rate).toBeCloseTo(5.1, 2);
    const first = annuityPayment(600_000, 4.5, 300) + annuityPayment(400_000, 6, 120);
    expect(mortgagePayment(state.mortgage)).toBeCloseTo(first, 6);
    expect(mortgagePaymentAt(state.mortgage, 120)).toBeCloseTo(annuityPayment(600_000, 4.5, 300), 6);
    const points = timeline(state);
    expect(points.length).toBeGreaterThan(120);
    expect(points[121].mortgage).toBeCloseTo(annuityPayment(600_000, 4.5, 300), 6);
    expect(mortgageSchedule(state.mortgage)).toHaveLength(300);
  });

  it('keeps the client edits to the same mix and replaces them for another one', () => {
    const state = applyKnownMortgage(emptyCashFlow(), known);
    const edited = { ...state, mortgage: { ...state.mortgage, tracks: [{ ...tracks[0], rate: 4 }] } };
    expect(applyKnownMortgage(edited, known)).toBe(edited);
    const other = { ...known, source: { ...known.source, key: 'mix:2:final' } };
    expect(applyKnownMortgage(edited, other).mortgage.tracks).toHaveLength(2);
    expect(applyKnownMortgage(edited, known, true).mortgage.tracks).toHaveLength(2);
    // נשמר ונקרא חזרה עם המסלולים
    const parsed = parseCashFlow(JSON.parse(JSON.stringify(edited)));
    expect(parsed?.mortgage.tracks?.[0].rate).toBe(4);
    expect(parsed?.mortgage.source?.key).toBe('mix:1:final');
  });
});
