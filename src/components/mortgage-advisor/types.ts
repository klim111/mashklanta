export interface MortgageTrack {
  id: string;
  name: string;
  type: 'fixed_unlinked' | 'fixed_linked' | 'prime' | 'variable_unlinked' | 'variable_linked' | 'makam' | 'dollar' | 'euro' | 'eligibility' | 'five_year_plan' | 'grant';
  amount: number; // סכום במסלול בש"ח
  percentage: number; // אחוז מסך המשכנתא
  interestRate: number; // ריבית שנתית באחוזים
  years: number; // תקופה בשנים
  monthlyPayment?: number; // תשלום חודשי מחושב
  totalInterest?: number; // סך הריבית
  totalPaid?: number; // סך הכל לתשלום
  // שדות נוספים לריביות צמודות
  cpiIndex?: number; // מדד המחירים לצרכן
  // שדות לריביות משתנות
  variablePeriod?: number; // תקופת משתנה (1-5 שנים)
  // שדות למטבעות חוץ
  exchangeRate?: number; // שער חליפין
  currency?: 'USD' | 'EUR'; // סוג מטבע
  // לוח סילוקין
  amortizationType?: 'spitzer' | 'equal_principal' | 'partial_grace' | 'full_grace' | 'ability_based' | 'secured';
}

export const MORTGAGE_BANKS = [
  'לאומי',
  'הפועלים',
  'מזרחי',
  'דיסקונט',
  'מרכנטיל',
  'הבינלאומי',
  'ירושלים',
] as const;

export type MortgageBank = (typeof MORTGAGE_BANKS)[number];

export interface MortgageMix {
  id: string;
  name: string;
  bank?: MortgageBank;
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
  fixed_unlinked: 'ריבית קבועה לא צמודה',
  fixed_linked: 'ריבית קבועה צמודה',
  prime: 'פריים',
  variable_unlinked: 'ריבית משתנה לא צמודה',
  variable_linked: 'ריבית משתנה צמודה',
  makam: 'מק"מ',
  dollar: 'מטח דולר',
  euro: 'מטח יורו',
  eligibility: 'זכאות',
  five_year_plan: 'תוכנית חומש',
  grant: 'מענק'
} as const;

// ריביות ברירת המחדל נטענות מקובץ הריביות המרכזי (src/lib/interest-rates.ts).
// לעדכון ערכים יש לערוך את הקובץ הזה בלבד.
export { DEFAULT_INTEREST_RATES } from '@/lib/interest-rates';

export const AMORTIZATION_TYPES = {
  spitzer: 'שפיצר',
  equal_principal: 'קרן שווה',
  partial_grace: 'גרייס חלקי',
  full_grace: 'גרייס מלא',
  ability_based: 'כפי יכולתך',
  secured: 'משכנתא בטוחה'
} as const;

/** סוג ריבית + לוח סילוקין בסוגריים, לתצוגה ברשימת מסלולים בתמהיל */
export function formatTrackTypeWithAmortization(
  track: Pick<MortgageTrack, 'type' | 'amortizationType'>
): string {
  const typeLabel = TRACK_TYPES[track.type];
  const amortLabel = AMORTIZATION_TYPES[track.amortizationType || 'spitzer'];
  return `${typeLabel} (${amortLabel})`;
}

export const VARIABLE_PERIODS = {
  1: '1 שנה',
  2: '2 שנים',
  3: '3 שנים',
  4: '4 שנים',
  5: '5 שנים'
} as const;