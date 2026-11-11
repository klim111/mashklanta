import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { REPAYMENT_RATIO_LIMIT } from '@/lib/mortgage-plan';

type AssignableMix = Pick<WorkspaceMix, 'propertyValue' | 'borrowers'>;

/** סך ההכנסה החודשית נטו של הלווים שהיועץ הזין בתמהיל */
export function borrowersIncome(mix: Pick<WorkspaceMix, 'borrowers'>): number {
  return (mix.borrowers ?? []).reduce((sum, item) => sum + (item.monthlyIncome ?? 0), 0);
}

/** ההחזר החודשי המקסימלי שנגזר מההכנסה — 40% ממנה, כמו בכל שאר המערכת */
export function maxPaymentFromIncome(income: number): number {
  return income > 0 ? Math.round(income * (REPAYMENT_RATIO_LIMIT / 100)) : 0;
}

/**
 * מה חסר בתמהיל לפני שהיועץ משייך אותו ללקוח: מחיר הנכס והכנסה חודשית של
 * הלווים. מהם נגזרים ההון העצמי, אחוז המימון וההחזר החודשי המקסימלי שהלקוח
 * יראה. רשימה ריקה — אפשר לשייך.
 */
export function assignmentGaps(mix: AssignableMix): string[] {
  const gaps: string[] = [];
  if (!((mix.propertyValue ?? 0) > 0)) gaps.push('מחיר הנכס');
  if (borrowersIncome(mix) <= 0) gaps.push('הכנסה חודשית של הלווים');
  return gaps;
}

/** ההודעה שמוצגת כששיוך נחסם */
export function assignmentGapsMessage(gaps: string[]): string {
  return `לפני שיוך ללקוח צריך להזין בבונה התמהילים: ${gaps.join(' ו')}.`;
}
