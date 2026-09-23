import { Bot, UserCheck, type LucideIcon } from 'lucide-react';
import { journeyStages, stagesTotalPrice } from './journey';
import {
  FULL_SERVICE_PRICE,
  PLATFORM_ACCESS_DAYS,
  PLATFORM_PROCESS_PRICE,
  PRICING_PRINCIPLES,
} from '@/lib/service-flow';

/**
 * המחירים עצמם וחוקי התמחור יושבים ב-`src/lib/service-flow.ts`, כי גם השרת
 * צריך אותם. כאן רק התוכן השיווקי שנבנה מעליהם.
 */
export { FULL_SERVICE_PRICE, PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE, PRICING_PRINCIPLES };

/** How much the bundle saves compared to buying every stage separately */
export const BUNDLE_SAVING = stagesTotalPrice - FULL_SERVICE_PRICE;

/**
 * הכותרת והפסקה שמעל שני המסלולים — במקום "שלושה מסלולים". אותו נוסח
 * באזור האישי, בעמוד הבית ובעמוד התמחור.
 */
export const TRACKS_HEADLINE = 'אתם מחליטים כמה ליווי צריך. אנחנו דואגים שזה לא יעלה הון';
export const TRACKS_INTRO =
  'במשכלנתא אפשר לתכנן לבד, להיעזר ביועץ רק בשלב שבו צריך, או לקבל ליווי מלא עד החתימה, ולעבור ביניהם בכל רגע. ' +
  'הכלים החכמים שלנו ושיטת עבודה מסודרת הופכים את התהליך לפשוט וזורם יותר, וזה מה שמאפשר לנו לתת ליווי מקצועי ברמה הגבוהה ביותר במחיר נמוך בהרבה. ' +
  'המטרה שלנו פשוטה: שתגיעו לבנק חזקים, מבינים ובטוחים, בלי שהמשכנתא תקרע לכם את הכיס עוד לפני שהתחילה.';

export type PlanId = 'self' | 'full';

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
    name: 'עצמאי / היברידי',
    tagline: 'מתחילים לבד, ובכל שלב שצריך עזרה מעבירים את הטיפול ליועץ משכלנתא',
    price: `₪${PLATFORM_PROCESS_PRICE}`,
    priceNote: `לתהליך משכנתא · ${PLATFORM_ACCESS_DAYS} יום גישה מלאה · מקוזז אם תבקשו ליווי`,
    icon: Bot,
    gradient: 'from-blue-500 to-cyan-500',
    ring: 'ring-blue-200',
    popular: true,
    features: [
      'גישה מלאה לכל הכלים והמחשבונים בפלטפורמה',
      'בונה תמהיל, סלים אחידים ולוחות סילוקין מלאים',
      'חישוב IRR, סימולציות ריבית ופירעון מוקדם',
      'תיק מסמכים דיגיטלי וצ׳ק־ליסט לפי סטטוס תעסוקתי',
      'בכל שלב: כפתור "פנו ליועץ משכלנתא" שמעביר אליו את השלב, עם כל מה שכבר הזנתם',
      'תמחור שקוף לכל שלב שהיועץ לוקח, ותמיד המחיר הנמוך מבין האופציות',
      `צריכים יותר מ-${PLATFORM_ACCESS_DAYS} יום? מחדשים באותו מחיר`,
    ],
    bestFor: 'לרוב הלקוחות: בונים לבד ומצרפים יועץ בשלב שבו זה באמת משתלם',
    ctaLabel: 'מתחילים לבד',
    ctaHref: '/auth/register',
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
      'גישה מלאה לפלטפורמה ללא תשלום נוסף, עד לסיום התהליך',
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
  full: boolean | string;
};

export const comparisonRows: ComparisonRow[] = [
  { capability: 'כלים, מחשבונים וסימולציות', self: true, full: true },
  { capability: 'בניית תמהיל ולוח סילוקין מלא', self: true, full: true },
  { capability: 'תיק מסמכים דיגיטלי ומעקב שלבים', self: true, full: true },
  { capability: 'מעקב אחרי המשכנתא לאחר החתימה', self: true, full: true },
  { capability: 'ניתוח חיתומי מקדים על ידי יועץ', self: 'בכל שלב שתבחרו', full: true },
  { capability: 'בניית תמהיל על ידי יועץ', self: 'בכל שלב שתבחרו', full: true },
  { capability: 'הגשה מקבילה למספר בנקים', self: 'עצמאית או עם יועץ', full: true },
  { capability: 'ניהול מכרז ריביות מול הבנקים', self: 'בכל שלב שתבחרו', full: true },
  { capability: 'ליווי אישי לפגישת החתימות', self: 'בכל שלב שתבחרו', full: true },
  { capability: 'השוואה בין ברירת המחדל לתוצר היועץ', self: true, full: true },
  { capability: 'קיזוז מה ששולם על הפלטפורמה', self: 'כשמצרפים יועץ', full: true },
  {
    capability: 'עלות',
    self: `₪${PLATFORM_PROCESS_PRICE} לתהליך · ${PLATFORM_ACCESS_DAYS} יום`,
    full: `₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`,
  },
];

export const pricingFaq: { question: string; answer: string }[] = [
  {
    question: 'מה קורה אם התחלתי לבד ובאמצע הבנתי שאני צריך יועץ?',
    answer:
      `זה בדיוק המודל. בכל שלב יש כפתור "פנו ליועץ משכלנתא", והשלב עובר אליו — גם אחרי שהתחלתם. מה ששילמתם על הגישה לפלטפורמה (₪${PLATFORM_PROCESS_PRICE}) מקוזז ממחיר הליווי. כל הנתונים שהזנתם עוברים ליועץ כמו שהם — הוא ממשיך מהנקודה שבה עצרתם ולא מתחילים מאפס.`,
  },
  {
    question: 'כמה עולה הגישה לפלטפורמה ולכמה זמן?',
    answer:
      `₪${PLATFORM_PROCESS_PRICE} לתהליך משכנתא אחד (משכנתא חדשה או מיחזור), עם גישה מלאה לכל הכלים ל-${PLATFORM_ACCESS_DAYS} יום. לא הספקתם? מחדשים לעוד ${PLATFORM_ACCESS_DAYS} יום באותו מחיר. תהליך נוסף, אחרי שהקודם הסתיים, נרכש בנפרד. בכל הזמנת ליווי הגישה המלאה כלולה במחיר.`,
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
      'אין מנוי ואין חיוב חוזר: משלמים פעם אחת על התהליך, ומחדשים רק אם צריך. שלב ליווי שנרכש ולא בוצע מזוכה במלואו. שלב שהחל בביצוע מחויב יחסית לעבודה שכבר נעשתה.',
  },
  {
    question: 'איך אני יודע שהריבית שהיועץ השיג באמת טובה?',
    answer:
      'כל הצעה שהתקבלה נכנסת לפלטפורמה ומושווית על אותו בסיס — אותו תמהיל, אותה תקופה, אותו לוח סילוקין. אתם רואים את העלות הכוללת ואת ה-IRR של כל הצעה זו לצד זו, כולל ההצעה הראשונה שהבנק נתן.',
  },
];

export { journeyStages, stagesTotalPrice };
