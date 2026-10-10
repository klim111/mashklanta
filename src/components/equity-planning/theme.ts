import {
  AlertCircle,
  Banknote,
  Building2,
  Hammer,
  Package,
  Scale,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EQUITY_CATEGORY_ID } from '@/lib/equity-planning';
import type { EquityStandingLevel } from '@/lib/equity-planning';

/** האייקון של כל קטגוריה — נשאר בשכבת התצוגה, כדי שהלוגיקה תישאר טהורה */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  [EQUITY_CATEGORY_ID]: Banknote,
  mortgage: Building2,
  legal: Scale,
  'property-search': Search,
  taxation: Banknote,
  logistics: Package,
  'new-home': Hammer,
  emergency: AlertCircle,
};

export function categoryIcon(categoryId: string): LucideIcon {
  return CATEGORY_ICONS[categoryId] ?? AlertCircle;
}

interface CategoryTone {
  /** ריבוע האייקון */
  chip: string;
  /** הגוון בגרף ובפס ההרכב */
  hex: string;
  /** פס צד עדין בשורת הקטגוריה */
  bar: string;
}

const TONES: Record<string, CategoryTone> = {
  emerald: { chip: 'bg-emerald-100 text-emerald-700', hex: '#10b981', bar: 'bg-emerald-500' },
  blue: { chip: 'bg-blue-100 text-blue-700', hex: '#3b82f6', bar: 'bg-blue-500' },
  green: { chip: 'bg-green-100 text-green-700', hex: '#22c55e', bar: 'bg-green-500' },
  purple: { chip: 'bg-purple-100 text-purple-700', hex: '#a855f7', bar: 'bg-purple-500' },
  orange: { chip: 'bg-orange-100 text-orange-700', hex: '#f97316', bar: 'bg-orange-500' },
  teal: { chip: 'bg-teal-100 text-teal-700', hex: '#14b8a6', bar: 'bg-teal-500' },
  red: { chip: 'bg-red-100 text-red-700', hex: '#ef4444', bar: 'bg-red-500' },
  amber: { chip: 'bg-amber-100 text-amber-700', hex: '#f59e0b', bar: 'bg-amber-500' },
  indigo: { chip: 'bg-indigo-100 text-indigo-700', hex: '#6366f1', bar: 'bg-indigo-500' },
  gray: { chip: 'bg-slate-100 text-slate-600', hex: '#64748b', bar: 'bg-slate-400' },
};

export function categoryTone(color: string): CategoryTone {
  return TONES[color] ?? TONES.gray;
}

/** הצבעים של שורת ההון העצמי, לפי איפה היא עומדת מול המינימום הנדרש */
export const STANDING_TONES: Record<
  EquityStandingLevel,
  { row: string; title: string; note: string; border: string; ring: string }
> = {
  below: {
    row: 'bg-gradient-to-l from-rose-50 via-orange-50 to-rose-50',
    title: 'text-rose-900',
    note: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'focus-visible:ring-rose-500/20 border-rose-300',
  },
  minimum: {
    row: 'bg-gradient-to-l from-amber-50 via-yellow-50 to-amber-50',
    title: 'text-amber-900',
    note: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'focus-visible:ring-amber-500/20 border-amber-300',
  },
  good: {
    row: 'bg-gradient-to-l from-green-50 via-emerald-50 to-green-50',
    title: 'text-green-900',
    note: 'text-green-700',
    border: 'border-green-200',
    ring: 'focus-visible:ring-green-500/20 border-green-300',
  },
  great: {
    row: 'bg-gradient-to-l from-emerald-50 via-teal-50 to-emerald-50',
    title: 'text-emerald-900',
    note: 'text-emerald-700',
    border: 'border-emerald-300',
    ring: 'focus-visible:ring-emerald-500/20 border-emerald-400',
  },
  excellent: {
    row: 'bg-gradient-to-l from-blue-50 via-indigo-50 to-blue-50',
    title: 'text-blue-900',
    note: 'text-blue-700',
    border: 'border-blue-300',
    ring: 'focus-visible:ring-blue-500/20 border-blue-400',
  },
};

const SHEKEL = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

export function shekel(value: number): string {
  return `₪${SHEKEL.format(Math.round(value))}`;
}

/** סכום מקוצר לכרטיסי המדדים ולגרף — 1.2M / 340K */
export function compactShekel(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₪${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `₪${Math.round(value / 1000)}K`;
  return `₪${Math.round(value)}`;
}

export const HE_DATE = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const HE_MONTH = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
export const HE_SHORT_DATE = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });

export const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

/** YYYY-MM-DD לפי הזמן המקומי, בלי הזזה של אזור זמן */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDayKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}
