import {
  Activity,
  BookOpen,
  Calculator,
  CreditCard,
  FolderOpen,
  Home,
  LayoutDashboard,
  Wallet,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Video,
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

/**
 * הכלים שמוצגים בעמוד "איך זה עובד" ובסיור בתהליך. כל קישור מוביל לכלי הנוכחי:
 * הכלים החינמיים פתוחים לכולם, והכלים שבאזור האישי מבקשים מאורח להתחבר.
 */
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
    icon: Wallet,
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
    id: 'cash-flow',
    title: 'מצב הון ותזרים',
    description:
      'המשכנתא וכל ההלוואות במקום אחד באזור האישי: ההחזר החודשי, יחס ההחזר מההכנסה הפנויה, וכמה נשאר בכל חודש.',
    href: '/dashboard#cash-flow',
    icon: Activity,
    category: 'planning',
    gradient: 'from-indigo-600 to-violet-700',
    stageId: 'analysis',
  },

  // ── תמהיל וריביות ───────────────────────────────────────────────
  {
    id: 'custom-mix',
    title: 'בניית תמהיל',
    description:
      'הרכבת מסלולי המשכנתא עם לוח סילוקין מלא, החזר חודשי וסך הריבית — והשוואה מול הסלים האחידים ומול תמהילים אחרים.',
    href: '/dashboard/mix-planner',
    icon: SlidersHorizontal,
    category: 'mix',
    gradient: 'from-violet-600 to-purple-700',
    stageId: 'mix',
  },
  {
    id: 'saved-mixes',
    title: 'תמהילים שמורים',
    description:
      'מכתבי הבקשה ששלחתם לבנקים, ההצעות שהתקבלו עליהם והתמהילים שבניתם — במקום אחד באזור האישי.',
    href: '/dashboard#rate-requests',
    icon: Save,
    category: 'mix',
    gradient: 'from-teal-600 to-cyan-700',
    stageId: 'auction',
  },

  // ── תהליך וניירת ────────────────────────────────────────────────
  {
    id: 'documents',
    title: 'תיק מסמכים דיגיטלי',
    description:
      'כל המסמכים שהבנק ידרוש, לפי הפרופיל ובעלות הנכס — מה כבר הוגש, מה חסר, והעלאה במקום אחד.',
    href: '/dashboard#documents',
    icon: FolderOpen,
    category: 'process',
    gradient: 'from-slate-600 to-gray-700',
    stageId: 'applications',
  },
  {
    id: 'video-call',
    title: 'פגישות עם היועץ',
    description:
      'הפגישות עם היועץ והמועדים החשובים בתהליך, בלוח השנה שבאזור האישי — לצד המשימות שממתינות לכם.',
    href: '/dashboard#agenda',
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
