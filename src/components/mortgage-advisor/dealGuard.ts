import { DEAL_TYPES } from './types';
import type { DealType } from './types';
import { maxLtvPercent, maxMortgageFor, requiredEquityFor } from './propertyContext';
import { REPAYMENT_RATIO_LIMIT } from '@/lib/mortgage-plan';

/**
 * בדיקת מגבלות הרגולציה על עריכת פרטי העסקה בכלי התמהילים.
 *
 * שלוש מגבלות של בנק ישראל נבדקות לפני שעריכה של סכום המשכנתא, עלות הנכס,
 * ההון העצמי או תקרת ההחזר נכנסת לתוקף:
 * - יחס מימון (LTV) לפי סוג העסקה;
 * - הון עצמי מינימלי — הצד השני של אותו כלל, מנוסח לפי מה שהלקוח ערך;
 * - יחס החזר — ההחזר החודשי לא יעלה על 40% מההכנסה הפנויה.
 * כל שדה נשמר כפי שהוזן ולא מזיז את השדות האחרים. עריכה שחורגת לא נחסמת —
 * ההפרות מוצגות למשתמש כהתראה, והוא מחליט מה לתקן.
 */
export type DealViolationKind = 'ltv' | 'equity' | 'ratio';

export interface DealViolation {
  kind: DealViolationKind;
  message: string;
}

export interface DealCandidate {
  propertyValue: number;
  totalAmount: number;
  dealType: DealType;
  /** ההון העצמי שהוזן. בלי ערך — ההפרש בין עלות הנכס למשכנתא */
  equity?: number;
  /** תקרת ההחזר שנקבעה ללקוח בתמהיל (אם נקבעה) */
  maxMonthlyPayment?: number;
  /** ההחזר החודשי של התמהיל אחרי השינוי */
  monthlyPayment: number;
  /** 40% מההכנסה הפנויה לפי הפרופיל — התקרה הרגולטורית */
  profileCap?: number;
}

/** איזה שדה נערך — קובע את ניסוח ההודעה, לא את הכלל */
export type DealField =
  | 'totalAmount'
  | 'propertyValue'
  | 'equity'
  | 'maxMonthlyPayment'
  | 'dealType'
  | 'propertyAddress';

const shekel = (value: number) => `₪${Math.round(value).toLocaleString('he-IL')}`;

export function checkDealLimits(candidate: DealCandidate, edited: DealField): DealViolation[] {
  const violations: DealViolation[] = [];
  const { propertyValue, totalAmount, dealType } = candidate;
  const dealName = DEAL_TYPES[dealType];
  const ltvLimit = maxLtvPercent(dealType);

  const maxMortgage = maxMortgageFor(propertyValue, dealType);
  const overFinanced = propertyValue > 0 && totalAmount > maxMortgage + 1;
  const minEquity = Math.max(0, propertyValue - maxMortgage);
  const storedEquity = candidate.equity;

  if (storedEquity !== undefined) {
    // ההון העצמי נשמר בנפרד, ולכן נבדק בנפרד מיחס המימון
    if (overFinanced) {
      violations.push({ kind: 'ltv', message: ltvMessage(candidate, maxMortgage) });
    }
    if (propertyValue > 0 && storedEquity < minEquity - 1) {
      violations.push({
        kind: 'equity',
        message: `הון עצמי של ${shekel(storedEquity)} נמוך מהמינימום ל${dealName}: לנכס בעלות ${shekel(propertyValue)} נדרש לפחות ${shekel(minEquity)} (${100 - ltvLimit}% מעלות הנכס).`,
      });
    }
  } else if (overFinanced) {
    const equity = Math.max(0, propertyValue - totalAmount);
    if (edited === 'equity') {
      violations.push({
        kind: 'equity',
        message: `הון עצמי של ${shekel(equity)} נמוך מהמינימום ל${dealName}: לנכס בעלות ${shekel(propertyValue)} נדרש לפחות ${shekel(minEquity)} (${100 - ltvLimit}% מעלות הנכס).`,
      });
    } else {
      violations.push({ kind: 'ltv', message: ltvMessage(candidate, maxMortgage) });
    }
  }

  const cap = candidate.profileCap ?? 0;
  if (cap > 0 && (candidate.maxMonthlyPayment ?? 0) > cap + 1) {
    violations.push({
      kind: 'ratio',
      message: `החזר חודשי מקסימלי של ${shekel(candidate.maxMonthlyPayment ?? 0)} חורג מיחס ההחזר המותר — ${REPAYMENT_RATIO_LIMIT}% מההכנסה הפנויה, כלומר ${shekel(cap)} לפי הפרופיל הפיננסי.`,
    });
  }

  // ההחזר של התמהיל נבדק רק כשהסכום השתנה — שינוי בעלות הנכס או בכתובת לא מזיז אותו
  const amountChanged =
    edited === 'totalAmount' || (edited === 'equity' && storedEquity === undefined);
  const paymentCap = cap > 0 ? Math.min(cap, candidate.maxMonthlyPayment || cap) : candidate.maxMonthlyPayment ?? 0;
  if (amountChanged && paymentCap > 0 && candidate.monthlyPayment > paymentCap + 1) {
    violations.push({
      kind: 'ratio',
      message: `אחרי השינוי ההחזר החודשי של התמהיל יהיה ${shekel(candidate.monthlyPayment)} — מעל תקרת ההחזר של ${shekel(paymentCap)} (${REPAYMENT_RATIO_LIMIT}% מההכנסה הפנויה). האריכו תקופה או הקטינו את המשכנתא.`,
    });
  }

  return violations;
}

function ltvMessage(candidate: DealCandidate, maxMortgage: number): string {
  const { propertyValue, totalAmount, dealType } = candidate;
  const ltv = (totalAmount / propertyValue) * 100;
  return `משכנתא של ${shekel(totalAmount)} על נכס בעלות ${shekel(propertyValue)} היא מימון של ${ltv.toFixed(1)}% — מעל התקרה של ${maxLtvPercent(dealType)}% ל${DEAL_TYPES[dealType]}. אפשר עד ${shekel(maxMortgage)}, או הון עצמי של ${shekel(requiredEquityFor(totalAmount, dealType))} לפחות.`;
}
