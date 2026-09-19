/**
 * דוח הפרופיל הפיננסי — התוצר של השלב הראשון.
 *
 * השלב הזה אינו "מילוי טופס": מה שיוצא ממנו הוא בדיקה שהעסקה עומדת בכל
 * הדרישות הרגולטוריות מול הנתונים הפיננסיים שהוזנו, לפני שמגישים לבנק. הדוח
 * אומר בדיוק איפה הלקוח עומד מול כל מגבלה, כמה מרווח נשאר לו, ומה נדרש ממנו
 * להציג כדי שהבנק יאמת את מה שהוצהר.
 *
 * המודול הזה מחזיק את הלוגיקה בלבד — מה נבדק, מה עבר ומה לא — כדי שאפשר יהיה
 * לבדוק אותו, ולהציג אותו גם על המסך וגם בקובץ שמורידים.
 */

import {
  DEFAULT_PLAN_YEARS,
  EMPLOYMENT_LABELS,
  PLAN_STAGES,
  PLAN_TERM_MONTHS_MAX,
  REPAYMENT_RATIO_COMFORT,
  REPAYMENT_RATIO_LIMIT,
  accountBanks,
  analyzeProfile,
  countedLoans,
  dealMaxLtv,
  describeMonths,
  preApprovalDocumentGroups,
  requestedMortgage,
  sumProfileLoans,
  yearsToMonths,
} from './mortgage-plan';
import type { AnalysisData, PlanData, PlanStageId, ProfileScreen } from './mortgage-plan';
import { INTEREST_RATES } from './interest-rates';
import { DEAL_TYPES, MIN_FIXED_PERCENT } from '@/components/mortgage-advisor/types';
import { journeyStageFor } from '@/data/platform/planStages';

/** תוצאת בדיקה בודדת מול מגבלה */
export type CheckStatus = 'pass' | 'near' | 'fail' | 'unknown';

export interface ReportCheck {
  key: string;
  label: string;
  /** הערך שנמדד, כטקסט מוכן לתצוגה */
  value: string;
  /** המגבלה שמולה הוא נמדד */
  limit: string;
  status: CheckStatus;
  /** משפט אחד שמסביר את המשמעות ללקוח */
  note: string;
}

export interface ReportRecommendation {
  title: string;
  body: string;
}

export interface ReportDocumentGroup {
  title: string;
  documents: string[];
}

export type RecommendationTone = 'info' | 'warning' | 'critical';

export type ProfileRecommendationId =
  | 'repayment-ratio'
  | 'grace-track'
  | 'early-appraisal'
  | 'primary-bank';

/**
 * המלצה שצפה תוך כדי ההזנה, במסך שבו הנתון הרלוונטי מוזן, ומשתקפת בדוח.
 * כולן נגזרות מהפרופיל בלבד — אין מצב נפרד לכל אחת.
 */
export interface ProfileRecommendation {
  id: ProfileRecommendationId;
  tone: RecommendationTone;
  title: string;
  body: string;
  bullets?: string[];
  /** המסכים שבהם ההמלצה צפה בזמן ההזנה */
  screens: ProfileScreen[];
}

export interface GraceReason {
  kind: 'income' | 'loan';
  /** בעוד כמה חודשים ההחזר החודשי הפנוי גדל */
  months: number;
  label: string;
}

export interface GraceHorizon {
  /** אורך מסלול הגרייס המומלץ — עד האירוע הקרוב ביותר שמגדיל את ההכנסה הפנויה */
  months: number;
  reasons: GraceReason[];
}

export interface ReportRisk {
  id: string;
  tone: RecommendationTone;
  title: string;
  body: string;
}

export interface ReportGuideline {
  id: string;
  title: string;
  body: string;
}

export interface ReportBorrower {
  label: string;
  age: number | null;
  income: number | null;
  employment: string | null;
  bank: string | null;
  loanPayment: number;
}

/** שלב בתזרים החודשי: מה נכנס, מה יורד, ומה נשאר */
export interface CashFlowStep {
  key: 'income' | 'expenses' | 'loans' | 'disposable' | 'mortgage' | 'remaining';
  label: string;
  amount: number;
  kind: 'income' | 'deduction' | 'subtotal' | 'result';
}

/** נקודה בציר הזמן של הכסף הפנוי — שנה מתחילת המשכנתא */
export interface CashFlowPoint {
  year: number;
  income: number;
  loans: number;
  /** הכנסה פנויה לפני המשכנתא: הכנסה פחות הוצאות שוטפות פחות הלוואות */
  disposable: number;
  /** מה שנשאר אחרי ההחזר החודשי המשוער */
  remaining: number;
  /** יחס ההחזר באותה שנה, מול המגבלה */
  ratio: number | null;
  /** מה קרה בשנה הזו — הלוואה שהסתיימה, הכנסה שגדלה */
  events: string[];
}

export interface ReportCashFlow {
  income: number;
  expenses: number;
  existingLoans: number;
  disposable: number;
  mortgagePayment: number;
  remaining: number;
  /** הנשאר אחרי המשכנתא כאחוז מסך ההכנסה */
  remainingShare: number | null;
  steps: CashFlowStep[];
  timeline: CashFlowPoint[];
}

/** פריט בלוח הזמנים של התהליך — שלב או אבן דרך שבין השלבים */
export interface TimelineItem {
  id: string;
  label: string;
  /** שבוע התחלה וסיום מתחילת התהליך */
  startWeek: number;
  endWeek: number;
  kind: 'stage' | 'milestone';
  stage: PlanStageId | null;
  duration: string;
  note: string;
  /** אבן דרך שהפרופיל הופך לחשובה במיוחד (למשל שמאות מוקדמת כשהמימון קרוב לתקרה) */
  emphasized: boolean;
}

export type MixSketchTrack = 'fixed_unlinked' | 'prime' | 'variable_unlinked';

/** מסלול בתמהיל הסכמטי — הרכב עקרוני, לא המלצה סופית */
export interface MixSketchItem {
  id: MixSketchTrack;
  label: string;
  short: string;
  /** חלק מהמשכנתא באחוזים */
  share: number;
  rate: number;
  /** דירוג 1–3: כמה סיכון, כמה גמישות, כמה עלות */
  risk: 1 | 2 | 3;
  flexibility: 1 | 2 | 3;
  cost: 1 | 2 | 3;
  role: string;
}

/** נקודה שנתית בסימולציית העלות — כמה מהקרן וכמה מהריבית כבר שולמו */
export interface CostPoint {
  year: number;
  balance: number;
  paidPrincipal: number;
  paidInterest: number;
}

/** מספרי המפתח של הדשבורד — כמספרים, כדי שהתצוגה תעצב אותם */
export interface ReportSummary {
  mortgageAmount: number;
  propertyValue: number | null;
  equity: number | null;
  equityInDeal: number;
  equityGap: number;
  ltv: number | null;
  maxLtv: number;
  ltvStatus: CheckStatus;
  repaymentRatio: number | null;
  ratioStatus: CheckStatus;
  ratioLimit: number;
  ratioComfort: number;
  totalIncome: number;
  existingLoans: number;
  disposableIncome: number;
  /** ההכנסה הפנויה שתישאר אחרי תשלום המשכנתא */
  disposableAfterMortgage: number;
  maxMonthlyPayment: number;
  estimatedMonthlyPayment: number;
  years: number;
  months: number;
  /** תקופה מרבית לפי גיל הלווה המבוגר — מדיניות מקובלת בבנקים */
  maxYearsByAge: number | null;
  totalPaid: number;
  totalInterest: number;
  /** סך הריביות כאחוז מהקרן */
  interestShare: number | null;
  estimateRate: number;
  /** האם יש די נתונים כדי שהמספרים יהיו משמעותיים */
  ready: boolean;
  dealTypeLabel: string | null;
  propertyAddress: string | null;
  couple: boolean;
  borrowers: ReportBorrower[];
  grace: GraceHorizon | null;
}

export interface ProfileReport {
  generatedAt: string;
  /** תיאור העסקה בשורה אחת */
  headline: string;
  checks: ReportCheck[];
  /** המצב הכולל: הגרוע מבין הבדיקות */
  overall: CheckStatus;
  figures: Array<{ label: string; value: string }>;
  documents: ReportDocumentGroup[];
  recommendations: ReportRecommendation[];
  /** מספרי המפתח לדשבורד: עסקה, משק בית, עלות */
  summary: ReportSummary;
  /** ההמלצות שצפו בזמן מילוי הפרטים (השמאות המוקדמת כבר בהמלצות לתמהיל) */
  alerts: ProfileRecommendation[];
  risks: ReportRisk[];
  /** קווים מנחים לבניית התמהיל — איזון בין עלות, גמישות, סיכון ויציבות */
  guidelines: ReportGuideline[];
  /** התזרים החודשי: מהכנסה ועד מה שנשאר אחרי המשכנתא, וכיצד הוא משתנה עם השנים */
  cashFlow: ReportCashFlow;
  /** לוח הזמנים של חמשת השלבים ואבני הדרך שביניהם */
  timeline: TimelineItem[];
  /** הרכב סכמטי של מסלולי המשכנתא, לפי הפרופיל */
  mixSketch: MixSketchItem[];
  /** הסימולציה: קרן מול ריבית לאורך השנים — הערכה גסה בלבד */
  costByYear: CostPoint[];
}

const shekel = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return shekel.format(Math.round(value));
}

function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** הסטטוס החמור מבין השניים — כך נגזר המצב הכולל מכל הבדיקות */
function worse(a: CheckStatus, b: CheckStatus): CheckStatus {
  const order: CheckStatus[] = ['pass', 'unknown', 'near', 'fail'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/**
 * יחס ההחזר מול מגבלת בנק ישראל.
 *
 * מעל 40% הבקשה כמעט תמיד נדחית, ומעל 35% החיתום מחמיר — ולכן שני הסימנים
 * האלה מוצגים בנפרד, ולא כ"עבר / לא עבר" אחד.
 */
function repaymentCheck(ratio: number | null): ReportCheck {
  if (ratio === null || !Number.isFinite(ratio)) {
    return {
      key: 'repayment',
      label: 'יחס החזר',
      value: '—',
      limit: `עד ${REPAYMENT_RATIO_LIMIT}%`,
      status: 'unknown',
      note: 'כדי לחשב את יחס ההחזר נדרשים גם ההכנסה וגם סכום המשכנתא המבוקש.',
    };
  }

  const status: CheckStatus =
    ratio > REPAYMENT_RATIO_LIMIT ? 'fail' : ratio > REPAYMENT_RATIO_COMFORT ? 'near' : 'pass';

  return {
    key: 'repayment',
    label: 'יחס החזר',
    value: percent(ratio),
    limit: `עד ${REPAYMENT_RATIO_LIMIT}%`,
    status,
    note:
      status === 'fail'
        ? `יחס ההחזר חורג מהמגבלה. הבנק לא יאשר את הסכום הזה — צריך להקטין את המשכנתא, להאריך תקופה או להגדיל הון עצמי.`
        : status === 'near'
          ? `מעל ${REPAYMENT_RATIO_COMFORT}% החיתום מחמיר: הבנק עשוי לאשר סכום נמוך מהמבוקש או לדרוש בטוחה נוספת.`
          : 'יחס ההחזר בתוך התחום שהבנקים מאשרים בלי חיתום מיוחד.',
  };
}

/** יחס המימון מול תקרת בנק ישראל לסוג העסקה */
function ltvCheck(ltv: number | null, maxLtv: number, dealLabel: string): ReportCheck {
  if (ltv === null || !Number.isFinite(ltv)) {
    return {
      key: 'ltv',
      label: 'יחס מימון',
      value: '—',
      limit: `עד ${maxLtv}%`,
      status: 'unknown',
      note: 'כדי לחשב את יחס המימון נדרשים מחיר הנכס וההון העצמי.',
    };
  }

  // שתי נקודות אחוז הן בערך ירידה סבירה בשמאות; מתחת לכך אין באמת מרווח
  const status: CheckStatus = ltv > maxLtv ? 'fail' : ltv > maxLtv - 2 ? 'near' : 'pass';

  return {
    key: 'ltv',
    label: 'יחס מימון',
    value: percent(ltv),
    limit: `עד ${maxLtv}% ב${dealLabel}`,
    status,
    note:
      status === 'fail'
        ? 'יחס המימון חורג מתקרת בנק ישראל לסוג העסקה. נדרש הון עצמי נוסף או נכס זול יותר.'
        : status === 'near'
          ? 'המימון קרוב לתקרה. ירידה בשמאות הנכס תוציא את העסקה מהמגבלה — כדאי להשאיר מרווח.'
          : 'יחס המימון בתוך התקרה, עם מרווח לשינוי בשמאות.',
  };
}

/** ההון העצמי מול המינימום הנדרש לעסקה */
function equityCheck(equity: number, required: number): ReportCheck {
  if (required <= 0) {
    return {
      key: 'equity',
      label: 'הון עצמי',
      value: money(equity),
      limit: '—',
      status: 'unknown',
      note: 'ההון העצמי המינימלי מחושב מרגע שנקבעו מחיר הנכס וסוג העסקה.',
    };
  }

  const gap = required - equity;
  const status: CheckStatus = gap > 0 ? 'fail' : gap > -required * 0.05 ? 'near' : 'pass';

  return {
    key: 'equity',
    label: 'הון עצמי',
    value: money(equity),
    limit: `לפחות ${money(required)}`,
    status,
    note:
      status === 'fail'
        ? `חסרים ${money(gap)} כדי לעמוד בתקרת המימון של סוג העסקה.`
        : status === 'near'
          ? 'ההון העצמי מכסה בדיוק את הנדרש. אין מרווח להוצאות הנלוות — עורך דין, שמאי, מס רכישה והובלה.'
          : 'ההון העצמי מכסה את הנדרש, ונשאר מרווח להוצאות הנלוות.',
  };
}

/** מסמכי האימות שהבנק ידרוש, מקובצים כפי שהם נאספים בפועל */
function documentsOf(data: PlanData): ReportDocumentGroup[] {
  return preApprovalDocumentGroups(data).map((group) => ({
    title: group.title,
    documents: group.documents.map((doc) => doc.name),
  }));
}

/**
 * ההמלצות שנגזרות מהנתונים.
 *
 * הדוח גנרי, אבל שני מצבים משנים את התכנון ולכן מקבלים התייחסות מפורשת: כסף
 * חד-פעמי שצפוי להיכנס, והכנסה שצפויה לגדול. שניהם נכנסים לתמהיל בשלב הבא.
 */
export function reportRecommendations(data: PlanData): ReportRecommendation[] {
  const profile = data.ANALYSIS;
  const out: ReportRecommendation[] = [];

  const appraisal = appraisalRecommendation(profile);
  if (appraisal) out.push(appraisal);

  const lumpSums = profile.futureLumpSums.filter(
    (item) => (item.amount ?? 0) > 0 && (item.inYears ?? 0) > 0
  );
  if (lumpSums.length > 0) {
    const total = lumpSums.reduce((sum, item) => sum + (item.amount ?? 0), 0);
    const soonest = Math.min(...lumpSums.map((item) => item.inYears ?? 0));
    out.push({
      title: 'צפוי סכום חד-פעמי — שווה לתכנן מסלול שסופג אותו',
      body: `הוצהר על ${money(total)} שצפויים להיכנס בעוד כ-${soonest} שנים. כסף כזה שווה הרבה יותר כפירעון מוקדם של מסלול יקר מאשר בעו״ש. כדאי לשקול מסלול בתקופה קצרה שאפשר לפרוע בלי עמלת היוון, או תכנית בלון שמסתיימת סמוך למועד הזה — כך הסכום נכנס בדיוק כשהוא נדרש.`,
    });
  }

  const increase = profile.futureMonthlyIncrease ?? 0;
  if (increase > 0) {
    const years = profile.futureMonthlyIncreaseInYears ?? 0;
    out.push({
      title: 'ההכנסה הפנויה צפויה לגדול — שווה לשמור אפשרות למחזור',
      body: `הוצהר על תוספת של ${money(increase)} לחודש${years > 0 ? ` בעוד כ-${years} שנים` : ''}. תקציב החזר שגדל מאפשר לקצר תקופה ולחסוך ריבית, ולכן כדאי לשקול מחזור באותו מועד. עד אז עדיף להימנע ממסלולים עם עמלת היוון גבוהה, שהופכים את המחזור ליקר.`,
    });
  }

  return out;
}

/**
 * כמה מתחת למחיר העסקה השמאות עדיין מספיקה.
 *
 * הבנק מממן אחוז מהנמוך מבין מחיר העסקה והשמאות. לכן כשההון העצמי בקושי
 * מספיק, שמאות נמוכה ממחיר המכר מקטינה את המשכנתא המרבית — ופתאום חסר כסף
 * לסגירת העסקה. זה המרווח שנשאר, באחוזים ממחיר העסקה.
 */
export function appraisalTolerance(profile: AnalysisData): number | null {
  const price = profile.propertyValue ?? 0;
  const maxLtv = dealMaxLtv(profile.dealType);
  if (price <= 0 || maxLtv <= 0) return null;

  const needed = Math.max(0, price - (profile.equity ?? 0));
  if (needed <= 0) return null;

  // השמאות המינימלית שבה המשכנתא המרבית עדיין מכסה את מה שחסר
  const minAppraisal = needed / (maxLtv / 100);
  return ((price - minAppraisal) / price) * 100;
}

/** מתחת למרווח הזה כדאי לשמאות מוקדמת — לפני החתימה על חוזה המכר */
const APPRAISAL_TOLERANCE_LIMIT = 10;

/**
 * שמאות מוקדמת, כשיחס המימון קרוב לתקרה.
 *
 * היא עולה כסף פעמיים — לפני העסקה ושוב לבנק — אבל היא זולה בהרבה מהחלופה:
 * חוזה חתום שאי אפשר לממן, ומולו קנס ביטול או מימון חוץ-בנקאי יקר.
 */
function appraisalRecommendation(profile: AnalysisData): ReportRecommendation | null {
  const tolerance = appraisalTolerance(profile);
  if (tolerance === null || tolerance > APPRAISAL_TOLERANCE_LIMIT) return null;

  const gap = Math.max(0, Math.round(tolerance * 10) / 10);
  const maxLtv = dealMaxLtv(profile.dealType);

  return {
    title: 'יחס המימון קרוב לתקרה — שקלו שמאות מוקדמת לפני חתימת חוזה המכר',
    body:
      `המשכנתא המבוקשת מנצלת כמעט את מלוא תקרת המימון (${maxLtv}%), והבנק מממן אחוז מהנמוך מבין ` +
      `מחיר העסקה והשמאות. לפי הנתונים, שמאות שתהיה נמוכה ביותר מ-${gap}% ממחיר העסקה כבר לא תאפשר ` +
      `לקבל את הסכום הדרוש. שמאות מוקדמת, לפני החתימה, מייקרת את התהליך — משלמים עליה פעמיים, ` +
      `כי הבנק ידרוש שמאות משלו — אבל היא מונעת את התרחיש הגרוע: חוזה חתום שהמשכנתא המרבית אינה ` +
      `מספיקה למימונו, ואז נותרים קנס ביטול חוזה גבוה מאוד או גיוס ההפרש ממימון חוץ-בנקאי יקר.`,
  };
}

/** הדוח המלא, מוכן לתצוגה ולהורדה */
export function buildProfileReport(data: PlanData, now: Date = new Date()): ProfileReport {
  const profile = data.ANALYSIS;
  const analysis = analyzeProfile(profile);
  const dealLabel = profile.dealType ? DEAL_TYPES[profile.dealType] : 'עסקה';
  const maxLtv = dealMaxLtv(profile.dealType);

  const mortgage =
    profile.mortgageAmount ??
    requestedMortgage(
      profile.propertyValue ?? 0,
      profile.equity,
      profile.dealType,
      profile.targetLtvPercent
    ) ??
    (analysis.requiredLoan || null);

  /*
    יחס המימון שנבדק הוא זה שהעסקה דורשת בפועל — מחיר הנכס פחות ההון העצמי —
    ולא זה שאחרי הקיצוץ למגבלה. `analyzeProfile` מחזיר את המשכנתא כבר חסומה
    בתקרה, ולכן היחס שלה לעולם אינו חורג, ובדיקה מולו הייתה תמיד עוברת.
  */
  const propertyValue = profile.propertyValue ?? 0;
  const neededLtv =
    propertyValue > 0
      ? (Math.max(0, propertyValue - (profile.equity ?? 0)) / propertyValue) * 100
      : null;

  const checks: ReportCheck[] = [
    repaymentCheck(analysis.repaymentRatio),
    ltvCheck(neededLtv, maxLtv, dealLabel),
    equityCheck(profile.equity ?? 0, analysis.requiredEquity),
  ];

  const overall = checks.reduce<CheckStatus>((worst, check) => worse(worst, check.status), 'pass');

  const figures = [
    { label: 'סך הכנסות משק הבית', value: money(analysis.totalIncome) },
    { label: 'הכנסה פנויה', value: money(analysis.disposableIncome) },
    { label: 'החזר על הלוואות קיימות', value: money(profile.existingLoans ?? 0) },
    { label: 'תקרת החזר חודשי', value: money(analysis.maxMonthlyPayment) },
    { label: 'מחיר הנכס', value: money(profile.propertyValue) },
    { label: 'הון עצמי', value: money(profile.equity) },
    { label: 'משכנתא מבוקשת', value: money(mortgage) },
    { label: 'החזר חודשי משוער', value: money(analysis.estimatedMonthlyPayment) },
  ];

  const headline = profile.propertyValue
    ? `${dealLabel} · נכס ב-${money(profile.propertyValue)} · משכנתא ${money(mortgage)}`
    : `${dealLabel} · בדיקת היתכנות לפני בחירת נכס`;

  const summary = reportSummary(profile, mortgage ?? 0, checks);

  return {
    generatedAt: now.toISOString(),
    headline,
    checks,
    overall,
    figures,
    documents: documentsOf(data),
    recommendations: reportRecommendations(data),
    summary,
    alerts: profileRecommendations(profile).filter((item) => item.id !== 'early-appraisal'),
    risks: reportRisks(profile, summary),
    guidelines: mixGuidelines(profile, summary),
    cashFlow: reportCashFlow(profile, summary),
    timeline: processTimeline(profile),
    mixSketch: mixSketch(profile, summary),
    costByYear: costByYear(summary),
  };
}

/** משפט המצב הכולל, לכותרת הדוח */
export function overallHeadline(status: CheckStatus): string {
  switch (status) {
    case 'pass':
      return 'העסקה עומדת בכל הדרישות הרגולטוריות';
    case 'near':
      return 'העסקה עומדת בדרישות, אך קרובה לאחת המגבלות';
    case 'fail':
      return 'העסקה אינה עומדת באחת מהדרישות — נדרש תיקון לפני ההגשה';
    default:
      return 'חסרים נתונים כדי לבדוק את העסקה מול כל הדרישות';
  }
}

/**
 * האזהרה שחוזרת בכל דוח.
 *
 * הסיבה השכיחה ביותר לעיכוב או לסירוב אינה הנתונים עצמם אלא פערים ביניהם:
 * תלוש שאומר מספר אחד ותדפיס עו״ש שאומר אחר. הבנק מפרש פער כזה כבעיית אמינות,
 * ולא כטעות טכנית.
 */
export const DOCUMENT_CONSISTENCY_WARNING =
  'הסכומים חייבים להיות זהים בכל המסמכים: מה שמופיע בתלוש חייב להופיע באותו סכום ובאותו מועד בתדפיס העו״ש, וכך גם הכנסות קבועות אחרות, שכר דירה, קצבאות והחזרי הלוואות. פער בין המסמכים — גם אם הוא נובע מעיגול או ממועד זיכוי — נקרא אצל הבנק כבעיית אמינות, והוא עלול לדחות את המסמכים או לדרוש חיתום מחמיר. לפני ההגשה כדאי להצליב את שלושת החודשים האחרונים שורה מול שורה.';

// ───────────────────────── ההמלצות שצפות בזמן ההזנה ─────────────────────────

/** הלוואה שמסתיימת בטווח הזה משחררת החזר חודשי בתוך חיי המשכנתא — סיבה לגרייס */
export const GRACE_LOAN_MIN_MONTHS = 18;
export const GRACE_LOAN_MAX_MONTHS = 60;
/** הגיל שבו רוב הבנקים דורשים שהמשכנתא תסתיים — מדיניות מקובלת, לא הוראת בנק ישראל */
export const MAX_BORROWER_AGE_AT_END = 75;
/** חלקו המרבי של מסלול הפריים בתמהיל לפי הוראות בנק ישראל */
export const PRIME_MAX_SHARE_PERCENT = 66.7;
/** הריבית המשוערת שבה מחושבים ההחזר וסך הריביות בדוח */
export const REPORT_ESTIMATE_RATE = INTEREST_RATES.fixed_unlinked;

/** מיקום יחס ההחזר מול המגבלה — אותו סיווג שמשמש את בדיקת הדוח */
export function repaymentRatioStatus(ratio: number | null): CheckStatus {
  if (ratio === null || !Number.isFinite(ratio)) return 'unknown';
  if (ratio > REPAYMENT_RATIO_LIMIT) return 'fail';
  if (ratio > REPAYMENT_RATIO_COMFORT) return 'near';
  return 'pass';
}

/** האם צריך לשאול אם צפויה עלייה בהכנסה הפנויה — רק כשיחס ההחזר קרוב למגבלה או מעבר לה */
export function shouldAskIncomeIncrease(profile: AnalysisData): boolean {
  const status = repaymentRatioStatus(analyzeProfile(profile).repaymentRatio);
  return status === 'near' || status === 'fail';
}

/**
 * מסלול גרייס (בלון/בוליט) מקל על ההחזר בתקופה הראשונה. הוא מוצדק כשידוע
 * שההכנסה הפנויה תגדל: עלייה צפויה בהכנסה כשיחס ההחזר גבוה, או הלוואה
 * שמסתיימת בתוך פחות מחמש שנים. אורכו נקבע לפי האירוע הקרוב ביותר.
 */
export function graceHorizon(profile: AnalysisData): GraceHorizon | null {
  const reasons: GraceReason[] = [];

  if (
    shouldAskIncomeIncrease(profile) &&
    profile.expectsIncomeIncrease === true &&
    (profile.futureMonthlyIncreaseInYears ?? 0) > 0
  ) {
    const months = Math.round((profile.futureMonthlyIncreaseInYears ?? 0) * 12);
    const amount = profile.futureMonthlyIncrease ?? 0;
    reasons.push({
      kind: 'income',
      months,
      label:
        amount > 0
          ? `העלייה הצפויה בהכנסה הפנויה (${money(amount)} לחודש) בעוד ${describeMonths(months)}`
          : `העלייה הצפויה בהכנסה הפנויה בעוד ${describeMonths(months)}`,
    });
  }

  countedLoans(profile).forEach((loan) => {
    const remaining = loan.remainingMonths ?? 0;
    if (remaining > GRACE_LOAN_MIN_MONTHS && remaining < GRACE_LOAN_MAX_MONTHS) {
      reasons.push({
        kind: 'loan',
        months: remaining,
        label: `סיום הלוואה עם החזר של ${money(loan.monthlyPayment ?? 0)} לחודש בעוד ${describeMonths(remaining)}`,
      });
    }
  });

  if (reasons.length === 0) return null;
  reasons.sort((a, b) => a.months - b.months);
  return { months: reasons[0].months, reasons };
}

/**
 * ההמלצות שצפות תוך כדי ההזנה ומשתקפות בדוח הסופי.
 *
 * כולן נגזרות מהפרופיל בלבד, ולכן אותה המלצה מופיעה בזמן ההקלדה ובדוח —
 * בלי מצב נפרד לכל אחת. השמאות המוקדמת היא אותה המלצה שכבר נכנסת להמלצות
 * התמהיל, כאן רק עם המסך שבו היא צפה.
 */
export function profileRecommendations(profile: AnalysisData): ProfileRecommendation[] {
  const items: ProfileRecommendation[] = [];
  const analysis = analyzeProfile(profile);
  const ratio = analysis.repaymentRatio;
  const ratioState = repaymentRatioStatus(ratio);

  if (ratio !== null && (ratioState === 'near' || ratioState === 'fail')) {
    items.push({
      id: 'repayment-ratio',
      tone: ratioState === 'fail' ? 'critical' : 'warning',
      title:
        ratioState === 'fail'
          ? `יחס ההחזר המשוער (${percent(ratio)}) חורג מהמגבלה המקובלת בבנקים (${REPAYMENT_RATIO_LIMIT}%)`
          : `יחס ההחזר המשוער (${percent(ratio)}) קרוב לגבול העליון (${REPAYMENT_RATIO_LIMIT}%)`,
      body:
        'נסו להגיע לבנק עם תלושי שכר גבוהים ככל האפשר בחודשים שלפני ההגשה — תגבורים, שעות נוספות, בונוסים ועמלות — כדי להציג לבנק תמונת מצב של הכנסה גבוהה. ככל שיחס ההחזר נמוך יותר, הבנק נותן ריביות נמוכות יותר, וכך גם ההחזר החודשי וסך הריביות שישולמו לאורך חיי המשכנתא יהיו נמוכים יותר.',
      bullets: [
        'שימו לב: ההכנסה הפנויה הריאלית שתישאר לכם עשויה להיות נמוכה יותר אחרי שתחזרו לרמות ההכנסה הרגילות. שקלו מהלך כזה בכובד ראש, וודאו שההחזר החודשי נסבל גם בלי התוספות.',
        'הבנק בוחן את ההכנסה נטו הממוצעת בשלושת התלושים האחרונים — תגבור חד-פעמי בחודש אחד משפיע פחות מתוספת עקבית.',
      ],
      screens: ['borrowers', 'deal'],
    });
  }

  const grace = graceHorizon(profile);
  if (grace) {
    const fromIncome = grace.reasons.some((reason) => reason.kind === 'income');
    const fromLoan = grace.reasons.some((reason) => reason.kind === 'loan');
    items.push({
      id: 'grace-track',
      tone: 'info',
      title: `שקלו מסלול בלון (בוליט/גרייס) של ${describeMonths(grace.months)} בתמהיל`,
      body: `${
        fromIncome && fromLoan
          ? 'ההכנסה הפנויה שלכם צפויה לגדול גם מהעלייה בהכנסה וגם מסיום הלוואה קיימת.'
          : fromIncome
            ? 'ההכנסה הפנויה שלכם צפויה לגדול בהמשך.'
            : 'הלוואה קיימת מסתיימת בתוך פחות מחמש שנים ומשחררת החזר חודשי.'
      } מסלול שבו משלמים בתקופה הראשונה רק ריבית (או לא משלמים כלל) מקל על ההחזר החודשי עד שההכנסה הפנויה גדלה, ואז הקרן נפרסת על יתרת התקופה. אורך הגרייס המומלץ הוא עד האירוע הקרוב ביותר — ${describeMonths(grace.months)} — ולא יותר, כי כל חודש של גרייס עולה בריבית שאינה מקטינה את הקרן.`,
      bullets: grace.reasons.map((reason) => reason.label),
      screens: ['borrowers', 'future', 'deal'],
    });
  }

  const appraisal = appraisalRecommendation(profile);
  if (appraisal) {
    items.push({
      id: 'early-appraisal',
      tone: 'warning',
      title: appraisal.title,
      body: appraisal.body,
      screens: ['deal'],
    });
  }

  const banks = accountBanks(profile);
  if (banks.length > 0) {
    const names = banks.map((bank) => `בנק ${bank}`).join(' ו');
    items.push({
      id: 'primary-bank',
      tone: 'info',
      title: `כללו את ${names} בין הבנקים שאליהם תוגש הבקשה לאישור עקרוני`,
      body: 'בנקים שבהם הלקוח מנהל את חשבונו נוטים לתת תנאים טובים יותר — הם מכירים את ההתנהלות בחשבון ורוצים לשמור אותו אצלם. הצעה ראשונית זולה יחסית מהבנק שלכם תקל בשלב המיקוח: תוכלו לפנות איתה לבנקים אחרים ולחסוך סבבי מיקוח.',
      screens: ['borrowers'],
    });
  }

  return items;
}

// ───────────────────────── מספרי הדשבורד, סיכונים וקווים מנחים ─────────────────────────

function oldestBorrowerAge(profile: AnalysisData): number | null {
  const ages = [profile.age, profile.household === 'COUPLE' ? profile.partnerAge : null].filter(
    (age): age is number => age !== null && age > 0
  );
  return ages.length > 0 ? Math.max(...ages) : null;
}

function reportSummary(profile: AnalysisData, mortgageAmount: number, checks: ReportCheck[]): ReportSummary {
  const analysis = analyzeProfile(profile);
  const couple = profile.household === 'COUPLE';
  const propertyValue = profile.propertyValue ?? null;
  const years = profile.years || DEFAULT_PLAN_YEARS;
  const months = yearsToMonths(years);
  const payment = analysis.estimatedMonthlyPayment;
  const totalPaid = payment * months;
  const totalInterest = Math.max(0, totalPaid - mortgageAmount);
  const oldest = oldestBorrowerAge(profile);
  const maxYearsByAge =
    oldest !== null
      ? Math.max(0, Math.min(PLAN_TERM_MONTHS_MAX / 12, MAX_BORROWER_AGE_AT_END - oldest))
      : null;
  const statusOf = (key: string): CheckStatus =>
    checks.find((check) => check.key === key)?.status ?? 'unknown';

  const borrowers: ReportBorrower[] = [
    {
      label: couple ? 'לווה 1' : 'הלווה',
      age: profile.age,
      income: profile.income,
      employment: profile.employmentType ? EMPLOYMENT_LABELS[profile.employmentType] : null,
      bank: profile.primaryBank,
      loanPayment: sumProfileLoans(profile.borrowerLoans.filter((loan) => !loan.shared)),
    },
  ];
  if (couple) {
    borrowers.push({
      label: 'לווה 2',
      age: profile.partnerAge,
      income: profile.partnerIncome,
      employment: profile.partnerEmploymentType ? EMPLOYMENT_LABELS[profile.partnerEmploymentType] : null,
      bank: profile.partnerPrimaryBank,
      loanPayment: sumProfileLoans(profile.partnerLoans.filter((loan) => !loan.shared)),
    });
  }

  return {
    mortgageAmount,
    propertyValue,
    equity: profile.equity,
    equityInDeal: propertyValue ? Math.max(0, propertyValue - mortgageAmount) : 0,
    equityGap: analysis.equityGap,
    ltv: analysis.ltv,
    maxLtv: analysis.maxLtv,
    ltvStatus: statusOf('ltv'),
    repaymentRatio: analysis.repaymentRatio,
    ratioStatus: statusOf('repayment'),
    ratioLimit: REPAYMENT_RATIO_LIMIT,
    ratioComfort: REPAYMENT_RATIO_COMFORT,
    totalIncome: analysis.totalIncome,
    existingLoans: profile.existingLoans ?? 0,
    disposableIncome: analysis.disposableIncome,
    disposableAfterMortgage: analysis.disposableIncome - payment,
    maxMonthlyPayment: analysis.maxMonthlyPayment,
    estimatedMonthlyPayment: payment,
    years,
    months,
    maxYearsByAge,
    totalPaid,
    totalInterest,
    interestShare: mortgageAmount > 0 ? (totalInterest / mortgageAmount) * 100 : null,
    estimateRate: REPORT_ESTIMATE_RATE,
    ready: analysis.hasInputs,
    dealTypeLabel: profile.dealType ? DEAL_TYPES[profile.dealType] : null,
    propertyAddress: profile.propertyAddress.trim() || null,
    couple,
    borrowers,
    grace: graceHorizon(profile),
  };
}

/** מה יכול לעצור את הבקשה או להכביד על התזרים — נגזר מהנתונים, לא רשימה קבועה */
function reportRisks(profile: AnalysisData, summary: ReportSummary): ReportRisk[] {
  const risks: ReportRisk[] = [];
  const couple = profile.household === 'COUPLE';

  if (profile.intent === 'FEASIBILITY' || !summary.propertyValue) {
    risks.push({
      id: 'no-property',
      tone: 'info',
      title: 'עוד אין נכס קונקרטי',
      body: 'המספרים בדוח מבוססים על הפרופיל בלבד. כשייבחר נכס, שיעור המימון ויחס ההחזר יחושבו מולו.',
    });
  }
  if (summary.ratioStatus === 'fail' || summary.ratioStatus === 'near') {
    risks.push({
      id: 'ratio',
      tone: summary.ratioStatus === 'fail' ? 'critical' : 'warning',
      title: summary.ratioStatus === 'fail' ? 'יחס החזר מעל המגבלה' : 'יחס החזר קרוב למגבלה',
      body: `ההחזר המשוער הוא ${money(summary.estimatedMonthlyPayment)} מתוך ${money(summary.totalIncome - summary.existingLoans)} הכנסה נטו אחרי הלוואות. עליית ריבית או ירידה בהכנסה תכביד מיד על התזרים. הארכת תקופה, סגירת הלוואות או הקטנת מחיר הנכס מורידות את היחס.`,
    });
  }
  if (summary.ltvStatus === 'fail' || summary.ltvStatus === 'near') {
    risks.push({
      id: 'ltv',
      tone: summary.ltvStatus === 'fail' ? 'critical' : 'warning',
      title: summary.ltvStatus === 'fail' ? 'שיעור מימון מעל התקרה' : 'שיעור מימון קרוב לתקרה',
      body: 'הבנק מחשב את המשכנתא לפי הנמוך מבין מחיר הרכישה לשווי השמאות. פער שמאות בעסקה שקרובה לתקרה יוצר חור בתקציב שצריך לסגור מהון עצמי או במימון יקר.',
    });
  }
  if (summary.equityGap > 0) {
    risks.push({
      id: 'equity-gap',
      tone: 'critical',
      title: `חסרים ${money(summary.equityGap)} בהון העצמי`,
      body: 'לפי ההון העצמי שהוצהר אי אפשר לעמוד בתקרת המימון של סוג העסקה. יש להשלים הון, להקטין את מחיר הנכס, או לבדוק מקורות הון נוספים.',
    });
  }
  if (summary.existingLoans > 0 && summary.totalIncome > 0) {
    const share = (summary.existingLoans / summary.totalIncome) * 100;
    risks.push({
      id: 'loans',
      tone: share > 10 ? 'warning' : 'info',
      title: `הלוואות קיימות: ${money(summary.existingLoans)} לחודש (${share.toFixed(0)}% מההכנסה)`,
      body: 'הבנק מנכה את ההחזרים מההכנסה לפני חישוב יחס ההחזר. סגירה או איחוד של הלוואות לפני ההגשה מגדילים את הסכום שיאושר ומשפרים את הריביות.',
    });
  }
  if (summary.maxYearsByAge !== null && summary.years > summary.maxYearsByAge) {
    risks.push({
      id: 'age',
      tone: 'warning',
      title: 'התקופה המבוקשת ארוכה ממה שהגיל מאפשר',
      body: `לפי גיל הלווה המבוגר, רוב הבנקים יאשרו עד ${describeMonths(summary.maxYearsByAge * 12)}. תקופה קצרה יותר מעלה את ההחזר החודשי — בדקו את יחס ההחזר מולה.`,
    });
  }
  if (
    profile.employmentType === 'SELF_EMPLOYED' ||
    (couple && profile.partnerEmploymentType === 'SELF_EMPLOYED')
  ) {
    risks.push({
      id: 'self-employed',
      tone: 'info',
      title: 'לווה עצמאי — החיתום נשען על שומות ודוחות',
      body: 'הבנק בוחן שומת מס אחרונה, דוח רווח והפסד ואישור מקדמות. הכנסה שאינה מגובה בדיווח לרשויות לא תיספר — כדאי להתחיל לאסוף את המסמכים כבר עכשיו.',
    });
  }
  return risks;
}

/**
 * הקווים המנחים לבניית התמהיל: המסגרת הרגולטורית, ואז האיזון בין יציבות,
 * גמישות לפירעונות מוקדמים, הצמדה, תקופה, והעברת הכספים מול חוזה המכר —
 * כולם מנוסחים לפי הפרופיל שהוזן.
 */
function mixGuidelines(profile: AnalysisData, summary: ReportSummary): ReportGuideline[] {
  const lumpTotal = profile.futureLumpSums.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const comfortable = summary.ratioStatus === 'pass';

  const guidelines: ReportGuideline[] = [
    {
      id: 'frame',
      title: 'המסגרת הרגולטורית',
      body: `לפחות ${MIN_FIXED_PERCENT}% בריבית קבועה (קל"צ או ק"צ), הפריים עד ${Math.round(PRIME_MAX_SHARE_PERCENT)}%, ומסלולים משתנים שמתעדכנים מתחת לחמש שנים עד שליש. בתוך המסגרת הזו נבנה האיזון בין עלות, גמישות ויציבות.`,
    },
    {
      id: 'stability',
      title: comfortable
        ? 'יציבות: הבסיס הקבוע יכול להיות מינימלי'
        : 'יציבות: הגדילו את החלק הקבוע הלא-צמוד',
      body: comfortable
        ? `יחס ההחזר שלכם משאיר מרווח נשימה, ולכן אפשר לשאת יותר מסלולים משתנים זולים (פריים, משתנה כל 5 שנים) ולהשאיר את הקל"צ סביב השליש הנדרש. ודאו שגם בעליית ריבית של 2% ההחזר נשאר מתחת ל-${REPAYMENT_RATIO_COMFORT}% מההכנסה.`
        : 'כשההחזר קרוב למגבלה אין מקום לזעזועים. שקלו קל"צ של 50% ויותר, כדי שרוב ההחזר ידוע מראש ולא יקפוץ עם ריבית בנק ישראל או המדד. הפער בריבית מול הפריים הוא המחיר של הביטוח הזה.',
    },
    {
      id: 'flexibility',
      title: 'גמישות לפירעונות מוקדמים ולשינויים',
      body:
        lumpTotal > 0
          ? `צפויים לכם ${money(lumpTotal)} בהכנסות חד-פעמיות. ייעדו למסלול הפריים (או למסלול משתנה בנקודת עדכון) חלק מהמשכנתא בסדר גודל דומה — במסלולים אלה אין עמלת היוון בפירעון מוקדם, וכך הכסף יוצא מהמשכנתא בלי קנס, ובתזמון שכבר ידוע.`
          : 'שמרו חלק מהמשכנתא במסלול פריים או במסלול משתנה: בהם פירעון מוקדם ומיחזור אינם כרוכים בעמלת היוון, ולכן הם השסתום לשינויים בעתיד — עלייה בהכנסה, ירושה, או ירידת ריביות שתצדיק מיחזור.',
    },
    {
      id: 'linkage',
      title: 'הצמדה למדד — בזהירות',
      body: 'מסלולים צמודי מדד מציעים ריבית נומינלית נמוכה יותר והחזר התחלתי נמוך, אבל הקרן גדלה עם המדד ולאורך שנים היתרה יכולה לעלות במקום לרדת. הם מתאימים לחלק קטן מהתמהיל, לתקופות קצרות או לכסף שמתוכנן להיפרע מוקדם.',
    },
    {
      id: 'term',
      title:
        summary.maxYearsByAge !== null
          ? `תקופה: ${describeMonths(summary.months)} מבוקשות, עד ${describeMonths(Math.min(30, summary.maxYearsByAge) * 12)} לפי גיל`
          : `תקופה: ${describeMonths(summary.months)} מבוקשות`,
      body: 'תקופה ארוכה מקטינה את ההחזר החודשי אך מגדילה את סך הריביות. בתמהיל לכל מסלול תקופה משלו — אפשר לקצר את המסלולים היקרים ולהאריך את הזולים, ולתכנן פירעון מוקדם שמקצר את הכל.',
    },
    {
      id: 'cash-flow',
      title: 'העברת הכספים והתזמון מול חוזה המכר',
      body: 'ההון העצמי משולם ראשון לפי לוח התשלומים בחוזה, והמשכנתא משוחררת בפעימה האחרונה — רק אחרי חתימה בבנק, ביטוחים ורישום הערת אזהרה. תאמו את מועדי התשלום בחוזה עם תוקף האישור העקרוני (בדרך כלל 24 ימים, עם אפשרות הארכה) ועם זמן הביצוע בבנק, כדי שלא תגיעו למועד תשלום בלי כסף זמין.',
    },
  ];

  if (summary.grace) {
    guidelines.splice(2, 0, {
      id: 'grace',
      title: `גרייס: מסלול בלון של ${describeMonths(summary.grace.months)}`,
      body: `כדי להקל על ההחזר בתקופה הראשונה, חלק מהמשכנתא יכול להיות במסלול שבו משלמים בתחילה רק ריבית. אורכו — עד ${summary.grace.reasons[0].label}. הגדירו את סכום המסלול לפי הפער בין ההחזר הרצוי היום להחזר שתוכלו לשאת אחרי האירוע, ולא יותר.`,
    });
  }

  return guidelines;
}

// ───────────────────────── התזרים, לוח הזמנים, התמהיל הסכמטי והסימולציה ─────────────────────────

/**
 * התזרים החודשי כמפל: ההכנסה, מה שיורד ממנה (הוצאות שוטפות, הלוואות), מה
 * שנשאר לפני המשכנתא, ההחזר המשוער, ומה שנשאר אחריו.
 *
 * ציר הזמן מראה איך אותו תזרים משתנה: הלוואה שמסתיימת משחררת החזר, והכנסה
 * שצפויה לגדול נכנסת במועדה. ההחזר עצמו נשאר קבוע, כי זו הערכה לפי ריבית
 * קבועה — התמהיל בשלב הבא יקבע את הצורה האמיתית שלו.
 */
export function reportCashFlow(profile: AnalysisData, summary: ReportSummary): ReportCashFlow {
  const income = summary.totalIncome;
  const expenses = profile.expenses ?? 0;
  const existingLoans = summary.existingLoans;
  const disposable = income - expenses - existingLoans;
  const payment = summary.ready ? summary.estimatedMonthlyPayment : 0;
  const remaining = disposable - payment;

  const steps: CashFlowStep[] = [
    { key: 'income', label: 'הכנסה נטו של משק הבית', amount: income, kind: 'income' },
    { key: 'expenses', label: 'הוצאות שוטפות', amount: -expenses, kind: 'deduction' },
    { key: 'loans', label: 'החזר הלוואות קיימות', amount: -existingLoans, kind: 'deduction' },
    { key: 'disposable', label: 'הכנסה פנויה לפני המשכנתא', amount: disposable, kind: 'subtotal' },
    { key: 'mortgage', label: 'החזר משכנתא משוער', amount: -payment, kind: 'deduction' },
    { key: 'remaining', label: 'נשאר אחרי המשכנתא', amount: remaining, kind: 'result' },
  ];

  const loans = countedLoans(profile);
  const known = sumProfileLoans(loans);
  /* מה שהוזן כסכום כולל ולא פורט להלוואות — נשאר לאורך כל התקופה */
  const unlisted = Math.max(0, existingLoans - known);
  const increase = profile.futureMonthlyIncrease ?? 0;
  const increaseYears = profile.futureMonthlyIncreaseInYears ?? 0;
  const years = Math.max(1, Math.round(summary.years));

  const timeline: CashFlowPoint[] = [];
  for (let year = 0; year <= years; year += 1) {
    const month = year * 12;
    const activeLoans =
      unlisted +
      loans.reduce((sum, loan) => {
        const left = loan.remainingMonths;
        const active = left === null || left === undefined || left > month;
        return active ? sum + (loan.monthlyPayment ?? 0) : sum;
      }, 0);
    const yearIncome = income + (increase > 0 && increaseYears > 0 && year >= increaseYears ? increase : 0);
    const yearDisposable = yearIncome - expenses - activeLoans;
    const base = yearIncome - activeLoans;
    const events: string[] = [];
    if (year > 0) {
      loans.forEach((loan) => {
        const left = loan.remainingMonths ?? null;
        if (left !== null && left > month - 12 && left <= month) {
          events.push(`סיום הלוואה (${money(loan.monthlyPayment ?? 0)} לחודש)`);
        }
      });
      if (increase > 0 && increaseYears > 0 && year >= increaseYears && year - 1 < increaseYears) {
        events.push(`עלייה בהכנסה (${money(increase)} לחודש)`);
      }
    }
    timeline.push({
      year,
      income: yearIncome,
      loans: activeLoans,
      disposable: yearDisposable,
      remaining: yearDisposable - payment,
      ratio: payment > 0 && base > 0 ? (payment / base) * 100 : null,
      events,
    });
  }

  return {
    income,
    expenses,
    existingLoans,
    disposable,
    mortgagePayment: payment,
    remaining,
    remainingShare: income > 0 && summary.ready ? (remaining / income) * 100 : null,
    steps,
    timeline,
  };
}

/** משך אופייני של כל שלב בשבועות — לפי טווח הזמנים שבעמוד "איך זה עובד" */
const STAGE_WEEKS: Record<PlanStageId, number> = {
  ANALYSIS: 1,
  MIX: 2,
  APPLICATIONS: 2,
  AUCTION: 3,
  SIGNING: 1,
};

/**
 * לוח הזמנים של התהליך: חמשת השלבים בסדר שבו עוברים אותם, ובין הפרופיל
 * לתמהיל שתי אבני הדרך שאינן שלב בפלטפורמה אבל קובעות את הקצב — שמאות
 * מוקדמת (לפני חתימת החוזה) והפנייה לעורך הדין לחוזה המכר.
 */
export function processTimeline(profile: AnalysisData): TimelineItem[] {
  const appraisal = appraisalRecommendation(profile) !== null;
  const items: TimelineItem[] = [];
  let week = 0;

  const pushStage = (stage: PlanStageId) => {
    const journey = journeyStageFor(stage);
    const weeks = STAGE_WEEKS[stage];
    items.push({
      id: stage,
      label: journey.title,
      startWeek: week,
      endWeek: week + weeks,
      kind: 'stage',
      stage,
      duration: journey.duration,
      note: journey.tagline,
      emphasized: false,
    });
    week += weeks;
  };

  PLAN_STAGES.forEach((stage) => {
    pushStage(stage);
    if (stage === 'ANALYSIS') {
      items.push({
        id: 'appraisal',
        label: 'שמאות מוקדמת לנכס',
        startWeek: week,
        endWeek: week + 1,
        kind: 'milestone',
        stage: null,
        duration: 'כשבוע',
        note: appraisal
          ? 'המימון קרוב לתקרה — שמאות לפני החתימה מונעת חוזה שאי אפשר לממן.'
          : 'אופציונלי: מומלץ כשהמימון קרוב לתקרה או כשיש ספק לגבי שווי הנכס.',
        emphasized: appraisal,
      });
      week += 1;
      items.push({
        id: 'lawyer',
        label: 'פנייה לעורך דין וחתימת חוזה המכר',
        startWeek: week,
        endWeek: week + 1,
        kind: 'milestone',
        stage: null,
        duration: 'כשבוע',
        note: 'לוח התשלומים בחוזה נקבע מול תוקף האישור העקרוני וזמן הביצוע בבנק.',
        emphasized: false,
      });
      week += 1;
    }
  });

  return items;
}

/**
 * הרכב סכמטי של התמהיל: שלושה מסלולים שמייצגים את שלוש הזוויות — קבוע
 * ליציבות, פריים לגמישות, משתנה לעלות. החלוקה זזה לפי המרווח ביחס ההחזר:
 * כשההחזר צמוד למגבלה, החלק הקבוע גדל. זהו קו מנחה, לא תמהיל.
 */
export function mixSketch(profile: AnalysisData, summary: ReportSummary): MixSketchItem[] {
  const tight = summary.ratioStatus === 'near' || summary.ratioStatus === 'fail';
  const lumpTotal = profile.futureLumpSums.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const fixedShare = tight ? 50 : Math.max(MIN_FIXED_PERCENT, 35);
  const primeShare = tight ? 30 : 40;
  const variableShare = 100 - fixedShare - primeShare;

  return [
    {
      id: 'fixed_unlinked',
      label: 'ריבית קבועה לא צמודה (קל"צ)',
      short: 'קבועה',
      share: fixedShare,
      rate: INTEREST_RATES.fixed_unlinked,
      risk: 1,
      flexibility: 1,
      cost: 3,
      role: tight
        ? 'הבסיס היציב: ההחזר ידוע מראש. כשההחזר קרוב למגבלה, זה החלק שמונע הפתעות.'
        : `לפחות ${MIN_FIXED_PERCENT}% לפי הרגולציה. ההחזר ידוע מראש, אבל פירעון מוקדם עשוי לעלות בעמלת היוון.`,
    },
    {
      id: 'prime',
      label: 'פריים',
      short: 'פריים',
      share: primeShare,
      rate: INTEREST_RATES.prime,
      risk: 2,
      flexibility: 3,
      cost: 2,
      role:
        lumpTotal > 0
          ? `השסתום לפירעון מוקדם בלי עמלת היוון — כאן ייכנסו ${money(lumpTotal)} שצפויים.`
          : 'השסתום הגמיש: פירעון מוקדם ומיחזור בלי עמלת היוון, אבל ההחזר זז עם ריבית בנק ישראל.',
    },
    {
      id: 'variable_unlinked',
      label: 'משתנה לא צמודה כל 5 שנים',
      short: 'משתנה',
      share: variableShare,
      rate: INTEREST_RATES.variable_unlinked_5y,
      risk: 2,
      flexibility: 2,
      cost: 1,
      role: 'ריבית התחלתית נמוכה עם יציבות לחמש שנים, ונקודת יציאה בלי קנס בכל עדכון.',
    },
  ];
}

/** הקרן והריבית שהצטברו בסוף כל שנה — לפי ההחזר המשוער ולוח שפיצר */
export function costByYear(summary: ReportSummary): CostPoint[] {
  const principal = summary.mortgageAmount;
  const months = Math.max(0, Math.round(summary.months));
  if (!summary.ready || principal <= 0 || months <= 0) return [];

  const payment = summary.estimatedMonthlyPayment;
  const monthlyRate = summary.estimateRate / 100 / 12;
  const points: CostPoint[] = [{ year: 0, balance: principal, paidPrincipal: 0, paidInterest: 0 }];
  let balance = principal;
  let paidInterest = 0;

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthlyRate;
    const towardPrincipal = Math.min(balance, payment - interest);
    balance = Math.max(0, balance - towardPrincipal);
    paidInterest += interest;
    if (month % 12 === 0 || month === months) {
      points.push({
        year: Math.ceil(month / 12),
        balance,
        paidPrincipal: principal - balance,
        paidInterest,
      });
    }
  }
  return points;
}
