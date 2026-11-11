import { describe, expect, it } from 'vitest';
import { defaultMortgagePlanningUserData } from './mortgage-affordability';
import { knownDisposableIncome, planningFromKnown, resolveKnownDetails } from './known-details';

describe('resolveKnownDetails', () => {
  it('prefers the plan, then the chosen mix for the mortgage amount', () => {
    const details = resolveKnownDetails({
      plan: {
        id: 'p1',
        analysis: { propertyValue: 2_000_000, mortgageAmount: 1_400_000, equity: 600_000, household: 'SINGLE', income: 20_000 },
        mix: { mixKey: 'm1', totalAmount: 1_300_000 },
      },
      profile: { income: 15_000, age: 40, household: 'SINGLE' },
    });
    expect(details.propertyValue).toBe(2_000_000);
    expect(details.mortgageAmount).toBe(1_300_000);
    expect(details.sources.mortgageAmount).toBe('mix');
    expect(details.income).toBe(20_000);
    expect(details.age).toBe(40);
    expect(details.sources.age).toBe('profile');
    expect(details.planId).toBe('p1');
  });

  it('takes the property price from other tools when there is no plan', () => {
    const details = resolveKnownDetails({
      profile: { income: 15_000, household: 'SINGLE', equity: 500_000 },
      equityPlan: { propertyPrice: 1_800_000, financingProfile: 'replacement' },
    });
    expect(details.propertyValue).toBe(1_800_000);
    expect(details.sources.propertyValue).toBe('equityPlan');
    expect(details.dealType).toBe('replacement_home');
    // נגזר מהמחיר וההון: 1.8M פחות 500K, בתוך תקרת 70% לדירה חליפית
    expect(details.mortgageAmount).toBe(1_260_000);
    expect(details.planId).toBeNull();
  });

  it('ignores the partner of a single borrower', () => {
    const details = resolveKnownDetails({ profile: { household: 'SINGLE', income: 10_000, partnerIncome: 9_000 } });
    expect(details.partnerIncome).toBeNull();
    expect(knownDisposableIncome(details)).toBe(10_000);
  });
});

describe('planningFromKnown', () => {
  it('opens on the result only when everything the calculator asks is known', () => {
    const known = resolveKnownDetails({
      plan: {
        id: 'p1',
        analysis: { household: 'COUPLE', age: 35, partnerAge: 33, income: 18_000, partnerIncome: 12_000, equity: 700_000, dealType: 'first_home' },
        mix: null,
      },
    });
    const full = planningFromKnown(known, defaultMortgagePlanningUserData());
    expect(full.complete).toBe(true);
    expect(full.userData.applicationType).toBe('couple');
    expect(full.userData.borrower2.monthlyIncome).toBe('12,000');
    expect(full.userData.propertyType).toBe('דירה ראשונה');

    const partial = planningFromKnown(
      resolveKnownDetails({ profile: { household: 'SINGLE', income: 10_000 } }),
      defaultMortgagePlanningUserData()
    );
    expect(partial.complete).toBe(false);
    expect(partial.hasAny).toBe(true);
    expect(partial.userData.monthlyIncome).toBe('10,000');
  });
});
