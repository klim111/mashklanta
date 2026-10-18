import { Calculator, CreditCard, RefreshCw, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LeadTopic } from '@/lib/advisor-lead-topics';

export type LandingToolId = 'affordability' | 'refinance' | 'equity' | 'loans';

export interface LandingTool {
  id: LandingToolId;
  /** הכתובת של דף הנחיתה באתר */
  path: string;
  /** השם הקצר — בכותרת העליונה ובכרטיסים של הכלים האחרים */
  name: string;
  headline: string;
  subtitle: string;
  highlights: string[];
  icon: LucideIcon;
  /** הגרדיאנט של הכלי — אותו גרדיאנט כמו בכרטיס שלו בעמוד הבית */
  gradient: string;
  /** משכנתא → יועץ משכנתאות; הלוואות → יועץ כלכלת המשפחה */
  advisor: 'mortgage' | 'family';
  leadTopic: LeadTopic;
  metaTitle: string;
  metaDescription: string;
}

export const LANDING_TOOLS: Record<LandingToolId, LandingTool> = {
  affordability: {
    id: 'affordability',
    path: '/afford',
    name: 'כמה משכנתא אפשר לקבל',
    headline: 'כמה דירה אתם באמת יכולים להרשות לעצמכם?',
    subtitle:
      'מזינים הכנסות, הון עצמי והתחייבויות, ומקבלים את שווי הנכס המקסימלי ואת ההחזר החודשי, לפי מגבלות בנק ישראל ולפי הריביות של החודש.',
    highlights: ['לפי מגבלות בנק ישראל', 'ריביות עדכניות מהשוק', 'תוצאה תוך דקות'],
    icon: Calculator,
    gradient: 'from-blue-500 to-cyan-500',
    advisor: 'mortgage',
    leadTopic: 'FEASIBILITY',
    metaTitle: 'מחשבון כמה משכנתא אפשר לקבל | משכלנתא',
    metaDescription:
      'מחשבון חינמי לשווי הנכס המקסימלי שאפשר לקנות: לפי הכנסות, הון עצמי והתחייבויות, עם מגבלות בנק ישראל וריביות עדכניות. בלי הרשמה.',
  },
  refinance: {
    id: 'refinance',
    path: '/refinance-check',
    name: 'בדיקת מיחזור משכנתא',
    headline: 'האם המשכנתא שלכם עולה לכם יותר מדי?',
    subtitle:
      'בוחרים מטרה, מזינים את המסלולים של המשכנתא הקיימת, והמערכת בודקת מול ממוצעי הריביות של בנק ישראל אם יש מקום לחסוך.',
    highlights: ['השוואה לממוצעי בנק ישראל', 'בלי לשלוח מסמכים', 'רואים את החיסכון מיד'],
    icon: RefreshCw,
    gradient: 'from-violet-500 to-purple-600',
    advisor: 'mortgage',
    leadTopic: 'CONSULT_REFINANCE',
    metaTitle: 'בדיקת מיחזור משכנתא בחינם | משכלנתא',
    metaDescription:
      'בודקים בחינם אם כדאי למחזר את המשכנתא: מזינים את המסלולים הקיימים ומשווים לממוצעי הריביות של בנק ישראל. בלי הרשמה ובלי מסמכים.',
  },
  equity: {
    id: 'equity',
    path: '/equity',
    name: 'תכנון הון עצמי',
    headline: 'כמה כסף צריך להביא עד שמקבלים את המפתח?',
    subtitle:
      'מקדמה, מס רכישה, עורך דין, תיווך ושיפוץ, כל ההוצאות של קניית הדירה על ציר זמן אחד, כדי לדעת מראש מתי צריך כל שקל.',
    highlights: ['כל ההוצאות עד המפתח בטבלה אחת', 'תזרים לפי חודשים', 'ייצוא ושיתוף של התכנון'],
    icon: Wallet,
    gradient: 'from-emerald-500 to-teal-600',
    advisor: 'mortgage',
    leadTopic: 'EQUITY',
    metaTitle: 'מחשבון הון עצמי ומס רכישה לקניית דירה | משכלנתא',
    metaDescription:
      'מתכננים את ההון העצמי לקניית דירה: מקדמה, מס רכישה, עו״ד, תיווך ושיפוץ על ציר זמן אחד. כלי חינמי, בלי הרשמה.',
  },
  loans: {
    id: 'loans',
    path: '/loans',
    name: 'ניתוח הלוואות',
    headline: 'כל ההלוואות שלכם במקום אחד, ומה אפשר לחסוך',
    subtitle:
      'ממפים את ההלוואות הקיימות ורואים מיד את ההחזר החודשי, את הריבית עד הסוף, ואת מה שאיחוד או פירעון מוקדם יכולים לחסוך למשפחה.',
    highlights: ['יחס החזר מההכנסה', 'תרחישי איחוד ופירעון מוקדם', 'השוואה לריביות בשוק'],
    icon: CreditCard,
    gradient: 'from-amber-500 to-orange-600',
    advisor: 'family',
    leadTopic: 'FAMILY_ECONOMY',
    metaTitle: 'מחשבון הלוואות, איחוד הלוואות ופירעון מוקדם | משכלנתא',
    metaDescription:
      'מרכזים את כל ההלוואות במקום אחד: החזר חודשי, ריבית עד הסוף, יחס החזר מההכנסה ותרחישי איחוד ופירעון מוקדם. כלי חינמי של משכלנתא.',
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
