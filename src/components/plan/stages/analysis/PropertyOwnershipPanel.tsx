'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ClipboardList, Info, ScrollText } from 'lucide-react';
import { ScenarioPicker, resolveSelection } from '../signing/ScenarioPicker';
import type { ScenarioSelection } from '../signing/ScenarioPicker';
import type { SigningData } from '@/lib/mortgage-plan';

/**
 * הגדרת בעלות הנכס, כבר בפרופיל הפיננסי.
 *
 * זו אותה בחירה בדיוק שנעשית בשלב החתימה (תת-שלב "מסמכי התיק"): סוג העסקה,
 * אופן רישום הזכויות והתרחיש. היא נשמרת על שלב החתימה עצמו, כך שיש מקור אמת
 * אחד — מי שממלא אותה כאן מקבל את רשימת המסמכים המינימלית כבר עכשיו, ומי
 * שאין לו את הפרטים משאיר את זה לשלב הסופי.
 */
export function PropertyOwnershipPanel({
  signing,
  onChange,
}: {
  signing: SigningData;
  onChange: (next: SigningData) => void;
}) {
  const { deal, registry, scenario } = resolveSelection(signing);
  const [open, setOpen] = useState(Boolean(deal));

  const select = (next: ScenarioSelection) => onChange({ ...signing, ...next });

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <header className="mb-5 text-center">
        <h3 className="text-xl font-black text-slate-900 md:text-2xl">בעלות הנכס ורישום הזכויות</h3>
        <p className="mx-auto mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">
          מילוי הפרטים האלה מגדיר את רשימת המסמכים המינימלית שהבנק ידרוש בשלב החתימה על תיק
          המשכנתא. טיפול באיסוף המסמכים כבר מהשלב הראשון מקצר משמעותית את הזמנים בשלב החתימה
          הסופי. אם הפרטים עדיין לא בידיכם — אפשר להשאיר אותם לשלב הסופי ולחזור לכאן בהמשך.
        </p>
      </header>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-rose-500 to-pink-600 px-6 py-3 text-[15px] font-black text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:brightness-110"
        >
          <ScrollText className="h-5 w-5" />
          הגדרת בעלות הנכס
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {scenario && deal && (
          <p className="inline-flex flex-wrap items-center justify-center gap-2 text-[13px] font-bold text-slate-600">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white">
              {deal.short}
            </span>
            {registry && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                {registry.title}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <ClipboardList className="h-4 w-4" />
              {scenario.documents.length} מסמכים ידועים כבר עכשיו
            </span>
          </p>
        )}

        {!scenario && (
          <p className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400">
            <Info className="h-4 w-4" />
            לא חובה עכשיו — אפשר להשלים בשלב החתימה
          </p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="ownership"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-5">
              <ScenarioPicker
                value={{
                  dealTypeId: signing.dealTypeId,
                  registryId: signing.registryId,
                  scenarioId: signing.scenarioId,
                }}
                onChange={select}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
