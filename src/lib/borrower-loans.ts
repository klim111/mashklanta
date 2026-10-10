import { parseFormattedNumberInput } from '@/lib/currency';
import type { BorrowerData, MortgagePlanningUserData } from '@/lib/mortgage-affordability';

export interface BorrowerLoan {
  id: string;
  monthlyPayment: string;
  isBullet: boolean;
  /** סדר תצוגה בהלוואות משוטפות משותפות (גבוה יותר = למטה) */
  bulletOrder?: number;
}

export function createEmptyLoan(): BorrowerLoan {
  return {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `loan-${Date.now()}-${Math.random()}`,
    monthlyPayment: '',
    isBullet: false,
  };
}

export function sumBorrowerLoans(loans: BorrowerLoan[]): number {
  return loans.reduce((sum, loan) => sum + parseFormattedNumberInput(loan.monthlyPayment), 0);
}

export function sumAllCoupleLoanPayments(data: MortgagePlanningUserData): number {
  return sumBorrowerLoans(data.borrower1.loans) + sumBorrowerLoans(data.borrower2.loans);
}

export function sumIndividualLoanPayments(data: MortgagePlanningUserData): number {
  return sumBorrowerLoans(data.loans);
}

export function borrowerHasLoanEntries(borrower: BorrowerData): boolean {
  return borrower.loans.length > 0;
}

export function hasEnteredLoanPayment(loans: BorrowerLoan[]): boolean {
  return loans.some((loan) => parseFormattedNumberInput(loan.monthlyPayment) > 0);
}

/** האם לזוג יש לפחות הלוואה אחת שהוזנה (פרטנית או משוטפת) */
export function coupleHasLoanEntries(borrower1: BorrowerData, borrower2: BorrowerData): boolean {
  return borrowerHasLoanEntries(borrower1) || borrowerHasLoanEntries(borrower2);
}

export type CoupleBorrowerKey = 'borrower1' | 'borrower2';

export interface CoupleBulletLoanRef {
  loan: BorrowerLoan;
  owner: CoupleBorrowerKey;
}

export function getNonBulletLoans(loans: BorrowerLoan[]): BorrowerLoan[] {
  return loans.filter((loan) => !loan.isBullet);
}

export function getCoupleBulletLoans(data: MortgagePlanningUserData): CoupleBulletLoanRef[] {
  const refs: CoupleBulletLoanRef[] = [
    ...data.borrower1.loans
      .filter((loan) => loan.isBullet)
      .map((loan) => ({ loan, owner: 'borrower1' as const })),
    ...data.borrower2.loans
      .filter((loan) => loan.isBullet)
      .map((loan) => ({ loan, owner: 'borrower2' as const })),
  ];

  return refs.sort((a, b) => (a.loan.bulletOrder ?? 0) - (b.loan.bulletOrder ?? 0));
}

export function nextBulletDisplayOrder(data: MortgagePlanningUserData): number {
  const orders = getCoupleBulletLoans(data).map(({ loan }) => loan.bulletOrder ?? 0);
  return orders.length > 0 ? Math.max(...orders) + 1 : Date.now();
}

export function sumCoupleBulletLoans(data: MortgagePlanningUserData): number {
  return getCoupleBulletLoans(data).reduce(
    (sum, { loan }) => sum + parseFormattedNumberInput(loan.monthlyPayment),
    0
  );
}

export function pickOwnerForNewBulletLoan(data: MortgagePlanningUserData): CoupleBorrowerKey {
  if (borrowerHasLoanEntries(data.borrower1) && !borrowerHasLoanEntries(data.borrower2)) {
    return 'borrower1';
  }
  if (borrowerHasLoanEntries(data.borrower2) && !borrowerHasLoanEntries(data.borrower1)) {
    return 'borrower2';
  }
  if (data.borrower1.loans.some((loan) => loan.isBullet)) return 'borrower1';
  if (data.borrower2.loans.some((loan) => loan.isBullet)) return 'borrower2';
  return 'borrower1';
}

type LegacyBorrower = Partial<BorrowerData> & {
  hasLoans?: boolean;
  monthlyLoanPayment?: string;
  isBulletLoan?: boolean;
};

export function migrateBorrowerData(raw: LegacyBorrower = {}): BorrowerData {
  if (Array.isArray(raw.loans)) {
    return {
      age: String(raw.age ?? ''),
      monthlyIncome: String(raw.monthlyIncome ?? ''),
      loans: raw.loans.map((loan) => ({
        id: loan.id || createEmptyLoan().id,
        monthlyPayment: String(loan.monthlyPayment ?? ''),
        isBullet: Boolean(loan.isBullet),
        bulletOrder: loan.bulletOrder,
      })),
    };
  }

  const legacyPayment = String(raw.monthlyLoanPayment ?? '');
  if (raw.hasLoans || legacyPayment) {
    return {
      age: String(raw.age ?? ''),
      monthlyIncome: String(raw.monthlyIncome ?? ''),
      loans: [
        {
          id: createEmptyLoan().id,
          monthlyPayment: legacyPayment,
          isBullet: Boolean(raw.isBulletLoan),
          bulletOrder: raw.isBulletLoan ? Date.now() : undefined,
        },
      ],
    };
  }

  return {
    age: String(raw.age ?? ''),
    monthlyIncome: String(raw.monthlyIncome ?? ''),
    loans: [],
  };
}

export function migrateMortgagePlanningUserData(
  raw: Partial<MortgagePlanningUserData> & Record<string, unknown>
): MortgagePlanningUserData {
  const base = { ...raw } as MortgagePlanningUserData;

  const borrower1 = migrateBorrowerData(
    (raw.borrower1 as LegacyBorrower) ?? {}
  );
  const borrower2 = migrateBorrowerData(
    (raw.borrower2 as LegacyBorrower) ?? {}
  );

  let loans: BorrowerLoan[] = Array.isArray(raw.loans)
    ? raw.loans.map((loan) => ({
        id: loan.id || createEmptyLoan().id,
        monthlyPayment: String(loan.monthlyPayment ?? ''),
        isBullet: Boolean(loan.isBullet),
      }))
    : [];

  if (loans.length === 0 && (raw.hasLoans || raw.monthlyLoanPayment)) {
    loans = [
      {
        id: createEmptyLoan().id,
        monthlyPayment: String(raw.monthlyLoanPayment ?? ''),
        isBullet: Boolean(raw.isBulletLoan),
      },
    ];
  }

  return {
    ...base,
    borrower1,
    borrower2,
    loans,
    hasLoans: loans.length > 0 || Boolean(raw.hasLoans),
  };
}
