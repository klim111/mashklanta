'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, X } from 'lucide-react';
import { demoId } from '@/demo/demo-attr';

export interface FloatingAction {
  key: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
  demo?: string;
}

/**
 * העיגול הכחול "פעולות" בפינה הימנית התחתונה, והפריטים שנפרשים ממנו כלפי
 * מעלה, אחד אחרי השני, כמו תפריט פעולות בטאבלט. כולם באותו גודל ובאותה צורה.
 *
 * משמש את שלבי המשכנתא (`StageActionsMenu`) ואת שאר מסכי הלקוח המחובר
 * (`ClientActionsMenu`), כך שהכפתור נראה ומתנהג אותו דבר בכל מקום.
 * `inline` — העיגול יושב בעמודה צפה של המסך, ולא בפינה בעצמו.
 */
export function FloatingActions({
  items,
  unread = 0,
  ariaLabel,
  inline = false,
  menuId,
}: {
  items: FloatingAction[];
  /** הודעות שעוד לא נקראו — מוצג על העיגול כשהתפריט סגור */
  unread?: number;
  ariaLabel: string;
  inline?: boolean;
  menuId: string;
}) {
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

  // בחירה בפריט סוגרת את התפריט, ואז מבצעת את הפעולה
  const pick = (action: FloatingAction) => () => {
    setOpen(false);
    action.onClick?.();
  };

  return (
    <>
      {/* שכבה שקופה-למחצה: לחיצה מחוץ לתפריט סוגרת אותו */}
      <AnimatePresence>
        {open && (
          <motion.button
            key="scrim"
            type="button"
            aria-label="סגירת תפריט הפעולות"
            tabIndex={-1}
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 cursor-default bg-slate-900/15 backdrop-blur-[1px] print:hidden"
          />
        )}
      </AnimatePresence>

      <div
        dir="rtl"
        className={`${inline ? 'relative' : 'fixed bottom-5 right-5'} z-40 flex flex-col items-start gap-3 print:hidden`}
      >
        <AnimatePresence>
          {open && (
            <motion.ul
              key="items"
              id={menuId}
              className="flex flex-col items-start gap-3"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.06, staggerDirection: -1 } },
                closed: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {items.map((item) => (
                <motion.li
                  key={item.key}
                  variants={{
                    open: { opacity: 1, y: 0, scale: 1 },
                    closed: { opacity: 0, y: 18, scale: 0.6 },
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  style={{ transformOrigin: 'right bottom' }}
                >
                  <ActionItem action={item} onClick={item.onClick ? pick(item) : close} />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((value) => !value)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'סגירת תפריט הפעולות' : ariaLabel}
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
          {!open && unread > 0 && (
            <span className="absolute -top-1 -left-1">
              <CountBadge value={unread} />
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
}

/**
 * פריט אחד בתפריט: עיגול זהה לכולם, ולצידו תווית בכדור לבן. כל השורה לחיצה,
 * כך שקל לפגוע בה באצבע בטאבלט.
 */
function ActionItem({ action, onClick }: { action: FloatingAction; onClick: () => void }) {
  const body = (
    <>
      <span className="rounded-full bg-white px-4 py-2 text-button font-black text-slate-900 shadow-lg ring-1 ring-slate-200 transition-colors group-hover:text-blue-700">
        {action.label}
      </span>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg ring-1 ring-slate-200 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        {action.icon}
        {action.badge && <span className="absolute -top-1.5 -left-1.5">{action.badge}</span>}
      </span>
    </>
  );
  const className =
    'group flex flex-row-reverse items-center gap-3 outline-none focus-visible:[&>span:last-child]:ring-4 focus-visible:[&>span:last-child]:ring-blue-300';
  const demo = action.demo ? demoId(action.demo) : {};

  if (action.href) {
    return (
      <Link href={action.href} onClick={onClick} className={className} {...demo}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} {...demo}>
      {body}
    </button>
  );
}

export function CountBadge({ value }: { value: number }) {
  return (
    <span className="block min-w-[1.25rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-2xs font-black leading-none text-white ring-2 ring-white">
      {value > 99 ? '99+' : value}
    </span>
  );
}
