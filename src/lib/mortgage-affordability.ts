import { parseFormattedNumberInput } from '@/lib/currency';
import {
  createEmptyLoan,
  sumAllCoupleLoanPayments,
  sumIndividualLoanPayments,
  type BorrowerLoan,
} from '@/lib/borrower-loans';

export type { BorrowerLoan };

export interface BorrowerData {
  age: string;
  monthlyIncome: string;
  loans: BorrowerLoan[];
}

export interface MortgagePlanningUserData {
  propertyType: string;
  calculationType: string;
  applicationType: 'individual' | 'couple' | '';
  ownCapital: string;
  age: string;
  monthlyIncome: string;
  /** @deprecated use loans */
  hasLoans: boolean;
  /** @deprecated use loans */
  monthlyLoanPayment: string;
  /** @deprecated use loans */
  isBulletLoan: boolean;
  loans: BorrowerLoan[];
  borrower1: BorrowerData;
  borrower2: BorrowerData;
  propertyPrice: string;
  wantsLoanManagement: boolean;
  currentPropertyPrice: string;
  hasCurrentMortgage: boolean;
  remainingMortgageAmount: string;
  isOver55: boolean;
}

export const emptyBorrower = (): BorrowerData => ({
  age: '',
  monthlyIncome: '',
  loans: [],
});

export const defaultMortgagePlanningUserData = (): MortgagePlanningUserData => ({
  propertyType: '',
  calculationType: '',
  applicationType: '',
  ownCapital: '',
  age: '',
  monthlyIncome: '',
  hasLoans: false,
  monthlyLoanPayment: '',
  isBulletLoan: false,
  loans: [],
  borrower1: emptyBorrower(),
  borrower2: emptyBorrower(),
  propertyPrice: '',
  wantsLoanManagement: false,
  currentPropertyPrice: '',
  hasCurrentMortgage: false,
  remainingMortgageAmount: '',
  isOver55: false,
});

export function getAffordabilityInputs(data: MortgagePlanningUserData) {
  if (data.applicationType === 'couple') {
    const age1 = parseInt(data.borrower1.age) || 0;
    const age2 = parseInt(data.borrower2.age) || 0;
    const income =
      parseFormattedNumberInput(data.borrower1.monthlyIncome) +
      parseFormattedNumberInput(data.borrower2.monthlyIncome);
    const loanPayment = sumAllCoupleLoanPayments(data);
    const age =
      age1 > 0 && age2 > 0 ? Math.min(age1, age2) : Math.max(age1, age2);

    return {
      income,
      loanPayment,
      age,
      ownCapital: parseFormattedNumberInput(data.ownCapital),
      isCouple: true,
      disposableIncome: income - loanPayment,
    };
  }

  const income = parseFormattedNumberInput(data.monthlyIncome);
  const loanPayment = sumIndividualLoanPayments(data);

  return {
    income,
    loanPayment,
    age: parseInt(data.age) || 0,
    ownCapital: parseFormattedNumberInput(data.ownCapital),
    isCouple: false,
    disposableIncome: income - loanPayment,
  };
}

export interface AffordabilityResult {
  maxPropertyPrice: number;
  maxLoanAmount: number;
  maxMonthlyPayment: number;
  actualMonthlyPayment: number;
  maxLTV: number;
  maxLoanPeriod: number;
  ownCapitalUsed: number;
  hasValidResult: boolean;
  isCapitalSufficient: boolean;
  limitingFactor: 'payment' | 'ltv' | '';
  interestRate: number;
  disposableIncome: number;
  isCouple: boolean;
}

export function calculateMaxProperty(
  data: MortgagePlanningUserData
): AffordabilityResult {
  const { income, loanPayment, age, ownCapital, isCouple, disposableIncome } =
    getAffordabilityInputs(data);

  const maxMonthlyPayment = disposableIncome * 0.4;
  const maxLoanPeriod = Math.min(30, Math.max(1, 80 - age));

  let maxLTVRatio = 0.5;
  switch (data.propertyType) {
    case 'דירה ראשונה':
      maxLTVRatio = 0.75;
      break;
    case 'דירה חליפית':
      maxLTVRatio = 0.7;
      break;
    case 'דירה להשקעה':
      maxLTVRatio = 0.5;
      break;
  }

  const annualRate = isCouple ? 0.05 : 0.052;
  const monthlyRate = annualRate / 12;
  const numPayments = maxLoanPeriod * 12;

  let maxLoanFromPayment = 0;
  if (monthlyRate > 0 && numPayments > 0) {
    maxLoanFromPayment =
      maxMonthlyPayment *
      ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);
  } else {
    maxLoanFromPayment = maxMonthlyPayment * numPayments;
  }

  const maxPropertyFromPayment = maxLoanFromPayment + ownCapital;

  let maxPropertyFromLTV = 0;
  if (ownCapital > 0) {
    maxPropertyFromLTV = ownCapital / (1 - maxLTVRatio);
  }

  const actualPropertyPrice = Math.min(maxPropertyFromPayment, maxPropertyFromLTV);
  const actualLoanAmount = actualPropertyPrice - ownCapital;
  const actualLTV =
    actualPropertyPrice > 0 ? (actualLoanAmount / actualPropertyPrice) * 100 : 0;

  const limitingFactor =
    maxPropertyFromPayment < maxPropertyFromLTV ? 'payment' : 'ltv';

  const requiredCapital = actualPropertyPrice - actualLoanAmount;
  const isCapitalSufficient = ownCapital >= requiredCapital;

  let actualMonthlyPayment = 0;
  if (monthlyRate > 0 && numPayments > 0 && actualLoanAmount > 0) {
    actualMonthlyPayment =
      (actualLoanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  return {
    maxPropertyPrice: Math.floor(actualPropertyPrice),
    maxLoanAmount: Math.floor(actualLoanAmount),
    maxMonthlyPayment: Math.floor(maxMonthlyPayment),
    actualMonthlyPayment: Math.floor(actualMonthlyPayment),
    maxLTV: Math.round(actualLTV * 10) / 10,
    maxLoanPeriod,
    ownCapitalUsed: Math.floor(requiredCapital),
    hasValidResult: actualPropertyPrice > 0 && actualLoanAmount > 0,
    isCapitalSufficient,
    limitingFactor,
    interestRate: annualRate * 100,
    disposableIncome,
    isCouple,
  };
}

export { createEmptyLoan };
