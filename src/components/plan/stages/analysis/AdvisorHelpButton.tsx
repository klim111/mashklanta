'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpLeft, CheckCircle2, Headset, Loader2, X } from 'lucide-react';

/**
 * הכפתור הצף שמלווה את כל מסכי שלב הפרופיל.
 *
 * מי שבחר לבצע את השלב לבד לא צריך לבחור שוב — מה שהוא צריך בכל רגע הוא
 * את הדרך להביא יועץ שיעזור לו בשלב: בקשת הליווי החינמית של השלב.
 */
export function AdvisorHelpButton({
  onRequestAdvisor,
  busy = false,
  stageLabel = 'שלב 1 · הפרופיל הפיננסי',
  title = 'היעזרו ביועץ משכנתא להשלמת השלב',
  description = 'יועץ משכלנתא ייפגש איתכם אונליין, יבחן את התלושים, דפי הבנק וההתחייבויות, ויפיק את דוח הפרופיל במקומכם. כל מה שכבר הזנתם כאן עובר אליו. הבקשה חינמית — התשלום מסודר מולו בהמשך, רק אם תחליטו להמשיך.',
  opensDialog = false,
}: {
  onRequestAdvisor?: () => void;
  busy?: boolean;
  /** השורה הקטנה מעל הכותרת — באיזה שלב אנחנו */
  stageLabel?: string;
  title?: string;
  description?: string;
  /**
   * הלחיצה פותחת טופס פנייה (ולא שולחת בקשה מיד) — ואז הכפתור לא מסמן
   * "הבקשה נשלחה" בעצמו
   */
  opensDialog?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const request = () => {
    onRequestAdvisor?.();
    if (opensDialog) {
      setOpen(false);
      return;
    }
    setSent(true);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 left-4 z-40 flex flex-col items-start gap-3 print:hidden sm:left-6">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            dir="rtl"
            className="pointer-events-auto w-[min(92vw,22rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 bg-gradient-to-l from-violet-600 to-purple-600 px-5 py-4 text-white">
              <div>
                <p className="text-[11px] font-bold text-white/80">{stageLabel}</p>
                <h4 className="mt-0.5 text-base font-black leading-snug">{title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירה"
                className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
              {onRequestAdvisor && (
                <button
                  type="button"
                  disabled={busy || sent}
                  onClick={request}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-violet-700 disabled:opacity-70"
                >
                  {sent ? 'הבקשה נשלחה — היועץ יחזור אליכם' : 'העבירו פנייה ליועץ'}
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : sent ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ArrowUpLeft className="h-4 w-4" />
                  )}
                </button>
              )}
              <Link
                href="/how-it-works#journey"
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-900"
              >
                מה היועץ עושה בשלב הזה
                <ArrowUpLeft className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        aria-expanded={open}
        className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-gradient-to-l from-violet-600 to-purple-600 py-3 pl-5 pr-4 text-sm font-black text-white shadow-[0_12px_30px_rgba(124,58,237,0.4)] ring-2 ring-white transition-shadow hover:shadow-[0_14px_36px_rgba(124,58,237,0.5)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Headset className="h-4 w-4" />
        </span>
        פנו ליועץ לעזרה בשלב זה
      </motion.button>
    </div>
  );
}
