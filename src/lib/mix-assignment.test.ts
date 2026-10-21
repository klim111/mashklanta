import { describe, expect, it } from 'vitest';
import { assignmentGaps, borrowersIncome, maxPaymentFromIncome } from './mix-assignment';

describe('mix assignment', () => {
  it('requires the property price and the borrowers income', () => {
    expect(assignmentGaps({})).toEqual(['מחיר הנכס', 'הכנסה חודשית של הלווים']);
    expect(assignmentGaps({ propertyValue: 2_000_000, borrowers: [{ name: 'דנה' }] })).toEqual([
      'הכנסה חודשית של הלווים',
    ]);
    expect(
      assignmentGaps({ propertyValue: 2_000_000, borrowers: [{ name: 'דנה', monthlyIncome: 15_000 }] })
    ).toEqual([]);
  });

  it('derives the max monthly payment from the total income', () => {
    const borrowers = [
      { name: 'דנה', monthlyIncome: 16_000 },
      { name: 'יוסי', monthlyIncome: 14_000 },
    ];
    expect(borrowersIncome({ borrowers })).toBe(30_000);
    expect(maxPaymentFromIncome(30_000)).toBe(12_000);
    expect(maxPaymentFromIncome(0)).toBe(0);
  });
});
