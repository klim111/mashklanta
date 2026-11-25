import { Calculator, CreditCard, RefreshCw, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LeadTopic } from '@/lib/advisor-lead-topics';

export type LandingToolId = 'affordability' | 'refinance' | 'equity' | 'loans';

/** מה שקבוע בכל דף כלי. הטקסטים נערכים מלוח היועץ — src/lib/landing-content.ts */
export interface LandingTool {
  id: LandingToolId;
  /** הכתובת של דף הנחיתה באתר */
  path: string;
  icon: LucideIcon;
  /** הגרדיאנט של הכלי — אותו גרדיאנט כמו בכרטיס שלו בעמוד הבית */
  gradient: string;
  /** משכנתא → יועץ משכנתאות; הלוואות → יועץ כלכלת המשפחה */
  advisor: 'mortgage' | 'family';
  leadTopic: LeadTopic;
}

export const LANDING_TOOLS: Record<LandingToolId, LandingTool> = {
  affordability: {
    id: 'affordability',
    path: '/afford',
    icon: Calculator,
    gradient: 'from-blue-500 to-cyan-500',
    advisor: 'mortgage',
    leadTopic: 'FEASIBILITY',
  },
  refinance: {
    id: 'refinance',
    path: '/refinance-check',
    icon: RefreshCw,
    gradient: 'from-violet-500 to-purple-600',
    advisor: 'mortgage',
    leadTopic: 'CONSULT_REFINANCE',
  },
  equity: {
    id: 'equity',
    path: '/equity',
    icon: Wallet,
    gradient: 'from-emerald-500 to-teal-600',
    advisor: 'mortgage',
    leadTopic: 'EQUITY',
  },
  loans: {
    id: 'loans',
    path: '/loans',
    icon: CreditCard,
    gradient: 'from-amber-500 to-orange-600',
    advisor: 'family',
    leadTopic: 'FAMILY_ECONOMY',
  },
};

export const LANDING_TOOL_ORDER: LandingToolId[] = ['affordability', 'refinance', 'equity', 'loans'];

/**
 * כתובת בפלטפורמה המלאה. כשדפי הנחיתה יוגשו מדומיין משלהם, `NEXT_PUBLIC_PLATFORM_URL`
 * (למשל https://mashkalanta.com) מוודא שהקישורים יוצאים לאתר הראשי ולא נשארים בדומיין
 * של דף הנחיתה. בלי המשתנה הקישורים יחסיים, כמו בשאר האתר.
 */
export function platformUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_PLATFORM_URL ?? '').replace(/\/$/, '');
  return `${base}${path}`;
}
