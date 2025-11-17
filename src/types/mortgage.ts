// Types for mortgage dashboard
export interface MortgageTrack {
  id: string;
  name: string;
  type: 'prime' | 'fixed' | 'variable' | 'adjustable' | 'eligibility';
  principal: number;
  remainingPrincipal: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: Date;
  endDate: Date;
  totalMonths: number;
  remainingMonths: number;
  nextAdjustmentDate?: Date;
  adjustmentPeriod?: number; // in months
  indexType?: string;
  margin?: number;
  isCompleted: boolean;
}

export interface Payment {
  id: string;
  trackId: string;
  paymentNumber: number;
  date: Date;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
  isPaid: boolean;
  isUpcoming: boolean;
}

export interface MortgageSummary {
  id: string;
  userId: string;
  propertyAddress: string;
  originalAmount: number;
  currentBalance: number;
  startDate: Date;
  endDate: Date;
  tracks: MortgageTrack[];
  totalMonthlyPayment: number;
  totalPaidPrincipal: number;
  totalPaidInterest: number;
  totalRemainingPrincipal: number;
  totalRemainingInterest: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
}

export interface AmortizationSchedule {
  trackId: string;
  payments: Payment[];
  totalInterest: number;
  totalPrincipal: number;
  totalPayments: number;
}

export interface DateSnapshot {
  date: Date;
  totalRemainingPrincipal: number;
  totalPaidPrincipal: number;
  totalPaidInterest: number;
  totalRemainingPayments: number;
  trackSnapshots: {
    trackId: string;
    remainingPrincipal: number;
    paidPrincipal: number;
    paidInterest: number;
    remainingPayments: number;
    nextAdjustment?: Date;
  }[];
}

export interface RefinanceScenario {
  trackId: string;
  currentRate: number;
  newRate: number;
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlySavings: number;
  totalSavings: number;
  breakEvenMonths: number;
  refinanceCost: number;
}
