import { parseFormattedNumberInput } from '@/lib/currency';
import {
  createEmptyLoan,
  sumAllCoupleLoanPayments,
  sumIndividualLoanPayments,
  type BorrowerLoan,
} from '@/lib/borrower-loans';
import { INTEREST_RATES } from '@/lib/interest-rates';

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
  // Insurance breakdown (always returned; zero when insurance is not included)
  includesInsurance: boolean;
  propertyInsuranceMonthly: number;
  healthInsuranceMonthly: number;
  totalInsuranceMonthly: number;
  apartmentAreaSqm: number;
  reinstatementCostPerSqm: number;
}

// Insurance constants
/** Default apartment area used for property (reinstatement) insurance estimation, in square meters. */
export const DEFAULT_APARTMENT_AREA_SQM = 100;
/** Default reinstatement cost per square meter used for property insurance estimation, in ILS. */
export const DEFAULT_REINSTATEMENT_COST_PER_SQM = 7500;
/** Monthly property insurance cost in ILS per each 100,000 ILS of reinstatement value. */
export const PROPERTY_INSURANCE_RATE_PER_100K = 25;
/** Health/life insurance rate per 100,000 ILS of loan at the low age (≤30). */
export const HEALTH_INSURANCE_RATE_LOW = 7;
/** Health/life insurance rate per 100,000 ILS of loan at the high age (≥50). */
export const HEALTH_INSURANCE_RATE_HIGH = 30;
const HEALTH_INSURANCE_AGE_LOW = 30;
const HEALTH_INSURANCE_AGE_HIGH = 50;

/**
 * Returns the monthly health/life insurance rate in ILS per 100,000 ILS of loan,
 * based on the borrower's age. Linear interpolation between ages 30 and 50.
 */
export function getHealthInsuranceRatePer100k(age: number): number {
  if (!Number.isFinite(age) || age <= HEALTH_INSURANCE_AGE_LOW) {
    return HEALTH_INSURANCE_RATE_LOW;
  }
  if (age >= HEALTH_INSURANCE_AGE_HIGH) {
    return HEALTH_INSURANCE_RATE_HIGH;
  }
  const t =
    (age - HEALTH_INSURANCE_AGE_LOW) /
    (HEALTH_INSURANCE_AGE_HIGH - HEALTH_INSURANCE_AGE_LOW);
  return (
    HEALTH_INSURANCE_RATE_LOW +
    t * (HEALTH_INSURANCE_RATE_HIGH - HEALTH_INSURANCE_RATE_LOW)
  );
}

/** Monthly property (reinstatement) insurance cost in ILS for a given apartment area. */
export function calculatePropertyInsuranceMonthly(
  apartmentAreaSqm: number = DEFAULT_APARTMENT_AREA_SQM,
  costPerSqm: number = DEFAULT_REINSTATEMENT_COST_PER_SQM
): number {
  const reinstatementValue = Math.max(0, apartmentAreaSqm) * Math.max(0, costPerSqm);
  return (reinstatementValue / 100_000) * PROPERTY_INSURANCE_RATE_PER_100K;
}

/** Monthly health/life insurance cost in ILS for a given loan amount and borrower age. */
export function calculateHealthInsuranceMonthly(
  loanAmount: number,
  age: number
): number {
  const safeLoan = Math.max(0, loanAmount);
  return (safeLoan / 100_000) * getHealthInsuranceRatePer100k(age);
}

export interface CalculateMaxPropertyOptions {
  /** When true, insurance costs (property + health/life) are deducted from disposable income before applying the 40% rule. */
  includeInsurance?: boolean;
  /** Override apartment area in square meters (defaults to 100 m²). */
  apartmentAreaSqm?: number;
  /** Override reinstatement cost per square meter in ILS (defaults to 7,500). */
  reinstatementCostPerSqm?: number;
  /**
   * Override the annual interest rate used for the simulation, given as a *percentage* (e.g. 4.85 for 4.85%).
   * When omitted (or non-finite / non-positive), falls back to the central קל"צ rate
   * defined in `src/lib/interest-rates.ts` (`INTEREST_RATES.fixed_unlinked`).
   * Typically supplied when the user wants to test a specific bank quote.
   */
  interestRateOverride?: number;
  /**
   * Override the loan period (in years) used for the simulation.
   * When provided, the maximum loan / property values are computed against this period
   * (still clamped to the bank's age-based maximum). Typically supplied from the results-page
   * "תקופת משכנתא" slider, so the displayed max correctly reflects the chosen period
   * (a shorter period yields a smaller affordable loan).
   * When omitted (or non-finite / non-positive), falls back to the bank's age-based maximum.
   */
  loanPeriodOverride?: number;
}

export function calculateMaxProperty(
  data: MortgagePlanningUserData,
  options: CalculateMaxPropertyOptions = {}
): AffordabilityResult {
  const {
    includeInsurance = false,
    apartmentAreaSqm = DEFAULT_APARTMENT_AREA_SQM,
    reinstatementCostPerSqm = DEFAULT_REINSTATEMENT_COST_PER_SQM,
    interestRateOverride,
    loanPeriodOverride,
  } = options;

  const { age, ownCapital, isCouple, disposableIncome } =
    getAffordabilityInputs(data);

  // Bank-allowed maximum loan period (age-based) — always returned as `maxLoanPeriod`
  // so the UI can show it as the upper bound for the period slider.
  const maxLoanPeriod = Math.min(30, Math.max(1, 80 - age));

  // The period actually used inside the calculation. When the user picks a shorter
  // period via the results-page slider, the affordable loan shrinks accordingly.
  const isValidPeriodOverride =
    typeof loanPeriodOverride === 'number' &&
    Number.isFinite(loanPeriodOverride) &&
    loanPeriodOverride > 0;
  const effectivePeriodYears = isValidPeriodOverride
    ? Math.min(maxLoanPeriod, Math.max(1, Math.round(loanPeriodOverride as number)))
    : maxLoanPeriod;

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

  // הריבית לחישוב הסימולציה:
  // 1. אם הלקוח הזין ריבית מותאמת אישית (לרוב על-בסיס הצעת בנק) - משתמשים בה.
  // 2. אחרת - נטענת מקובץ הריביות המרכזי (`INTEREST_RATES.fixed_unlinked`).
  const isValidOverride =
    typeof interestRateOverride === 'number' &&
    Number.isFinite(interestRateOverride) &&
    interestRateOverride > 0;
  const annualRatePct = isValidOverride
    ? (interestRateOverride as number)
    : INTEREST_RATES.fixed_unlinked;
  const annualRate = annualRatePct / 100;
  const monthlyRate = annualRate / 12;
  const numPayments = effectivePeriodYears * 12;

  // Annuity factor: present value of 1 ILS monthly payment over numPayments months
  const annuityFactor =
    monthlyRate > 0 && numPayments > 0
      ? (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate
      : numPayments;

  const propertyInsuranceMonthly = includeInsurance
    ? calculatePropertyInsuranceMonthly(apartmentAreaSqm, reinstatementCostPerSqm)
    : 0;
  const healthInsuranceRatePer100k = includeInsurance
    ? getHealthInsuranceRatePer100k(age)
    : 0;

  // Bank-of-Israel 40% rule (applied to the TOTAL monthly payment):
  //   p + propertyInsurance + healthInsurance(loan) ≤ 0.4 × disposableIncome
  //   loan = p × annuityFactor   ⇒   healthInsurance(loan) = p × annuityFactor × h / 100,000
  // Solving for the maximum bank payment p:
  //   p × (1 + annuityFactor × h / 100,000) = 0.4 × D − propertyInsurance
  //   p = (0.4 × D − propertyInsurance) / (1 + annuityFactor × h / 100,000)
  const budgetForBankAndHealth = Math.max(
    0,
    0.4 * disposableIncome - propertyInsuranceMonthly
  );
  const healthInsuranceCoefficient =
    (healthInsuranceRatePer100k * annuityFactor) / 100_000;
  const maxMonthlyPayment =
    budgetForBankAndHealth / (1 + healthInsuranceCoefficient);

  const maxLoanFromPayment = maxMonthlyPayment * annuityFactor;

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

  // Insurance breakdown reflects the *actual* loan amount the borrower will take
  // (which may be capped by LTV), so the figures match what they will actually pay.
  const healthInsuranceMonthly = includeInsurance
    ? calculateHealthInsuranceMonthly(actualLoanAmount, age)
    : 0;

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
    interestRate: annualRatePct,
    disposableIncome,
    isCouple,
    includesInsurance: includeInsurance,
    propertyInsuranceMonthly: Math.round(propertyInsuranceMonthly),
    healthInsuranceMonthly: Math.round(healthInsuranceMonthly),
    totalInsuranceMonthly: Math.round(
      propertyInsuranceMonthly + healthInsuranceMonthly
    ),
    apartmentAreaSqm,
    reinstatementCostPerSqm,
  };
}

export { createEmptyLoan };
