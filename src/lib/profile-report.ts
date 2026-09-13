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
  REPAYMENT_RATIO_COMFORT,
  REPAYMENT_RATIO_LIMIT,
  analyzeProfile,
  dealMaxLtv,
  preApprovalDocumentGroups,
  requestedMortgage,
} from './mortgage-plan';
import type { PlanData } from './mortgage-plan';
import { DEAL_TYPES } from '@/components/mortgage-advisor/types';

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

  return {
    generatedAt: now.toISOString(),
    headline,
    checks,
    overall,
    figures,
    documents: documentsOf(data),
    recommendations: reportRecommendations(data),
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
