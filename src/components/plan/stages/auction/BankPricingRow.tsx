'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { MORTGAGE_BANKS } from '@/components/mortgage-advisor/types';
import type { MortgageBank } from '@/components/mortgage-advisor/types';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { BankRateEntry } from './BankRateEntry';
import { bankTone } from './pricedMixes';
import { StageSubtitle } from './ui';

interface BankPricingRowProps {
  /** התמהיל הסופי — המבנה שכל הבנקים מתמחרים */
  mix: WorkspaceMix;
  takenNames: string[];
  /** כמה הצעות כבר נשמרו לכל בנק */
  offersPerBank: Record<string, number>;
  /**
   * הבנקים שנתנו אישור עקרוני בשלב הקודם. הם מוצגים ראשונים ומסומנים, כי רק
   * מהם אפשר לבקש תמחור בפועל. שאר הבנקים נשארים זמינים מאחורי כפתור.
   */
  approvedBanks?: readonly string[];
  onSave: (quoted: WorkspaceMix) => Promise<void> | void;
}

/**
 * שורת הבנקים.
 *
 * כל הבנקים בשורה אחת, ותו לא. לחיצה על שם בנק פותחת מתחתיה את טבלת הזנת
 * הריביות של אותו בנק בלבד, ושמירה סוגרת אותה — ההצעה כבר מופיעה למטה כשורת
 * תמהיל. כך המסך לא מתמלא בטפסים של בנקים שעדיין לא חזרו עם תמחור.
 */
export function BankPricingRow({
  mix,
  takenNames,
  offersPerBank,
  approvedBanks = [],
  onSave,
}: BankPricingRowProps) {
  const [open, setOpen] = useState<MortgageBank | null>(null);
  /** בנקים שלא נתנו אישור עקרוני מוצגים רק כשמבקשים אותם במפורש */
  const [showAll, setShowAll] = useState(false);

  const approved = MORTGAGE_BANKS.filter((bank) => approvedBanks.includes(bank));
  const rest = MORTGAGE_BANKS.filter((bank) => !approvedBanks.includes(bank));
  const visible = approved.length === 0 || showAll ? [...approved, ...rest] : approved;

  return (
    <div className="space-y-3">
      <StageSubtitle>
        {approved.length > 0
          ? 'הבנקים שנתנו לכם אישור עקרוני. לחצו על הבנק שחזר אליכם עם ריביות'
          : 'לחצו על הבנק שחזר אליכם עם ריביות'}
      </StageSubtitle>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {visible.map((bank) => {
          const tone = bankTone(bank);
          const active = open === bank;
          const count = offersPerBank[bank] ?? 0;

          return (
            <button
              key={bank}
              type="button"
              onClick={() => setOpen(active ? null : bank)}
              aria-expanded={active}
              style={
                active ? { backgroundColor: tone.dot, borderColor: tone.dot } : { borderColor: tone.dot }
              }
              className={`inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition-all ${
                active ? 'text-white shadow-md' : 'bg-white text-slate-800 hover:shadow-sm'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: active ? '#fff' : tone.dot }}
              />
              {bank}
              {count > 0 ? (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 text-[11px] font-black ${
                    active ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Check className="h-3 w-3" />
                  {count}
                </span>
              ) : (
                <Plus className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
              )}
            </button>
          );
        })}

        {approved.length > 0 && rest.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-2.5 text-sm font-black text-slate-500 transition-colors hover:bg-slate-50"
          >
            {showAll ? 'הצג רק בנקים עם אישור' : `בנק אחר (${rest.length})`}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={open}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl border-2 border-slate-200 bg-slate-50/60 p-4">
              <BankRateEntry
                mix={mix}
                bank={open}
                takenNames={takenNames}
                onSave={onSave}
                onSaved={() => setOpen(null)}
                onCancel={() => setOpen(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
