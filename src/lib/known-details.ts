/**
 * הפרטים שהלקוח כבר הזין במקום כלשהו בפלטפורמה, במקום אחד.
 *
 * כל כלי באזור הרשומים שואל על אותם פרטים בסיסיים — מחיר הנכס, סכום
 * המשכנתא, ההון העצמי, ההכנסות והגילים. הכלל הוא שמה שכבר הוזן לא נשאל שוב:
 * הכלי מציג את הערך הקיים ומאפשר לשנות אותו משם. הקובץ הזה מחליט מה ידוע ומאיפה.
 *
 * סדר העדיפות לכל שדה, מהמקור העדכני והמחייב ביותר:
 *   1. התהליך הפעיל של משכנתא חדשה — הפרופיל הפיננסי שלו, והתמהיל שנבחר בו;
 *   2. הפרופיל השמור על החשבון (User.profileJson);
 *   3. «מה אני יכול להרשות לעצמי», גם אם הוזן לפני ההרשמה;
 *   4. תכנון ההון העצמי (מחיר הנכס וסוג העסקה בלבד).
 *
 * הקובץ משותף לשרת ולדפדפן, ולכן אין בו גישה לבסיס הנתונים.
 */

import type { DealType } from '@/components/mortgage-advisor/types';
import type { FinancingProfileId } from './equity-planning';
import type { AnalysisData, Household, MixData, ProfileLoan } from './mortgage-plan';
import { propertyTypeForDeal, requestedMortgage } from './mortgage-plan';
import type { BorrowerLoan } from './borrower-loans';
import type { MortgagePlanningUserData } from './mortgage-affordability';

/** מאיפה הגיע ערך ידוע — לשורת ההסבר שליד הערך המוצג */
export type KnownSource = 'plan' | 'mix' | 'profile' | 'affordability' | 'equityPlan';

export const KNOWN_SOURCE_LABELS: Record<KnownSource, string> = {
  plan: 'מהפרופיל הפיננסי בתהליך',
  mix: 'מהתמהיל שבחרתם',
  profile: 'מהפרופיל השמור בחשבון',
  affordability: 'מ«מה אני יכול להרשות לעצמי»',
  equityPlan: 'מתכנון ההון העצמי',
};

export interface KnownDetails {
  propertyValue: number | null;
  mortgageAmount: number | null;
  equity: number | null;
  dealType: DealType | null;
  propertyAddress: string;
  household: Household | null;
  firstName: string;
  partnerFirstName: string;
  age: number | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  expenses: number | null;
  existingLoans: number | null;
  borrowerLoans: ProfileLoan[];
  partnerLoans: ProfileLoan[];
  /** התהליך שממנו נלקחו פרטי העסקה, כשנלקחו מתהליך */
  planId: string | null;
  sources: Partial<Record<KnownField, KnownSource>>;
}

export type KnownField = Exclude<keyof KnownDetails, 'sources' | 'planId'>;

export function emptyKnownDetails(): KnownDetails {
  return {
    propertyValue: null,
    mortgageAmount: null,
    equity: null,
    dealType: null,
    propertyAddress: '',
    household: null,
    firstName: '',
    partnerFirstName: '',
    age: null,
    partnerAge: null,
    income: null,
    partnerIncome: null,
    expenses: null,
    existingLoans: null,
    borrowerLoans: [],
    partnerLoans: [],
    planId: null,
    sources: {},
  };
}

/** מקור אחד: מה שהוא יודע לכל שדה. ערך חסר הוא null, מחרוזת ריקה או רשימה ריקה */
type Layer = { source: KnownSource; values: Partial<Omit<KnownDetails, 'sources' | 'planId'>> };

function present(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

const FINANCING_TO_DEAL: Record<FinancingProfileId, DealType> = {
  'first-home': 'first_home',
  replacement: 'replacement_home',
  investment: 'second_home',
  'any-purpose': 'any_purpose',
};

const DEAL_TO_FINANCING: Record<DealType, FinancingProfileId> = {
  first_home: 'first-home',
  replacement_home: 'replacement',
  second_home: 'investment',
  any_purpose: 'any-purpose',
};

export function dealTypeForFinancingProfile(profile: FinancingProfileId | null | undefined): DealType | null {
  return profile && FINANCING_TO_DEAL[profile] ? FINANCING_TO_DEAL[profile] : null;
}

export function financingProfileForDeal(dealType: DealType | null): FinancingProfileId | null {
  return dealType ? DEAL_TO_FINANCING[dealType] : null;
}

/**
 * מה שהפרופיל הפיננסי (של תהליך, של החשבון או של כלי המחשבון) יודע. הלווה
 * השני נחשב רק בזוג, והכנסה, גיל והוצאות נחשבים רק כשהוזנו בפועל.
 */
export function layerFromAnalysis(
  source: KnownSource,
  analysis: Partial<AnalysisData> | null | undefined,
  { withDeal }: { withDeal: boolean }
): Layer | null {
  if (!analysis) return null;
  const couple = analysis.household === 'COUPLE';
  const hasPeople = present(analysis.income) || present(analysis.age) || (couple && present(analysis.partnerIncome));
  const values: Layer['values'] = {
    equity: analysis.equity ?? null,
    age: analysis.age ?? null,
    partnerAge: couple ? analysis.partnerAge ?? null : null,
    income: analysis.income ?? null,
    partnerIncome: couple ? analysis.partnerIncome ?? null : null,
    expenses: analysis.expenses ?? null,
    existingLoans: analysis.existingLoans ?? null,
    borrowerLoans: analysis.borrowerLoans ?? [],
    partnerLoans: couple ? analysis.partnerLoans ?? [] : [],
    firstName: analysis.firstName ?? '',
    partnerFirstName: couple ? analysis.partnerFirstName ?? '' : '',
    household: hasPeople ? analysis.household ?? null : null,
  };
  if (withDeal) {
    const price = analysis.propertyValue ?? null;
    values.propertyValue = price;
    values.dealType = analysis.dealType ?? null;
    values.propertyAddress = analysis.propertyAddress ?? '';
    values.mortgageAmount =
      analysis.mortgageAmount ??
      (price && price > 0
        ? requestedMortgage(price, analysis.equity ?? null, analysis.dealType ?? null, analysis.targetLtvPercent ?? null)
        : null);
  }
  return { source, values };
}

/** התמהיל שנבחר בתהליך: הוא סכום המשכנתא בפועל, וגובר על המבוקש בפרופיל */
export function layerFromMix(mix: Partial<MixData> | null | undefined): Layer | null {
  if (!mix || !mix.mixKey || !present(mix.totalAmount)) return null;
  return {
    source: 'mix',
    values: {
      mortgageAmount: mix.totalAmount ?? null,
      propertyValue: mix.propertyValue ?? null,
      propertyAddress: mix.propertyAddress ?? '',
    },
  };
}

export function layerFromEquityPlan(
  plan: { propertyPrice?: number | null; financingProfile?: string | null } | null | undefined
): Layer | null {
  if (!plan || !present(plan.propertyPrice)) return null;
  return {
    source: 'equityPlan',
    values: {
      propertyValue: plan.propertyPrice ?? null,
      dealType: dealTypeForFinancingProfile(plan.financingProfile as FinancingProfileId | undefined),
    },
  };
}

/** איחוד המקורות לפי הסדר: לכל שדה, המקור הראשון שבו הוא מוזן */
export function mergeKnownLayers(layers: Array<Layer | null>, planId: string | null = null): KnownDetails {
  const result = emptyKnownDetails();
  const target = result as unknown as Record<string, unknown>;
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer.values)) {
      if (!present(value) || result.sources[key as KnownField]) continue;
      target[key] = value;
      result.sources[key as KnownField] = layer.source;
    }
  }
  // סכום המשכנתא שנגזר מהמחיר וההון של מקור אחר עדיף על כלום
  if (!present(result.mortgageAmount) && present(result.propertyValue)) {
    const derived = requestedMortgage(result.propertyValue ?? 0, result.equity, result.dealType, null);
    if (present(derived)) {
      result.mortgageAmount = derived;
      result.sources.mortgageAmount = result.sources.propertyValue;
    }
  }
  const fromPlan = Object.values(result.sources).some((source) => source === 'plan' || source === 'mix');
  result.planId = fromPlan ? planId : null;
  return result;
}

/** מה ידוע על הלקוח — פונקציה טהורה, השרת מביא לה את המקורות */
export function resolveKnownDetails(input: {
  /** התהליך הפעיל של משכנתא חדשה, אם יש */
  plan?: { id: string; analysis: Partial<AnalysisData> | null; mix: Partial<MixData> | null } | null;
  profile?: Partial<AnalysisData> | null;
  affordability?: Partial<AnalysisData> | null;
  equityPlan?: { propertyPrice?: number | null; financingProfile?: string | null } | null;
}): KnownDetails {
  return mergeKnownLayers(
    [
      layerFromMix(input.plan?.mix),
      layerFromAnalysis('plan', input.plan?.analysis, { withDeal: true }),
      layerFromAnalysis('profile', input.profile, { withDeal: false }),
      layerFromAnalysis('affordability', input.affordability, { withDeal: true }),
      layerFromEquityPlan(input.equityPlan),
    ],
    input.plan?.id ?? null
  );
}

/** שורת המקור שליד ערך ידוע */
export function knownSourceLabel(details: KnownDetails | null, field: KnownField): string | null {
  const source = details?.sources[field];
  return source ? KNOWN_SOURCE_LABELS[source] : null;
}

/* ---------------- «מה אני יכול להרשות לעצמי» ---------------- */

function text(value: number | null): string {
  return value !== null && value > 0 ? Math.round(value).toLocaleString('en-US') : '';
}

function planningLoans(loans: ProfileLoan[]): BorrowerLoan[] {
  return loans
    .filter((loan) => (loan.monthlyPayment ?? 0) > 0)
    .map((loan) => ({ id: loan.id, monthlyPayment: text(loan.monthlyPayment), isBullet: false }));
}

/**
 * הנתונים שהמחשבון נפתח איתם כשכבר ידוע מה הלקוח הזין במקום אחר. `complete`
 * אומר שכל מה שהמחשבון שואל כבר ידוע — אז הוא נפתח ישר בתוצאה, ולא שואל.
 */
export function planningFromKnown(
  details: KnownDetails,
  base: MortgagePlanningUserData
): { userData: MortgagePlanningUserData; complete: boolean; hasAny: boolean } {
  const couple = details.household === 'COUPLE';
  const propertyType = propertyTypeForDeal(details.dealType);
  const userData: MortgagePlanningUserData = {
    ...base,
    propertyType: propertyType || base.propertyType,
    applicationType: details.household ? (couple ? 'couple' : 'individual') : base.applicationType,
    ownCapital: text(details.equity) || base.ownCapital,
    propertyPrice: text(details.propertyValue) || base.propertyPrice,
  };
  if (couple) {
    userData.borrower1 = {
      ...base.borrower1,
      age: details.age ? String(details.age) : base.borrower1.age,
      monthlyIncome: text(details.income) || base.borrower1.monthlyIncome,
      loans: planningLoans(details.borrowerLoans),
    };
    userData.borrower2 = {
      ...base.borrower2,
      age: details.partnerAge ? String(details.partnerAge) : base.borrower2.age,
      monthlyIncome: text(details.partnerIncome) || base.borrower2.monthlyIncome,
      loans: planningLoans(details.partnerLoans),
    };
  } else {
    userData.age = details.age ? String(details.age) : base.age;
    userData.monthlyIncome = text(details.income) || base.monthlyIncome;
    userData.loans = planningLoans(details.borrowerLoans);
  }
  const people = couple
    ? Boolean(details.age && details.partnerAge && details.income && details.partnerIncome)
    : Boolean(details.age && details.income);
  const complete = Boolean(propertyType && details.household && people && details.equity);
  const hasAny = Boolean(
    propertyType || details.household || details.age || details.income || details.equity || details.propertyValue
  );
  return { userData, complete, hasAny };
}

/** ההכנסה החודשית הפנויה של משק הבית: הכנסות נטו פחות ההוצאות הקבועות */
export function knownDisposableIncome(details: KnownDetails | null): number | undefined {
  if (!details) return undefined;
  const income = (details.income ?? 0) + (details.household === 'COUPLE' ? details.partnerIncome ?? 0 : 0);
  const disposable = Math.round(income - (details.expenses ?? 0));
  return disposable > 0 ? disposable : undefined;
}
