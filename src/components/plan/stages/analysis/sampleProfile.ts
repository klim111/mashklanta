import { emptyPlanData } from '@/lib/mortgage-plan';
import type { PlanData } from '@/lib/mortgage-plan';

/**
 * פרופיל לדוגמה לדוח הדמה במסך «על השלב». הנתונים נבחרו כך שהדוח יציג את כל
 * מה שהוא יודע להציג: מימון קרוב לתקרה, הלוואה שמסתיימת בתוך שנתיים, הכנסה
 * חד-פעמית צפויה ובנק של חשבון — כדי שהלקוח יראה איך המלצה נראית עוד לפני
 * שהזין נתון אחד.
 */
export function sampleProfileData(): PlanData {
  const data = emptyPlanData();
  data.ANALYSIS = {
    ...data.ANALYSIS,
    intent: 'HAS_PROPERTY',
    profileScreen: 'report',
    household: 'COUPLE',
    bankAccountMode: 'JOINT',
    age: 34,
    partnerAge: 32,
    income: 16_500,
    partnerIncome: 11_200,
    employmentType: 'SALARIED',
    partnerEmploymentType: 'SELF_EMPLOYED',
    borrowerLoans: [{ id: 'sample-loan', monthlyPayment: 1_450, remainingMonths: 22 }],
    partnerLoans: [],
    existingLoans: 1_450,
    equity: 620_000,
    dealType: 'first_home',
    propertyValue: 2_350_000,
    mortgageAmount: 1_730_000,
    primaryBank: 'לאומי',
    partnerPrimaryBank: 'לאומי',
    propertyAddress: 'הנרקיסים 12, ראשון לציון',
    years: 27,
    futureLumpSums: [{ id: 'sample-lump', label: 'קרן השתלמות', amount: 140_000, inYears: 4 }],
    futureMonthlyIncrease: 2_500,
    futureMonthlyIncreaseInYears: 2,
    expectsIncomeIncrease: true,
  };
  return data;
}

export const SAMPLE_PLAN_NAME = 'משפחת כהן · דירה ראשונה';
