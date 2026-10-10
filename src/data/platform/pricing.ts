import { Bot, Sparkles, UserCheck, type LucideIcon } from 'lucide-react';
import { journeyStages, stagesTotalPrice } from './journey';
import {
  ADVISORY_TRACK,
  FULL_SERVICE_PRICE,
  PLATFORM_ACCESS_PERIOD,
  PLATFORM_PROCESS_PRICE,
  PRICING_PRINCIPLES,
  platformBillingNotes,
  pricingPrinciples,
  typicalTotal,
} from '@/lib/service-flow';
import {
  DEFAULT_PRICING,
  trackHref,
  trackPriceLabel,
  trackPriceNote,
  visibleTracks,
  type PricingConfig,
  type TrackConfig,
} from '@/lib/pricing-config';

/**
 * המחירים עצמם וחוקי התמחור יושבים ב-`src/lib/service-flow.ts`, כי גם השרת
 * צריך אותם. כאן רק התוכן השיווקי שנבנה מעליהם.
 */
export { ADVISORY_TRACK, FULL_SERVICE_PRICE, PLATFORM_ACCESS_PERIOD, PLATFORM_PROCESS_PRICE, PRICING_PRINCIPLES };

/**
 * הכותרת והפסקה שמעל שני המסלולים — במקום "שלושה מסלולים". אותו נוסח
 * באזור האישי, בעמוד הבית ובעמוד התמחור.
 */
export const TRACKS_HEADLINE = 'אתם מחליטים כמה ליווי צריך. אנחנו דואגים שזה לא יעלה הון';
export const TRACKS_INTRO =
  'במשכלנתא אפשר לתכנן לבד, להיעזר ביועץ רק בשלב שבו צריך, או לקחת יועץ לכל שלבי התכנון, ולעבור ביניהם בכל רגע. ' +
  'הכלים החכמים שלנו ושיטת עבודה מסודרת הופכים את התהליך לפשוט וזורם יותר, וזה מה שמאפשר לנו לתת ליווי מקצועי ברמה הגבוהה ביותר במחיר נמוך בהרבה. ' +
  'המטרה שלנו פשוטה: שתגיעו לבנק חזקים, מבינים ובטוחים, בלי שהמשכנתא תקרע לכם את הכיס עוד לפני שהתחילה.';

export type PlanId = string;

export type PricingPlan = {
  id: PlanId;
  kind: TrackConfig['kind'];
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

const LOOK: Record<TrackConfig['kind'], { icon: LucideIcon; gradient: string; ring: string }> = {
  PLATFORM: { icon: Bot, gradient: 'from-blue-500 to-cyan-500', ring: 'ring-blue-200' },
  ADVISORY: { icon: UserCheck, gradient: 'from-amber-500 to-orange-600', ring: 'ring-amber-200' },
  CUSTOM: { icon: Sparkles, gradient: 'from-violet-500 to-fuchsia-600', ring: 'ring-violet-200' },
};

/** כרטיסי המסלולים בעמודי התמחור — לפי המסלולים והמחירים שהיועץ הגדיר */
export function buildPricingPlans(config: PricingConfig): PricingPlan[] {
  return visibleTracks(config).map((track) => ({
    id: track.id,
    kind: track.kind,
    name: track.name,
    tagline: track.tagline,
    price: trackPriceLabel(track, config.platformPrice),
    priceNote: trackPriceNote(track),
    ...LOOK[track.kind],
    popular: track.popular,
    features: track.features,
    bestFor: track.bestFor,
    ctaLabel: track.ctaLabel,
    ctaHref: trackHref(track),
  }));
}

export const pricingPlans: PricingPlan[] = buildPricingPlans(DEFAULT_PRICING);

export type ComparisonRow = {
  capability: string;
  self: boolean | string;
  full: boolean | string;
};

export function buildComparisonRows(price: number): ComparisonRow[] {
  return [
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
    self: `₪${price} לחודש לתהליך`,
    full: 'לפי השלבים ומורכבות התיק',
  },
  ];
}

export const comparisonRows = buildComparisonRows(PLATFORM_PROCESS_PRICE);

export function buildPricingFaq(price: number): { question: string; answer: string }[] {
  const total = typicalTotal(price);
  return [
  {
    question: 'מה קורה אם התחלתי לבד ובאמצע הבנתי שאני צריך יועץ?',
    answer:
      `זה בדיוק המודל. בכל שלב יש כפתור "פנו ליועץ משכלנתא", והשלב עובר אליו — גם אחרי שהתחלתם. מה ששילמתם על הגישה לפלטפורמה (₪${price}) תמיד מקוזז ממחיר הליווי, כבר מהשלב הראשון שתזמינו. כל הנתונים שהזנתם עוברים ליועץ כמו שהם — הוא ממשיך מהנקודה שבה עצרתם ולא מתחילים מאפס.`,
  },
  {
    question: 'כמה עולה הגישה לפלטפורמה ולכמה זמן?',
    answer:
      `₪${price} לתהליך משכנתא (משכנתא חדשה או מיחזור), עם גישה מלאה לכל הכלים לחודש. החודש נספר לפי החודש הקלנדרי שבו שילמתם: תשלום באוקטובר פותח 31 יום, ובפברואר 28 או 29. לא הספקתם? לקראת סוף החודש נשלח לכם מייל עם קישור לחידוש לחודש נוסף באותו מחיר, והחיוב מתבצע רק כשאתם מאשרים: אין חיוב חוזר אוטומטי. תהליך משכנתא לוקח בדרך כלל בין חודש לשלושה חודשים, כך שהעלות הכוללת נעה בדרך כלל בין ₪${total.min} ל-₪${total.max}. כל חבילה היא סכום קבוע לחודש, ולכן סיום מוקדם אינו מזכה בהחזר על הימים שנשארו. כל תשלום הוא עבור תהליך משכנתא אחד: כדי לפתוח תהליך נוסף כשהקודם עוד לא הסתיים, משלמים עליו בנפרד או מוחקים את הקודם. מחקתם תהליך בתוך החודש? תהליך חדש נפתח על אותו תשלום, בלי תשלום נוסף. בכל הזמנת ליווי הגישה המלאה כלולה במחיר.`,
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
}

export const pricingFaq = buildPricingFaq(PLATFORM_PROCESS_PRICE);

export { journeyStages, stagesTotalPrice };

/** כל מה שעמודי האתר צריכים לדעת על המחירים, מתוך הגדרות התמחור */
export interface PricingView {
  config: PricingConfig;
  /** מחיר הגישה לפלטפורמה לחודש — זה מה שנגבה ב-HYP */
  platformPrice: number;
  typicalTotal: { min: number; max: number };
  plans: PricingPlan[];
  principles: ReturnType<typeof pricingPrinciples>;
  billingNotes: ReturnType<typeof platformBillingNotes>;
  comparisonRows: ComparisonRow[];
  faq: { question: string; answer: string }[];
  /** המסלול בליווי, בשם ובתיאור שהיועץ הגדיר */
  advisory: { title: string; tagline: string; priceLabel: string; priceNote: string; cheaper: string; credit: string };
}

export function buildPricingView(config: PricingConfig): PricingView {
  const price = config.platformPrice;
  const full = config.tracks.find((track) => track.kind === 'ADVISORY');
  return {
    config,
    platformPrice: price,
    typicalTotal: typicalTotal(price),
    plans: buildPricingPlans(config),
    principles: pricingPrinciples(price),
    billingNotes: platformBillingNotes(price),
    comparisonRows: buildComparisonRows(price),
    faq: buildPricingFaq(price),
    advisory: {
      ...ADVISORY_TRACK,
      title: full?.name || ADVISORY_TRACK.title,
      tagline: full?.tagline || ADVISORY_TRACK.tagline,
      priceNote: full?.priceNote || ADVISORY_TRACK.priceNote,
    },
  };
}
