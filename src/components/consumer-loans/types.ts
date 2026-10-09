/**
 * סוג ההלוואה. משמש לצביעה ולקיבוץ בלוח הבקרה, ולהסברים שמתאימים לסוג —
 * למשל שהלוואת כרטיס אשראי היא בדרך כלל היקרה בתיק. רשות, כדי ששמירות
 * מקומיות קיימות ימשיכו להיטען.
 */
export type LoanCategory = 'bank' | 'credit' | 'car' | 'family' | 'other';

/**
 * פירעון מוקדם בתוך הלוואה — אותו רעיון של פרעון מוקדם במסלול בבונה התמהילים:
 * סכום חד-פעמי שמשולם יחד עם תשלום מסוים, ואחריו ההלוואה מתקצרת או שההחזר
 * החודשי קטן.
 */
export interface LoanPrepayment {
  id: string;
  amount: number;
  /** מספר התשלום שאיתו משולם הפירעון (1 = התשלום הראשון) */
  month: number;
  /** shorten = התקופה מתקצרת וההחזר נשמר, reduce = ההחזר קטן והתקופה נשמרת */
  mode: 'shorten' | 'reduce';
}

export interface Loan {
  id: string;
  name: string;
  principal: number; // קרן ההלוואה בש"ח
  apr: number; // ריבית שנתית נומינלית באחוזים
  months: number; // תקופה בחודשים
  category?: LoanCategory;
  prepayments?: LoanPrepayment[];
}

/**
 * הלוואה כפי שהיא בפאנל השליטה: הלוואה חדשה נפתחת בלי ערכים, וכל שדה נשאר
 * ריק עד שהלקוח מזין אותו. רק הלוואה שכל שלושת השדות שלה מולאו נכנסת לחישובים.
 */
export interface LoanDraft {
  id: string;
  name: string;
  principal: number | null;
  apr: number | null;
  months: number | null;
  category?: LoanCategory;
  prepayments?: LoanPrepayment[];
}

/** איחוד הלוואות: אילו הלוואות מאוחדות, ובאיזו ריבית ותקופה (ריקים עד שהוזנו) */
export interface ConsolidationPlan {
  loanIds: string[];
  apr: number | null;
  months: number | null;
}

export interface AmortRow {
  m: number; // מספר החודש
  balStart: number; // יתרה בתחילת החודש
  pay: number; // תשלום חודשי
  prepay?: number; // פירעון מוקדם ששולם יחד עם התשלום
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
  loans: LoanDraft[];
  selectedForComparison: string[];
  optimizationInput: Partial<OptimizationInput>;
  /**
   * ההכנסה החודשית הפנויה של משק הבית. רשות — כשהיא מוזנת הכלי מציג את יחס
   * ההחזר, אותו יחס שהבנק בוחן כשהוא שוקל משכנתא.
   */
  monthlyIncome?: number;
  /** האיחוד שהלקוח בנה — כשהוא קיים מופיעים טאבי האיחוד */
  consolidation?: ConsolidationPlan;
  /** האם טאבי האסטרטגיה פתוחים */
  strategyOpen?: boolean;
}