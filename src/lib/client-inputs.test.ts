import { describe, expect, it } from 'vitest';
import { emptyClientProfile } from './client-profile';
import { withClientInputs } from './client-inputs';
import type { ClientCardInputs } from './client-inputs';

const emptyCard: ClientCardInputs = {
  household: 'SINGLE',
  age: null,
  partnerName: null,
  partnerAge: null,
  income: null,
  partnerIncome: null,
  expenses: null,
  existingLoans: null,
  downPayment: null,
  propertyValue: null,
  propertyAddress: null,
  mortgageAmount: null,
};

describe('withClientInputs', () => {
  it('fills what the advisor left empty from the client profile and deal', () => {
    const profile = {
      ...emptyClientProfile(),
      household: 'COUPLE' as const,
      age: 34,
      partnerFirstName: 'נועה',
      partnerLastName: 'כהן',
      partnerAge: 32,
      income: 18000,
      partnerIncome: 12000,
      expenses: 9000,
      equity: 600000,
    };
    const card = withClientInputs(emptyCard, profile, {
      propertyValue: 2150000,
      propertyAddress: ' רחוב הרצל 12, חיפה ',
      mortgageAmount: 1400000,
    });
    expect(card).toMatchObject({
      household: 'COUPLE',
      age: 34,
      partnerName: 'נועה כהן',
      partnerAge: 32,
      income: 18000,
      partnerIncome: 12000,
      expenses: 9000,
      downPayment: 600000,
      propertyValue: 2150000,
      propertyAddress: 'רחוב הרצל 12, חיפה',
      mortgageAmount: 1400000,
    });
  });

  it('keeps every value the advisor already wrote', () => {
    const advisor = { ...emptyCard, age: 40, income: 25000, propertyValue: 3000000 };
    const profile = { ...emptyClientProfile(), household: 'COUPLE' as const, age: 34, income: 18000 };
    const card = withClientInputs(advisor, profile, { propertyValue: 2150000, propertyAddress: null, mortgageAmount: null });
    expect(card.household).toBe('SINGLE');
    expect(card.age).toBe(40);
    expect(card.income).toBe(25000);
    expect(card.propertyValue).toBe(3000000);
  });

  it('leaves the partner out for a single client', () => {
    const profile = { ...emptyClientProfile(), household: 'SINGLE' as const, partnerFirstName: 'x', partnerIncome: 5000 };
    const card = withClientInputs(emptyCard, profile, null);
    expect(card.partnerName).toBeNull();
    expect(card.partnerIncome).toBeNull();
  });
});
