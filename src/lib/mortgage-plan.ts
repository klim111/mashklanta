/**
 * מודל תהליך תכנון המשכנתא של הלקוח.
 *
 * התהליך מחולק לחמשת השלבים של עמוד "איך זה עובד", וכל שלב מחזיק את הנתונים
 * שהלקוח הזין בו. הקובץ טהור מכוונה — הוא נטען גם בשרת (לאימות לפני שמירה
 * ולגזירת עמודות הסיכום) וגם בדפדפן (לחישוב חי בזמן ההקלדה), ולכן אינו מייבא
 * את Prisma ואינו נוגע ב-React.
 */

import { DEFAULT_INTEREST_RATES, INTEREST_RATES } from './interest-rates';
import type { MortgageTrackType } from './interest-rates';
import {
  EMPLOYMENT_DOCUMENTS,
  EMPLOYMENT_LABELS,
  EMPLOYMENT_TYPES,
  STAGE_DOCUMENTS,
} from './client-process';
import type { EmploymentType, StageDocument } from './client-process';
import { DEAL_TYPES, MAX_LTV_PERCENT, MORTGAGE_BANKS } from '@/components/mortgage-advisor/types';
import type { DealType } from '@/components/mortgage-advisor/types';
import {
  calculateMaxProperty,
  defaultMortgagePlanningUserData,
  getAffordabilityInputs,
  type MortgagePlanningUserData,
} from './mortgage-affordability';
import { parseFormattedNumberInput } from './currency';

/**
 * סדר השלבים בתהליך. הבקשה לאישור עקרוני קודמת לבניית התמהיל, כי הריביות
 * שהבנק נוקב באישור העקרוני הן הבסיס שממנו נבנים התמהילים. המכרז מגיע אחרי
 * התמהיל — מתמחרים את מה שנבנה, לא רק את הסלים האחידים.
 *
 * המזהים הם ערכי enum בבסיס הנתונים ולכן נשארו כפי שהם: `APPLICATIONS` הוא
 * שלב האישור העקרוני ו-`AUCTION` הוא מכרז הריביות.
 */
export const PLAN_STAGES = ['ANALYSIS', 'APPLICATIONS', 'MIX', 'AUCTION', 'SIGNING'] as const;
export type PlanStageId = (typeof PLAN_STAGES)[number];

export type PlanStageStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type PlanStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

/** מזהה השלב בעמוד "איך זה עובד" — כדי שכל התיאורים והעיצוב יגיעו משם */
export const STAGE_JOURNEY_ID: Record<PlanStageId, string> = {
  ANALYSIS: 'analysis',
  MIX: 'mix',
  APPLICATIONS: 'applications',
  AUCTION: 'auction',
  SIGNING: 'signing',
};

export function isPlanStage(value: unknown): value is PlanStageId {
  return typeof value === 'string' && (PLAN_STAGES as readonly string[]).includes(value);
}

export function stageIndex(stage: PlanStageId): number {
  const index = PLAN_STAGES.indexOf(stage);
  return index < 0 ? 0 : index;
}

/** שלבים קודמים שטרם נסגרו — בלי אלה אי אפשר באמת לעבוד בשלב הנוכחי */
export function unfinishedPrerequisites(
  stage: PlanStageId,
  statuses: Record<PlanStageId, PlanStageStatus>
): PlanStageId[] {
  const idx = stageIndex(stage);
  return PLAN_STAGES.slice(0, idx).filter((prior) => statuses[prior] !== 'COMPLETED');
}

// ───────────────────────────── נתוני השלבים ─────────────────────────────

export type Household = 'SINGLE' | 'COUPLE';

export type { EmploymentType } from './client-process';
export { EMPLOYMENT_LABELS, EMPLOYMENT_TYPES } from './client-process';

/**
 * הכנסה חד-פעמית שצפויה בעתיד — קרן השתלמות, מענק, ירושה או מכירת נכס.
 * היא נאספת בפרופיל כדי שתגיע לבניית התמהיל כפירעון מוקדם מתוכנן.
 */
export interface FutureLumpSum {
  id: string;
  label: string;
  amount: number | null;
  /** בעוד כמה שנים היא צפויה להתקבל */
  inYears: number | null;
}

/**
 * השאלה הראשונה בתהליך: האם יש כבר נכס קונקרטי על השולחן, או שהלקוח עדיין
 * בודק מה הוא יכול להרשות לעצמו. הבחירה קובעת אם ממשיכים להזנת פרטי הנכס
 * או שנשלחים לכלי בדיקת ההיתכנות לפני שיש מה להגיש לבנק.
 */
export type ProfileIntent = 'HAS_PROPERTY' | 'FEASIBILITY';

/** המסכים הפנימיים של שלב הפרופיל — אחד בכל פעם, מהשאלה הראשונה עד הנכס */
export const PROFILE_SCREENS = ['intent', 'borrowers', 'future', 'deal'] as const;
export type ProfileScreen = (typeof PROFILE_SCREENS)[number];

/** הלוואה צרכנית של לווה אחד, כמו בכלי «מה אני יכול להרשות לעצמי» */
export interface ProfileLoan {
  id: string;
  monthlyPayment: number | null;
}

export function sumProfileLoans(loans: ProfileLoan[]): number {
  return loans.reduce((sum, loan) => sum + (loan.monthlyPayment ?? 0), 0);
}

/** שלב 1 — הפרופיל הפיננסי. כל שאר השלבים נשענים על מה שהוזן כאן */
export interface AnalysisData {
  intent: ProfileIntent | null;
  /** המסך הפנימי שהלקוח נמצא בו עכשיו */
  profileScreen: ProfileScreen;
  household: Household;
  age: number | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  /** אופן ההעסקה קובע אילו מסמכים הבנק ידרוש מכל לווה */
  employmentType: EmploymentType | null;
  partnerEmploymentType: EmploymentType | null;
  expenses: number | null;
  /** הלוואות צרכניות לפי לווה — סך ההחזר נגזר מהן ל־existingLoans */
  borrowerLoans: ProfileLoan[];
  partnerLoans: ProfileLoan[];
  /** סך ההחזר החודשי על הלוואות צרכניות קיימות */
  existingLoans: number | null;
  /** ההון העצמי הפנוי לעסקה */
  equity: number | null;
  dealType: DealType | null;
  propertyValue: number | null;
  /** סכום המשכנתא המבוקש. ברירת המחדל היא מחיר הנכס פחות ההון העצמי */
  mortgageAmount: number | null;
  propertyAddress: string;
  /** תקופת המשכנתא המבוקשת בשנים — נשמרת ברזולוציית חודשים (48–360) */
  years: number;
  futureLumpSums: FutureLumpSum[];
  /** תוספת חודשית צפויה להכנסה הפנויה, ובעוד כמה שנים */
  futureMonthlyIncrease: number | null;
  futureMonthlyIncreaseInYears: number | null;
  /** הנתונים כמו שהכלי «מה אני יכול להרשות לעצמי» שומר אותם */
  planning?: MortgagePlanningUserData;
  planningStep?: string;
}

export function profileLoanTotal(
  data: Pick<AnalysisData, 'household' | 'borrowerLoans' | 'partnerLoans'>
): number {
  const own = sumProfileLoans(data.borrowerLoans);
  const partner = data.household === 'COUPLE' ? sumProfileLoans(data.partnerLoans) : 0;
  return own + partner;
}

const PROPERTY_TYPE_TO_DEAL: Record<string, DealType> = {
  'דירה ראשונה': 'first_home',
  'דירה חליפית': 'replacement_home',
  'דירה להשקעה': 'second_home',
  'משכנתא לכל מטרה': 'any_purpose',
};

const DEAL_TO_PROPERTY_TYPE: Record<DealType, string> = {
  first_home: 'דירה ראשונה',
  replacement_home: 'דירה חליפית',
  second_home: 'דירה להשקעה',
  any_purpose: 'משכנתא לכל מטרה',
};

/**
 * גזירת שדות הסיכום מתוך כלי התכנון הקיים — בלי טופס מקביל.
 * השדות המספריים משמשים את השלבים הבאים ואת כרטיס התהליך.
 *
 * `carry` הם השדות שנאספים בשלב הפרופיל אך אינם חלק מהכלי (אופן העסקה וצפי
 * הכנסות עתידיות). הם נשמרים כאן כדי שכתיבה מהכלי לא תמחק אותם.
 */
export function analysisFromPlanning(
  userData: MortgagePlanningUserData,
  currentStep: string,
  carry?: Partial<AnalysisData>
): AnalysisData {
  const inputs = getAffordabilityInputs(userData);
  const priced = parseFormattedNumberInput(userData.propertyPrice);
  const currentPriced = parseFormattedNumberInput(userData.currentPropertyPrice);
  const calculated = calculateMaxProperty(userData);
  const fromPrice = priced > 0 ? priced : currentPriced > 0 ? currentPriced : null;
  const propertyValue =
    fromPrice ??
    (currentStep === 'results' && calculated.hasValidResult ? calculated.maxPropertyPrice : null);

  const couple = userData.applicationType === 'couple';
  const income = couple
    ? parseFormattedNumberInput(userData.borrower1.monthlyIncome) || null
    : parseFormattedNumberInput(userData.monthlyIncome) || null;
  const partnerIncome = couple
    ? parseFormattedNumberInput(userData.borrower2.monthlyIncome) || null
    : null;
  const ageRaw = couple ? userData.borrower1.age : userData.age;
  const partnerAgeRaw = couple ? userData.borrower2.age : '';

  const borrowerLoans =
    carry?.borrowerLoans ??
    mapPlanningLoans(couple ? userData.borrower1.loans : userData.loans);
  const partnerLoans = couple
    ? (carry?.partnerLoans ?? mapPlanningLoans(userData.borrower2.loans))
    : [];
  const loanTotal = sumProfileLoans(borrowerLoans) + sumProfileLoans(partnerLoans);

  return {
    intent: carry?.intent ?? (propertyValue ? 'HAS_PROPERTY' : null),
    profileScreen: carry?.profileScreen ?? 'intent',
    household: couple ? 'COUPLE' : 'SINGLE',
    age: parseInt(ageRaw, 10) || null,
    partnerAge: parseInt(partnerAgeRaw, 10) || null,
    income,
    partnerIncome,
    employmentType: carry?.employmentType ?? null,
    partnerEmploymentType: couple ? carry?.partnerEmploymentType ?? null : null,
    futureLumpSums: carry?.futureLumpSums ?? [],
    futureMonthlyIncrease: carry?.futureMonthlyIncrease ?? null,
    futureMonthlyIncreaseInYears: carry?.futureMonthlyIncreaseInYears ?? null,
    expenses: null,
    borrowerLoans,
    partnerLoans,
    existingLoans: loanTotal > 0 ? loanTotal : inputs.loanPayment > 0 ? inputs.loanPayment : null,
    equity: inputs.ownCapital > 0 ? inputs.ownCapital : null,
    dealType: PROPERTY_TYPE_TO_DEAL[userData.propertyType] ?? null,
    propertyValue,
    mortgageAmount: carry?.mortgageAmount ?? null,
    propertyAddress: '',
    years: clampPlanYears(calculated.maxLoanPeriod || 25),
    planning: userData,
    planningStep: currentStep,
  };
}

export function propertyTypeForDeal(dealType: DealType | null): string {
  return dealType ? DEAL_TO_PROPERTY_TYPE[dealType] : '';
}

/** שלב 3 — התמהיל שנבחר. הרשומה עצמה חיה בטבלת התמהילים */
export interface MixData {
  mixRecordId: string | null;
  mixKey: string | null;
  mixName: string | null;
  totalAmount: number | null;
  monthlyPayment: number | null;
  averageRate: number | null;
  totalInterest: number | null;
  totalPaid: number | null;
  months: number | null;
  propertyAddress: string;
  propertyValue: number | null;
  notes: string;
}

/**
 * סל אחיד כפי שהתקבל באישור העקרוני. הריביות נשמרות לפי סוג המסלול, כי בכל
 * אחד משלושת הסלים מופיע כל סוג מסלול פעם אחת בלבד.
 */
export interface PreApprovalBasket {
  basketId: string;
  rates: Record<string, number>;
  /** התמהיל השמור שנוצר מהסל, כדי שימשיך לשלב בניית התמהיל */
  mixKey: string | null;
  mixRecordId: string | null;
  monthlyPayment: number | null;
  averageRate: number | null;
  totalPaid: number | null;
}

/**
 * שלב 2 — הבקשה לאישור עקרוני. הבקשה מוגשת לבנק אחד, ובסופה הלקוח מזין את
 * הריביות שהבנק נקב לכל אחד משלושת הסלים האחידים.
 */
export interface PreApprovalData {
  /** הבנק שאליו הוגשה הבקשה */
  bank: string | null;
  submittedAt: string | null;
  /** מפתח המסמך מהקטלוג → האם נאסף */
  documents: Record<string, boolean>;
  /** הלקוח סימן שהאישור העקרוני התקבל — התנאי לסגירת השלב */
  approved: boolean;
  approvedAmount: number | null;
  validUntil: string | null;
  baskets: PreApprovalBasket[];
  note: string;
}

export interface BankOffer {
  id: string;
  bank: string;
  /** סבב ההתמחרות — כדי להשוות שיפור בין סבבים */
  round: number;
  monthlyPayment: number | null;
  averageRate: number | null;
  totalPaid: number | null;
  note: string;
}

/** שלב 4 — מכרז הריביות */
export interface AuctionData {
  offers: BankOffer[];
  winnerOfferId: string | null;
}

/** שלב 5 — החתימה בבנק */
export interface SigningData {
  bank: string | null;
  signingDate: string | null;
  finalAmount: number | null;
  finalMonthlyPayment: number | null;
  finalAverageRate: number | null;
  /** מפתח בדיקה מרשימת החתימה → האם אומתה */
  checklist: Record<string, boolean>;
}

export interface PlanStageDataMap {
  ANALYSIS: AnalysisData;
  MIX: MixData;
  APPLICATIONS: PreApprovalData;
  AUCTION: AuctionData;
  SIGNING: SigningData;
}

export type PlanStageData = PlanStageDataMap[PlanStageId];

/** נתוני כל השלבים יחד — התמונה המלאה של התהליך */
export type PlanData = { [S in PlanStageId]: PlanStageDataMap[S] };

// ───────────────────────────── ברירות מחדל ─────────────────────────────

export const DEFAULT_PLAN_YEARS = 25;
/** תקופת משכנתא מותרת: 4 עד 30 שנים, כל חודש ביניים */
export const PLAN_TERM_MONTHS_MIN = 48;
export const PLAN_TERM_MONTHS_MAX = 360;

export function yearsToMonths(years: number): number {
  return Math.round((Number.isFinite(years) ? years : 0) * 12);
}

export function monthsToYears(months: number): number {
  return months / 12;
}

export function clampTermMonths(months: number): number {
  if (!Number.isFinite(months) || months <= 0) return PLAN_TERM_MONTHS_MIN;
  return Math.min(PLAN_TERM_MONTHS_MAX, Math.max(PLAN_TERM_MONTHS_MIN, Math.round(months)));
}

export function clampPlanYears(years: number): number {
  return monthsToYears(clampTermMonths(yearsToMonths(years)));
}

const EMPTY: PlanData = {
  ANALYSIS: {
    intent: null,
    profileScreen: 'intent',
    household: 'SINGLE',
    age: null,
    partnerAge: null,
    income: null,
    partnerIncome: null,
    employmentType: null,
    partnerEmploymentType: null,
    expenses: null,
    borrowerLoans: [],
    partnerLoans: [],
    existingLoans: null,
    equity: null,
    dealType: null,
    propertyValue: null,
    mortgageAmount: null,
    propertyAddress: '',
    years: DEFAULT_PLAN_YEARS,
    futureLumpSums: [],
    futureMonthlyIncrease: null,
    futureMonthlyIncreaseInYears: null,
  },
  MIX: {
    mixRecordId: null,
    mixKey: null,
    mixName: null,
    totalAmount: null,
    monthlyPayment: null,
    averageRate: null,
    totalInterest: null,
    totalPaid: null,
    months: null,
    propertyAddress: '',
    propertyValue: null,
    notes: '',
  },
  APPLICATIONS: {
    bank: null,
    submittedAt: null,
    documents: {},
    approved: false,
    approvedAmount: null,
    validUntil: null,
    baskets: [],
    note: '',
  },
  AUCTION: { offers: [], winnerOfferId: null },
  SIGNING: {
    bank: null,
    signingDate: null,
    finalAmount: null,
    finalMonthlyPayment: null,
    finalAverageRate: null,
    checklist: {},
  },
};

export function emptyStageData<S extends PlanStageId>(stage: S): PlanStageDataMap[S] {
  return structuredClone(EMPTY[stage]);
}

export function emptyPlanData(): PlanData {
  return structuredClone(EMPTY);
}

// ───────────────────────────── ניקוי וקריאה ─────────────────────────────

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function bool(value: unknown): boolean {
  return value === true;
}

function pickBank(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function flagMap(value: unknown, keys: string[]): Record<string, boolean> {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const result: Record<string, boolean> = {};
  keys.forEach((key) => {
    if (bool(source[key])) result[key] = true;
  });
  return result;
}

let idCounter = 0;
function rowId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function pickEmployment(value: unknown): EmploymentType | null {
  return EMPLOYMENT_TYPES.includes(value as EmploymentType) ? (value as EmploymentType) : null;
}

function pickIntent(value: unknown): ProfileIntent | null {
  return value === 'HAS_PROPERTY' || value === 'FEASIBILITY' ? value : null;
}

function pickProfileScreen(value: unknown): ProfileScreen | null {
  return typeof value === 'string' && (PROFILE_SCREENS as readonly string[]).includes(value)
    ? (value as ProfileScreen)
    : null;
}

function mapPlanningLoans(loans: Array<{ id?: string; monthlyPayment?: string }>): ProfileLoan[] {
  return loans.flatMap((loan) => {
    const payment = parseFormattedNumberInput(loan.monthlyPayment ?? '');
    return [
      {
        id: loan.id || rowId('loan'),
        monthlyPayment: payment > 0 ? payment : null,
      },
    ];
  });
}

function parseProfileLoans(value: unknown): ProfileLoan[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    return [
      {
        id: typeof row.id === 'string' && row.id ? row.id : rowId('loan'),
        monthlyPayment: num(row.monthlyPayment),
      },
    ];
  });
}

function seedLoansFromTotal(total: number | null): ProfileLoan[] {
  if (!total || total <= 0) return [];
  return [{ id: rowId('loan'), monthlyPayment: total }];
}

function parseLumpSums(value: unknown): FutureLumpSum[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const amount = num(row.amount);
    const inYears = num(row.inYears);
    return [
      {
        id: typeof row.id === 'string' ? row.id : rowId('lump'),
        label: str(row.label),
        amount,
        inYears: inYears && inYears > 0 ? Math.round(inYears) : null,
      },
    ];
  });
}

function bankFromLegacyApplications(value: unknown): { bank: string | null; approved: boolean } {
  if (!Array.isArray(value)) return { bank: null, approved: false };
  const rows = value.flatMap((item) =>
    item && typeof item === 'object' ? [item as Record<string, unknown>] : []
  );
  const approved = rows.find((row) => row.status === 'APPROVED');
  if (approved) return { bank: pickBank(approved.bank), approved: true };
  const submitted = rows.find((row) => row.status === 'SUBMITTED');
  if (submitted) return { bank: pickBank(submitted.bank), approved: false };
  return { bank: rows.length > 0 ? pickBank(rows[0].bank) : null, approved: false };
}

/**
 * ניקוי נתוני שלב שהגיעו מהדפדפן או מרשומה ישנה.
 *
 * כל מה שנכנס לבסיס הנתונים עובר כאן, כדי שגרסה עתידית של הטופס לא תיתקל בשדה
 * חסר או בערך שאינו מהסוג הצפוי — ותציג שדה ריק במקום להפיל את המסך.
 */
export function parseStageData<S extends PlanStageId>(stage: S, raw: unknown): PlanStageDataMap[S] {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const base = emptyStageData(stage);

  switch (stage) {
    case 'ANALYSIS': {
      const has = (key: string) => Object.prototype.hasOwnProperty.call(source, key);
      const carry: Partial<AnalysisData> = {
        intent: pickIntent(source.intent),
        profileScreen: pickProfileScreen(source.profileScreen) ?? undefined,
        employmentType: pickEmployment(source.employmentType),
        partnerEmploymentType: pickEmployment(source.partnerEmploymentType),
        futureLumpSums: parseLumpSums(source.futureLumpSums),
        futureMonthlyIncrease: num(source.futureMonthlyIncrease),
        futureMonthlyIncreaseInYears: num(source.futureMonthlyIncreaseInYears),
        borrowerLoans: has('borrowerLoans') ? parseProfileLoans(source.borrowerLoans) : undefined,
        partnerLoans: has('partnerLoans') ? parseProfileLoans(source.partnerLoans) : undefined,
      };

      /**
       * תהליך שנפתח מרשומת לקוח קיימת מגיע עם הנתונים בפורמט של כלי התכנון.
       * הם משמשים כזרע בלבד: כל שדה שהלקוח כבר ערך בטופס הפרופיל גובר עליהם.
       */
      const seed: AnalysisData =
        source.planning && typeof source.planning === 'object'
          ? analysisFromPlanning(
              {
                ...defaultMortgagePlanningUserData(),
                ...(source.planning as MortgagePlanningUserData),
              },
              typeof source.planningStep === 'string' ? source.planningStep : 'property-type',
              carry
            )
          : (base as AnalysisData);

      const household: Household = has('household')
        ? source.household === 'COUPLE'
          ? 'COUPLE'
          : 'SINGLE'
        : seed.household;
      const couple = household === 'COUPLE';
      const years = num(source.years);
      const dealType = has('dealType')
        ? (DEAL_TYPES as Record<string, string>)[source.dealType as string]
          ? (source.dealType as DealType)
          : null
        : seed.dealType;
      const equity = has('equity') ? num(source.equity) : seed.equity;
      const maxPrice = maxPropertyForEquity(equity, dealType);
      const propertyValueRaw = has('propertyValue') ? num(source.propertyValue) : seed.propertyValue;
      const propertyValue =
        propertyValueRaw && maxPrice !== null && propertyValueRaw > maxPrice
          ? maxPrice
          : propertyValueRaw;
      const mortgageAmount = mortgageFromProperty(propertyValue ?? 0, equity, dealType);

      const borrowerLoans = carry.borrowerLoans ?? seed.borrowerLoans;
      const partnerLoans = couple ? (carry.partnerLoans ?? seed.partnerLoans) : [];
      const fromLoans = sumProfileLoans(borrowerLoans) + sumProfileLoans(partnerLoans);
      const existingLoans =
        fromLoans > 0
          ? fromLoans
          : has('existingLoans')
            ? num(source.existingLoans)
            : seed.existingLoans;
      const seededBorrowerLoans =
        borrowerLoans.length === 0 && partnerLoans.length === 0
          ? seedLoansFromTotal(existingLoans)
          : borrowerLoans;

      return {
        ...seed,
        ...carry,
        household,
        partnerEmploymentType: couple ? carry.partnerEmploymentType ?? null : null,
        age: has('age') ? num(source.age) : seed.age,
        partnerAge: has('partnerAge') ? num(source.partnerAge) : seed.partnerAge,
        income: has('income') ? num(source.income) : seed.income,
        partnerIncome: has('partnerIncome') ? num(source.partnerIncome) : seed.partnerIncome,
        expenses: has('expenses') ? num(source.expenses) : seed.expenses,
        borrowerLoans: seededBorrowerLoans,
        partnerLoans,
        existingLoans,
        equity,
        profileScreen:
          carry.profileScreen ??
          (carry.intent || seed.intent
            ? seed.profileScreen === 'intent'
              ? 'borrowers'
              : seed.profileScreen
            : 'intent'),
        dealType,
        propertyValue,
        mortgageAmount,
        propertyAddress: has('propertyAddress') ? str(source.propertyAddress) : seed.propertyAddress,
        years:
          years && years > 0 ? clampPlanYears(years) : seed.years || DEFAULT_PLAN_YEARS,
      } as PlanStageDataMap[S];
    }

    case 'MIX': {
      const value = base as MixData;
      return {
        ...value,
        mixRecordId: typeof source.mixRecordId === 'string' ? source.mixRecordId : null,
        mixKey: typeof source.mixKey === 'string' ? source.mixKey : null,
        mixName: typeof source.mixName === 'string' ? source.mixName : null,
        totalAmount: num(source.totalAmount),
        monthlyPayment: num(source.monthlyPayment),
        averageRate: num(source.averageRate),
        totalInterest: num(source.totalInterest),
        totalPaid: num(source.totalPaid),
        months: num(source.months),
        propertyAddress: str(source.propertyAddress),
        propertyValue: num(source.propertyValue),
        notes: str(source.notes),
      } as PlanStageDataMap[S];
    }

    case 'APPLICATIONS': {
      const legacy = bankFromLegacyApplications(source.banks);

      const rows = Array.isArray(source.baskets) ? source.baskets : [];
      const baskets: PreApprovalBasket[] = rows.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        const basket = UNIFORM_BASKETS.find((entry) => entry.id === row.basketId);
        if (!basket) return [];

        const source_rates =
          row.rates && typeof row.rates === 'object' ? (row.rates as Record<string, unknown>) : {};
        const rates: Record<string, number> = {};
        basket.tracks.forEach((track) => {
          const rate = num(source_rates[track.type]);
          if (rate !== null && rate >= 0) rates[track.type] = rate;
        });

        return [
          {
            basketId: basket.id,
            rates,
            mixKey: typeof row.mixKey === 'string' ? row.mixKey : null,
            mixRecordId: typeof row.mixRecordId === 'string' ? row.mixRecordId : null,
            monthlyPayment: num(row.monthlyPayment),
            averageRate: num(row.averageRate),
            totalPaid: num(row.totalPaid),
          },
        ];
      });

      return {
        bank: pickBank(source.bank) ?? legacy.bank,
        submittedAt: typeof source.submittedAt === 'string' ? source.submittedAt : null,
        documents: flagMap(source.documents, ALL_PRE_APPROVAL_DOCUMENT_KEYS),
        approved: source.approved === undefined ? legacy.approved : bool(source.approved),
        approvedAmount: num(source.approvedAmount),
        validUntil: typeof source.validUntil === 'string' ? source.validUntil : null,
        baskets,
        note: str(source.note),
      } as PlanStageDataMap[S];
    }

    case 'AUCTION': {
      const rows = Array.isArray(source.offers) ? source.offers : [];
      const offers: BankOffer[] = rows.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        const bank = pickBank(row.bank);
        if (!bank) return [];
        const round = num(row.round);
        return [
          {
            id: typeof row.id === 'string' ? row.id : rowId('offer'),
            bank,
            round: round && round > 0 ? Math.round(round) : 1,
            monthlyPayment: num(row.monthlyPayment),
            averageRate: num(row.averageRate),
            totalPaid: num(row.totalPaid),
            note: str(row.note),
          },
        ];
      });

      const winnerOfferId =
        typeof source.winnerOfferId === 'string' &&
        offers.some((offer) => offer.id === source.winnerOfferId)
          ? source.winnerOfferId
          : null;

      return { offers, winnerOfferId } as PlanStageDataMap[S];
    }

    case 'SIGNING': {
      return {
        bank: pickBank(source.bank),
        signingDate: typeof source.signingDate === 'string' ? source.signingDate : null,
        finalAmount: num(source.finalAmount),
        finalMonthlyPayment: num(source.finalMonthlyPayment),
        finalAverageRate: num(source.finalAverageRate),
        checklist: flagMap(
          source.checklist,
          SIGNING_CHECKS.map((check) => check.key)
        ),
      } as PlanStageDataMap[S];
    }

    default:
      return base;
  }
}

// ───────────────────────────── קטלוגים ─────────────────────────────

export const PLAN_BANKS: readonly string[] = MORTGAGE_BANKS;

/**
 * המסמכים שהבנק דורש מכל בקשה, ללא תלות באופן ההעסקה של הלווים. הרשימה נגזרת
 * מקטלוג המסמכים של תהליך הליווי, כדי שהלקוח באזור האישי והיועץ בכרטיס הלקוח
 * יעבדו מול אותה רשימה בדיוק. מסמכי הנכס עצמו אינם נדרשים בשלב הזה — הם
 * נדרשים רק כשהעסקה מבשילה לתיק חתום.
 */
export const SHARED_PRE_APPROVAL_DOCUMENTS: StageDocument[] = [
  ...STAGE_DOCUMENTS.INTAKE,
  ...STAGE_DOCUMENTS.DOCUMENTS.filter(
    (doc) => !['payslips', 'self_employed_tax'].includes(doc.key)
  ),
  ...STAGE_DOCUMENTS.BANK_SUBMISSION,
];

/** תחילית מפתח המסמך של כל לווה, כדי ששני בני הזוג יסומנו בנפרד */
const BORROWER_KEYS = ['b1', 'b2'] as const;
type BorrowerKey = (typeof BORROWER_KEYS)[number];

function borrowerDocKey(borrower: BorrowerKey, key: string): string {
  return `${borrower}:${key}`;
}

/**
 * כל המפתחות האפשריים. הרשימה קבועה ואינה תלויה בפרופיל, כדי שסימון שנשמר
 * לפני שינוי אופן ההעסקה לא יימחק בקריאה הבאה מבסיס הנתונים.
 */
export const ALL_PRE_APPROVAL_DOCUMENT_KEYS: string[] = [
  ...SHARED_PRE_APPROVAL_DOCUMENTS.map((doc) => doc.key),
  ...BORROWER_KEYS.flatMap((borrower) =>
    EMPLOYMENT_TYPES.flatMap((type) =>
      EMPLOYMENT_DOCUMENTS[type].map((doc) => borrowerDocKey(borrower, doc.key))
    )
  ),
];

export interface DocumentGroup {
  id: string;
  title: string;
  /** אופן ההעסקה שהרשימה נגזרת ממנו, כשהיא אישית ללווה */
  subtitle: string | null;
  documents: StageDocument[];
}

/**
 * תיק המסמכים לאישור עקרוני, מחולק לפי לווה.
 *
 * לכל לווה נדרשים מסמכים אחרים לפי אופן ההעסקה שלו, ולכן זוג שבו אחד שכיר
 * והשני עצמאי מקבל שתי רשימות נפרדות ולא רשימה מאוחדת שאי אפשר לעקוב אחריה.
 */
export function preApprovalDocumentGroups(data: PlanData): DocumentGroup[] {
  const profile = data.ANALYSIS;
  const couple = profile.household === 'COUPLE';

  const personal = (borrower: BorrowerKey, type: EmploymentType | null, title: string) => ({
    id: borrower,
    title,
    subtitle: type ? EMPLOYMENT_LABELS[type] : null,
    documents: type
      ? EMPLOYMENT_DOCUMENTS[type].map((doc) => ({
          ...doc,
          key: borrowerDocKey(borrower, doc.key),
        }))
      : [],
  });

  return [
    {
      id: 'shared',
      title: 'מסמכי משק הבית והעסקה',
      subtitle: null,
      documents: SHARED_PRE_APPROVAL_DOCUMENTS,
    },
    personal('b1', profile.employmentType, couple ? 'מסמכים של לווה 1' : 'מסמכים לפי אופן ההעסקה'),
    ...(couple ? [personal('b2', profile.partnerEmploymentType, 'מסמכים של לווה 2')] : []),
  ];
}

/** כל המסמכים שנדרשים בפועל מהתיק הזה */
export function preApprovalDocuments(data: PlanData): StageDocument[] {
  return preApprovalDocumentGroups(data).flatMap((group) => group.documents);
}

/** מסלול בתוך סל אחיד */
export interface UniformBasketTrack {
  type: MortgageTrackType;
  /** חלקו של המסלול מסך המשכנתא */
  share: number;
  variablePeriod?: number;
}

export interface UniformBasket {
  id: string;
  name: string;
  shortName: string;
  description: string;
  tracks: UniformBasketTrack[];
}

/**
 * שלושת הסלים האחידים שבנק ישראל מחייב כל בנק להציע. הם מוצגים באותו הרכב
 * בכל הבנקים, ולכן הם הבסיס היחיד שמאפשר להשוות בין הצעות — ומכאן שהריביות
 * שהתקבלו עליהם באישור העקרוני הן נקודת הפתיחה של המכרז ושל בניית התמהיל.
 */
export const UNIFORM_BASKETS: readonly UniformBasket[] = [
  {
    id: 'fixed',
    name: 'סל 1 — 100% קבועה לא צמודה',
    shortName: 'סל 1',
    description: 'כל המשכנתא בקל"צ. ההחזר ידוע מראש ואינו משתנה לאורך התקופה.',
    tracks: [{ type: 'fixed_unlinked', share: 1 }],
  },
  {
    id: 'balanced',
    name: 'סל 2 — 50% קבועה לא צמודה, 50% פריים',
    shortName: 'סל 2',
    description: 'חצי מהמשכנתא יציבה וחצי נעה עם ריבית בנק ישראל.',
    tracks: [
      { type: 'fixed_unlinked', share: 0.5 },
      { type: 'prime', share: 0.5 },
    ],
  },
  {
    id: 'thirds',
    name: 'סל 3 — שליש קל"צ, שליש פריים, שליש משתנה',
    shortName: 'סל 3',
    description: 'פיזור בין שלושה סוגי ריבית, כולל משתנה לא צמודה כל 5 שנים.',
    tracks: [
      { type: 'fixed_unlinked', share: 1 / 3 },
      { type: 'prime', share: 1 / 3 },
      { type: 'variable_unlinked', share: 1 / 3, variablePeriod: 5 },
    ],
  },
];

export function uniformBasket(basketId: string): UniformBasket | null {
  return UNIFORM_BASKETS.find((basket) => basket.id === basketId) ?? null;
}

/** סל ריק, לפני שהלקוח הזין את הריביות שקיבל */
export function emptyBasket(basketId: string): PreApprovalBasket {
  return {
    basketId,
    rates: {},
    mixKey: null,
    mixRecordId: null,
    monthlyPayment: null,
    averageRate: null,
    totalPaid: null,
  };
}

/** הריבית שהוזנה למסלול, ואם לא הוזנה — ריבית השוק הנוכחית כברירת מחדל */
export function basketRate(basket: PreApprovalBasket | null, track: UniformBasketTrack): number {
  const entered = basket?.rates[track.type];
  return entered !== undefined ? entered : DEFAULT_INTEREST_RATES[track.type];
}

/** האם כל הריביות של הסל הוזנו */
export function basketIsFilled(basket: PreApprovalBasket | null, uniform: UniformBasket): boolean {
  if (!basket) return false;
  return uniform.tracks.every((track) => typeof basket.rates[track.type] === 'number');
}

/** הסל הזול ביותר מבין הסלים שכבר חושבו — בסיס ההשוואה במכרז הריביות */
export function bestBasket(data: PreApprovalData): PreApprovalBasket | null {
  const priced = data.baskets.filter((basket) => (basket.monthlyPayment ?? 0) > 0);
  if (priced.length === 0) return null;
  return priced.reduce((best, basket) =>
    (basket.monthlyPayment ?? 0) < (best.monthlyPayment ?? 0) ? basket : best
  );
}

export interface ProfileRequirement {
  key: string;
  label: string;
  ok: boolean;
}

/**
 * הפרטים מהפרופיל הפיננסי שבלעדיהם הבנק לא קולט בקשה לאישור עקרוני. השלב
 * השני מציג את הרשימה הזו כדי שהלקוח ישלים בשלב הראשון מה שחסר, במקום להגיע
 * לבנק עם תיק חלקי.
 */
export function preApprovalRequirements(data: PlanData): ProfileRequirement[] {
  return profileRequirements(data.ANALYSIS);
}

/** הפרטים שהפרופיל הפיננסי חייב להכיל, ומה מהם כבר הוזן */
export function profileRequirements(profile: AnalysisData): ProfileRequirement[] {
  const couple = profile.household === 'COUPLE';

  const items: ProfileRequirement[] = [
    { key: 'dealType', label: 'סוג העסקה', ok: profile.dealType !== null },
    { key: 'propertyValue', label: 'מחיר הנכס', ok: (profile.propertyValue ?? 0) > 0 },
    { key: 'equity', label: 'ההון העצמי לעסקה', ok: (profile.equity ?? 0) > 0 },
    {
      key: 'income',
      label: couple ? 'הכנסה חודשית של לווה 1' : 'הכנסה חודשית נטו',
      ok: (profile.income ?? 0) > 0,
    },
    {
      key: 'age',
      label: couple ? 'גיל לווה 1' : 'גיל הלווה',
      ok: (profile.age ?? 0) > 0,
    },
    {
      key: 'employmentType',
      label: couple ? 'אופן ההעסקה של לווה 1' : 'אופן ההעסקה',
      ok: profile.employmentType !== null,
    },
  ];

  if (couple) {
    items.push(
      { key: 'partnerIncome', label: 'הכנסה חודשית של לווה 2', ok: (profile.partnerIncome ?? 0) > 0 },
      { key: 'partnerAge', label: 'גיל לווה 2', ok: (profile.partnerAge ?? 0) > 0 },
      {
        key: 'partnerEmploymentType',
        label: 'אופן ההעסקה של לווה 2',
        ok: profile.partnerEmploymentType !== null,
      }
    );
  }

  return items;
}

/**
 * סכום המשכנתא שעליו מוגשת הבקשה: מה שהבנק אישר בפועל, ועד אז ההפרש בין מחיר
 * הנכס להון העצמי כפי שהוזנו בפרופיל. זהו גם הסכום שממנו נבנים הסלים האחידים.
 */
export function preApprovalAmount(data: PlanData): number | null {
  const approved = data.APPLICATIONS.approvedAmount;
  if (approved !== null && approved > 0) return approved;
  return analyzeProfile(data.ANALYSIS).requiredLoan || null;
}

/** האם הפרופיל שלם דיו כדי להגיש בקשה לאישור עקרוני */
export function profileReadyForPreApproval(data: PlanData): boolean {
  return preApprovalRequirements(data).every((item) => item.ok);
}

export const SIGNING_CHECKS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'rates_match', label: 'הריביות בחוזה זהות לריביות שסוכמו במכרז' },
  { key: 'tracks_match', label: 'חלוקת המסלולים והסכומים תואמת לתמהיל שאושר' },
  { key: 'schedule_match', label: 'לוח הסילוקין של הבנק תואם לחישוב שלנו' },
  { key: 'fees_checked', label: 'נבדקו עמלות פתיחת תיק, שמאות ורישום' },
  { key: 'insurance_ready', label: 'ביטוח חיים וביטוח מבנה הופקו ומאושרים' },
  { key: 'linkage_checked', label: 'שיטות ההצמדה והעדכון בכל מסלול אומתו' },
];

// ───────────────────────────── חישובים נגזרים ─────────────────────────────

/**
 * יחס ההחזר שהבנקים עובדים לפיו. מעל 40% הבקשה כמעט תמיד נדחית, ומעל 35%
 * החיתום מחמיר — ולכן אלה שני הסימנים שמוצגים ללקוח.
 */
export const REPAYMENT_RATIO_LIMIT = 40;
export const REPAYMENT_RATIO_COMFORT = 35;

/** תקרת המימון באחוזים לפי סוג העסקה שנבחר */
export function dealMaxLtv(dealType: DealType | null): number {
  return MAX_LTV_PERCENT[dealType ?? 'first_home'];
}

/** סכום המשכנתא הגבוה ביותר שמותר לנכס ולסוג העסקה */
export function dealMaxMortgage(propertyValue: number, dealType: DealType | null): number {
  if (!Number.isFinite(propertyValue) || propertyValue <= 0) return 0;
  return Math.round((propertyValue * dealMaxLtv(dealType)) / 100);
}

/**
 * מחיר הנכס המרבי שאפשר לרכוש עם ההון העצמי שהוזן, לפי תקרת המימון של סוג
 * העסקה. בלי הון עצמי או בלי סוג עסקה אין מה לחשב.
 */
export function maxPropertyForEquity(
  equity: number | null,
  dealType: DealType | null
): number | null {
  if (!dealType || equity === null || !Number.isFinite(equity) || equity < 0) return null;
  const minEquityRatio = 1 - dealMaxLtv(dealType) / 100;
  if (minEquityRatio <= 0) return null;
  return Math.round(equity / minEquityRatio);
}

/** חיתוך סכום המשכנתא לתקרת סוג העסקה — אי אפשר לחרוג ממנה גם בהזנה ידנית */
export function clampDealMortgage(
  amount: number,
  propertyValue: number,
  dealType: DealType | null
): number {
  const max = dealMaxMortgage(propertyValue, dealType);
  if (!Number.isFinite(amount) || amount <= 0 || max <= 0) return 0;
  return Math.min(Math.round(amount), max);
}

/**
 * סכום המשכנתא כשמחיר הנכס מוזן: ההפרש מההון העצמי, ובלי הון עצמי — המימון
 * המרבי לסוג העסקה. תמיד נחתך לתקרה.
 */
export function mortgageFromProperty(
  propertyValue: number,
  equity: number | null,
  dealType: DealType | null
): number | null {
  if (propertyValue <= 0) return null;
  const max = dealMaxMortgage(propertyValue, dealType);
  const needed = equity !== null ? Math.max(0, propertyValue - equity) : max;
  return clampDealMortgage(needed, propertyValue, dealType);
}

/** סכום המשכנתא מאחוז מימון שהלקוח בחר, בתוך תקרת סוג העסקה */
export function mortgageFromLtvPercent(
  propertyValue: number,
  ltvPercent: number,
  dealType: DealType | null
): number | null {
  if (propertyValue <= 0) return null;
  const capped = Math.min(Math.max(0, ltvPercent), dealMaxLtv(dealType));
  return clampDealMortgage((propertyValue * capped) / 100, propertyValue, dealType);
}

export function ltvPercentOf(propertyValue: number, mortgageAmount: number): number | null {
  if (propertyValue <= 0) return null;
  return Math.round((mortgageAmount / propertyValue) * 1000) / 10;
}

/** החזר חודשי בשיטת שפיצר */
export function annuityPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate <= 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export interface AnalysisResult {
  totalIncome: number;
  /** ההכנסה הפנויה אחרי הוצאות והחזרי הלוואות קיימות */
  disposableIncome: number;
  /** תקרת ההחזר לפי יחס החזר של 40% מההכנסה */
  maxMonthlyPayment: number;
  requiredLoan: number;
  /** ההון העצמי המינימלי לפי תקרת המימון של סוג העסקה */
  requiredEquity: number;
  equityGap: number;
  ltv: number | null;
  maxLtv: number;
  estimatedMonthlyPayment: number;
  repaymentRatio: number | null;
  /** האם הוזן מספיק כדי שהמספרים יהיו משמעותיים */
  hasInputs: boolean;
  ltvOk: boolean;
  ratioOk: boolean;
}

/**
 * המספרים שמניעים את שלב הניתוח, ואת ההמלצות בשלבים שאחריו.
 *
 * הריבית לצורך ההערכה היא הקל"צ המרכזית — קירוב שמרני שנועד לתת סדר גודל
 * לפני שנבנה תמהיל אמיתי בשלב הבא.
 */
export function analyzeProfile(data: AnalysisData): AnalysisResult {
  const totalIncome = (data.income ?? 0) + (data.household === 'COUPLE' ? data.partnerIncome ?? 0 : 0);
  const disposableIncome = totalIncome - (data.expenses ?? 0) - (data.existingLoans ?? 0);

  const propertyValue = data.propertyValue ?? 0;
  const equity = data.equity ?? 0;
  const maxLtv = MAX_LTV_PERCENT[data.dealType ?? 'first_home'];

  const requiredLoan = mortgageFromProperty(propertyValue, data.equity, data.dealType) ?? 0;
  const requiredEquity = propertyValue > 0 ? propertyValue * (1 - maxLtv / 100) : 0;
  const equityGap = Math.max(0, requiredEquity - equity);
  const ltv = propertyValue > 0 ? (requiredLoan / propertyValue) * 100 : null;

  const estimatedMonthlyPayment = annuityPayment(
    requiredLoan,
    INTEREST_RATES.fixed_unlinked,
    data.years || DEFAULT_PLAN_YEARS
  );

  // יחס ההחזר בבנק נמדד מול ההכנסה אחרי הלוואות קיימות
  const ratioBase = totalIncome - (data.existingLoans ?? 0);
  const repaymentRatio =
    ratioBase > 0 ? (estimatedMonthlyPayment / ratioBase) * 100 : null;

  return {
    totalIncome,
    disposableIncome,
    // תקרת ההחזר לבניית תמהיל: 40% מההכנסה הפנויה של היחיד, או מסכום ההכנסות הפנויות של הזוג
    maxMonthlyPayment: Math.max(0, disposableIncome * (REPAYMENT_RATIO_LIMIT / 100)),
    requiredLoan,
    requiredEquity,
    equityGap,
    ltv,
    maxLtv,
    estimatedMonthlyPayment,
    repaymentRatio,
    hasInputs: totalIncome > 0 && propertyValue > 0,
    ltvOk: ltv === null || ltv <= maxLtv + 0.01,
    ratioOk: repaymentRatio === null || repaymentRatio <= REPAYMENT_RATIO_LIMIT,
  };
}

/** ההצעה שנבחרה במכרז, אם נבחרה */
export function winningOffer(data: AuctionData): BankOffer | null {
  return data.offers.find((offer) => offer.id === data.winnerOfferId) ?? null;
}

// ───────────────────────────── השלמת שלבים ─────────────────────────────

/** האם כלי בניית הפרופיל הגיע לסיום — בלי מסך תוצאות של כושר החזר */
export function isPlanningProfileDone(step?: string): boolean {
  return step === 'profile-complete' || step === 'results';
}

/**
 * מה חסר בפרופיל הפיננסי. מי שעדיין בבדיקת היתכנות אינו יכול לסגור את השלב:
 * בלי נכס קונקרטי אין על מה להגיש בקשה לאישור עקרוני.
 */
export function analysisMissing(profile: AnalysisData): string[] {
  if (!profile.intent) return ['בחירת נקודת הפתיחה'];
  if (profile.intent === 'FEASIBILITY') {
    return ['בדיקת ההיתכנות, וחזרה לכאן אחרי שנמצא נכס'];
  }
  return profileRequirements(profile)
    .filter((item) => !item.ok)
    .map((item) => item.label);
}

/**
 * האם השלב מוכן לסגירה. אלה הדרישות המינימליות שבלעדיהן השלב הבא יעבוד על
 * נתונים חסרים, ולכן הן נבדקות גם בשרת ולא רק בטופס.
 */
export function stageIsComplete(stage: PlanStageId, data: PlanData): boolean {
  switch (stage) {
    case 'ANALYSIS':
      return analysisMissing(data.ANALYSIS).length === 0;
    case 'MIX':
      return Boolean(data.MIX.mixRecordId || data.MIX.mixKey);
    /** שלב האישור העקרוני נסגר רק כשהלקוח מסמן שהאישור בידו */
    case 'APPLICATIONS': {
      const preApproval = data.APPLICATIONS;
      return (
        profileReadyForPreApproval(data) && preApproval.bank !== null && preApproval.approved
      );
    }
    case 'AUCTION':
      return winningOffer(data.AUCTION) !== null;
    case 'SIGNING':
      return (
        Boolean(data.SIGNING.bank) &&
        SIGNING_CHECKS.every((check) => data.SIGNING.checklist[check.key])
      );
    default:
      return false;
  }
}

/** מה חסר כדי לסגור את השלב — הטקסט שמוצג ללקוח מתחת לכפתור */
export function missingForStage(stage: PlanStageId, data: PlanData): string[] {
  const missing: string[] = [];

  switch (stage) {
    case 'ANALYSIS':
      missing.push(...analysisMissing(data.ANALYSIS));
      break;
    case 'MIX':
      if (!data.MIX.mixRecordId && !data.MIX.mixKey) missing.push('שמירת תמהיל בכלי התכנון');
      break;
    case 'APPLICATIONS': {
      const openProfile = preApprovalRequirements(data).filter((item) => !item.ok);
      if (openProfile.length > 0) {
        missing.push(
          `פרטים מהפרופיל הפיננסי: ${openProfile.map((item) => item.label).join(', ')}`
        );
      }
      if (!data.APPLICATIONS.bank) missing.push('הבנק שאליו מוגשת הבקשה');
      if (!data.APPLICATIONS.approved) missing.push('סימון שהאישור העקרוני התקבל');
      break;
    }
    case 'AUCTION':
      if (data.AUCTION.offers.length === 0) missing.push('הצעה אחת לפחות');
      else missing.push('בחירת ההצעה הזוכה');
      break;
    case 'SIGNING': {
      if (!data.SIGNING.bank) missing.push('הבנק שאיתו נחתם');
      const open = SIGNING_CHECKS.filter((check) => !data.SIGNING.checklist[check.key]).length;
      if (open > 0) missing.push(`${open} בדיקות חתימה`);
      break;
    }
  }

  return missing;
}

/** אחוז ההתקדמות בתהליך לפי מספר השלבים שנסגרו */
export function planProgress(statuses: Record<PlanStageId, PlanStageStatus>): number {
  const done = PLAN_STAGES.filter((stage) => statuses[stage] === 'COMPLETED').length;
  return Math.round((done / PLAN_STAGES.length) * 100);
}

export interface PlanSnapshot {
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  monthlyPayment: number | null;
}

/**
 * המספרים שמוצגים על כרטיס התהליך. הם נלקחים מהשלב המתקדם ביותר שיש בו נתון,
 * כך שכרטיס של תהליך שהסתיים מציג את התנאים שנחתמו בפועל ולא את ההערכה מהתחלה.
 */
export function planSnapshot(data: PlanData): PlanSnapshot {
  const analysis = analyzeProfile(data.ANALYSIS);
  const winner = winningOffer(data.AUCTION);
  const preApproval = data.APPLICATIONS;
  const basket = bestBasket(preApproval);

  const mortgageAmount =
    data.SIGNING.finalAmount ??
    data.MIX.totalAmount ??
    preApproval.approvedAmount ??
    (analysis.requiredLoan || null);

  const monthlyPayment =
    data.SIGNING.finalMonthlyPayment ??
    winner?.monthlyPayment ??
    data.MIX.monthlyPayment ??
    basket?.monthlyPayment ??
    (analysis.estimatedMonthlyPayment || null);

  return {
    propertyValue: data.MIX.propertyValue ?? data.ANALYSIS.propertyValue,
    propertyAddress:
      data.MIX.propertyAddress.trim() || data.ANALYSIS.propertyAddress.trim() || null,
    mortgageAmount,
    monthlyPayment,
  };
}

// ───────────────────────────── המלצות דינמיות ─────────────────────────────

export type HintTone = 'info' | 'warning' | 'success';

export interface StageHint {
  /** מזהה הכלי בקטלוג הכלים של הפלטפורמה */
  toolId: string;
  reason: string;
  tone: HintTone;
}

const shekel = (value: number) =>
  `₪${Math.round(value).toLocaleString('he-IL')}`;

/**
 * הכלים שכדאי לפתוח עכשיו, לפי מה שהוזן עד כה.
 *
 * אלה כלים שאינם חובה למעבר לשלב הבא — הם עולים רק כשהנתונים מצדיקים אותם,
 * כדי שההצעה תהיה רלוונטית ולא רשימה קבועה שהלקוח לומד להתעלם ממנה.
 */
export function stageHints(stage: PlanStageId, data: PlanData): StageHint[] {
  const hints: StageHint[] = [];
  const analysis = analyzeProfile(data.ANALYSIS);

  if (stage === 'ANALYSIS') {
    if ((data.ANALYSIS.existingLoans ?? 0) > 0) {
      hints.push({
        toolId: 'consumer-loans',
        reason: `יש לכם ${shekel(data.ANALYSIS.existingLoans ?? 0)} החזר חודשי על הלוואות. סגירה או איחוד לפני הפנייה לבנק מגדילים את יכולת ההחזר שיאשרו לכם.`,
        tone: (data.ANALYSIS.existingLoans ?? 0) > analysis.totalIncome * 0.1 ? 'warning' : 'info',
      });
    }
    if (analysis.equityGap > 0) {
      hints.push({
        toolId: 'equity',
        reason: `חסרים ${shekel(analysis.equityGap)} בהון העצמי כדי לעמוד בתקרת המימון של ${analysis.maxLtv}%. בנו לוח זמנים למקורות ההון.`,
        tone: 'warning',
      });
    } else if ((data.ANALYSIS.propertyValue ?? 0) > 0) {
      hints.push({
        toolId: 'equity',
        reason: 'מעבר למקדמה יש מס רכישה, עו״ד, תיווך ושיפוץ. כדאי לפרוס את כל התשלומים על ציר זמן.',
        tone: 'info',
      });
    }
    if (analysis.repaymentRatio !== null && analysis.repaymentRatio > REPAYMENT_RATIO_COMFORT) {
      hints.push({
        toolId: 'financial-dynamics',
        reason: `יחס ההחזר המשוער הוא ${analysis.repaymentRatio.toFixed(1)}% — גבוה מהאזור הנוח. בדקו איך זה נראה בתזרים המשפחתי לאורך שנים.`,
        tone: 'warning',
      });
    }
    if (!analysis.hasInputs && data.ANALYSIS.intent !== 'FEASIBILITY') {
      hints.push({
        toolId: 'affordability',
        reason: 'עוד לא יודעים לאיזה נכס לכוון? הכלי מחשב את שווי הנכס המקסימלי מההכנסות וההון העצמי שלכם.',
        tone: 'info',
      });
    }
  }

  if (stage === 'MIX') {
    hints.push({
      toolId: 'uniform-mixes',
      reason:
        'הסלים האחידים עם הריביות שקיבלתם כבר שמורים כתמהילים. השוו אליהם כל תמהיל שתבנו — זה הרף שצריך לשפר.',
      tone: 'info',
    });
    if (data.MIX.mixRecordId) {
      hints.push({
        toolId: 'simulations',
        reason: 'יש לכם תמהיל. בדקו מה קורה לו בעליית ריבית ומה חוסך פירעון מוקדם עתידי.',
        tone: 'success',
      });
    }
    if (analysis.repaymentRatio !== null && analysis.repaymentRatio > REPAYMENT_RATIO_LIMIT) {
      hints.push({
        toolId: 'affordability',
        reason: 'ההחזר המשוער חורג מיחס ההחזר המותר. שקלו הארכת תקופה או נכס בשווי נמוך יותר.',
        tone: 'warning',
      });
    }
  }

  if (stage === 'APPLICATIONS') {
    const open = preApprovalDocuments(data).filter(
      (doc) => doc.required !== false && !data.APPLICATIONS.documents[doc.key]
    ).length;
    if (open > 0) {
      hints.push({
        toolId: 'documents',
        reason: `${open} מסמכי חובה עדיין לא נאספו. הבנק לא פותח בקשה לאישור עקרוני בלי התיק המלא.`,
        tone: 'info',
      });
    }
    if (data.APPLICATIONS.approved) {
      const filled = data.APPLICATIONS.baskets.filter((basket) => {
        const uniform = uniformBasket(basket.basketId);
        return uniform ? basketIsFilled(basket, uniform) : false;
      }).length;
      if (filled < UNIFORM_BASKETS.length) {
        hints.push({
          toolId: 'uniform-mixes',
          reason: `האישור העקרוני בידכם. הזינו את הריביות שקיבלתם לכל שלושת הסלים האחידים (${filled}/${UNIFORM_BASKETS.length}) — זה בסיס ההשוואה במכרז.`,
          tone: 'warning',
        });
      }
    }
    if ((data.ANALYSIS.existingLoans ?? 0) > 0 && !data.APPLICATIONS.approved) {
      hints.push({
        toolId: 'consumer-loans',
        reason: `${shekel(data.ANALYSIS.existingLoans ?? 0)} החזר חודשי על הלוואות ייכנסו לחישוב החיתום. סגירה לפני ההגשה מגדילה את הסכום שיאשרו.`,
        tone: 'info',
      });
    }
  }

  if (stage === 'AUCTION') {
    if (data.AUCTION.offers.length > 0 && data.AUCTION.offers.length < 3) {
      hints.push({
        toolId: 'saved-mixes',
        reason: 'עם פחות משלוש הצעות קשה להתמחר. הזינו את כל ההצעות שקיבלתם כדי לראות מי באמת הזול ביותר.',
        tone: 'warning',
      });
    }
    hints.push({
      toolId: 'advisor-workspace',
      reason:
        'בקשו מכל בנק הצעה על שלושת הסלים האחידים — כך ההשוואה נעשית על אותו בסיס ולא לפי ריבית מוצהרת.',
      tone: 'info',
    });
  }

  if (stage === 'SIGNING') {
    hints.push({
      toolId: 'mortgage-dashboard',
      reason: 'אחרי החתימה הדשבורד עוקב אחרי היתרות, הריבית המשוקללת והתחזית להמשך.',
      tone: 'success',
    });
    hints.push({
      toolId: 'refinance',
      reason: 'שמרו את התנאים שנחתמו. בעוד כמה שנים תוכלו לבדוק מולם אם מיחזור משתלם.',
      tone: 'info',
    });
  }

  return hints;
}
