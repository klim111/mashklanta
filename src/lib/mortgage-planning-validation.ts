import { parseFormattedNumberInput } from '@/lib/currency';
import { borrowerHasLoanEntries } from '@/lib/borrower-loans';
import type { BorrowerData, MortgagePlanningUserData } from '@/lib/mortgage-affordability';

export interface FormFieldError {
  field: string;
  message: string;
}

export function fieldErrorsFromList(errors: FormFieldError[]): Record<string, boolean> {
  return Object.fromEntries(errors.map((e) => [e.field, true]));
}

export const fieldErrorClassName = 'border-red-500 ring-2 ring-red-200 focus-visible:ring-red-300';

function validateBorrowerLoans(
  borrower: BorrowerData,
  prefix: string,
  label: string,
  errors: FormFieldError[]
) {
  if (!borrowerHasLoanEntries(borrower)) return;

  borrower.loans.forEach((loan, index) => {
    if (!parseFormattedNumberInput(loan.monthlyPayment)) {
      const loanLabel = borrower.loans.length > 1 ? ` — הלוואה ${index + 1}` : '';
      errors.push({
        field: `${prefix}.loans.${loan.id}.monthlyPayment`,
        message: `החזר חודשי${loanLabel} — ${label}`,
      });
    }
  });
}

function validateIndividualLoans(data: MortgagePlanningUserData, errors: FormFieldError[]) {
  if (!data.hasLoans && data.loans.length === 0) return;

  data.loans.forEach((loan, index) => {
    if (!parseFormattedNumberInput(loan.monthlyPayment)) {
      const loanLabel = data.loans.length > 1 ? ` — הלוואה ${index + 1}` : '';
      errors.push({
        field: `loans.${loan.id}.monthlyPayment`,
        message: `החזר חודשי${loanLabel}`,
      });
    }
  });
}

export function getIndividualFormErrors(data: MortgagePlanningUserData): FormFieldError[] {
  const errors: FormFieldError[] = [];

  if (!data.ownCapital?.trim()) {
    errors.push({ field: 'ownCapital', message: 'הון עצמי' });
  }
  if (!data.age?.trim()) {
    errors.push({ field: 'age', message: 'גיל' });
  }
  if (!data.monthlyIncome?.trim()) {
    errors.push({ field: 'monthlyIncome', message: 'הכנסה חודשית' });
  }
  validateIndividualLoans(data, errors);

  return errors;
}

export function getCoupleFormErrors(data: MortgagePlanningUserData): FormFieldError[] {
  const errors: FormFieldError[] = [];

  if (!data.ownCapital?.trim()) {
    errors.push({ field: 'familyOwnCapital', message: 'הון עצמי של המשפחה' });
  }
  if (!data.borrower1.age?.trim()) {
    errors.push({ field: 'borrower1.age', message: 'גיל — לווה 1' });
  }
  if (!data.borrower1.monthlyIncome?.trim()) {
    errors.push({ field: 'borrower1.monthlyIncome', message: 'הכנסה חודשית — לווה 1' });
  }
  if (!data.borrower2.age?.trim()) {
    errors.push({ field: 'borrower2.age', message: 'גיל — לווה 2' });
  }
  if (!data.borrower2.monthlyIncome?.trim()) {
    errors.push({ field: 'borrower2.monthlyIncome', message: 'הכנסה חודשית — לווה 2' });
  }

  validateBorrowerLoans(data.borrower1, 'borrower1', 'לווה 1', errors);
  validateBorrowerLoans(data.borrower2, 'borrower2', 'לווה 2', errors);

  return errors;
}

export function getExistingPropertyFormErrors(data: MortgagePlanningUserData): FormFieldError[] {
  const errors: FormFieldError[] = [];

  if (!data.propertyPrice?.trim()) {
    errors.push({ field: 'propertyPrice', message: 'מחיר הנכס' });
  }
  if (!data.ownCapital?.trim()) {
    errors.push({ field: 'ownCapitalExisting', message: 'הון עצמי' });
  }

  return errors;
}

export function isIndividualFormValid(data: MortgagePlanningUserData): boolean {
  return getIndividualFormErrors(data).length === 0;
}

export function isCoupleFormValid(data: MortgagePlanningUserData): boolean {
  return getCoupleFormErrors(data).length === 0;
}
