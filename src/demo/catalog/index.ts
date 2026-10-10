/**
 * קטלוג ההדגמות.
 *
 * כל הדגמה היא רשומה אחת כאן: מזהה, כותרת, תיאור, אייקון, המסך שבו היא
 * מתחילה, קטגוריה וסדר — והצעדים עצמם נטענים בעצלות מ-`./flows`. כרטיסי דף
 * הבית, מסך /demo והמלצות ההמשך נבנים מהרשימה הזו; הוספת כלי חדש = רשומה
 * חדשה + קובץ צעדים.
 */

import {
  CalendarCheck,
  Calculator,
  Compass,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import type { DemoCatalogEntry, DemoCategory } from '../types';

export const DEMO_CATEGORY_LABELS: Record<DemoCategory, string> = {
  overview: 'סקירה כללית',
  planning: 'תכנון וכדאיות',
  mix: 'תמהיל ותרחישים',
  process: 'תהליך וניירת',
  client: 'האזור האישי',
};

export const DEMO_CATALOG: DemoCatalogEntry[] = [
  {
    id: 'overview',
    title: 'מה זה משכלנתא?',
    description: 'סיור קצר בפלטפורמה: הכלים החינמיים, חמשת שלבי המשכנתא והאזור האישי — בלי להיכנס לעומק.',
    icon: Compass,
    gradient: 'from-blue-600 to-indigo-700',
    route: '/',
    category: 'overview',
    order: 0,
    minutes: 3,
    featured: false,
    load: () => import('./flows/overview'),
  },
  {
    id: 'equity',
    title: 'הדגמת כלי תכנון הון עצמי',
    description: 'מחיר נכס ופרופיל מימון, ההוצאות הנלוות לפי קטגוריות, ותזרים ההון העצמי עד המפתח.',
    icon: Wallet,
    gradient: 'from-emerald-500 to-teal-600',
    route: '/equity-planning',
    category: 'planning',
    order: 1,
    minutes: 4,
    featured: true,
    load: () => import('./flows/equity'),
  },
  {
    id: 'affordability',
    title: 'הדגמת כלי "מה אני יכול להרשות לעצמי"',
    description: 'הכנסה, הון עצמי וגיל — ומשם שווי הנכס המקסימלי, הסליידרים של ההחזר והתקופה ומה כל תוצאה אומרת.',
    icon: Calculator,
    gradient: 'from-blue-500 to-cyan-500',
    route: '/mortgage-planning?flow=affordability',
    category: 'planning',
    order: 2,
    minutes: 4,
    featured: true,
    load: () => import('./flows/affordability'),
  },
  {
    id: 'plan-stages',
    title: 'הדגמת תכנון משכנתא לנכס עם חמשת השלבים',
    description: 'ניתוח, תמהיל, אישור עקרוני, מכרז בנקים וחתימה — שולחן העבודה של התהליך, שלב אחרי שלב.',
    icon: ListChecks,
    gradient: 'from-violet-500 to-purple-600',
    route: '/demo/plan',
    category: 'process',
    order: 3,
    minutes: 5,
    featured: true,
    load: () => import('./flows/plan-stages'),
  },
  {
    id: 'client-dashboard',
    title: 'הדגמת הדאשבורד של לקוח רשום',
    description: 'מעקב משימות, לוח שנה, הוספת פגישות ומשימות, מעקב אחרי הוצאות והפרופיל — מרכז השליטה היומיומי.',
    icon: CalendarCheck,
    gradient: 'from-sky-500 to-blue-600',
    route: '/demo/dashboard',
    category: 'client',
    order: 4,
    minutes: 5,
    featured: true,
    load: () => import('./flows/client-dashboard'),
  },
  {
    id: 'scenarios',
    title: 'הדגמת ניתוח תרחישים / תמהילים',
    description: 'פאנל השליטה של התמהיל: שינוי תקופה וסכום במסלול, מה קורה להחזר, והשוואה בין תמהילים.',
    icon: LineChart,
    gradient: 'from-indigo-500 to-violet-600',
    route: '/mortgage-advisor',
    category: 'mix',
    order: 5,
    minutes: 4,
    featured: true,
    load: () => import('./flows/scenarios'),
  },
  {
    id: 'refinance',
    title: 'הדגמת כלי מחזור משכנתא',
    description: 'הזנת המשכנתא הקיימת, סיכום המצב, בחירת מטרה — ופאנל שמראה מיד כמה אפשר לחסוך.',
    icon: RefreshCw,
    gradient: 'from-purple-500 to-fuchsia-600',
    route: '/mortgage-refinance',
    category: 'planning',
    order: 6,
    minutes: 4,
    featured: true,
    load: () => import('./flows/refinance'),
  },
  {
    id: 'client-area',
    title: 'הדגמת אזור הלקוח',
    description: 'הסקירה, התמהילים השמורים והבקשות לבנקים, מרכז הכלים וההגדרות — כל מה שיש ללקוח בחשבון.',
    icon: LayoutDashboard,
    gradient: 'from-slate-600 to-slate-800',
    route: '/demo/dashboard',
    category: 'client',
    order: 7,
    minutes: 3,
    featured: true,
    load: () => import('./flows/client-area'),
  },
  {
    id: 'documents',
    title: 'הדגמת ניהול מסמכים ותהליך העבודה',
    description: 'תיק המסמכים, ההתקדמות לפי שלב, העלאה בכותרת חופשית ומשימות השלב — איך הניירת זורמת בתהליך.',
    icon: FolderOpen,
    gradient: 'from-amber-500 to-orange-600',
    route: '/demo/plan',
    category: 'process',
    order: 8,
    minutes: 4,
    featured: true,
    load: () => import('./flows/documents'),
  },
];

export const featuredDemos = () =>
  DEMO_CATALOG.filter((entry) => entry.featured).sort((a, b) => a.order - b.order);

export const demoById = (id: string) => DEMO_CATALOG.find((entry) => entry.id === id) ?? null;
