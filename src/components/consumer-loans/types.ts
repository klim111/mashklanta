/**
 * סוג ההלוואה. משמש לצביעה ולקיבוץ בלוח הבקרה, ולהסברים שמתאימים לסוג —
 * למשל שהלוואת כרטיס אשראי היא בדרך כלל היקרה בתיק. רשות, כדי ששמירות
 * מקומיות קיימות ימשיכו להיטען.
 */
export type LoanCategory = 'bank' | 'credit' | 'car' | 'family' | 'other';

export interface Loan {
  id: string;
  name: string;
  principal: number; // קרן ההלוואה בש"ח
  apr: number; // ריבית שנתית נומינלית באחוזים
  months: number; // תקופה בחודשים
  category?: LoanCategory;
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
  /**
   * ההכנסה החודשית הפנויה של משק הבית. רשות — כשהיא מוזנת הכלי מציג את יחס
   * ההחזר, אותו יחס שהבנק בוחן כשהוא שוקל משכנתא.
   */
  monthlyIncome?: number;
}