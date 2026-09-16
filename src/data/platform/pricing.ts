import { Bot, Handshake, UserCheck, type LucideIcon } from 'lucide-react';
import { journeyStages, stagesTotalPrice } from './journey';
import {
  FULL_SERVICE_PRICE,
  PLATFORM_MONTHLY_PRICE,
  PRICING_PRINCIPLES,
} from '@/lib/service-flow';

/**
 * המחירים עצמם וחוקי התמחור יושבים ב-`src/lib/service-flow.ts`, כי גם השרת
 * צריך אותם. כאן רק התוכן השיווקי שנבנה מעליהם.
 */
export { FULL_SERVICE_PRICE, PLATFORM_MONTHLY_PRICE, PRICING_PRINCIPLES };

/** How much the bundle saves compared to buying every stage separately */
export const BUNDLE_SAVING = stagesTotalPrice - FULL_SERVICE_PRICE;

export type PlanId = 'self' | 'hybrid' | 'full';

export type PricingPlan = {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  icon: LucideIcon;
  gradient: string;
  ring: string;
  popular?: boolean;
  features: string[];
  bestFor: string;
  ctaLabel: string;
  ctaHref: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: 'self',
    name: 'עצמאי',
    tagline: 'לתכנן הכל לבד באמצעות משכלתנא — עם כל הכלים של היועץ',
    price: `₪${PLATFORM_MONTHLY_PRICE}`,
    priceNote: 'לחודש, עד לסיום התהליך · מקוזז אם תבקשו ליווי',
    icon: Bot,
    gradient: 'from-blue-500 to-cyan-500',
    ring: 'ring-blue-200',
    features: [
      'גישה מלאה לכל הכלים והמחשבונים בפלטפורמה',
      'בונה תמהיל, סלים אחידים ולוחות סילוקין מלאים',
      'חישוב IRR, סימולציות ריבית ופירעון מוקדם',
      'תיק מסמכים דיגיטלי וצ׳ק־ליסט לפי סטטוס תעסוקתי',
      'מעקב שלבים ותחזיות לאורך חיי המשכנתא',
      'ללא התחייבות — ניתן לבטל בכל חודש',
      'החלטתם באמצע להיעזר ביועץ? מה ששילמתם מקוזז ממחיר הליווי',
    ],
    bestFor: 'למי שמבין מספרים, יש לו זמן ורוצה לנהל את התהליך בעצמו',
    ctaLabel: 'התחילו חודש ראשון',
    ctaHref: '/auth/register',
  },
  {
    id: 'hybrid',
    name: 'ליווי משולב',
    tagline: 'מבצעים חלק מהתהליך עצמאית ומקבלים עזרה בשלבים שתבחרו',
    price: 'לפי שלב',
    priceNote: `החל מ-₪${journeyStages[4].advisorPrice.toLocaleString('he-IL')} לשלב · הגישה לפלטפורמה כלולה`,
    icon: Handshake,
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-300',
    popular: true,
    features: [
      'כל מה שכלול במסלול העצמאי — הגישה לפלטפורמה כלולה במחיר',
      'בחירה חופשית של השלבים שהיועץ יבצע עבורכם — שלב אחד או כמה',
      'תמחור שקוף לכל שלב, ותמיד המחיר הנמוך מבין כל האופציות',
      'אפשר להוסיף שלב באמצע התהליך, בלי להתחיל מחדש',
      'שיחות וידאו ישירות עם היועץ מתוך הפלטפורמה',
      'השוואה מלאה בין מה שהשגתם לבד למה שהיועץ השיג',
    ],
    bestFor: 'לרוב הלקוחות — בונים תמהיל לבד ומשאירים את ההתמחרות ליועץ',
    ctaLabel: 'בנו את החבילה שלכם',
    ctaHref: '/pricing#builder',
  },
  {
    id: 'full',
    name: 'ליווי מלא',
    tagline: 'מקבלים ליווי מלא עד לחתימה סופית של המשכנתא',
    price: `₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`,
    priceNote: 'תשלום חד-פעמי, כולל גישה מלאה לפלטפורמה',
    icon: UserCheck,
    gradient: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-200',
    features: [
      'כל חמשת השלבים מבוצעים על ידי יועץ מלווה',
      'גישה לפלטפורמה ללא תשלום חודשי נוסף',
      'ניהול מלא של מכרז הריביות מול כל הבנקים',
      'ליווי אישי לפגישת החתימות בבנק',
      'שקיפות מלאה — רואים כל צעד שהיועץ מבצע',
      `חיסכון של ₪${BUNDLE_SAVING.toLocaleString('he-IL')} לעומת רכישת השלבים בנפרד`,
    ],
    bestFor: 'למי שרוצה שקט נפשי מלא ואפס התעסקות מול הבנקים',
    ctaLabel: 'בקשו ליווי מלא',
    ctaHref: '/#start',
  },
];

export type ComparisonRow = {
  capability: string;
  self: boolean | string;
  hybrid: boolean | string;
  full: boolean | string;
};

export const comparisonRows: ComparisonRow[] = [
  { capability: 'כלים, מחשבונים וסימולציות', self: true, hybrid: true, full: true },
  { capability: 'בניית תמהיל ולוח סילוקין מלא', self: true, hybrid: true, full: true },
  { capability: 'תיק מסמכים דיגיטלי ומעקב שלבים', self: true, hybrid: true, full: true },
  { capability: 'מעקב אחרי המשכנתא לאחר החתימה', self: true, hybrid: true, full: true },
  { capability: 'ניתוח חיתומי מקדים על ידי יועץ', self: false, hybrid: 'לפי בחירה', full: true },
  { capability: 'בניית תמהיל על ידי יועץ', self: false, hybrid: 'לפי בחירה', full: true },
  { capability: 'הגשה מקבילה למספר בנקים', self: 'עצמאית', hybrid: 'לפי בחירה', full: true },
  { capability: 'ניהול מכרז ריביות מול הבנקים', self: false, hybrid: 'לפי בחירה', full: true },
  { capability: 'ליווי אישי לפגישת החתימות', self: false, hybrid: 'לפי בחירה', full: true },
  { capability: 'השוואה בין ברירת המחדל לתוצר היועץ', self: false, hybrid: true, full: true },
  { capability: 'גישה לפלטפורמה כלולה במחיר', self: 'זה המחיר', hybrid: true, full: true },
  { capability: 'קיזוז מה ששולם על הפלטפורמה', self: 'כשמצטרפים ליווי', hybrid: true, full: true },
  {
    capability: 'עלות',
    self: `₪${PLATFORM_MONTHLY_PRICE} לחודש`,
    hybrid: 'לפי שלב · הנמוך מבין האופציות',
    full: `₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`,
  },
];

export const pricingFaq: { question: string; answer: string }[] = [
  {
    question: 'מה קורה אם התחלתי לבד ובאמצע הבנתי שאני צריך יועץ?',
    answer:
      `זה בדיוק המודל. כל שלב נרכש בנפרד ובכל רגע, גם אחרי שהתחלתם — ומה ששילמתם עד אז על הגישה לפלטפורמה (₪${PLATFORM_MONTHLY_PRICE} לחודש) מקוזז ממחיר הליווי. כל הנתונים שהזנתם עוברים ליועץ כמו שהם — הוא ממשיך מהנקודה שבה עצרתם ולא מתחילים מאפס.`,
  },
  {
    question: 'עד מתי משלמים על הגישה לפלטפורמה?',
    answer:
      `הגישה בסך ₪${PLATFORM_MONTHLY_PRICE} נגבית מדי חודש עד לסיום התהליך, וניתן להפסיק אותה בכל עת. בכל הזמנת ליווי — לשלב בודד, לכמה שלבים או ליווי מלא — הגישה המלאה לפלטפורמה כלולה במחיר ואין תשלום חודשי נוסף.`,
  },
  {
    question: 'איך נקבע המחיר כשמשלבים שלבים לבד ושלבים עם יועץ?',
    answer:
      `סוכמים את השלבים שהיועץ מבצע, משווים לליווי המלא (₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}), מקזזים מה שכבר שולם על הפלטפורמה — ותמיד מחייבים במחיר הנמוך מבין כל האופציות. בכל שלב אפשר להחליט מחדש.`,
  },
  {
    question: 'למה השלבים בנפרד יקרים יותר מהחבילה המלאה?',
    answer:
      `סכום חמשת השלבים בנפרד הוא ₪${stagesTotalPrice.toLocaleString('he-IL')}, והחבילה המלאה עולה ₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')} — חיסכון של ₪${BUNDLE_SAVING.toLocaleString('he-IL')}. ליווי רציף חוסך ליועץ עבודת היכרות חוזרת בכל שלב, וההנחה מגולגלת אליכם.`,
  },
  {
    question: 'אני משלם ליועץ, אז למה שאקבל גישה לכלים שלו?',
    answer:
      'כי בלי הכלים אין לכם דרך לדעת אם העבודה הייתה טובה. הפלטפורמה מציגה את התמהיל שהיועץ בנה מול ברירת המחדל של הבנק, עם כל החישובים גלויים — כדי שתראו בדיוק כמה נחסך ואיך.',
  },
  {
    question: 'האם יש התחייבות או דמי ביטול?',
    answer:
      'אין התחייבות על המנוי החודשי. שלב שנרכש ולא בוצע מזוכה במלואו. שלב שהחל בביצוע מחויב יחסית לעבודה שכבר נעשתה.',
  },
  {
    question: 'איך אני יודע שהריבית שהיועץ השיג באמת טובה?',
    answer:
      'כל הצעה שהתקבלה נכנסת לפלטפורמה ומושווית על אותו בסיס — אותו תמהיל, אותה תקופה, אותו לוח סילוקין. אתם רואים את העלות הכוללת ואת ה-IRR של כל הצעה זו לצד זו, כולל ההצעה הראשונה שהבנק נתן.',
  },
];

export { journeyStages, stagesTotalPrice };
