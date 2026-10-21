'use client';

import React from 'react';
import { bankTone as toneOf } from './pricedMixes';
import { StageSubtitle } from './ui';

/**
 * שורת הבנקים — הדרך לבחור איזו הצעה מוצגת.
 *
 * המסך מציג הצעה אחת בכל רגע, וזו השורה שמחליפה אותה: לחיצה על שם בנק פותחת
 * בדאשבורד את ההצעה הזולה שלו, ולחיצה חוזרת מחזירה לזולה מכל ההצעות. זה מה
 * שמצופה מלחיצה על שם בנק — לראות מה הוא הציע.
 */
export function BankFilterRow({
  banks,
  counts,
  selectedBanks,
  onToggleBank,
  onClearBanks,
}: {
  banks: readonly string[];
  counts: Record<string, number>;
  selectedBanks: readonly string[];
  onToggleBank: (bank: string) => void;
  onClearBanks: () => void;
}) {
  if (banks.length === 0) return null;

  return (
    <div className="space-y-2">
      <StageSubtitle>לחצו על בנק כדי לפתוח את ההצעה שלו בדאשבורד</StageSubtitle>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {banks.map((bank) => {
          const tone = toneOf(bank);
          const active = selectedBanks.includes(bank);

          return (
            <button
              key={bank}
              type="button"
              onClick={() => onToggleBank(bank)}
              aria-pressed={active}
              style={
                active
                  ? { backgroundColor: tone.dot, borderColor: tone.dot }
                  : { borderColor: tone.dot }
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
              <span className={active ? 'text-white/80' : 'text-slate-500'}>
                {counts[bank] ?? 0}
              </span>
            </button>
          );
        })}

        {selectedBanks.length > 0 && (
          <button
            type="button"
            onClick={onClearBanks}
            className="rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            כל הבנקים
          </button>
        )}
      </div>
    </div>
  );
}
