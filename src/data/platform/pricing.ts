import { Bot, Handshake, UserCheck, type LucideIcon } from 'lucide-react';
import { journeyStages, stagesTotalPrice } from './journey';

/** Monthly platform subscription, charged until the mortgage is signed */
export const PLATFORM_MONTHLY_PRICE = 120;

/** All five advisor stages bought together */
export const FULL_SERVICE_PRICE = 6000;

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
    tagline: 'כל הכלים של היועץ — בידיים שלכם',
    price: `₪${PLATFORM_MONTHLY_PRICE}`,
    priceNote: 'לחודש, עד קבלת המשכנתא',
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
    ],
    bestFor: 'למי שמבין מספרים, יש לו זמן ורוצה לנהל את התהליך בעצמו',
    ctaLabel: 'התחילו חודש ראשון',
    ctaHref: '/auth/register',
  },
  {
    id: 'hybrid',
    name: 'היברידי',
    tagline: 'אתם עושים את מה שאתם יודעים — היועץ נכנס בדיוק היכן שצריך',
    price: 'לפי שלב',
    priceNote: `החל מ-₪${journeyStages[4].advisorPrice.toLocaleString('he-IL')} לשלב + ₪${PLATFORM_MONTHLY_PRICE} לחודש`,
    icon: Handshake,
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-300',
    popular: true,
    features: [
      'כל מה שכלול במסלול העצמאי',
      'בחירה חופשית של השלבים שהיועץ יבצע עבורכם',
      'תמחור שקוף לכל שלב — משלמים רק על מה שלקחתם',
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
    tagline: 'היועץ מבצע את כל חמשת השלבים מקצה לקצה',
    price: `₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`,
    priceNote: 'תשלום חד-פעמי, כולל גישה לפלטפורמה',
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
    ctaLabel: 'דברו עם יועץ',
    ctaHref: '/auth/register?role=client',
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
  {
    capability: 'עלות',
    self: `₪${PLATFORM_MONTHLY_PRICE} לחודש`,
    hybrid: 'לפי שלב',
    full: `₪${FULL_SERVICE_PRICE.toLocaleString('he-IL')}`,
  },
];

export const pricingFaq: { question: string; answer: string }[] = [
  {
    question: 'מה קורה אם התחלתי לבד ובאמצע הבנתי שאני צריך יועץ?',
    answer:
      'זה בדיוק המודל. כל שלב נרכש בנפרד ובכל רגע, גם אחרי שהתחלתם. כל הנתונים שהזנתם עוברים ליועץ כמו שהם — הוא ממשיך מהנקודה שבה עצרתם ולא מתחילים מאפס.',
  },
  {
    question: 'עד מתי משלמים את המנוי החודשי?',
    answer:
      `המנוי בסך ₪${PLATFORM_MONTHLY_PRICE} נגבה מדי חודש עד לקבלת המשכנתא, וניתן לבטל אותו בכל עת. מי שרוכש את מסלול הליווי המלא מקבל את הגישה לפלטפורמה ללא תשלום חודשי נוסף.`,
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
