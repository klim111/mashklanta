export interface Loan {
  id: string;
  name: string;
  principal: number; // קרן ההלוואה בש"ח
  apr: number; // ריבית שנתית נומינלית באחוזים
  months: number; // תקופה בחודשים
}

export interface AmortRow {
  m: number; // מספר החודש
  balStart: number; // יתרה בתחילת החודש
  pay: number; // תשלום חודשי
  interest: number; // חלק הריבית
  principal: number; // חלק הקרן
  balEnd: number; // יתרה בסוף החודש
}

export interface LoanCalculation {
  loan: Loan;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  amortSchedule: AmortRow[];
}

export interface PrepaymentParams {
  amount: number;
  month: number;
  mode: 'reduce' | 'shorten'; // reduce = קיצור תשלום, shorten = קיצור תקופה
}

export type Objective = 'minTotalInterest' | 'minMonthly';

export interface OptimizationInput {
  existingLoans: Loan[];
  cashAvailable: number;
  upcomingExpense: number;
  newLoanAPR: number;
  candidateTerms: number[];
  objective: Objective;
  budgetMonthly?: number;
}

export interface ScenarioResult {
  type: 'noConsolidation' | 'fullConsolidation';
  loans: Loan[];
  totalMonthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  weightedEndTime: number; // חודשים
  description: string;
  cashAllocation?: Record<string, number>; // הקצאת מזומן לכל הלוואה
}

export interface OptimizationResult {
  best: ScenarioResult;
  compared: ScenarioResult[];
  reason: string;
  budgetExceeded?: boolean;
}

export interface LoanPlannerState {
  loans: Loan[];
  selectedForComparison: string[];
  optimizationInput: Partial<OptimizationInput>;
}