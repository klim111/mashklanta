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
import {
  AMORTIZATION_TYPES,
  DEAL_TYPES,
  MAX_LTV_PERCENT,
  MORTGAGE_BANKS,
  TRACK_TYPES,
} from '@/components/mortgage-advisor/types';
import type { DealType, MortgageTrack } from '@/components/mortgage-advisor/types';
import type { RefinanceGoal } from './refinance';
import {
  clampCombinedLtv,
  dealTypeForCombinedLtv,
} from '@/components/mortgage-advisor/propertyContext';
import {
  calculateMaxProperty,
  defaultMortgagePlanningUserData,
  getAffordabilityInputs,
  type MortgagePlanningUserData,
} from './mortgage-affordability';
import { parseFormattedNumberInput } from './currency';
import {
  ALL_SIGNING_DOCUMENT_KEYS,
  registryOfScenario,
  signingDealType,
  signingDocumentKey,
  signingRegistry,
  signingScenario,
} from './signing-documents';

/**
 * סדר השלבים בתהליך. הבקשה לאישור עקרוני קודמת לבניית התמהיל, כי הריביות
 * שהבנק נוקב באישור העקרוני הן הבסיס שממנו נבנים התמהילים. המכרז מגיע אחרי
 * התמהיל — מתמחרים את מה שנבנה, לא רק את הסלים האחידים.
 *
 * הסדר בפועל: פרופיל, בניית תמהיל, אישור עקרוני, מכרז ריביות, חתימה. המזהים
 * הם ערכי enum בבסיס הנתונים ולכן נשארו כפי שהם: `APPLICATIONS` הוא שלב האישור
 * העקרוני ו-`AUCTION` הוא מכרז הריביות. סדר ה-enum אינו קובע את סדר התהליך.
 */
export const PLAN_STAGES = ['ANALYSIS', 'MIX', 'APPLICATIONS', 'AUCTION', 'SIGNING'] as const;
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

export function stageIndex(stage: PlanStageId, flow: PlanFlow = NEW_PLAN_FLOW): number {
  const index = flowStages(flow).indexOf(stage);
  return index < 0 ? 0 : index;
}

/** מספר השלב בתהליך (1–5), לפי הסדר בפועל — לא לפי המספר הקבוע בעמוד "איך זה עובד" */
export function planStageNumber(stage: PlanStageId, flow: PlanFlow = NEW_PLAN_FLOW): number {
  return stageIndex(stage, flow) + 1;
}

/** שלבים קודמים שטרם נסגרו — בלי אלה אי אפשר באמת לעבוד בשלב הנוכחי */
export function unfinishedPrerequisites(
  stage: PlanStageId,
  statuses: Record<PlanStageId, PlanStageStatus>,
  flow: PlanFlow = NEW_PLAN_FLOW
): PlanStageId[] {
  const stages = flowStages(flow);
  const idx = stageIndex(stage, flow);
  return stages.slice(0, idx).filter((prior) => statuses[prior] !== 'COMPLETED');
}

// ───────────────────────────── סוג התהליך ─────────────────────────────

/**
 * סוג התהליך: משכנתא חדשה, או מיחזור של משכנתא קיימת.
 *
 * במיחזור סדר השלבים שונה: בניית התמהיל (כלי המיחזור) היא הראשונה, ואחריה —
 * לפי סוג המיחזור — או שלושה שלבים קצרים מול הבנק שבו מנוהלת המשכנתא
 * (פנימי), או אותם חמישה שלבים של משכנתא חדשה (חיצוני). הסוג נגזר מנתוני שלב
 * התמהיל, ולכן אינו דורש עמודה נפרדת בבסיס הנתונים.
 */
export type PlanKind = 'NEW' | 'REFINANCE';

/** פנימי — באותו בנק שבו המשכנתא מנוהלת; חיצוני — בבנק אחר */
export type RefinanceMode = 'INTERNAL' | 'EXTERNAL';
export const REFINANCE_MODES = ['INTERNAL', 'EXTERNAL'] as const;

export function isRefinanceMode(value: unknown): value is RefinanceMode {
  return typeof value === 'string' && (REFINANCE_MODES as readonly string[]).includes(value);
}

export interface PlanFlow {
  kind: PlanKind;
  /** null — מיחזור שטרם נבחר בו בין פנימי לחיצוני */
  refinanceMode: RefinanceMode | null;
}

export const NEW_PLAN_FLOW: PlanFlow = { kind: 'NEW', refinanceMode: null };

/** מיחזור פנימי: התמהיל, הגשה לבנק הנוכחי ואימות ההצעה שלו */
export const REFINANCE_INTERNAL_STAGES = ['MIX', 'APPLICATIONS', 'AUCTION'] as const;
/** מיחזור חיצוני: כמו משכנתא חדשה, אבל התמהיל קודם לפרופיל */
export const REFINANCE_EXTERNAL_STAGES = ['MIX', 'ANALYSIS', 'APPLICATIONS', 'AUCTION', 'SIGNING'] as const;

/** סדר השלבים בפועל של תהליך, לפי סוגו */
export function flowStages(flow: PlanFlow = NEW_PLAN_FLOW): readonly PlanStageId[] {
  if (flow.kind !== 'REFINANCE') return PLAN_STAGES;
  return flow.refinanceMode === 'INTERNAL' ? REFINANCE_INTERNAL_STAGES : REFINANCE_EXTERNAL_STAGES;
}

/** סוג התהליך כפי שהוא נגזר מנתוני השלבים */
export function planFlowOf(data: Pick<PlanData, 'MIX'>): PlanFlow {
  const refinance = data.MIX.refinance;
  if (!refinance) return NEW_PLAN_FLOW;
  return { kind: 'REFINANCE', refinanceMode: refinance.mode };
}

/** השלב שבא אחרי שלב נתון בתהליך — null בשלב האחרון */
export function nextPlanStage(stage: PlanStageId, flow: PlanFlow = NEW_PLAN_FLOW): PlanStageId | null {
  const stages = flowStages(flow);
  const idx = stages.indexOf(stage);
  if (idx < 0) return null;
  return stages[idx + 1] ?? null;
}

/** השלב שלפני שלב נתון — null בשלב הראשון */
export function previousPlanStage(stage: PlanStageId, flow: PlanFlow = NEW_PLAN_FLOW): PlanStageId | null {
  const stages = flowStages(flow);
  const idx = stages.indexOf(stage);
  return idx > 0 ? stages[idx - 1] : null;
}

// ───────────────────────────── נתוני השלבים ─────────────────────────────

export type Household = 'SINGLE' | 'COUPLE';
/** זוג: חשבון בנק משותף או חשבון נפרד לכל לווה */
export type BankAccountMode = 'JOINT' | 'SEPARATE';

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

/**
 * המסכים הפנימיים של שלב הפרופיל — אחד בכל פעם, מההסבר על השלב ועד הדוח.
 *
 * השלב נפתח בהסבר ולא בשאלה: לפני שמזינים נתונים כדאי לדעת מה השלב עושה ומה
 * יוצא ממנו. השאלה אם כבר נמצא נכס עברה למסך הנכס והעסקה, שם היא נשאלת
 * במקומה. המסך האחרון הוא התוצר — דוח הפרופיל הפיננסי.
 */
/**
 * הדרך שבה הלקוח מטפל בתיק המסמכים.
 *
 * העלאה כאן היא ברירת המחדל, אבל אפשר גם לדלג: מי שמגיש לבנק בעצמו, ומי
 * שמעדיף להעלות בשלב האישור העקרוני, כשהתיק כבר נדרש בפועל.
 */
export const DOCUMENTS_MODES = ['UPLOAD', 'SELF_SUBMIT', 'LATER'] as const;
export type DocumentsMode = (typeof DOCUMENTS_MODES)[number];

export const DOCUMENTS_MODE_LABELS: Record<DocumentsMode, string> = {
  UPLOAD: 'מעלים את המסמכים כאן',
  SELF_SUBMIT: 'הגשה עצמאית לבנק',
  LATER: 'נעלה בשלב האישור העקרוני',
};

export const PROFILE_SCREENS = [
  'overview',
  'deal',
  'borrowers',
  'future',
  'documents',
  'report',
] as const;
export type ProfileScreen = (typeof PROFILE_SCREENS)[number];

/** הלוואה צרכנית של לווה אחד, כמו בכלי «מה אני יכול להרשות לעצמי» */
export interface ProfileLoan {
  id: string;
  monthlyPayment: number | null;
  /** הלוואה משותפת לשני בני הזוג — מוצגת על פני שתי העמודות */
  shared?: boolean;
  /**
   * כמה חודשים נותרו עד סיום ההלוואה. הלוואה שמסתיימת בתוך פחות מחמש שנים
   * משחררת החזר חודשי — ולכן היא סיבה למסלול גרייס בתמהיל.
   */
  remainingMonths?: number | null;
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
  /** איך הזוג מנהל חשבון בנק — רלוונטי רק כשהלווים הם זוג */
  bankAccountMode: BankAccountMode | null;
  /** שם הלווה — מחליף את «לווה 1» בכל מקום שבו הוא מוצג */
  firstName: string;
  lastName: string;
  /** שם בן/בת הזוג — מחליף את «לווה 2» */
  partnerFirstName: string;
  partnerLastName: string;
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
  /**
   * אחוז מימון ידני במצב משולב (1–75). כשהוא מוזן, המשכנתא והחישובים נגזרים
   * ממנו במקום מתקרת סוג העסקה או מההפרש להון העצמי.
   */
  targetLtvPercent: number | null;
  /** הבנק שבו מנוהל החשבון הראשי של הלווה — אליו מופקדת ההכנסה העיקרית */
  primaryBank: string | null;
  /** הבנק של החשבון הראשי של בן/בת הזוג */
  partnerPrimaryBank: string | null;
  propertyAddress: string;
  /** תקופת המשכנתא המבוקשת בשנים — נשמרת ברזולוציית חודשים (48–360) */
  years: number;
  futureLumpSums: FutureLumpSum[];
  /**
   * איך הלקוח בחר לטפל בתיק המסמכים: להעלות כאן, להגיש בעצמו לבנק, או לדחות
   * להעלאה בשלב האישור העקרוני.
   */
  documentsMode: DocumentsMode | null;
  /** תוספת חודשית צפויה להכנסה הפנויה, ובעוד כמה שנים */
  futureMonthlyIncrease: number | null;
  futureMonthlyIncreaseInYears: number | null;
  /**
   * תשובת הלקוח לשאלה אם צפויה עלייה בהכנסה הפנויה. השאלה נשאלת כשיחס ההחזר
   * קרוב למגבלה, כי תשובה חיובית פותחת מסלול גרייס בתמהיל.
   */
  expectsIncomeIncrease: boolean | null;
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
    profileScreen: carry?.profileScreen ?? 'overview',
    household: couple ? 'COUPLE' : 'SINGLE',
    bankAccountMode: couple ? (carry?.bankAccountMode ?? null) : null,
    firstName: carry?.firstName ?? '',
    lastName: carry?.lastName ?? '',
    partnerFirstName: couple ? carry?.partnerFirstName ?? '' : '',
    partnerLastName: couple ? carry?.partnerLastName ?? '' : '',
    primaryBank: carry?.primaryBank ?? null,
    partnerPrimaryBank: couple ? carry?.partnerPrimaryBank ?? null : null,
    age: parseInt(ageRaw, 10) || null,
    partnerAge: parseInt(partnerAgeRaw, 10) || null,
    income,
    partnerIncome,
    employmentType: carry?.employmentType ?? null,
    partnerEmploymentType: couple ? carry?.partnerEmploymentType ?? null : null,
    futureLumpSums: carry?.futureLumpSums ?? [],
    documentsMode: carry?.documentsMode ?? null,
    expectsIncomeIncrease: carry?.expectsIncomeIncrease ?? null,
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
    targetLtvPercent: carry?.targetLtvPercent ?? null,
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
  /** התמהיל שננעל כסופי למכרז מול הבנקים */
  isFinal: boolean;
  finalLocked: boolean;
  /**
   * נתוני המיחזור, כשהתהליך הוא מיחזור משכנתא קיימת. null — משכנתא חדשה.
   * זה מה שהופך תהליך לתהליך מיחזור: המשכנתא הנוכחית, התמהיל שנבנה למיחזור,
   * והבחירה בין מיחזור פנימי לחיצוני.
   */
  refinance: RefinanceMixData | null;
}

// ───────────────────────────── מיחזור ─────────────────────────────

/** מה ממחזרים: את כל המשכנתא, או מסלול אחד בלבד */
export type RefinanceScope = 'whole' | 'single';

/** תמהיל כפי שהוא נשמר בתהליך המיחזור — בדיוק מה שכלי המיחזור צריך כדי לשחזר אותו */
export interface RefinanceMixSnapshot {
  id: string;
  name: string;
  bank: string | null;
  totalAmount: number;
  tracks: MortgageTrack[];
}

/** המספרים של תמהיל, לכרטיסים ולסיכומים בלי לחשב לוח סילוקין מחדש */
export interface RefinanceFigures {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  averageRate: number;
  months: number;
}

export interface RefinanceMixData {
  /** הבנק שבו מנוהלת המשכנתא הנוכחית */
  bank: string;
  goal: RefinanceGoal;
  scope: RefinanceScope;
  /** המסלול שנבחר למיחזור, במיחזור מסלול בודד */
  selectedTrackId: string | null;
  /** המשכנתא הנוכחית כפי שהוזנה במסך הראשון של כלי המיחזור */
  currentMix: RefinanceMixSnapshot;
  /** התמהיל שנבנה למיחזור — מה שמוגש לבנק */
  refinancedMix: RefinanceMixSnapshot;
  current: RefinanceFigures;
  refinanced: RefinanceFigures;
  /** פנימי או חיצוני. null — טרם נבחר, והתהליך מציג את מסך הבחירה */
  mode: RefinanceMode | null;
  savedAt: string;
}

/** התמהיל למיחזור מקטין את ההחזר החודשי — המקרה שבו ההסבר על סוגי המיחזור מדגיש את החיסכון */
export function refinanceReducesPayment(refinance: RefinanceMixData): boolean {
  return refinance.refinanced.monthlyPayment < refinance.current.monthlyPayment - 1;
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
 * בקשה לאישור עקרוני שהוגשה לבנק מסוים.
 *
 * הלקוח שמגיש בעצמו פונה לכמה בנקים במקביל — כל אחד מהם נרשם כאן בנפרד, עם
 * המסמך שהתקבל ממנו. הבנקים שסומנו כאן הם אלה שנפתחים לתמחור בשלב המכרז.
 */
export interface BankPreApproval {
  bank: string;
  /** נשלחה בקשה לבנק הזה */
  submittedAt: string | null;
  /** האישור העקרוני התקבל מהבנק */
  approved: boolean;
  approvedAt: string | null;
  approvedAmount: number | null;
  /** שם הקובץ של האישור שהועלה לתיק התהליך */
  documentName: string | null;
  note: string;
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
  /**
   * הבקשות לפי בנק, כשהלקוח מגיש בעצמו. השדות `bank` ו-`approved` שמעל נשארים
   * הבנק המוביל של התהליך, כדי שכל מה שנשען עליהם ימשיך לעבוד כמו קודם.
   */
  bankApprovals: BankPreApproval[];
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

/**
 * ההצעה המתומחרת שנבחרה כתמהיל הסופי לחתימה.
 *
 * זה המבנה שנבחר בשלב 3, בריביות שבנק מסוים נתן עליו בשלב 4. משנבחר, הוא
 * המשכנתא של הלקוח: הוא מופיע באזור האישי כ"המשכנתא שלי", והוא מה שמאומת מול
 * מסמכי הבנק בשלב החתימה.
 */
export interface SignedMixChoice {
  /** מזהה התמהיל המתומחר */
  mixKey: string;
  /** מזהה הרשומה בבסיס הנתונים, אם נשמרה */
  mixRecordId: string | null;
  /** הבנק שתמחר אותו */
  bank: string;
  name: string;
  monthlyPayment: number | null;
  averageRate: number | null;
  totalInterest: number | null;
  totalPaid: number | null;
  months: number | null;
  /** מתי נבחר (ISO) */
  chosenAt: string;
}

/**
 * איך הלקוח בחר לעבור את שלב התמחור: לבד, או בליווי יועץ.
 *
 * עד שנבחר — השלב מציג רק את שתי האפשרויות, ושום דבר אחר. זו החלטה שמשנה את
 * כל המסך שאחריה, ולכן היא נשאלת ראשונה ולבדה.
 */
export type AuctionMode = 'self' | 'advisor';

/** שלב 4 — מכרז הריביות */
export interface AuctionData {
  /** null — עדיין לא נבחרה דרך, והשלב מציג את שתי האפשרויות בלבד */
  mode: AuctionMode | null;
  offers: BankOffer[];
  winnerOfferId: string | null;
  /** ההצעה המתומחרת שנבחרה כתמהיל הסופי לחתימה */
  signedMix: SignedMixChoice | null;
}

/** תת-המסכים של שלב החתימה, לפי הסדר שבו עוברים בהם */
export const SIGNING_SCREENS = ['overview', 'documents', 'verify'] as const;
export type SigningScreen = (typeof SIGNING_SCREENS)[number];

/** שלב 5 — החתימה בבנק */
export interface SigningData {
  bank: string | null;
  signingDate: string | null;
  finalAmount: number | null;
  finalMonthlyPayment: number | null;
  finalAverageRate: number | null;
  /** מפתח בדיקה מרשימת החתימה → האם אומתה */
  checklist: Record<string, boolean>;
  /** תת-המסך הפתוח: ההסבר על השלב, תיק המסמכים או אימות התנאים */
  screen: SigningScreen;
  /** תרחיש הרכישה, שקובע את רשימת המסמכים שהבנק ידרוש */
  dealTypeId: string | null;
  /** אופן רישום הזכויות, בעסקאות שבהן הוא מפצל את התרחישים */
  registryId: string | null;
  scenarioId: string | null;
  /** `${scenarioId}:${documentKey}` → האם המסמך נאסף */
  documents: Record<string, boolean>;
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
    profileScreen: 'overview',
    household: 'SINGLE',
    bankAccountMode: null,
    firstName: '',
    lastName: '',
    partnerFirstName: '',
    partnerLastName: '',
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
    targetLtvPercent: null,
    primaryBank: null,
    partnerPrimaryBank: null,
    propertyAddress: '',
    years: DEFAULT_PLAN_YEARS,
    futureLumpSums: [],
    documentsMode: null,
    expectsIncomeIncrease: null,
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
    isFinal: false,
    finalLocked: false,
    refinance: null,
  },
  APPLICATIONS: {
    bank: null,
    submittedAt: null,
    documents: {},
    approved: false,
    approvedAmount: null,
    validUntil: null,
    baskets: [],
    bankApprovals: [],
    note: '',
  },
  AUCTION: { mode: null, offers: [], winnerOfferId: null, signedMix: null },
  SIGNING: {
    bank: null,
    signingDate: null,
    finalAmount: null,
    finalMonthlyPayment: null,
    finalAverageRate: null,
    checklist: {},
    screen: 'overview',
    dealTypeId: null,
    registryId: null,
    scenarioId: null,
    documents: {},
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

function pickMortgageBank(value: unknown): string | null {
  const bank = pickBank(value);
  return bank && (MORTGAGE_BANKS as readonly string[]).includes(bank) ? bank : null;
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

function parseRefinanceTrack(value: unknown, index: number): MortgageTrack | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const type = typeof source.type === 'string' && source.type in TRACK_TYPES
    ? (source.type as MortgageTrack['type'])
    : 'fixed_unlinked';
  const amount = num(source.amount);
  if (amount === null || amount <= 0) return null;
  const amortization =
    typeof source.amortizationType === 'string' && source.amortizationType in AMORTIZATION_TYPES
      ? (source.amortizationType as MortgageTrack['amortizationType'])
      : 'spitzer';
  const paymentDay = num(source.paymentDay);
  const track: MortgageTrack = {
    id: typeof source.id === 'string' && source.id ? source.id : `refi-track-${index + 1}`,
    name: str(source.name) || `מסלול ${index + 1}`,
    type,
    amount,
    percentage: num(source.percentage) ?? 0,
    interestRate: num(source.interestRate) ?? DEFAULT_INTEREST_RATES[type] ?? 0,
    years: Math.max(1 / 12, num(source.years) ?? 0),
    amortizationType: amortization,
  };
  const spread = num(source.rateSpread);
  if (spread !== null) track.rateSpread = spread;
  const variablePeriod = num(source.variablePeriod);
  if (variablePeriod !== null) track.variablePeriod = variablePeriod;
  if (typeof source.endDate === 'string' && source.endDate.trim()) track.endDate = source.endDate.trim();
  if (paymentDay !== null) track.paymentDay = Math.min(28, Math.max(1, Math.round(paymentDay)));
  return track;
}

function parseRefinanceSnapshot(value: unknown, fallbackId: string): RefinanceMixSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const rows = Array.isArray(source.tracks) ? source.tracks : [];
  const tracks = rows.flatMap((row, index) => {
    const track = parseRefinanceTrack(row, index);
    return track ? [track] : [];
  });
  if (tracks.length === 0) return null;
  const fromTracks = tracks.reduce((sum, track) => sum + track.amount, 0);
  return {
    id: typeof source.id === 'string' && source.id ? source.id : fallbackId,
    name: str(source.name),
    bank: pickBank(source.bank),
    totalAmount: num(source.totalAmount) ?? fromTracks,
    tracks,
  };
}

function parseRefinanceFigures(value: unknown): RefinanceFigures {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    monthlyPayment: num(source.monthlyPayment) ?? 0,
    totalInterest: num(source.totalInterest) ?? 0,
    totalPaid: num(source.totalPaid) ?? 0,
    averageRate: num(source.averageRate) ?? 0,
    months: num(source.months) ?? 0,
  };
}

/**
 * נתוני המיחזור כפי שנשמרו. בלי בנק, בלי משכנתא נוכחית או בלי תמהיל למיחזור
 * אין מה לשחזר, ואז התהליך נקרא כתהליך של משכנתא חדשה.
 */
export function parseRefinanceMixData(value: unknown): RefinanceMixData | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const bank = pickBank(source.bank);
  const currentMix = parseRefinanceSnapshot(source.currentMix, 'refinance-current');
  const refinancedMix = parseRefinanceSnapshot(source.refinancedMix, 'refinance-mix');
  if (!bank || !currentMix || !refinancedMix) return null;

  return {
    bank,
    goal: source.goal === 'reduce_interest' ? 'reduce_interest' : 'reduce_payment',
    scope: source.scope === 'single' ? 'single' : 'whole',
    selectedTrackId: typeof source.selectedTrackId === 'string' ? source.selectedTrackId : null,
    currentMix,
    refinancedMix,
    current: parseRefinanceFigures(source.current),
    refinanced: parseRefinanceFigures(source.refinanced),
    mode: isRefinanceMode(source.mode) ? source.mode : null,
    savedAt: typeof source.savedAt === 'string' ? source.savedAt : new Date().toISOString(),
  };
}

/**
 * ההצעה שנבחרה לחתימה, כפי שהיא נשמרה. בלי מזהה תמהיל ובלי בנק אין מה לשחזר,
 * ולכן רשומה חלקית נקראת כאילו עוד לא נבחר דבר.
 */
function parseSignedMix(value: unknown): SignedMixChoice | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const mixKey = typeof source.mixKey === 'string' ? source.mixKey.trim() : '';
  const bank = pickBank(source.bank);
  if (!mixKey || !bank) return null;

  return {
    mixKey,
    mixRecordId: typeof source.mixRecordId === 'string' ? source.mixRecordId : null,
    bank,
    name: str(source.name) || 'התמהיל שנבחר לחתימה',
    monthlyPayment: num(source.monthlyPayment),
    averageRate: num(source.averageRate),
    totalInterest: num(source.totalInterest),
    totalPaid: num(source.totalPaid),
    months: num(source.months),
    chosenAt:
      typeof source.chosenAt === 'string' && source.chosenAt
        ? source.chosenAt
        : new Date().toISOString(),
  };
}

function pickSigningScreen(value: unknown): SigningScreen | null {
  return typeof value === 'string' && (SIGNING_SCREENS as readonly string[]).includes(value)
    ? (value as SigningScreen)
    : null;
}

function pickEmployment(value: unknown): EmploymentType | null {
  return EMPLOYMENT_TYPES.includes(value as EmploymentType) ? (value as EmploymentType) : null;
}

function pickIntent(value: unknown): ProfileIntent | null {
  return value === 'HAS_PROPERTY' || value === 'FEASIBILITY' ? value : null;
}

function pickProfileScreen(value: unknown): ProfileScreen | null {
  // תהליכים שנפתחו לפני שהשלב נפתח בהסבר נשמרו על מסך השאלה; הוא כבר לא קיים
  if (value === 'intent') return 'overview';
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
    const remaining = num(row.remainingMonths);
    return [
      {
        id: typeof row.id === 'string' && row.id ? row.id : rowId('loan'),
        monthlyPayment: num(row.monthlyPayment),
        shared: row.shared === true,
        remainingMonths: remaining !== null && remaining > 0 ? Math.round(remaining) : null,
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
        documentsMode: DOCUMENTS_MODES.includes(source.documentsMode as DocumentsMode)
          ? (source.documentsMode as DocumentsMode)
          : undefined,
        futureMonthlyIncrease: num(source.futureMonthlyIncrease),
        futureMonthlyIncreaseInYears: num(source.futureMonthlyIncreaseInYears),
        expectsIncomeIncrease:
          source.expectsIncomeIncrease === true
            ? true
            : source.expectsIncomeIncrease === false
              ? false
              : null,
        borrowerLoans: has('borrowerLoans') ? parseProfileLoans(source.borrowerLoans) : undefined,
        partnerLoans: has('partnerLoans') ? parseProfileLoans(source.partnerLoans) : undefined,
        bankAccountMode:
          source.bankAccountMode === 'SEPARATE'
            ? 'SEPARATE'
            : source.bankAccountMode === 'JOINT'
              ? 'JOINT'
              : undefined,
        primaryBank: pickMortgageBank(source.primaryBank) ?? undefined,
        partnerPrimaryBank: pickMortgageBank(source.partnerPrimaryBank) ?? undefined,
        targetLtvPercent:
          num(source.targetLtvPercent) !== null
            ? clampCombinedLtv(num(source.targetLtvPercent) as number)
            : undefined,
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
      const bankAccountMode: BankAccountMode | null = couple
        ? source.bankAccountMode === 'SEPARATE'
          ? 'SEPARATE'
          : source.bankAccountMode === 'JOINT'
            ? 'JOINT'
            : seed.bankAccountMode
        : null;
      const years = num(source.years);
      const dealTypeRaw = has('dealType')
        ? (DEAL_TYPES as Record<string, string>)[source.dealType as string]
          ? (source.dealType as DealType)
          : null
        : seed.dealType;
      const targetLtvRaw = has('targetLtvPercent')
        ? num(source.targetLtvPercent)
        : (seed.targetLtvPercent ?? null);
      const targetLtvPercent =
        targetLtvRaw !== null && targetLtvRaw > 0 ? clampCombinedLtv(targetLtvRaw) : null;
      const dealType =
        targetLtvPercent !== null ? dealTypeForCombinedLtv(targetLtvPercent, dealTypeRaw) : dealTypeRaw;
      const equity = has('equity') ? num(source.equity) : seed.equity;
      /*
        מחיר הנכס נשאר בדיוק כפי שהוזן. פעם הוא הוגבל כאן לפי ההון העצמי, וכך
        הזנת הון עצמי שינתה את מחיר הנכס למספר שהלקוח מעולם לא הקליד — ואיתו גם
        את ההון המינימלי הנדרש, שנגזר ממנו. הון עצמי שאינו מספיק אינו שגיאה
        בנתון אלא פער שצריך להציג, ומסך הנכס מציג אותו.
      */
      const propertyValue = has('propertyValue') ? num(source.propertyValue) : seed.propertyValue;
      const computedMortgage = requestedMortgage(propertyValue ?? 0, equity, dealType, targetLtvPercent);
      const mortgageAmount =
        (has('mortgageAmount') ? num(source.mortgageAmount) : seed.mortgageAmount) ??
        computedMortgage;

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
        bankAccountMode,
        partnerEmploymentType: couple ? carry.partnerEmploymentType ?? null : null,
        firstName: has('firstName') ? str(source.firstName).trim() : seed.firstName,
        lastName: has('lastName') ? str(source.lastName).trim() : seed.lastName,
        partnerFirstName: couple
          ? has('partnerFirstName')
            ? str(source.partnerFirstName).trim()
            : seed.partnerFirstName
          : '',
        partnerLastName: couple
          ? has('partnerLastName')
            ? str(source.partnerLastName).trim()
            : seed.partnerLastName
          : '',
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
            ? seed.profileScreen === 'overview'
              ? 'borrowers'
              : seed.profileScreen
            : 'overview'),
        dealType,
        propertyValue,
        mortgageAmount,
        targetLtvPercent,
        primaryBank: has('primaryBank') ? pickMortgageBank(source.primaryBank) : seed.primaryBank,
        partnerPrimaryBank: couple
          ? has('partnerPrimaryBank')
            ? pickMortgageBank(source.partnerPrimaryBank)
            : seed.partnerPrimaryBank
          : null,
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
        isFinal: bool(source.isFinal),
        finalLocked: bool(source.finalLocked) || bool(source.isFinal),
        refinance: parseRefinanceMixData(source.refinance),
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

      const approvalRows = Array.isArray(source.bankApprovals) ? source.bankApprovals : [];
      const bankApprovals: BankPreApproval[] = approvalRows.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        const bank = pickBank(row.bank);
        if (!bank) return [];
        return [
          {
            bank,
            submittedAt: typeof row.submittedAt === 'string' ? row.submittedAt : null,
            approved: bool(row.approved),
            approvedAt: typeof row.approvedAt === 'string' ? row.approvedAt : null,
            approvedAmount: num(row.approvedAmount),
            documentName: typeof row.documentName === 'string' ? row.documentName : null,
            note: str(row.note),
          },
        ];
      });

      // הבנק המוביל של התהליך: מה שנשמר, ואחרת הבנק הראשון שאישר בהגשה העצמית
      const leading =
        pickBank(source.bank) ??
        legacy.bank ??
        bankApprovals.find((row) => row.approved)?.bank ??
        null;

      return {
        bank: leading,
        submittedAt: typeof source.submittedAt === 'string' ? source.submittedAt : null,
        documents: flagMap(source.documents, ALL_PRE_APPROVAL_DOCUMENT_KEYS),
        approved:
          source.approved === undefined
            ? legacy.approved || bankApprovals.some((row) => row.approved)
            : bool(source.approved),
        approvedAmount: num(source.approvedAmount),
        validUntil: typeof source.validUntil === 'string' ? source.validUntil : null,
        baskets,
        bankApprovals,
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

      const mode: AuctionMode | null =
        source.mode === 'self' || source.mode === 'advisor' ? source.mode : null;

      return {
        mode,
        offers,
        winnerOfferId,
        signedMix: parseSignedMix(source.signedMix),
      } as PlanStageDataMap[S];
    }

    case 'SIGNING': {
      /** בחירה שאינה קיימת בקטלוג נזרקת, כדי שלא תישמר דרך שאי אפשר להציג */
      const deal = signingDealType(str(source.dealTypeId) || null);
      const scenario = signingScenario(deal, str(source.scenarioId) || null);
      const registry = deal
        ? (scenario
            ? registryOfScenario(deal, scenario.id)
            : signingRegistry(deal, str(source.registryId) || null))
        : null;

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
        screen: pickSigningScreen(source.screen) ?? 'overview',
        dealTypeId: deal?.id ?? null,
        registryId: registry?.id ?? null,
        scenarioId: scenario?.id ?? null,
        documents: flagMap(source.documents, ALL_SIGNING_DOCUMENT_KEYS),
      } as PlanStageDataMap[S];
    }

    default:
      return base;
  }
}

// ───────────────────────────── קטלוגים ─────────────────────────────

export const PLAN_BANKS: readonly string[] = MORTGAGE_BANKS;

/**
 * מסמכי חשבון הבנק — תדפיס עובר ושב ואישור ניהול חשבון.
 *
 * בחשבון משותף הם נדרשים פעם אחת לשני בני הזוג; בחשבונות נפרדים — מכל לווה
 * בנפרד, כי אלה שני חשבונות שונים.
 */
export const BANK_ACCOUNT_DOCUMENTS: StageDocument[] = [
  { key: 'bank_statements', name: 'תדפיס עובר ושב ל-3 החודשים האחרונים' },
  { key: 'account_management', name: 'אישור ניהול חשבון' },
];

/** תעודת זהות — מכל לווה בנפרד, שכיר כעצמאי */
export const IDENTITY_DOCUMENT: StageDocument = {
  key: 'id_card',
  name: 'צילום תעודת זהות + ספח',
};

/** דוח יתרת הלוואה — נדרש רק מלווה שיש לו הלוואות קיימות */
export const LOAN_BALANCE_DOCUMENT: StageDocument = {
  key: 'loans_report',
  name: 'דוח יתרת הלוואה',
};

/**
 * מסמכי הנכס והעסקה.
 *
 * הם אינם שייכים לאף לווה אלא לעסקה עצמה, ולכן הם רובריקה נפרדת בתיק.
 */
export const PROPERTY_DOCUMENTS: StageDocument[] = [
  { key: 'sale_contract', name: 'חוזה מכר' },
  { key: 'appraisal', name: 'אישור שמאות' },
];

/**
 * המסמכים שאינם תלויים בלווה מסוים — מסמכי הנכס והעסקה.
 *
 * השם נשמר כי גם תהליך האישור העקרוני נשען עליו.
 */
export const SHARED_PRE_APPROVAL_DOCUMENTS: StageDocument[] = PROPERTY_DOCUMENTS;

/** תחילית מפתח המסמך של כל לווה, כדי ששני בני הזוג יסומנו בנפרד */
const BORROWER_KEYS = ['b1', 'b2'] as const;
type BorrowerKey = (typeof BORROWER_KEYS)[number];

function borrowerDocKey(borrower: BorrowerKey, key: string): string {
  return `${borrower}:${key}`;
}

export function usesSeparateBankAccounts(profile: Pick<AnalysisData, 'household' | 'bankAccountMode'>): boolean {
  return profile.household === 'COUPLE' && profile.bankAccountMode === 'SEPARATE';
}

/**
 * כל המפתחות האפשריים. הרשימה קבועה ואינה תלויה בפרופיל, כדי שסימון שנשמר
 * לפני שינוי אופן ההעסקה לא יימחק בקריאה הבאה מבסיס הנתונים.
 */
export const ALL_PRE_APPROVAL_DOCUMENT_KEYS: string[] = [
  ...PROPERTY_DOCUMENTS.map((doc) => doc.key),
  ...BANK_ACCOUNT_DOCUMENTS.map((doc) => doc.key),
  LOAN_BALANCE_DOCUMENT.key,
  ...BORROWER_KEYS.flatMap((borrower) =>
    [
      IDENTITY_DOCUMENT,
      LOAN_BALANCE_DOCUMENT,
      ...BANK_ACCOUNT_DOCUMENTS,
      ...EMPLOYMENT_TYPES.flatMap((type) => EMPLOYMENT_DOCUMENTS[type]),
    ].map((doc) => borrowerDocKey(borrower, doc.key))
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
 * תיק המסמכים לאישור עקרוני.
 *
 * לכל לווה רשימה משלו: תעודת זהות, המסמך שמוכיח את ההכנסה לפי אופן ההעסקה
 * שלו — תלושים לשכיר, דוח רווחים לעצמאי — ודוח יתרת הלוואה כשיש לו הלוואות.
 * מסמכי חשבון הבנק נדרשים פעם אחת בחשבון משותף ומכל לווה בחשבונות נפרדים,
 * ומסמכי הנכס והעסקה יושבים ברובריקה נפרדת משלהם.
 */
/**
 * איך קוראים ללווים.
 *
 * ברגע שהוזן שם, הוא מחליף את «לווה 1» ו«לווה 2» בכל מקום — בתיק המסמכים,
 * בדוח הפרופיל ובמסכי השלב — כדי שהלקוח יראה את עצמו ולא תווית גנרית. עד
 * שהוזן שם נשארת התווית הגנרית, וללווה יחיד היא «הלווה».
 */
export function borrowerFullName(first: string, last: string): string {
  return [first, last].map((part) => part.trim()).filter(Boolean).join(' ');
}

export interface BorrowerLabels {
  /** השם של הלווה הראשון, או תווית גנרית כשאין שם */
  first: string;
  /** השם של בן/בת הזוג, או תווית גנרית */
  second: string;
  /** האם הוזן שם ללווה הראשון */
  hasFirst: boolean;
  hasSecond: boolean;
}

export function borrowerLabels(profile: AnalysisData): BorrowerLabels {
  const couple = profile.household === 'COUPLE';
  const first = borrowerFullName(profile.firstName, profile.lastName);
  const second = borrowerFullName(profile.partnerFirstName, profile.partnerLastName);
  return {
    first: first || (couple ? 'לווה 1' : 'הלווה'),
    second: second || 'לווה 2',
    hasFirst: Boolean(first),
    hasSecond: Boolean(second),
  };
}

export function preApprovalDocumentGroups(data: PlanData): DocumentGroup[] {
  const profile = data.ANALYSIS;
  const couple = profile.household === 'COUPLE';
  const sharedAccount = couple && profile.bankAccountMode !== 'SEPARATE';

  const tagged = (borrower: BorrowerKey, docs: StageDocument[]) =>
    docs.map((doc) => ({ ...doc, key: borrowerDocKey(borrower, doc.key) }));

  const personal = (
    borrower: BorrowerKey,
    type: EmploymentType | null,
    title: string,
    loans: ProfileLoan[]
  ): DocumentGroup => ({
    id: borrower,
    title,
    subtitle: type ? EMPLOYMENT_LABELS[type] : null,
    documents: tagged(borrower, [
      IDENTITY_DOCUMENT,
      ...(type ? EMPLOYMENT_DOCUMENTS[type] : []),
      ...(sharedAccount ? [] : BANK_ACCOUNT_DOCUMENTS),
      ...(sumProfileLoans(loans) > 0 ? [LOAN_BALANCE_DOCUMENT] : []),
    ]),
  });

  const names = borrowerLabels(profile);

  return [
    ...(sharedAccount
      ? [
          {
            id: 'household',
            title: 'חשבון הבנק המשותף',
            subtitle: null,
            documents: BANK_ACCOUNT_DOCUMENTS,
          },
        ]
      : []),
    personal(
      'b1',
      profile.employmentType,
      couple ? `מסמכים של ${names.first}` : names.hasFirst ? `מסמכים של ${names.first}` : 'המסמכים שלי',
      profile.borrowerLoans
    ),
    ...(couple
      ? [
          personal(
            'b2',
            profile.partnerEmploymentType,
            `מסמכים של ${names.second}`,
            profile.partnerLoans
          ),
        ]
      : []),
    {
      id: 'property',
      title: 'הנכס והעסקה',
      subtitle: null,
      documents: PROPERTY_DOCUMENTS,
    },
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
  return profileRequirements(data.ANALYSIS, { requireEquity: requiresEquityInProfile(data) });
}

/**
 * האם הפרופיל צריך לכלול הון עצמי.
 *
 * במיחזור אין הון עצמי לעסקה: הנכס כבר בבעלות הלקוח והמשכנתא כבר קיימת —
 * הבנק בוחן את ההחזר ואת יתרת ההלוואה, לא כסף שצריך להביא לעסקה. לכן במיחזור
 * לא שואלים על הון עצמי, והיעדרו אינו חוסם את המשך התהליך.
 */
export function requiresEquityInProfile(data: Pick<PlanData, 'MIX'>): boolean {
  return planFlowOf(data).kind !== 'REFINANCE';
}

export interface ProfileRequirementOptions {
  /** false — מיחזור: ההון העצמי אינו נדרש ואינו נבדק */
  requireEquity?: boolean;
}

/** הפרטים שהפרופיל הפיננסי חייב להכיל, ומה מהם כבר הוזן */
export function profileRequirements(
  profile: AnalysisData,
  options: ProfileRequirementOptions = {}
): ProfileRequirement[] {
  const couple = profile.household === 'COUPLE';
  const requireEquity = options.requireEquity !== false;

  const items: ProfileRequirement[] = [
    { key: 'dealType', label: 'סוג העסקה', ok: profile.dealType !== null },
    { key: 'propertyValue', label: 'מחיר הנכס', ok: (profile.propertyValue ?? 0) > 0 },
    ...(requireEquity
      ? [{ key: 'equity', label: 'ההון העצמי לעסקה', ok: (profile.equity ?? 0) > 0 }]
      : []),
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

/**
 * הבנקים שנתנו אישור עקרוני. אלה הבנקים שנפתחים לתמחור בשלב המכרז, כי רק מהם
 * אפשר לבקש ריביות על התמהיל הסופי.
 */
export function banksWithPreApproval(data: PlanData): string[] {
  const banks = data.APPLICATIONS.bankApprovals
    .filter((row) => row.approved)
    .map((row) => row.bank);
  const leading = data.APPLICATIONS.approved ? data.APPLICATIONS.bank : null;
  if (leading && !banks.includes(leading)) banks.push(leading);
  return banks;
}

/** התקדמות איסוף המסמכים של תרחיש הבעלות שנבחר. null — עדיין לא נבחר תרחיש */
export interface SigningDocumentsProgress {
  total: number;
  collected: number;
  open: number;
}

export function signingDocumentsProgress(signing: SigningData): SigningDocumentsProgress | null {
  const deal = signingDealType(signing.dealTypeId);
  const scenario = signingScenario(deal, signing.scenarioId);
  if (!scenario) return null;
  const collected = scenario.documents.filter(
    (document) => signing.documents[signingDocumentKey(scenario.id, document.key)]
  ).length;
  return { total: scenario.documents.length, collected, open: scenario.documents.length - collected };
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

/**
 * המשכנתא המבוקשת בפרופיל: במצב משולב לפי האחוז שהוזן, אחרת לפי הון עצמי
 * בתוך תקרת סוג העסקה.
 */
export function requestedMortgage(
  propertyValue: number,
  equity: number | null,
  dealType: DealType | null,
  targetLtvPercent: number | null
): number | null {
  if (propertyValue <= 0) return null;
  if (targetLtvPercent !== null && targetLtvPercent > 0) {
    const percent = clampCombinedLtv(targetLtvPercent);
    const resolvedDeal = dealTypeForCombinedLtv(percent, dealType);
    return mortgageFromLtvPercent(propertyValue, percent, resolvedDeal);
  }
  return mortgageFromProperty(propertyValue, equity, dealType);
}

/** הבנק המוצע לאישור עקרוני — החשבון שאליו מופקדת ההכנסה העיקרית */
export function suggestedPreApprovalBank(profile: AnalysisData): {
  bank: string | null;
  source: 'borrower' | 'partner' | 'shared' | null;
} {
  const own = profile.primaryBank;
  if (profile.household !== 'COUPLE') {
    return { bank: own, source: own ? 'borrower' : null };
  }
  const partner = profile.partnerPrimaryBank;
  if (!own && !partner) return { bank: null, source: null };
  if (own && partner && own === partner) return { bank: own, source: 'shared' };
  const ownIncome = profile.income ?? 0;
  const partnerIncome = profile.partnerIncome ?? 0;
  if (partner && partnerIncome > ownIncome) return { bank: partner, source: 'partner' };
  if (own) return { bank: own, source: 'borrower' };
  return { bank: partner, source: partner ? 'partner' : null };
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

/** השדות שמהם נגזרת ההכנסה הפנויה — תת-קבוצה של נתוני השלב הראשון */
export type IncomeInputs = Pick<
  AnalysisData,
  'household' | 'income' | 'partnerIncome' | 'expenses' | 'existingLoans'
>;

/** סך ההכנסות של משק הבית, כולל בן/בת הזוג בהגשה זוגית */
export function totalIncomeOf(data: IncomeInputs): number {
  return (data.income ?? 0) + (data.household === 'COUPLE' ? data.partnerIncome ?? 0 : 0);
}

/**
 * ההכנסה הפנויה של משק הבית: סך ההכנסות פחות ההוצאות החודשיות ופחות החזרי
 * ההלוואות הקיימות. זהו הבסיס לתקרת ההחזר, ולכן זה גם המספר שמוצג לבנקים.
 */
export function disposableIncomeOf(data: IncomeInputs): number {
  return totalIncomeOf(data) - (data.expenses ?? 0) - (data.existingLoans ?? 0);
}

/**
 * המספרים שמניעים את שלב הניתוח, ואת ההמלצות בשלבים שאחריו.
 *
 * הריבית לצורך ההערכה היא הקל"צ המרכזית — קירוב שמרני שנועד לתת סדר גודל
 * לפני שנבנה תמהיל אמיתי בשלב הבא.
 */
export function analyzeProfile(data: AnalysisData): AnalysisResult {
  const totalIncome = totalIncomeOf(data);
  const disposableIncome = disposableIncomeOf(data);

  const propertyValue = data.propertyValue ?? 0;
  const equity = data.equity ?? 0;
  const maxLtv = MAX_LTV_PERCENT[data.dealType ?? 'first_home'];
  const financingLtv =
    data.targetLtvPercent !== null && data.targetLtvPercent > 0
      ? Math.min(clampCombinedLtv(data.targetLtvPercent), maxLtv)
      : maxLtv;

  const requiredLoan =
    requestedMortgage(propertyValue, data.equity, data.dealType, data.targetLtvPercent) ?? 0;
  const requiredEquity = propertyValue > 0 ? propertyValue * (1 - financingLtv / 100) : 0;
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
export function analysisMissing(
  profile: AnalysisData,
  options: ProfileRequirementOptions = {}
): string[] {
  if (!profile.intent) return ['בחירת נקודת הפתיחה'];
  if (profile.intent === 'FEASIBILITY') {
    return ['בדיקת ההיתכנות, וחזרה לכאן אחרי שנמצא נכס'];
  }
  return profileRequirements(profile, options)
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
      return (
        analysisMissing(data.ANALYSIS, { requireEquity: requiresEquityInProfile(data) }).length === 0
      );
    case 'MIX':
      // במיחזור, מה שסוגר את שלב התמהיל הוא הבחירה בין מיחזור פנימי לחיצוני
      if (data.MIX.refinance && !data.MIX.refinance.mode) return false;
      return Boolean(data.MIX.mixRecordId || data.MIX.mixKey);
    /** שלב האישור העקרוני נסגר רק כשהלקוח מסמן שהאישור בידו */
    case 'APPLICATIONS': {
      /*
        במיחזור ההגשה מתבצעת מול הבנק ישירות, והאישור חוזר אליו בערוץ שלו.
        המסמך שאפשר להעלות כאן הוא תיעוד בלבד, ולכן הוא אינו תנאי להמשך:
        הלקוח ממשיך לאימות ההצעה ברגע שהגיש.
      */
      if (planFlowOf(data).kind === 'REFINANCE') return true;
      const preApproval = data.APPLICATIONS;
      return (
        (!requiresProfileForPreApproval(data) || profileReadyForPreApproval(data)) &&
        preApproval.bank !== null &&
        preApproval.approved
      );
    }
    case 'AUCTION':
      // מה שסוגר את השלב הוא בחירת התמהיל שהולכים איתו לחתימה. הזנה ידנית של
      // הצעות היא המסלול הישן, ולכן היא עדיין סוגרת את השלב כשהיא בשימוש.
      return data.AUCTION.signedMix !== null || winningOffer(data.AUCTION) !== null;
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
      missing.push(
        ...analysisMissing(data.ANALYSIS, { requireEquity: requiresEquityInProfile(data) })
      );
      break;
    case 'MIX':
      if (!data.MIX.mixRecordId && !data.MIX.mixKey) {
        missing.push(data.MIX.refinance ? 'שמירת התמהיל למיחזור' : 'שמירת תמהיל בכלי התכנון');
      }
      if (data.MIX.refinance && !data.MIX.refinance.mode) {
        missing.push('בחירה בין מיחזור פנימי למיחזור חיצוני');
      }
      break;
    case 'APPLICATIONS': {
      // במיחזור אין תנאי לסגירת השלב — ראו stageIsComplete
      if (planFlowOf(data).kind === 'REFINANCE') break;
      const openProfile = requiresProfileForPreApproval(data)
        ? preApprovalRequirements(data).filter((item) => !item.ok)
        : [];
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
      missing.push('בחירת התמהיל המתומחר שהולכים איתו לחתימה');
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

/**
 * במיחזור פנימי הבנק כבר מכיר את הלקוח, ולכן הבקשה אינה נשענת על הפרופיל
 * הפיננסי שנבנה בפלטפורמה. בכל תהליך אחר הפרופיל הוא תנאי להגשה.
 */
export function requiresProfileForPreApproval(data: Pick<PlanData, 'MIX'>): boolean {
  const flow = planFlowOf(data);
  return !(flow.kind === 'REFINANCE' && flow.refinanceMode === 'INTERNAL');
}

/** אחוז ההתקדמות בתהליך לפי מספר השלבים שנסגרו, מתוך השלבים של אותו סוג תהליך */
export function planProgress(
  statuses: Record<PlanStageId, PlanStageStatus>,
  flow: PlanFlow = NEW_PLAN_FLOW
): number {
  const stages = flowStages(flow);
  const done = stages.filter((stage) => statuses[stage] === 'COMPLETED').length;
  return Math.round((done / stages.length) * 100);
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
    data.ANALYSIS.mortgageAmount ??
    (analysis.requiredLoan || null);

  const monthlyPayment =
    data.SIGNING.finalMonthlyPayment ??
    data.AUCTION.signedMix?.monthlyPayment ??
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

/** תיאור תקופה בחודשים בעברית טבעית: "18 חודשים", "שנתיים", "3 שנים ו-4 חודשים" */
export function describeMonths(months: number): string {
  const whole = Math.max(0, Math.round(months));
  const years = Math.floor(whole / 12);
  const rest = whole % 12;
  const yearsText = years === 1 ? 'שנה' : years === 2 ? 'שנתיים' : `${years} שנים`;
  if (years === 0) return `${whole} חודשים`;
  if (rest === 0) return yearsText;
  if (years < 2) return `${whole} חודשים`;
  return `${yearsText} ו-${rest} חודשים`;
}

/** כל ההלוואות שנספרות בפרופיל — של הלווה, ושל בן/בת הזוג בהגשה זוגית, בלי כפילות של הלוואה משותפת */
export function countedLoans(profile: AnalysisData): ProfileLoan[] {
  const partner = profile.household === 'COUPLE' ? profile.partnerLoans : [];
  const seen = new Set<string>();
  return [...profile.borrowerLoans, ...partner].filter((loan) => {
    if (seen.has(loan.id)) return false;
    seen.add(loan.id);
    return true;
  });
}

/** הבנקים שבהם הלווים מנהלים את החשבונות הראשיים, בלי כפילויות */
export function accountBanks(profile: AnalysisData): string[] {
  const banks = [profile.primaryBank];
  if (profile.household === 'COUPLE') banks.push(profile.partnerPrimaryBank);
  return Array.from(new Set(banks.filter((bank): bank is string => Boolean(bank))));
}
