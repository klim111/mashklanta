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
 * עריכה שחורגת נחסמת עם הסבר; עריכה תקינה נשמרת לתהליך ומשם נמשכת לכל המסכים.
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

  if (propertyValue > 0 && totalAmount > maxMortgageFor(propertyValue, dealType) + 1) {
    const ltv = (totalAmount / propertyValue) * 100;
    const maxMortgage = maxMortgageFor(propertyValue, dealType);
    const requiredEquity = requiredEquityFor(totalAmount, dealType);
    const equity = Math.max(0, propertyValue - totalAmount);

    if (edited === 'equity') {
      violations.push({
        kind: 'equity',
        message: `הון עצמי של ${shekel(equity)} נמוך מהמינימום ל${dealName}: לנכס בעלות ${shekel(propertyValue)} נדרש לפחות ${shekel(propertyValue - maxMortgage)} (${100 - ltvLimit}% מעלות הנכס). השינוי לא נשמר.`,
      });
    } else {
      violations.push({
        kind: 'ltv',
        message: `משכנתא של ${shekel(totalAmount)} על נכס בעלות ${shekel(propertyValue)} היא מימון של ${ltv.toFixed(1)}% — מעל התקרה של ${ltvLimit}% ל${dealName}. אפשר עד ${shekel(maxMortgage)}, או הון עצמי של ${shekel(requiredEquity)} לפחות. השינוי לא נשמר.`,
      });
    }
  }

  const cap = candidate.profileCap ?? 0;
  if (cap > 0 && (candidate.maxMonthlyPayment ?? 0) > cap + 1) {
    violations.push({
      kind: 'ratio',
      message: `החזר חודשי מקסימלי של ${shekel(candidate.maxMonthlyPayment ?? 0)} חורג מיחס ההחזר המותר — ${REPAYMENT_RATIO_LIMIT}% מההכנסה הפנויה, כלומר ${shekel(cap)} לפי הפרופיל הפיננסי. השינוי לא נשמר.`,
    });
  }

  // ההחזר של התמהיל נבדק רק כשהסכום השתנה — שינוי בעלות הנכס או בכתובת לא מזיז אותו
  const amountChanged = edited === 'totalAmount' || edited === 'equity';
  const paymentCap = cap > 0 ? Math.min(cap, candidate.maxMonthlyPayment || cap) : candidate.maxMonthlyPayment ?? 0;
  if (amountChanged && paymentCap > 0 && candidate.monthlyPayment > paymentCap + 1) {
    violations.push({
      kind: 'ratio',
      message: `אחרי השינוי ההחזר החודשי של התמהיל יהיה ${shekel(candidate.monthlyPayment)} — מעל תקרת ההחזר של ${shekel(paymentCap)} (${REPAYMENT_RATIO_LIMIT}% מההכנסה הפנויה). האריכו תקופה או הקטינו את המשכנתא לפני השינוי. השינוי לא נשמר.`,
    });
  }

  return violations;
}
