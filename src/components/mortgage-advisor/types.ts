export interface MortgageTrack {
  id: string;
  name: string;
  type: 'fixed' | 'variable' | 'prime' | 'madad';
  amount: number; // סכום במסלול בש"ח
  percentage: number; // אחוז מסך המשכנתא
  interestRate: number; // ריבית שנתית באחוזים
  years: number; // תקופה בשנים
  monthlyPayment?: number; // תשלום חודשי מחושב
  totalInterest?: number; // סך הריבית
  totalPaid?: number; // סך הכל לתשלום
}

export interface MortgageMix {
  id: string;
  name: string;
  totalAmount: number; // סך המשכנתא
  tracks: MortgageTrack[];
  createdAt: Date;
  notes?: string;
  totalMonthlyPayment?: number; // סך התשלום החודשי
  totalInterest?: number; // סך הריבית בכל המסלולים
  totalPaid?: number; // סך הכל לתשלום
  averageRate?: number; // ריבית ממוצעת משוקללת
}

export interface MortgageCalculation {
  mix: MortgageMix;
  trackCalculations: TrackCalculation[];
  summary: {
    totalMonthlyPayment: number;
    totalInterest: number;
    totalPaid: number;
    averageRate: number;
    weightedAverageYears: number;
  };
}

export interface TrackCalculation {
  track: MortgageTrack;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  amortSchedule: AmortRow[];
}

export interface AmortRow {
  month: number;
  balanceStart: number;
  payment: number;
  interest: number;
  principal: number;
  balanceEnd: number;
}

export interface ComparisonResult {
  mixes: MortgageCalculation[];
  bestByMonthly: MortgageCalculation;
  bestByTotal: MortgageCalculation;
  bestByInterest: MortgageCalculation;
  summary: {
    monthlyDifference: number;
    totalDifference: number;
    interestDifference: number;
  };
}

export interface MortgageAdvisorState {
  mixes: MortgageMix[];
  selectedForComparison: string[];
  activeTab: 'builder' | 'compare' | 'scenarios';
}

export const TRACK_TYPES = {
  fixed: 'ריבית קבועה',
  variable: 'ריבית משתנה',
  prime: 'פריים',
  madad: 'צמוד מדד'
} as const;

export const DEFAULT_INTEREST_RATES = {
  fixed: 4.5,
  variable: 3.8,
  prime: 5.2,
  madad: 2.1
} as const;