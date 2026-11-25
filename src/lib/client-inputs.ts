import type { ClientProfileFinancials } from './client-profile';

/**
 * מה שהלקוח מילא בעצמו, בכרטיס שהיועץ רואה.
 *
 * כרטיס הלקוח אצל היועץ שומר פרטים משלו (משק הבית, ההכנסות, העסקה). עד עכשיו
 * הם הופיעו רק אחרי שהיועץ הקליד אותם, גם כשהלקוח כבר מילא אותם בפרופיל
 * הפיננסי או בפרטי העסקה של התהליך. כאן כל שדה שהיועץ עוד לא מילא נלקח ממה
 * שהלקוח הזין. מה שהיועץ כתב בעצמו נשאר שלו.
 */

export interface ClientCardInputs {
  household: 'SINGLE' | 'COUPLE';
  age: number | null;
  partnerName: string | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  expenses: number | null;
  existingLoans: number | null;
  downPayment: number | null;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
}

export interface ClientDeal {
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
}

const filled = (value: number | null | undefined): value is number => typeof value === 'number' && value > 0;

export function withClientInputs<T extends ClientCardInputs>(
  card: T,
  profile: ClientProfileFinancials | null,
  deal: ClientDeal | null
): T {
  const next = { ...card };

  if (profile) {
    // משק הבית נלקח מהלקוח כל עוד היועץ לא מילא אף פרט של משק הבית
    const advisorSetHousehold = card.age !== null || card.partnerName !== null || card.partnerAge !== null;
    if (!advisorSetHousehold) next.household = profile.household;
    const couple = next.household === 'COUPLE';

    if (next.age === null && filled(profile.age)) next.age = profile.age;
    if (couple && next.partnerName === null) {
      const partner = [profile.partnerFirstName, profile.partnerLastName].filter(Boolean).join(' ').trim();
      if (partner) next.partnerName = partner;
    }
    if (couple && next.partnerAge === null && filled(profile.partnerAge)) next.partnerAge = profile.partnerAge;
    if (next.income === null && filled(profile.income)) next.income = profile.income;
    if (couple && next.partnerIncome === null && filled(profile.partnerIncome)) {
      next.partnerIncome = profile.partnerIncome;
    }
    if (next.expenses === null && filled(profile.expenses)) next.expenses = profile.expenses;
    if (next.existingLoans === null && filled(profile.existingLoans)) next.existingLoans = profile.existingLoans;
    if (next.downPayment === null && filled(profile.equity)) next.downPayment = profile.equity;
  }

  if (deal) {
    if (next.propertyValue === null && filled(deal.propertyValue)) next.propertyValue = deal.propertyValue;
    if (next.mortgageAmount === null && filled(deal.mortgageAmount)) next.mortgageAmount = deal.mortgageAmount;
    if (next.propertyAddress === null && deal.propertyAddress?.trim()) {
      next.propertyAddress = deal.propertyAddress.trim();
    }
  }

  return next;
}
