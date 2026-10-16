'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calculator,
  CreditCard,
  Gavel,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';

/** מסכים שבהם הכפתור לא מוצג: התחברות, שיחת וידאו וסיור ההדגמה */
const HIDDEN_PREFIXES = ['/auth', '/meeting/', '/demo'];

/** לשונית בלוח הבקרה של היועץ. בלוח עצמו — מעבר בלי טעינה מחדש */
export const ADVISOR_TAB_EVENT = 'mashkalanta:advisor-tab';

interface QuickTool {
  key: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  href?: string;
  /** לשונית בלוח הבקרה של היועץ */
  tab?: string;
}

/** בניית תמהילים — הכלי של היועץ, תיק התמהילים ומה שהוגש לבנקים */
const MIX_TOOLS: QuickTool[] = [
  {
    key: 'mix-builder',
    label: 'בונה התמהילים',
    hint: 'מחיר, לווים, מסלולים ודוחות',
    icon: <Calculator className="h-5 w-5" />,
    href: '/mortgage-advisor',
  },
  {
    key: 'mixes',
    label: 'תיק התמהילים',
    hint: 'שיוך ללקוח ושליחה',
    icon: <Layers className="h-5 w-5" />,
    tab: 'mixes',
  },
  {
    key: 'rate-requests',
    label: 'תמהילים שהוגשו לבנקים',
    icon: <Gavel className="h-5 w-5" />,
    tab: 'rate-requests',
  },
];

/** אותם כלים שיש ללקוח במרכז הכלים שלו */
const CLIENT_TOOLS: QuickTool[] = [
  { key: 'equity', label: 'תכנון הון עצמי', icon: <Wallet className="h-5 w-5" />, href: '/equity-planning' },
  {
    key: 'cash-flow',
    label: 'מצב הון ותזרים',
    icon: <LineChart className="h-5 w-5" />,
    href: '/advisor-dashboard/tools/cash-flow',
  },
  { key: 'consumer-loans', label: 'הלוואות צרכניות', icon: <CreditCard className="h-5 w-5" />, href: '/consumer-loans' },
  { key: 'refinance', label: 'מיחזור משכנתא', icon: <RefreshCw className="h-5 w-5" />, href: '/mortgage-refinance' },
  {
    key: 'feasibility',
    label: 'בדיקת היתכנות',
    icon: <Search className="h-5 w-5" />,
    href: '/mortgage-planning?flow=affordability',
  },
  { key: 'learn', label: 'מרכז הלמידה', icon: <BookOpen className="h-5 w-5" />, href: '/learn' },
];

const NAV_TOOLS: QuickTool[] = [
  { key: 'dashboard', label: 'לוח הבקרה', icon: <LayoutDashboard className="h-4 w-4" />, href: '/advisor-dashboard' },
  { key: 'clients', label: 'לקוחות', icon: <Users className="h-4 w-4" />, tab: 'clients' },
];

/**
 * כפתור הפעולות המהירות של היועץ — עיגול כחול בפינה הימנית התחתונה, בכל עמוד
 * שהיועץ נמצא בו. נפתח ממנו לוח עם בונה התמהילים ותיק התמהילים, כל הכלים
 * שיש ללקוח, ומעבר מהיר ללוח הבקרה.
 */
export function AdvisorActionsMenu() {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // מעבר עמוד סוגר את הלוח
  useEffect(() => setOpen(false), [pathname]);

  if (status !== 'authenticated' || session?.user?.role !== 'ADVISOR') return null;
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const openTab = (tab: string) => {
    setOpen(false);
    if (pathname === '/advisor-dashboard') {
      window.dispatchEvent(new CustomEvent(ADVISOR_TAB_EVENT, { detail: tab }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(`/advisor-dashboard?tab=${tab}`);
    }
  };

  const item = (tool: QuickTool, size: 'big' | 'small' = 'big') => {
    const className =
      size === 'big'
        ? 'group flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 text-right transition-colors hover:border-blue-300 hover:bg-blue-50'
        : 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700';
    const body =
      size === 'big' ? (
        <>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            {tool.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black leading-tight text-slate-900">{tool.label}</span>
            {tool.hint && <span className="block truncate text-2xs text-slate-500">{tool.hint}</span>}
          </span>
        </>
      ) : (
        <>
          {tool.icon}
          {tool.label}
        </>
      );
    if (tool.tab) {
      const tab = tool.tab;
      return (
        <button key={tool.key} type="button" onClick={() => openTab(tab)} className={className}>
          {body}
        </button>
      );
    }
    return (
      <Link key={tool.key} href={tool.href ?? '/advisor-dashboard'} onClick={close} className={className}>
        {body}
      </Link>
    );
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            key="scrim"
            type="button"
            aria-label="סגירת הפעולות המהירות"
            tabIndex={-1}
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 cursor-default bg-slate-900/20 backdrop-blur-[1px] print:hidden"
          />
        )}
      </AnimatePresence>

      <div dir="rtl" className="fixed bottom-5 right-5 z-40 flex flex-col items-start gap-3 print:hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              key="panel"
              id="advisor-quick-actions"
              role="dialog"
              aria-label="פעולות מהירות"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{ transformOrigin: 'right bottom' }}
              className="max-h-[calc(100dvh-7.5rem)] w-[min(26rem,calc(100vw-2.5rem))] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 text-right shadow-2xl"
            >
              <p className="px-1 pb-2 text-2xs font-black text-slate-500">בניית תמהילים</p>
              <div className="grid grid-cols-1 gap-2">{MIX_TOOLS.map((tool) => item(tool))}</div>

              <p className="px-1 pb-2 pt-4 text-2xs font-black text-slate-500">הכלים של הלקוח</p>
              <div className="grid grid-cols-2 gap-2">{CLIENT_TOOLS.map((tool) => item(tool))}</div>

              <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-200 pt-2">
                {NAV_TOOLS.map((tool) => item(tool, 'small'))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((value) => !value)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          aria-expanded={open}
          aria-controls="advisor-quick-actions"
          aria-label={open ? 'סגירת הפעולות המהירות' : 'פעולות מהירות: בונה התמהילים, תיק התמהילים וכלי הלקוח'}
          className="relative flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/35 ring-4 ring-white transition-colors hover:bg-blue-700"
        >
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="flex"
          >
            {open ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
          </motion.span>
          <span className="text-2xs font-black leading-none">{open ? 'סגירה' : 'פעולות'}</span>
        </motion.button>
      </div>
    </>
  );
}
