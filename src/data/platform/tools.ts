import {
  Activity,
  BookOpen,
  Calculator,
  CreditCard,
  FileCheck2,
  FolderOpen,
  GaugeCircle,
  Home,
  Layers,
  LayoutDashboard,
  LineChart,
  Map,
  PiggyBank,
  RefreshCw,
  Save,
  Scale,
  SlidersHorizontal,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type ToolCategoryId = 'planning' | 'mix' | 'process' | 'tracking';

export type PlatformTool = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  category: ToolCategoryId;
  gradient: string;
  /** Which advisor stage this tool serves */
  stageId?: string;
  badge?: string;
};

export const toolCategories: {
  id: ToolCategoryId;
  label: string;
  description: string;
  gradient: string;
}[] = [
  {
    id: 'planning',
    label: 'תכנון וכדאיות',
    description: 'כמה אפשר לקחת, כמה צריך להביא ומה זה עושה לתזרים',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'mix',
    label: 'תמהיל וריביות',
    description: 'הרכבת המסלולים, השוואת הצעות וחישוב העלות האמיתית',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'process',
    label: 'תהליך וניירת',
    description: 'הגשה לבנקים, מסמכים ומעקב אחרי כל שלב',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'tracking',
    label: 'מעקב וניהול שוטף',
    description: 'אחרי החתימה — מעקב, מיחזור ותחזיות לעתיד',
    gradient: 'from-amber-500 to-orange-600',
  },
];

export const platformTools: PlatformTool[] = [
  // ── תכנון וכדאיות ───────────────────────────────────────────────
  {
    id: 'affordability',
    title: 'מה אני יכול להרשות לעצמי',
    description:
      'מחשב את שווי הנכס המקסימלי לפי הכנסות, הון עצמי והתחייבויות קיימות — כולל מגבלות יחס החזר ו-LTV.',
    href: '/mortgage-planning?flow=affordability',
    icon: Calculator,
    category: 'planning',
    gradient: 'from-blue-600 to-blue-700',
    stageId: 'analysis',
  },
  {
    id: 'existing-property',
    title: 'משכנתא לנכס קיים',
    description:
      'יודעים את מחיר הנכס? הכלי בונה את מבנה המימון המלא — הון עצמי, גובה הלוואה והחזר חודשי.',
    href: '/mortgage-planning?flow=existing',
    icon: Home,
    category: 'planning',
    gradient: 'from-sky-600 to-blue-700',
    stageId: 'analysis',
  },
  {
    id: 'equity',
    title: 'תכנון הון עצמי',
    description:
      'לוח זמנים של כל התשלומים וההוצאות הנלוות — מקדמה, מס רכישה, עו״ד ושיפוץ — עד ליום קבלת המפתח.',
    href: '/equity-planning',
    icon: PiggyBank,
    category: 'planning',
    gradient: 'from-green-600 to-emerald-700',
    stageId: 'analysis',
  },
  {
    id: 'consumer-loans',
    title: 'מתכנן הלוואות צרכניות',
    description:
      'מיפוי כל ההלוואות הקיימות, בדיקת איחוד או סגירה מוקדמת והשפעתן על יכולת ההחזר במשכנתא.',
    href: '/consumer-loans',
    icon: CreditCard,
    category: 'planning',
    gradient: 'from-orange-600 to-amber-700',
    stageId: 'analysis',
  },
  {
    id: 'financial-dynamics',
    title: 'דינמיקה פיננסית',
    description:
      'סימולציה חיה של התזרים המשפחתי — נזילות, חוב, חיסכון ונכסים — לאורך שנות המשכנתא.',
    href: '/financial-dynamics',
    icon: Activity,
    category: 'planning',
    gradient: 'from-indigo-600 to-violet-700',
    stageId: 'analysis',
  },

  // ── תמהיל וריביות ───────────────────────────────────────────────
  {
    id: 'custom-mix',
    title: 'בונה תמהיל אישי',
    description:
      'שאלון פרופיל סיכון שמתרגם את ההעדפות שלכם לתמהיל מסלולים מומלץ — עם רגישות להחזר ולעליית ריבית.',
    href: '/custom-mix-builder',
    icon: SlidersHorizontal,
    category: 'mix',
    gradient: 'from-violet-600 to-purple-700',
    stageId: 'mix',
    badge: 'הכי מבוקש',
  },
  {
    id: 'uniform-mixes',
    title: 'סלים אחידים',
    description:
      'שלושת הסלים שכל בנק חייב להציע לפי בנק ישראל — בסיס ההשוואה ההוגן בין ההצעות שתקבלו.',
    href: '/uniform-mixes',
    icon: Layers,
    category: 'mix',
    gradient: 'from-purple-600 to-fuchsia-700',
    stageId: 'mix',
  },
  {
    id: 'advisor-workspace',
    title: 'שולחן העבודה של היועץ',
    description:
      'הכלי המקצועי במלואו: בניית מסלולים, לוחות סילוקין, פירעונות מוקדמים, IRR והשוואה גרפית בין תמהילים.',
    href: '/mortgage-advisor',
    icon: Wrench,
    category: 'mix',
    gradient: 'from-blue-600 to-indigo-700',
    stageId: 'auction',
    badge: 'כלי היועצים',
  },
  {
    id: 'saved-mixes',
    title: 'תמהילים שמורים',
    description:
      'כל הגרסאות שבניתם וכל ההצעות שקיבלתם מהבנקים במקום אחד — להשוואה זו מול זו בכל רגע.',
    href: '/saved-mixes',
    icon: Save,
    category: 'mix',
    gradient: 'from-teal-600 to-cyan-700',
    stageId: 'auction',
  },
  {
    id: 'simulations',
    title: 'סימולציות פיננסיות',
    description:
      'מה קורה אם הריבית תעלה ב-2%? אם תפרעו 200 אלף בעוד 5 שנים? תרחישים מלאים לפני שחותמים.',
    href: '/simulations',
    icon: LineChart,
    category: 'mix',
    gradient: 'from-indigo-600 to-blue-700',
    stageId: 'mix',
  },

  // ── תהליך וניירת ────────────────────────────────────────────────
  {
    id: 'application',
    title: 'בקשת משכנתא חכמה',
    description:
      'תהליך מונחה להגשת הבקשה: אבני דרך, ריכוז עלויות, מיזוג הצעות וסימולציית זעזוע ריבית.',
    href: '/mortgage-application',
    icon: FileCheck2,
    category: 'process',
    gradient: 'from-emerald-600 to-green-700',
    stageId: 'applications',
  },
  {
    id: 'journey-map',
    title: 'מפת תהליך אינטראקטיבית',
    description:
      'כל שלבי המשכנתא על ציר זמן אחד — מה קורה עכשיו, מה הבא בתור ואילו מסמכים נדרשים בכל שלב.',
    href: '/interactive-mortgage-journey',
    icon: Map,
    category: 'process',
    gradient: 'from-cyan-600 to-teal-700',
    stageId: 'applications',
  },
  {
    id: 'documents',
    title: 'תיק מסמכים דיגיטלי',
    description:
      'העלאה וסריקה חכמה של תלושים, דפי בנק ואישורים — צ׳ק־ליסט שמתעדכן לפי הסטטוס התעסוקתי שלכם.',
    href: '/dashboard',
    icon: FolderOpen,
    category: 'process',
    gradient: 'from-slate-600 to-gray-700',
    stageId: 'applications',
  },
  {
    id: 'video-call',
    title: 'שיחת וידאו עם היועץ',
    description:
      'פגישה מאובטחת מתוך הפלטפורמה, כשהתמהיל והמסמכים פתוחים מול שני הצדדים באותו מסך.',
    href: '/dashboard',
    icon: Video,
    category: 'process',
    gradient: 'from-rose-600 to-pink-700',
    stageId: 'auction',
  },

  // ── מעקב וניהול שוטף ────────────────────────────────────────────
  {
    id: 'dashboard',
    title: 'האזור האישי',
    description:
      'מרכז השליטה שלכם: התקדמות התהליך, המסמכים, התמהילים והמחשבונים — הכל בעמוד אחד.',
    href: '/dashboard',
    icon: LayoutDashboard,
    category: 'tracking',
    gradient: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'mortgage-dashboard',
    title: 'דשבורד המשכנתא שלי',
    description:
      'מעקב אחרי המשכנתא הפעילה: יתרות לפי מסלול, לוח סילוקין, ריבית משוקללת ותחזית להמשך.',
    href: '/mortgage-dashboard',
    icon: GaugeCircle,
    category: 'tracking',
    gradient: 'from-emerald-600 to-teal-700',
    stageId: 'signing',
  },
  {
    id: 'refinance',
    title: 'מיחזור משכנתא',
    description:
      'בדיקה אם כדאי למחזר — הקטנת ההחזר או קיצור התקופה, כולל חישוב עמלת היוון ונקודת האיזון.',
    href: '/mortgage-refinance',
    icon: RefreshCw,
    category: 'tracking',
    gradient: 'from-purple-600 to-violet-700',
  },
  {
    id: 'existing-mortgage',
    title: 'פעולות על משכנתא קיימת',
    description:
      'פירעון מוקדם, החלפת מסלול או שינוי תקופה — לבדוק את ההשפעה לפני שפונים לבנק.',
    href: '/existing-mortgage',
    icon: Scale,
    category: 'tracking',
    gradient: 'from-amber-600 to-orange-700',
  },
  {
    id: 'learn',
    title: 'מרכז למידה',
    description:
      'תשעת מסלולי הריבית בשוק הישראלי, יסודות התמהיל וכל מה שצריך להבין לפני שמדברים עם בנקאי.',
    href: '/learn',
    icon: BookOpen,
    category: 'tracking',
    gradient: 'from-sky-600 to-blue-700',
  },
];

export const toolsByCategory = (category: ToolCategoryId) =>
  platformTools.filter((tool) => tool.category === category);
