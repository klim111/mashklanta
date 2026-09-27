import { Bot, UserCheck, type LucideIcon } from 'lucide-react';
import { journeyStages, stagesTotalPrice } from './journey';
import {
  ADVISORY_TRACK,
  FULL_SERVICE_PRICE,
  PLATFORM_ACCESS_DAYS,
  PLATFORM_MAX_OPEN_PROCESSES,
  PLATFORM_PROCESS_PRICE,
  PLATFORM_TYPICAL_TOTAL,
  PRICING_PRINCIPLES,
} from '@/lib/service-flow';

/**
 * המחירים עצמם וחוקי התמחור יושבים ב-`src/lib/service-flow.ts`, כי גם השרת
 * צריך אותם. כאן רק התוכן השיווקי שנבנה מעליהם.
 */
export { ADVISORY_TRACK, FULL_SERVICE_PRICE, PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE, PRICING_PRINCIPLES };

/**
 * הכותרת והפסקה שמעל שני המסלולים — במקום "שלושה מסלולים". אותו נוסח
 * באזור האישי, בעמוד הבית ובעמוד התמחור.
 */
export const TRACKS_HEADLINE = 'אתם מחליטים כמה ליווי צריך. אנחנו דואגים שזה לא יעלה הון';
export const TRACKS_INTRO =
  'במשכלנתא אפשר לתכנן לבד, להיעזר ביועץ רק בשלב שבו צריך, או לקחת יועץ לכל שלבי התכנון, ולעבור ביניהם בכל רגע. ' +
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
    priceNote: `לתהליך משכנתא · גישה מלאה עד ${PLATFORM_ACCESS_DAYS} יום · מקוזז אם תבקשו ליווי`,
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
      'שלב שעובר ליועץ מתומחר לפי השלב ומורכבות התיק, ומה ששילמתם על הפלטפורמה מקוזז',
      `צריכים יותר מ-${PLATFORM_ACCESS_DAYS} יום? מחדשים באותו מחיר`,
    ],
    bestFor: 'לרוב הלקוחות: בונים לבד ומצרפים יועץ בשלב שבו זה באמת משתלם',
    ctaLabel: 'מתחילים לבד',
    ctaHref: '/auth/register',
  },
  {
    id: 'full',
    name: ADVISORY_TRACK.title,
    tagline: ADVISORY_TRACK.tagline,
    price: ADVISORY_TRACK.priceLabel,
    priceNote: ADVISORY_TRACK.priceNote,
    icon: UserCheck,
    gradient: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-200',
    features: [
      'בוחרים כמה ליווי צריך: משלב 1 בלבד, כמה שלבים או כל שלבי תכנון המשכנתא',
      'יועץ משכנתאות מקצועי מבצע את השלבים שבחרתם',
      'המחיר הסופי נקבע לפי השלבים שנבחרו ומורכבות התיק',
      ADVISORY_TRACK.cheaper,
      ADVISORY_TRACK.credit,
      'גישה מלאה לפלטפורמה כלולה, ושקיפות מלאה בכל צעד שהיועץ מבצע',
    ],
    bestFor: 'למי שרוצה יועץ מקצועי לצידו, בשלב אחד או לאורך כל הדרך',
    ctaLabel: 'בקשו ליווי',
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
  { capability: 'ניתוח חיתומי מקדים על ידי יועץ', self: 'בכל שלב שתבחרו', full: 'בשלבים שבחרתם' },
  { capability: 'בניית תמהיל על ידי יועץ', self: 'בכל שלב שתבחרו', full: 'בשלבים שבחרתם' },
  { capability: 'הגשה מקבילה למספר בנקים', self: 'עצמאית או עם יועץ', full: 'בשלבים שבחרתם' },
  { capability: 'ניהול מכרז ריביות מול הבנקים', self: 'בכל שלב שתבחרו', full: 'בשלבים שבחרתם' },
  { capability: 'ליווי אישי לפגישת החתימות', self: 'בכל שלב שתבחרו', full: 'בשלבים שבחרתם' },
  { capability: 'השוואה בין ברירת המחדל לתוצר היועץ', self: true, full: true },
  { capability: 'קיזוז מה ששולם על הפלטפורמה', self: 'כשמצרפים יועץ', full: 'משלב אחד ומעלה' },
  {
    capability: 'עלות',
    self: `₪${PLATFORM_PROCESS_PRICE} לתהליך · עד ${PLATFORM_ACCESS_DAYS} יום`,
    full: 'לפי השלבים ומורכבות התיק',
  },
];

export const pricingFaq: { question: string; answer: string }[] = [
  {
    question: 'מה קורה אם התחלתי לבד ובאמצע הבנתי שאני צריך יועץ?',
    answer:
      `זה בדיוק המודל. בכל שלב יש כפתור "פנו ליועץ משכלנתא", והשלב עובר אליו — גם אחרי שהתחלתם. מה ששילמתם על הגישה לפלטפורמה (₪${PLATFORM_PROCESS_PRICE}) תמיד מקוזז ממחיר הליווי, כבר מהשלב הראשון שתזמינו. כל הנתונים שהזנתם עוברים ליועץ כמו שהם — הוא ממשיך מהנקודה שבה עצרתם ולא מתחילים מאפס.`,
  },
  {
    question: 'כמה עולה הגישה לפלטפורמה ולכמה זמן?',
    answer:
      `₪${PLATFORM_PROCESS_PRICE} לתהליך משכנתא (משכנתא חדשה או מיחזור), עם גישה מלאה לכל הכלים עד ${PLATFORM_ACCESS_DAYS} יום. לא הספקתם? רוכשים חבילה נוספת לעוד ${PLATFORM_ACCESS_DAYS} יום באותו מחיר, ורק כשאתם מאשרים: אין חיוב חוזר אוטומטי. תהליך משכנתא לוקח בדרך כלל בין חודש לשלושה חודשים, כך שהעלות הכוללת נעה בדרך כלל בין ₪${PLATFORM_TYPICAL_TOTAL.min} ל-₪${PLATFORM_TYPICAL_TOTAL.max}. כל חבילה היא סכום קבוע לתקופה, ולכן סיום מוקדם אינו מזכה בהחזר על הימים שנשארו. בתוך החבילה אפשר לנהל עד ${PLATFORM_MAX_OPEN_PROCESSES} תהליכים במקביל, ולפתוח מחדש תהליך שמחקתם בלי תשלום נוסף. תהליך חדש אחרי שתהליך הסתיים נרכש בנפרד. בכל הזמנת ליווי הגישה המלאה כלולה במחיר.`,
  },
  {
    question: 'כמה עולה המסלול בליווי?',
    answer:
      'אין מחיר אחד קבוע, כי כל תיק שונה. אפשר לקחת יועץ לשלב 1 בלבד, לכמה שלבים או לכל שלבי תכנון המשכנתא, והמחיר הסופי נקבע לפי השלבים שבחרתם ומורכבות התיק. יועץ משכלנתא חוזר אליכם עם הצעת מחיר לפני שמתחילים. בזכות הטכנולוגיה המתקדמת של משכלנתא, המחיר תמיד יהיה זול מהממוצע בשוק, ומה ששילמתם על הפלטפורמה תמיד מקוזז ממנו כשמזמינים לפחות שלב אחד.',
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
