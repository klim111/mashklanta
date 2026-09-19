import { parseFormattedNumberInput } from '@/lib/currency';
import type { BorrowerLoan } from '@/lib/borrower-loans';
import { getCoupleBulletLoans, getNonBulletLoans } from '@/lib/borrower-loans';
import type { MortgagePlanningUserData } from '@/lib/mortgage-affordability';

export const CONSUMER_LOANS_IMPORT_KEY = 'consumer-loans-import-from-planning';

export interface PlanningLoanImportItem {
  id: string;
  monthlyPayment: number;
  label: string;
}

export interface ConsumerLoansImportSession {
  loans: PlanningLoanImportItem[];
  startedAt: number;
}

function loanToImportItem(loan: BorrowerLoan, label: string): PlanningLoanImportItem | null {
  const monthlyPayment = parseFormattedNumberInput(loan.monthlyPayment);
  if (monthlyPayment <= 0) return null;
  return {
    id: loan.id,
    monthlyPayment,
    label,
  };
}

/** אוסף הלוואות עם החזר חודשי מהמסך "בוא נכיר" */
export function collectPlanningLoansForImport(
  data: MortgagePlanningUserData
): PlanningLoanImportItem[] {
  const items: PlanningLoanImportItem[] = [];

  if (data.applicationType === 'couple') {
    getNonBulletLoans(data.borrower1.loans).forEach((loan, index) => {
      const item = loanToImportItem(loan, `לווה 1 — הלוואה ${index + 1}`);
      if (item) items.push(item);
    });
    getNonBulletLoans(data.borrower2.loans).forEach((loan, index) => {
      const item = loanToImportItem(loan, `לווה 2 — הלוואה ${index + 1}`);
      if (item) items.push(item);
    });
    const bulletLoans = getCoupleBulletLoans(data);
    bulletLoans.forEach(({ loan }, index) => {
      const label =
        bulletLoans.length > 1 ? `הלוואה משותפת ${index + 1}` : 'הלוואה משותפת';
      const item = loanToImportItem(loan, label);
      if (item) items.push(item);
    });
    return items;
  }

  data.loans.forEach((loan, index) => {
    const item = loanToImportItem(
      loan,
      data.loans.length > 1 ? `הלוואה ${index + 1}` : 'הלוואה שלך'
    );
    if (item) items.push(item);
  });

  return items;
}

export function startConsumerLoansImport(data: MortgagePlanningUserData): boolean {
  const loans = collectPlanningLoansForImport(data);
  if (loans.length === 0) return false;

  const session: ConsumerLoansImportSession = {
    loans,
    startedAt: Date.now(),
  };

  try {
    localStorage.setItem(CONSUMER_LOANS_IMPORT_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function readConsumerLoansImportSession(): ConsumerLoansImportSession | null {
  try {
    const raw = localStorage.getItem(CONSUMER_LOANS_IMPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsumerLoansImportSession;
    if (!Array.isArray(parsed.loans) || parsed.loans.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearConsumerLoansImportSession(): void {
  try {
    localStorage.removeItem(CONSUMER_LOANS_IMPORT_KEY);
  } catch {
    // ignore
  }
}
