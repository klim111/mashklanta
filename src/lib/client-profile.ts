/**
 * פרופיל הלקוח מההגדרות: כל פרטי השלב הראשון בלי נכס, כולל הון עצמי וחשבון.
 * נשמר על המשתמש ונטען כברירת מחדל בפתיחת משכנתא חדשה.
 */

import {
  DEFAULT_PLAN_YEARS,
  clampPlanYears,
  emptyStageData,
  parseStageData,
  profileLoanTotal,
} from './mortgage-plan';
import type {
  AnalysisData,
  BankAccountMode,
  EmploymentType,
  FutureLumpSum,
  Household,
  ProfileLoan,
} from './mortgage-plan';

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  household: 'הרכב הלווים',
  bankAccountMode: 'אופן ניהול החשבון',
  age: 'גיל',
  partnerAge: 'גיל בן/בת הזוג',
  income: 'הכנסה חודשית',
  partnerIncome: 'הכנסה של בן/בת הזוג',
  employmentType: 'אופן ההעסקה',
  partnerEmploymentType: 'אופן ההעסקה של בן/בת הזוג',
  expenses: 'הוצאות חודשיות',
  borrowerLoans: 'הלוואות צרכניות',
  partnerLoans: 'הלוואות של בן/בת הזוג',
  existingLoans: 'סך החזר הלוואות',
  equity: 'הון עצמי זמין',
  primaryBank: 'הבנק הראשי',
  partnerPrimaryBank: 'הבנק הראשי של בן/בת הזוג',
  years: 'תקופת משכנתא מבוקשת',
  futureLumpSums: 'הכנסות חד-פעמיות עתידיות',
  futureMonthlyIncrease: 'תוספת הכנסה חודשית עתידית',
  futureMonthlyIncreaseInYears: 'מועד תוספת ההכנסה',
  name: 'שם מלא',
  username: 'שם משתמש',
};

/** שדות הפרופיל שמועתקים לתהליך חדש — בלי פרטי נכס */
export const PROFILE_ANALYSIS_KEYS = [
  'household',
  'bankAccountMode',
  'age',
  'partnerAge',
  'income',
  'partnerIncome',
  'employmentType',
  'partnerEmploymentType',
  'expenses',
  'borrowerLoans',
  'partnerLoans',
  'existingLoans',
  'equity',
  'primaryBank',
  'partnerPrimaryBank',
  'years',
  'futureLumpSums',
  'futureMonthlyIncrease',
  'futureMonthlyIncreaseInYears',
] as const satisfies ReadonlyArray<keyof AnalysisData>;

export type ProfileAnalysisKey = (typeof PROFILE_ANALYSIS_KEYS)[number];

export interface ClientProfileFinancials {
  household: Household;
  bankAccountMode: BankAccountMode | null;
  age: number | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  employmentType: EmploymentType | null;
  partnerEmploymentType: EmploymentType | null;
  expenses: number | null;
  borrowerLoans: ProfileLoan[];
  partnerLoans: ProfileLoan[];
  existingLoans: number | null;
  equity: number | null;
  primaryBank: string | null;
  partnerPrimaryBank: string | null;
  years: number;
  futureLumpSums: FutureLumpSum[];
  futureMonthlyIncrease: number | null;
  futureMonthlyIncreaseInYears: number | null;
}

export interface ClientProfile extends ClientProfileFinancials {
  name: string;
  email: string;
  username: string;
}

export function emptyClientProfile(): ClientProfileFinancials {
  const base = emptyStageData('ANALYSIS');
  return {
    household: base.household,
    bankAccountMode: base.bankAccountMode,
    age: base.age,
    partnerAge: base.partnerAge,
    income: base.income,
    partnerIncome: base.partnerIncome,
    employmentType: base.employmentType,
    partnerEmploymentType: base.partnerEmploymentType,
    expenses: base.expenses,
    borrowerLoans: base.borrowerLoans,
    partnerLoans: base.partnerLoans,
    existingLoans: base.existingLoans,
    equity: base.equity,
    primaryBank: base.primaryBank,
    partnerPrimaryBank: base.partnerPrimaryBank,
    years: base.years,
    futureLumpSums: base.futureLumpSums,
    futureMonthlyIncrease: base.futureMonthlyIncrease,
    futureMonthlyIncreaseInYears: base.futureMonthlyIncreaseInYears,
  };
}

/** קריאת JSON שנשמר על המשתמש — תמיד מחזירה מבנה שלם */
export function parseClientProfile(raw: unknown): ClientProfileFinancials {
  const parsed = parseStageData('ANALYSIS', raw);
  const couple = parsed.household === 'COUPLE';
  return {
    household: parsed.household,
    bankAccountMode: couple ? parsed.bankAccountMode : null,
    age: parsed.age,
    partnerAge: couple ? parsed.partnerAge : null,
    income: parsed.income,
    partnerIncome: couple ? parsed.partnerIncome : null,
    employmentType: parsed.employmentType,
    partnerEmploymentType: couple ? parsed.partnerEmploymentType : null,
    expenses: parsed.expenses,
    borrowerLoans: parsed.borrowerLoans,
    partnerLoans: couple ? parsed.partnerLoans : [],
    existingLoans: parsed.existingLoans,
    equity: parsed.equity,
    primaryBank: parsed.primaryBank,
    partnerPrimaryBank: couple ? parsed.partnerPrimaryBank : null,
    years: parsed.years || DEFAULT_PLAN_YEARS,
    futureLumpSums: parsed.futureLumpSums,
    futureMonthlyIncrease: parsed.futureMonthlyIncrease,
    futureMonthlyIncreaseInYears: parsed.futureMonthlyIncreaseInYears,
  };
}

export function profileToJson(profile: ClientProfileFinancials): ClientProfileFinancials {
  const couple = profile.household === 'COUPLE';
  const borrowerLoans = profile.borrowerLoans ?? [];
  const partnerLoans = couple ? profile.partnerLoans ?? [] : [];
  const loanTotal = profileLoanTotal({
    household: profile.household,
    borrowerLoans,
    partnerLoans,
  });
  return {
    household: profile.household === 'COUPLE' ? 'COUPLE' : 'SINGLE',
    bankAccountMode: couple ? profile.bankAccountMode : null,
    age: profile.age,
    partnerAge: couple ? profile.partnerAge : null,
    income: profile.income,
    partnerIncome: couple ? profile.partnerIncome : null,
    employmentType: profile.employmentType,
    partnerEmploymentType: couple ? profile.partnerEmploymentType : null,
    expenses: profile.expenses,
    borrowerLoans,
    partnerLoans,
    existingLoans: loanTotal > 0 ? loanTotal : profile.existingLoans,
    equity: profile.equity,
    primaryBank: profile.primaryBank,
    partnerPrimaryBank: couple ? profile.partnerPrimaryBank : null,
    years: clampPlanYears(profile.years || DEFAULT_PLAN_YEARS),
    futureLumpSums: profile.futureLumpSums ?? [],
    futureMonthlyIncrease: profile.futureMonthlyIncrease,
    futureMonthlyIncreaseInYears: profile.futureMonthlyIncreaseInYears,
  };
}

/** השתלת הפרופיל לתוך שלב הניתוח — בלי לדרוס פרטי נכס שכבר הוזנו */
export function applyProfileToAnalysis(
  analysis: AnalysisData,
  profile: ClientProfileFinancials
): AnalysisData {
  const financials = profileToJson(profile);
  return {
    ...analysis,
    ...financials,
  };
}

export function analysisFromProfile(profile: ClientProfileFinancials): AnalysisData {
  return applyProfileToAnalysis(emptyStageData('ANALYSIS'), profile);
}

export function pickProfileFromAnalysis(analysis: AnalysisData): ClientProfileFinancials {
  return parseClientProfile(analysis);
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function divergedProfileKeys(
  previous: AnalysisData,
  next: AnalysisData,
  saved: ClientProfileFinancials
): ProfileAnalysisKey[] {
  return PROFILE_ANALYSIS_KEYS.filter((key) => {
    if (valuesEqual(previous[key], next[key])) return false;
    return !valuesEqual(next[key], saved[key]);
  });
}
