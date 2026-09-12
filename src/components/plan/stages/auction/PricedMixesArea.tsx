'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import type { MixResult } from '@/components/mortgage-advisor/engine';
import { PricedMixRow } from './PricedMixRow';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { StageEmpty } from './ui';

interface PricedMixesAreaProps {
  /** כל ההצעות שהתקבלו על התמהיל הסופי */
  items: PricedMix[];
  /** ההצעות אחרי הסינון — אלה שמוצגות */
  visible: PricedMix[];
  /** התמהיל כפי שתוכנן, לפני התמחור — הבסיס להשוואה בגרפים */
  baseResult: MixResult;
  /** הבנקים שאפשר לסנן לפיהם */
  banks: readonly string[];
  /** הבנקים שנבחרו. ריק — הכול */
  selectedBanks: readonly string[];
  onToggleBank: (bank: string) => void;
  onClearBanks: () => void;
  /** ההצעה הזולה מבין המוצגות */
  winnerId?: string | null;
  /** ההצעה שנבחרה כתמהיל הסופי לחתימה */
  signedMixKey?: string | null;
  onRemove?: (mixId: string) => void;
  /** הטקסט שמוצג כשאין עדיין אף הצעה */
  emptyHint: string;
}

/**
 * אזור התמהילים המתומחרים.
 *
 * כל שורה היא אותו מבנה תמהיל בדיוק, בריביות של בנק אחר, ומוצגת כשורת תמהיל
 * מלאה — בדיוק כמו בכלי בניית התמהיל. שורת הסינון למעלה מצמצמת את התצוגה
 * לבנקים שרוצים להשוות, בלי הגבלה על מספרם.
 */
export function PricedMixesArea({
  items,
  visible,
  baseResult,
  banks,
  selectedBanks,
  onToggleBank,
  onClearBanks,
  winnerId,
  signedMixKey,
  onRemove,
  emptyHint,
}: PricedMixesAreaProps) {
  if (items.length === 0) {
    return <StageEmpty>{emptyHint}</StageEmpty>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-black text-slate-700">
          <Filter className="h-4 w-4" />
          הצגה לפי בנק
        </span>
        {banks.map((bank) => {
          const tone = bankTone(bank);
          const active = selectedBanks.includes(bank);
          const count = items.filter((item) => item.bank === bank).length;

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
              className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-black transition-colors ${
                active ? 'text-white shadow-sm' : 'bg-white text-slate-700 hover:shadow-sm'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: active ? '#fff' : tone.dot }}
              />
              {bank}
              <span className={active ? 'text-white/80' : 'text-slate-500'}>{count}</span>
            </button>
          );
        })}

        {selectedBanks.length > 0 && (
          <button
            type="button"
            onClick={onClearBanks}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
            כל הבנקים
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <StageEmpty>לבנקים שסימנתם אין עדיין הצעות שמורות.</StageEmpty>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((item) => (
              <PricedMixRow
                key={item.mix.id}
                item={item}
                baseResult={baseResult}
                isWinner={item.mix.id === winnerId}
                isSigned={item.mix.id === signedMixKey}
                onRemove={onRemove ? () => onRemove(item.mix.id) : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
