/**
 * מסלול השירות של הלקוח — הטיפוסים, התוויות וחוקי התמחור.
 *
 * הקובץ טהור בכוונה: הוא נטען גם במסלולי ה-API (לאימות בקשות ליווי ולחישוב
 * הצעת מחיר) וגם ברכיבי הלקוח (הדאשבורד, עמוד הבית, התמחור), ולכן אינו מייבא
 * את Prisma ואינו נוגע ב-React.
 *
 * הזרימה: הלקוח בוחר קודם *מה הוא רוצה לעשות* (משכנתא חדשה, מיחזור או ייעוץ),
 * ואחר כך *איך* (לבד, ליווי משולב או ליווי מלא). בחירה בליווי הופכת לבקשת
 * ליווי שמגיעה ליועצים; בחירה במסלול העצמאי פותחת את כלי התכנון.
 */

import { journeyStages } from '@/data/platform/journey';
import { MAX_OPEN_PROCESSES, PROCESS_ACCESS_DAYS, PROCESS_PRICE, TYPICAL_PROCESS_MONTHS } from './process-access';

// ─────────────────────────────── מה רוצים לעשות ───────────────────────────────

export const MORTGAGE_GOALS = ['NEW_MORTGAGE', 'REFINANCE', 'ADVICE'] as const;
export type MortgageGoal = (typeof MORTGAGE_GOALS)[number];

export const GOAL_LABELS: Record<MortgageGoal, { title: string; description: string }> = {
  NEW_MORTGAGE: {
    title: 'לקחת משכנתא חדשה',
    description: 'קונים נכס ורוצים לתכנן, להשוות ולסגור את המשכנתא הנכונה',
  },
  REFINANCE: {
    title: 'למחזר משכנתא קיימת',
    description: 'יש כבר משכנתא — בודקים אם אפשר לשפר תנאים, החזר או תקופה',
  },
  ADVICE: {
    title: 'לקבל ייעוץ והכוונה בנושא משכנתא',
    description: 'עדיין לא בטוחים מה נכון לכם — יועץ יחזור אליכם ויכוון',
  },
};

export function isMortgageGoal(value: unknown): value is MortgageGoal {
  return typeof value === 'string' && (MORTGAGE_GOALS as readonly string[]).includes(value);
}

// ─────────────────────────────── איך רוצים לעשות ───────────────────────────────

/**
 * סוג השירות. `GUIDANCE` הוא ייעוץ והכוונה כללי — בקשה שאינה קשורה למסלול
 * מסוים, ולכן היא לא "לבד" ולא "ליווי לשלבים".
 */
export const SERVICE_TYPES = ['SELF', 'HYBRID', 'FULL', 'GUIDANCE'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/**
 * שני המסלולים שהלקוח שעדיין לא שילם בוחר ביניהם אחרי שבחר משכנתא חדשה או
 * מיחזור: עצמאי / היברידי (מתחילים לבד, ובכל שלב אפשר להעביר ליועץ) וליווי מלא.
 * `HYBRID` נשאר סוג שירות — כך מסומנת בקשת ליווי שנשלחת מתוך שלב — אבל אינו
 * מסלול נפרד לבחירה.
 */
export const SERVICE_CHOICES = ['SELF', 'FULL'] as const;
export type ServiceChoice = (typeof SERVICE_CHOICES)[number];

export const SERVICE_LABELS: Record<ServiceType, { title: string; description: string }> = {
  SELF: {
    title: 'עצמאי / היברידי',
    description:
      'מתחילים לבד עם הכלים של משכלנתא, ובכל שלב שצריך עזרה מעבירים את הטיפול ליועץ משכלנתא',
  },
  HYBRID: {
    title: 'ליווי משולב',
    description: 'מבצעים חלק מהתהליך עצמאית ומקבלים עזרה בשלבים שתבחרו',
  },
  FULL: {
    title: 'ליווי מלא',
    description: 'מקבלים ליווי מלא עד לחתימה סופית של המשכנתא',
  },
  GUIDANCE: {
    title: 'ייעוץ והכוונה',
    description: 'שיחה עם יועץ שמכוון אתכם לפני שמתחילים',
  },
};

export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === 'string' && (SERVICE_TYPES as readonly string[]).includes(value);
}

/** בקשת ליווי נשלחת ליועצים רק כשהלקוח ביקש עזרה — לא במסלול העצמאי */
export function serviceNeedsAdvisor(service: ServiceType): boolean {
  return service !== 'SELF';
}

// ─────────────────────────────── בקשת ליווי ───────────────────────────────

/**
 * הבחירה ב"מה תרצו לעשות?" הופכת לנושא פנייה ליועץ (`AdvisorLead.topic`),
 * כדי שהבקשה תופיע באותו אזור בקשות שהיועץ כבר עובד בו, עם תווית שאומרת
 * בדיוק מה הלקוח ביקש.
 */
export function leadTopicFor(goal: MortgageGoal, service: ServiceType): string {
  if (goal === 'ADVICE' || service === 'GUIDANCE') return 'ADVICE';
  const kind = service === 'FULL' ? 'FULL' : 'HYBRID';
  return goal === 'REFINANCE' ? `REFINANCE_${kind}` : `NEW_MORTGAGE_${kind}`;
}

// ─────────────────────────────── חוקי התמחור ───────────────────────────────

/** המסלול העצמאי / ההיברידי — לתהליך משכנתא אחד, לתקופת הגישה */
export const PLATFORM_PROCESS_PRICE = PROCESS_PRICE;

/** כמה ימים הכלים פתוחים מכל תשלום על תהליך */
export const PLATFORM_ACCESS_DAYS = PROCESS_ACCESS_DAYS;

/** כמה תהליכים פתוחים אפשר לנהל במקביל על אותה חבילת גישה */
export const PLATFORM_MAX_OPEN_PROCESSES = MAX_OPEN_PROCESSES;

/** העלות הכוללת של הגישה בתהליך טיפוסי — חודש עד שלושה חודשים */
export const PLATFORM_TYPICAL_TOTAL = {
  min: PLATFORM_PROCESS_PRICE * TYPICAL_PROCESS_MONTHS.min,
  max: PLATFORM_PROCESS_PRICE * TYPICAL_PROCESS_MONTHS.max,
} as const;

/**
 * מה חשוב לדעת על החיוב במסלול העצמאי — בעמוד התמחור, במסך התשלום ובעמוד
 * הבית. נוסח אחד, מקור אחד. הנוסח מרגיע ולא מזהיר: אין הפתעות, העלות צפויה,
 * ותקופה שנפתחה היא סכום קבוע.
 */
export const PLATFORM_BILLING_NOTES: Array<{ id: string; title: string; description: string }> = [
  {
    id: 'no-auto',
    title: 'אין חיוב בלי אישור שלכם',
    description: `הפלטפורמה לא מחייבת שוב מעצמה. כש-${PLATFORM_ACCESS_DAYS} הימים מסתיימים, אתם מחליטים אם להמשיך.`,
  },
  {
    id: 'range',
    title: `בדרך כלל ₪${PLATFORM_TYPICAL_TOTAL.min} עד ₪${PLATFORM_TYPICAL_TOTAL.max} בסך הכול`,
    description: `תהליך משכנתא לוקח בדרך כלל בין חודש לשלושה חודשים, ולכן העלות הכוללת של הגישה נעה בין ₪${PLATFORM_TYPICAL_TOTAL.min} ל-₪${PLATFORM_TYPICAL_TOTAL.max}.`,
  },
  {
    id: 'period',
    title: 'משלמים לתקופה, לא ליום',
    description: `כל חבילה היא סכום קבוע ל-${PLATFORM_ACCESS_DAYS} יום. סיימתם מוקדם? מצוין, חסכתם זמן. ימים שנשארו בחבילה אינם מוחזרים.`,
  },
];

/** ליווי מלא — חמשת השלבים יחד */
export const FULL_SERVICE_PRICE = 6000;

/** סכום חמשת השלבים כשרוכשים אותם אחד-אחד */
export const STAGES_TOTAL_PRICE = journeyStages.reduce((sum, stage) => sum + stage.advisorPrice, 0);

/**
 * חמשת העקרונות שמוצגים ללקוח בכל מקום שבו מדברים על כסף — בדאשבורד, בעמוד
 * הבית, ב"איך זה עובד" ובתמחור. נוסח אחד, מקור אחד.
 */
export const PRICING_PRINCIPLES: Array<{ id: string; title: string; description: string }> = [
  {
    id: 'platform',
    title: `גישה לפלטפורמה — ₪${PLATFORM_PROCESS_PRICE} לתהליך משכנתא`,
    description: `כל השלבים וכל הכלים פתוחים עד ${PLATFORM_ACCESS_DAYS} יום. צריכים עוד זמן? רוכשים חבילה נוספת באותו מחיר, רק באישור שלכם.`,
  },
  {
    id: 'credit',
    title: 'רכשתם גישה ואז ביקשתם ליווי? הכסף לא הולך לאיבוד',
    description:
      'מה ששילמתם על הפלטפורמה מקוזז ממחיר הייעוץ — לשלב אחד או לליווי מלא.',
  },
  {
    id: 'included',
    title: 'כל הזמנת ליווי כוללת גישה מלאה לפלטפורמה',
    description:
      'הזמנתם ליווי לשלב בודד, לכמה שלבים או ליווי מלא — הגישה לכל הכלים כלולה במחיר.',
  },
  {
    id: 'freedom',
    title: 'בכל שלב בוחרים מחדש',
    description:
      'לבד, ליווי לשלב בודד, לכמה שלבים או ליווי מלא — ההחלטה פתוחה בכל נקודה בתהליך.',
  },
  {
    id: 'lowest',
    title: 'תמיד המחיר הנמוך מבין כל האופציות',
    description:
      'לא משנה איך הגעתם — אם צירוף אחר של שלבים היה זול יותר, זה המחיר שתשלמו.',
  },
];

export interface AdvisoryQuoteInput {
  /** מזהי השלבים (מ-journeyStages) שהיועץ יבצע */
  stageIds: string[];
  /** כמה כבר שולם על הגישה לפלטפורמה לפני ההזמנה, בשקלים */
  platformPaid?: number;
}

export interface AdvisoryQuote {
  /** סכום השלבים שנבחרו, אחד-אחד */
  stagesPrice: number;
  /** מחיר הליווי לפני קיזוז — הנמוך מבין השלבים בנפרד לבין ליווי מלא */
  advisoryPrice: number;
  /** האם מחיר הליווי המלא הוא שנבחר, כי הוא היה זול יותר מהשלבים בנפרד */
  bundleApplied: boolean;
  /** הקיזוז על גישה לפלטפורמה שכבר שולמה */
  platformCredit: number;
  /** מה משלמים בפועל */
  total: number;
  /** הגישה לפלטפורמה כלולה — בכל הזמנת ליווי */
  platformIncluded: boolean;
}

/**
 * הצעת מחיר לליווי, לפי חוקי התמחור:
 *  1. שלבים בנפרד או ליווי מלא — הנמוך מביניהם.
 *  2. מה ששולם על הגישה לפלטפורמה מקוזז מהמחיר, ולא יורד מתחת לאפס.
 *  3. הגישה לפלטפורמה כלולה בכל הזמנה.
 */
export function quoteAdvisory({ stageIds, platformPaid = 0 }: AdvisoryQuoteInput): AdvisoryQuote {
  const chosen = new Set(stageIds);
  const stagesPrice = journeyStages
    .filter((stage) => chosen.has(stage.id))
    .reduce((sum, stage) => sum + stage.advisorPrice, 0);

  if (stagesPrice === 0) {
    return {
      stagesPrice: 0,
      advisoryPrice: 0,
      bundleApplied: false,
      platformCredit: 0,
      total: 0,
      platformIncluded: false,
    };
  }

  const bundleApplied = FULL_SERVICE_PRICE < stagesPrice;
  const advisoryPrice = bundleApplied ? FULL_SERVICE_PRICE : stagesPrice;
  const paid = Math.max(0, Math.floor(platformPaid));
  const platformCredit = Math.min(paid, advisoryPrice);

  return {
    stagesPrice,
    advisoryPrice,
    bundleApplied,
    platformCredit,
    total: advisoryPrice - platformCredit,
    platformIncluded: true,
  };
}

/**
 * כמה חודשי מנוי חלפו מאז הרכישה — רק למנויים החודשיים מלפני המעבר לתשלום
 * לתהליך, לצורך הקיזוז שלהם
 */
export function platformMonthsSince(since: Date | string | null | undefined, now = new Date()): number {
  if (!since) return 0;
  const start = new Date(since);
  if (Number.isNaN(start.getTime()) || start > now) return 0;
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  // חודש הרכישה עצמו נספר — הוא שולם
  return Math.max(1, months + 1);
}
