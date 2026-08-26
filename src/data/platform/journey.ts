import {
  BarChart3,
  Layers,
  FileStack,
  Gavel,
  PenLine,
  type LucideIcon,
} from 'lucide-react';

export type StageToolLink = {
  label: string;
  href: string;
};

export type JourneyStage = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  tagline: string;
  icon: LucideIcon;
  gradient: string;
  accent: string;
  /** Price in ILS when the advisor performs this stage */
  advisorPrice: number;
  duration: string;
  /** What the advisor actually does */
  advisorActions: string[];
  /** The headline benefit for the client */
  valueHeadline: string;
  valueDescription: string;
  /** What the client gets in the platform when doing this stage alone */
  selfServiceSummary: string;
  selfServiceSteps: string[];
  tools: StageToolLink[];
};

export const journeyStages: JourneyStage[] = [
  {
    id: 'analysis',
    number: 1,
    title: 'פרופיל פיננסי של הלקוח',
    shortTitle: 'פרופיל פיננסי',
    tagline: 'מזהים את נקודות התורפה לפני שהבנק מזהה אותן',
    icon: BarChart3,
    gradient: 'from-blue-500 to-cyan-500',
    accent: 'blue',
    advisorPrice: 1200,
    duration: 'כשבוע',
    advisorActions: [
      'בחינת הכנסות, דפי בנק, הון עצמי והתחייבויות קיימות',
      'הגדרת יכולת החזר פיננסית מציאותית',
      'איתור חריגות עו״ש, הלוואות פתוחות ובעיות חיתומיות',
      'טיפול מקדים בנקודות התורפה לפני הפנייה לבנק',
    ],
    valueHeadline: 'מניעת הפתעות וסירובים',
    valueDescription:
      'הבנק בוחן את שלושת החודשים האחרונים שלכם במיקרוסקופ. ניתוח מקדים מזהה מראש את מה שיעצור את הבקשה — ומתקן אותו בזמן, לפני שנרשם סירוב בתיק.',
    selfServiceSummary:
      'הפלטפורמה בונה את הפרופיל הפיננסי שלכם: הכנסות מול התחייבויות, יחס החזר, הון עצמי ויכולת החזר — בדיוק הנתונים שהבנק ידרוש בבקשה לאישור עקרוני.',
    selfServiceSteps: [
      'נמצא נכס, או שעדיין בודקים היתכנות — השאלה שפותחת את התהליך',
      'הכנסות, גילים, אופן העסקה, הון עצמי והלוואות קיימות',
      'צפי להכנסות עתידיות, שיהפוך לפירעון מוקדם מתוכנן בתמהיל',
      'פרטי הנכס והעסקה, עם יחס החזר ו-LTV מול מגבלות בנק ישראל',
    ],
    tools: [
      { label: 'מה אני יכול להרשות לעצמי', href: '/mortgage-planning?flow=affordability' },
      { label: 'תכנון הון עצמי', href: '/equity-planning' },
      { label: 'מתכנן הלוואות צרכניות', href: '/consumer-loans' },
      { label: 'דינמיקה פיננסית', href: '/financial-dynamics' },
    ],
  },
  {
    id: 'applications',
    number: 2,
    title: 'הגשת בקשה לאישור עקרוני',
    shortTitle: 'אישור עקרוני',
    tagline: 'אישור עקרוני ביד הוא כרטיס הכניסה להתמחרות',
    icon: FileStack,
    gradient: 'from-emerald-500 to-teal-600',
    accent: 'emerald',
    advisorPrice: 1200,
    duration: '3–10 ימי עסקים',
    advisorActions: [
      'הכנת התיק החיתומי המלא לקראת הבקשה',
      'התאמת רשימת המסמכים לסטטוס התעסוקתי — שכיר, עצמאי או בעל שליטה',
      'הגשת הבקשה לאישור עקרוני מול מרכז המשכנתאות של הבנק',
      'מעקב שוטף מול הבנקאי עד קבלת האישור והריביות שבו',
    ],
    valueHeadline: 'חיסכון בזמן וייעול בירוקרטי',
    valueDescription:
      'היועץ יודע בדיוק איזה מסמך נדרש לכל סטטוס ואיזה ניסוח עובר. במקום סבב תיקונים אינסופי — תיק אחד מושלם שמתקבל בפעם הראשונה, עם אישור עקרוני שאפשר לצאת איתו לשוק.',
    selfServiceSummary:
      'תיק מסמכים דיגיטלי עם מעקב התקדמות, בחירת הבנק שאליו מגישים, ורישום הריביות שהתקבלו באישור העקרוני לשלושת הסלים האחידים.',
    selfServiceSteps: [
      'בדיקה שכל פרטי הפרופיל הנדרשים לבקשה הוזנו',
      'רשימת מסמכים מותאמת לשכיר / עצמאי / בעל שליטה עם מעקב התקדמות',
      'בחירת הבנק שאליו מוגשת הבקשה',
      'הזנת הריביות שהוצעו באישור העקרוני לסלים האחידים',
    ],
    tools: [
      { label: 'בקשת משכנתא חכמה', href: '/mortgage-application' },
      { label: 'מפת תהליך אינטראקטיבית', href: '/interactive-mortgage-journey' },
      { label: 'תיק המסמכים שלי', href: '/dashboard' },
    ],
  },
  {
    id: 'auction',
    number: 3,
    title: 'מכרז ריביות',
    shortTitle: 'מכרז ריביות',
    tagline: 'כאן נקבע כמה באמת תשלמו',
    icon: Gavel,
    gradient: 'from-amber-500 to-orange-600',
    accent: 'amber',
    advisorPrice: 2200,
    duration: '1–3 שבועות',
    advisorActions: [
      'ניהול משא ומתן אינטנסיבי מול מספר בנקים במקביל',
      'התמחרות על בסיס הסלים האחידים — כדי שההשוואה תהיה אמיתית',
      'שיפור מרווחים מול הפריים ומול העוגן הקבוע',
      'ניצול כוח המיקוח והקשרים המקצועיים מול מרכזי המשכנתאות',
    ],
    valueHeadline: 'השגת התנאים הטובים ביותר',
    valueDescription:
      'בנק לא נותן את הריבית הטובה ביותר שלו בהצעה הראשונה. סבב התמחרות מנוהל היטב מוריד עשיריות אחוז — שהן עשרות ומאות אלפי שקלים לאורך חיי המשכנתא.',
    selfServiceSummary:
      'ניהול סבבי ההצעות בפלטפורמה: הזנת כל הצעה מכל בנק, השוואה מול הריביות שקיבלתם באישור העקרוני וחישוב מיידי של העלות הכוללת.',
    selfServiceSteps: [
      'הזנת ההצעות שהתקבלו מכל בנק',
      'השוואה מול הסלים האחידים שמילאתם באישור העקרוני',
      'זיהוי המסלול היקר בכל הצעה ומה כדאי לבקש לשפר',
      'שמירת גרסאות והשוואה בין סבבי התמחרות',
    ],
    tools: [
      { label: 'השוואת הצעות בנקים', href: '/mortgage-advisor' },
      { label: 'תמהילים שמורים', href: '/saved-mixes' },
      { label: 'בונה תמהיל אישי', href: '/custom-mix-builder' },
    ],
  },
  {
    id: 'mix',
    number: 4,
    title: 'בניית תמהיל אופטימלי',
    shortTitle: 'בניית תמהיל',
    tagline: 'התמהיל הוא ההבדל בין משכנתא יקרה למשכנתא נכונה',
    icon: Layers,
    gradient: 'from-violet-500 to-purple-600',
    accent: 'violet',
    advisorPrice: 1900,
    duration: 'שבוע–שבועיים',
    advisorActions: [
      'הרכבת מספר מסלולי ריבית המתאימים לפרופיל האישי',
      'בחירת לוח סילוקין — שפיצר או קרן שווה',
      'התאמת שיטות ההצמדה (מדד, פריים, קבועה) לתחזית העתידית',
      'תכנון מראש של פירעונות מוקדמים (קרן השתלמות, בונוסים, ירושה)',
    ],
    valueHeadline: 'חיסכון של עשרות אלפי שקלים',
    valueDescription:
      'תמהיל נכון ממזער את ה-IRR — העלות האפקטיבית האמיתית של הכסף — ומקטין את הסיכון לקפיצה בהחזר החודשי. אותה משכנתא, אותה ריבית, פער של מאות אלפי שקלים לאורך התקופה.',
    selfServiceSummary:
      'אותם כלים בדיוק שהיועץ עובד איתם, כשהסלים האחידים עם הריביות שקיבלתם כבר שמורים כתמהילים ומשמשים בסיס להשוואה.',
    selfServiceSteps: [
      'הסלים האחידים מהאישור העקרוני מחכים כתמהילים שמורים',
      'בניית תמהיל חופשי עם לוח סילוקין וחישוב IRR',
      'השוואה גרפית בין התמהיל שבניתם לסלים האחידים',
      'סימולציית זעזוע ריבית ופירעון מוקדם',
    ],
    tools: [
      { label: 'בונה תמהיל אישי', href: '/custom-mix-builder' },
      { label: 'סלים אחידים', href: '/uniform-mixes' },
      { label: 'שולחן עבודה מקצועי', href: '/mortgage-advisor' },
      { label: 'סימולציות פיננסיות', href: '/simulations' },
    ],
  },
  {
    id: 'signing',
    number: 5,
    title: 'חתימה על תיק המשכנתא בבנק',
    shortTitle: 'חתימה בבנק',
    tagline: 'הרגע שבו טעות קטנה עולה הרבה כסף',
    icon: PenLine,
    gradient: 'from-rose-500 to-pink-600',
    accent: 'rose',
    advisorPrice: 900,
    duration: 'פגישה אחת',
    advisorActions: [
      'קביעת פגישת החתימות ותיאום מול הבנק',
      'בדיקת נכונות מסמכי הבנק והסכם ההלוואה לפני החתימה',
      'אימות שכל ריבית וכל מסלול שסוכמו במכרז אכן נכנסו לחוזה',
      'בדיקת נספחים, ביטוחים ועמלות נלוות',
    ],
    valueHeadline: 'שקט נפשי',
    valueDescription:
      'בין ההצעה שאושרה לבין המסמך שאתם חותמים עליו יכולים להשתנות פרטים. בדיקה סופית מוודאת שהתנאים שסוכמו הם בדיוק התנאים שנחתמו — בלי טעויות ובלי שינויים של הרגע האחרון.',
    selfServiceSummary:
      'משווים את מסמכי הבנק מול התמהיל שאושר, בודקים את לוח הסילוקין שקיבלתם ומוודאים שאין פערים.',
    selfServiceSteps: [
      'טעינת התמהיל שסוכם והשוואה מול מסמכי הבנק',
      'בדיקת לוח הסילוקין הרשמי מול החישוב שלנו',
      'צ׳ק־ליסט חתימה — מה לבדוק ומה לשאול',
      'שמירת המשכנתא הסופית למעקב שוטף',
    ],
    tools: [
      { label: 'בדיקת לוח סילוקין', href: '/mortgage-advisor' },
      { label: 'דשבורד המשכנתא שלי', href: '/mortgage-dashboard' },
      { label: 'מפת תהליך אינטראקטיבית', href: '/interactive-mortgage-journey' },
    ],
  },
];

/** Sum of every stage bought separately */
export const stagesTotalPrice = journeyStages.reduce(
  (sum, stage) => sum + stage.advisorPrice,
  0
);
