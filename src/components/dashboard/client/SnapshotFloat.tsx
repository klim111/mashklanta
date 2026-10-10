'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gauge, X } from 'lucide-react';

export interface SnapshotItem {
  id: string;
  icon: ReactNode;
  tone: keyof typeof TONES;
  label: string;
  value: string;
  hint: string;
  onClick: () => void;
}

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
} as const;

const SEEN_KEY = 'mashkalanta:snapshot-closed';

/**
 * תמונת המצב — ארבעת המספרים שהיו בראש הסקירה, כחלונית צפה בפינה.
 *
 * בכניסה הראשונה בכל ביקור היא נפתחת כהתרעה; אחרי שנסגרה היא נשארת סגורה עד
 * לחיצה על הכפתור הצף "תמונת מצב". כך המידע זמין תמיד בלי לתפוס את ראש המסך.
 */
export function SnapshotFloat({ items, alert }: { items: SnapshotItem[]; alert: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let closed = false;
    try {
      closed = window.sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      closed = false;
    }
    if (!closed) setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* אחסון חסום — החלונית פשוט תיפתח שוב בביקור הבא */
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col items-start gap-2.5 print:hidden" dir="rtl">
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="תמונת מצב"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="w-[min(27rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
          >
            <header className="flex items-center justify-between gap-2 bg-brand-dark px-4 py-2.5">
              <span className="flex items-center gap-2 text-base font-black text-white">
                <Gauge className="h-4 w-4" />
                תמונת מצב
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="סגירת תמונת המצב"
                className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <ul className="grid grid-cols-2 gap-px bg-slate-100">
              {items.map((item) => (
                <li key={item.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      item.onClick();
                      close();
                    }}
                    className="flex h-full w-full items-center gap-2.5 px-3 py-2.5 text-right transition-colors hover:bg-slate-50"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[item.tone]}`}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 [&>span]:!text-right">
                      <span className="block truncate text-2xs font-bold text-slate-500">{item.label}</span>
                      <span className="block truncate text-base font-black leading-tight text-slate-900">{item.value}</span>
                      <span className="block truncate text-2xs text-slate-500">{item.hint}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className="relative inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-3 text-button font-black text-white shadow-xl shadow-slate-900/25 transition-transform hover:-translate-y-0.5"
      >
        <Gauge className="h-5 w-5" />
        תמונת מצב
        {alert && !open && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" aria-label="יש פריטים דחופים" />
        )}
      </button>
    </div>
  );
}
