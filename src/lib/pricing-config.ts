/**
 * המחירים והמסלולים שהיועץ עורך בעצמו מלוח היועץ ("תמחור ומסלולים").
 *
 * הערכים נשמרים בבסיס הנתונים (PricingSettings) ונקראים בשרת דרך
 * `src/lib/pricing-store.ts`. משם הם מגיעים:
 *  - לכל עמודי האתר דרך `usePricing()` (src/components/pricing/PricingProvider)
 *  - לחיוב ב-HYP, שקורא תמיד את המחיר העדכני מבסיס הנתונים
 *
 * כשעוד לא נשמר כלום, או כשהשמירה פגומה, חלים ערכי ברירת המחדל שכאן.
 *
 * הקובץ טהור בכוונה: נטען גם בשרת וגם בדפדפן, ונבדק בבדיקות יחידה.
 */

/** PLATFORM — המסלול העצמאי, שהמחיר שלו הוא הגישה החודשית · ADVISORY — המסלול בליווי · CUSTOM — מסלול שהיועץ הוסיף */
export type TrackKind = 'PLATFORM' | 'ADVISORY' | 'CUSTOM';

/** MONTHLY — לחודש · ONE_TIME — תשלום חד־פעמי · QUOTE — לפי הצעת מחיר */
export type TrackBilling = 'MONTHLY' | 'ONE_TIME' | 'QUOTE';

export interface TrackConfig {
  id: string;
  kind: TrackKind;
  name: string;
  tagline: string;
  /** המחיר בשקלים. במסלול העצמאי מתעלמים ממנו — המחיר שלו הוא `platformPrice` */
  price: number | null;
  billing: TrackBilling;
  /** השורה שמתחת למחיר. ריק — נוסח ברירת מחדל לפי סוג החיוב */
  priceNote: string;
  features: string[];
  bestFor: string;
  ctaLabel: string;
  popular: boolean;
  /** מוצג בעמודי התמחור */
  visible: boolean;
}

export interface PricingConfig {
  /** מחיר הגישה לפלטפורמה לחודש, בשקלים — זה הסכום שנגבה ב-HYP */
  platformPrice: number;
  tracks: TrackConfig[];
}

export const DEFAULT_PLATFORM_PRICE = 49;

/** גבולות סבירים למחיר, כדי שטעות הקלדה לא תגבה סכום מופרך */
export const PRICE_LIMITS = { min: 1, max: 100000 } as const;

export const MAX_TRACKS = 8;
export const MAX_FEATURES = 12;

export const DEFAULT_TRACKS: TrackConfig[] = [
  {
    id: 'self',
    kind: 'PLATFORM',
    name: 'עצמאי / היברידי',
    tagline: 'מתחילים לבד, ובכל שלב שצריך עזרה מעבירים את הטיפול ליועץ משכלנתא',
    price: null,
    billing: 'MONTHLY',
    priceNote: 'לחודש לתהליך משכנתא · גישה מלאה · מקוזז אם תבקשו ליווי',
    features: [
      'גישה מלאה לכל הכלים והמחשבונים בפלטפורמה',
      'בונה תמהיל, סלים אחידים ולוחות סילוקין מלאים',
      'חישוב IRR, סימולציות ריבית ופירעון מוקדם',
      'תיק מסמכים דיגיטלי וצ׳ק־ליסט לפי סטטוס תעסוקתי',
      'בכל שלב: כפתור "פנו ליועץ משכלנתא" שמעביר אליו את השלב, עם כל מה שכבר הזנתם',
      'שלב שעובר ליועץ מתומחר לפי השלב ומורכבות התיק, ומה ששילמתם על הפלטפורמה מקוזז',
      'צריכים יותר מחודש? מחדשים באותו מחיר, בקישור שנשלח אליכם במייל',
    ],
    bestFor: 'לרוב הלקוחות: בונים לבד ומצרפים יועץ בשלב שבו זה באמת משתלם',
    ctaLabel: 'מתחילים לבד',
    popular: true,
    visible: true,
  },
  {
    id: 'full',
    kind: 'ADVISORY',
    name: 'מסלול בליווי',
    tagline: 'משלב 1 ועד כל שלבי תכנון המשכנתא, בליווי יועץ משכנתאות מקצועי',
    price: null,
    billing: 'QUOTE',
    priceNote: 'המחיר הסופי נקבע לפי השלבים שתבחרו ומורכבות התיק',
    features: [
      'בוחרים כמה ליווי צריך: משלב 1 בלבד, כמה שלבים או כל שלבי תכנון המשכנתא',
      'יועץ משכנתאות מקצועי מבצע את השלבים שבחרתם',
      'המחיר הסופי נקבע לפי השלבים שנבחרו ומורכבות התיק',
      'תמיד זול מהממוצע בשוק, בזכות הטכנולוגיה המתקדמת של משכלנתא',
      'מה ששילמתם על הפלטפורמה תמיד מקוזז ממחיר הליווי, כשמזמינים לפחות שלב אחד',
      'גישה מלאה לפלטפורמה כלולה, ושקיפות מלאה בכל צעד שהיועץ מבצע',
    ],
    bestFor: 'למי שרוצה יועץ מקצועי לצידו, בשלב אחד או לאורך כל הדרך',
    ctaLabel: 'בקשו ליווי',
    popular: false,
    visible: true,
  },
];

export const DEFAULT_PRICING: PricingConfig = { platformPrice: DEFAULT_PLATFORM_PRICE, tracks: DEFAULT_TRACKS };

function text(value: unknown, max: number, fallback = ''): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : fallback;
}

/** מחיר בשקלים שלמים בתוך הגבולות, או null כשאינו תקין */
export function readPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : Number(String(value).replace(/[,\s₪]/g, ''));
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < PRICE_LIMITS.min || rounded > PRICE_LIMITS.max) return null;
  return rounded;
}

const BILLINGS: TrackBilling[] = ['MONTHLY', 'ONE_TIME', 'QUOTE'];

function readTrack(raw: unknown, fallback: TrackConfig | undefined, index: number): TrackConfig | null {
  if (!raw || typeof raw !== 'object') return fallback ?? null;
  const item = raw as Record<string, unknown>;
  const kind: TrackKind = fallback?.kind ?? 'CUSTOM';
  const name = text(item.name, 60, fallback?.name);
  if (!name) return fallback ?? null;
  const billing: TrackBilling =
    kind === 'PLATFORM'
      ? 'MONTHLY'
      : kind === 'ADVISORY'
        ? 'QUOTE'
        : BILLINGS.includes(item.billing as TrackBilling)
          ? (item.billing as TrackBilling)
          : 'ONE_TIME';
  const price = billing === 'QUOTE' || kind === 'PLATFORM' ? null : readPrice(item.price);
  const features = Array.isArray(item.features)
    ? item.features.map((feature) => text(feature, 200)).filter(Boolean).slice(0, MAX_FEATURES)
    : (fallback?.features ?? []);
  return {
    id: kind === 'CUSTOM' ? text(item.id, 40) || `track-${index + 1}` : (fallback as TrackConfig).id,
    kind,
    name,
    tagline: text(item.tagline, 200, fallback?.tagline),
    price,
    // מסלול בתשלום בלי מחיר תקין מוצג כ"לפי הצעת מחיר", כדי שלא יופיע מחיר ריק
    billing: billing !== 'QUOTE' && kind === 'CUSTOM' && price === null ? 'QUOTE' : billing,
    priceNote: text(item.priceNote, 160, fallback?.priceNote),
    features,
    bestFor: text(item.bestFor, 200, fallback?.bestFor),
    ctaLabel: text(item.ctaLabel, 40, fallback?.ctaLabel) || 'לפרטים',
    popular: item.popular === undefined ? (fallback?.popular ?? false) : item.popular === true,
    // המסלול העצמאי הוא המוצר עצמו — תמיד מוצג
    visible: kind === 'PLATFORM' ? true : item.visible === undefined ? (fallback?.visible ?? true) : item.visible === true,
  };
}

/**
 * קריאת הגדרות שנשמרו (או שהגיעו מהטופס) לצורה תקינה: שני המסלולים המובנים
 * תמיד קיימים, מחיר מחוץ לגבולות חוזר לברירת המחדל, ומזהים כפולים נזרקים.
 */
export function normalizePricing(raw: unknown): PricingConfig {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const platformPrice = readPrice(source.platformPrice) ?? DEFAULT_PLATFORM_PRICE;
  const rawTracks = Array.isArray(source.tracks) ? source.tracks : [];

  const tracks: TrackConfig[] = [];
  const seen = new Set<string>();
  rawTracks.slice(0, MAX_TRACKS + DEFAULT_TRACKS.length).forEach((raw, index) => {
    const id = raw && typeof raw === 'object' ? text((raw as Record<string, unknown>).id, 40) : '';
    const builtIn = DEFAULT_TRACKS.find((track) => track.id === id);
    const track = readTrack(raw, builtIn, index);
    if (!track || seen.has(track.id)) return;
    if (track.kind === 'CUSTOM' && tracks.filter((item) => item.kind === 'CUSTOM').length >= MAX_TRACKS) return;
    seen.add(track.id);
    tracks.push(track);
  });
  // מסלול מובנה שחסר בשמירה נכנס במקומו הרגיל
  DEFAULT_TRACKS.forEach((track, index) => {
    if (!seen.has(track.id)) tracks.splice(Math.min(index, tracks.length), 0, track);
  });
  return { platformPrice, tracks };
}

/** המחיר כפי שהוא מוצג בכרטיס המסלול */
export function trackPriceLabel(track: TrackConfig, platformPrice: number): string {
  if (track.kind === 'PLATFORM') return `₪${platformPrice.toLocaleString('he-IL')}`;
  if (track.billing === 'QUOTE' || track.price === null) {
    return track.kind === 'ADVISORY' ? 'מחיר לפי השלבים והתיק' : 'לפי הצעת מחיר';
  }
  return `₪${track.price.toLocaleString('he-IL')}`;
}

/** השורה שמתחת למחיר — מה שהיועץ כתב, או נוסח לפי סוג החיוב */
export function trackPriceNote(track: TrackConfig): string {
  if (track.priceNote) return track.priceNote;
  if (track.billing === 'MONTHLY') return 'לחודש';
  if (track.billing === 'ONE_TIME') return 'תשלום חד־פעמי';
  return 'המחיר נקבע לפי הצרכים שלכם';
}

/** לאן מוביל כפתור המסלול */
export function trackHref(track: TrackConfig): string {
  if (track.kind === 'PLATFORM') return '/auth/register';
  if (track.kind === 'ADVISORY') return '/#start';
  return `/consult?track=${encodeURIComponent(track.name)}`;
}

export function visibleTracks(config: PricingConfig): TrackConfig[] {
  return config.tracks.filter((track) => track.visible);
}
