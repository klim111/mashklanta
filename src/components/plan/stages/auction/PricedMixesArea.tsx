'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Crown, Filter, Trash2, X } from 'lucide-react';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { CompositionBar, formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { formatQuoteDate } from '@/components/mortgage-advisor/bankQuote/quote';
import { EmptyHint } from '../../ui';
import { bankTone, pricedMixLabel } from './pricedMixes';
import type { PricedMix } from './pricedMixes';

interface PricedMixesAreaProps {
  /** כל ההצעות שהתקבלו על התמהיל הסופי */
  items: PricedMix[];
  /** ההצעות אחרי הסינון — אלה שמוצגות */
  visible: PricedMix[];
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
  onRemove: (mixId: string) => void;
}

/**
 * אזור התמהילים המתומחרים.
 *
 * כל שורה היא אותו מבנה תמהיל בדיוק, בריביות של בנק אחר. הסימון בכיתוב ובצבע
 * הוא מה שמאפשר לראות בסריקה אחת מי תמחר מה, ושורת הסינון למעלה מצמצמת את
 * התצוגה לבנקים שרוצים להשוות — בלי הגבלה על מספרם.
 */
export function PricedMixesArea({
  items,
  visible,
  banks,
  selectedBanks,
  onToggleBank,
  onClearBanks,
  winnerId,
  signedMixKey,
  onRemove,
}: PricedMixesAreaProps) {
  if (items.length === 0) {
    return (
      <EmptyHint>
        עדיין לא נשמרה אף הצעה. הזינו למעלה את הריביות שבנק החזיר על התמהיל הסופי ולחצו
        &quot;שמור הצעה&quot; — כל הצעה תופיע כאן על שם הבנק שתמחר אותה.
      </EmptyHint>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
          <Filter className="h-3.5 w-3.5" />
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
              style={active ? { backgroundColor: tone.dot, borderColor: tone.dot } : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                active
                  ? 'text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: active ? '#fff' : tone.dot }}
              />
              {bank}
              <span className={active ? 'text-white/80' : 'text-slate-400'}>{count}</span>
            </button>
          );
        })}

        {selectedBanks.length > 0 && (
          <button
            type="button"
            onClick={onClearBanks}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-3 w-3" />
            כל הבנקים
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyHint>לבנקים שסימנתם אין עדיין הצעות שמורות.</EmptyHint>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {visible.map((item) => (
              <PricedMixRow
                key={item.mix.id}
                item={item}
                isWinner={item.mix.id === winnerId}
                isSigned={item.mix.id === signedMixKey}
                onRemove={() => onRemove(item.mix.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function PricedMixRow({
  item,
  isWinner,
  isSigned,
  onRemove,
}: {
  item: PricedMix;
  isWinner: boolean;
  isSigned: boolean;
  onRemove: () => void;
}) {
  const tone = bankTone(item.bank);
  const { summary } = item;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm ${
        isSigned ? 'border-emerald-500' : tone.border
      }`}
    >
      {/* פס הצבע של הבנק — ההפרדה הוויזואלית בין ההצעות */}
      <div className="h-1.5 w-full" style={{ backgroundColor: tone.dot }} />

      <div className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${tone.surface} ${tone.text}`}
          >
            <Building2 className="h-3 w-3" />
            {pricedMixLabel(item.bank)}
          </span>
          <span className="truncate text-sm font-black text-slate-900">{item.mix.name}</span>
          <span className="text-[10px] text-slate-400">
            התקבל {formatQuoteDate(item.receivedAt)}
          </span>

          {isSigned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white">
              <Crown className="h-3 w-3" />
              נבחר לחתימה
            </span>
          ) : isWinner ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
              <Crown className="h-3 w-3" />
              ההצעה הזולה
            </span>
          ) : null}

          <button
            type="button"
            onClick={onRemove}
            aria-label={`מחיקת ההצעה של ${item.bank}`}
            className="mr-auto rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <CompositionBar
          tracks={item.mix.tracks.map((track) => ({
            id: track.id,
            type: track.type,
            percentage: track.percentage,
            name: track.name,
          }))}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <RowStat label="החזר חודשי" value={formatShekel(summary.monthlyPayment)} emphasized />
          <RowStat label="סך ריבית" value={formatShekel(summary.totalInterest)} />
          <RowStat label="סך תשלום" value={formatShekel(summary.totalPaid)} />
          <RowStat label="ריבית ממוצעת" value={formatPercentage(summary.averageRate)} />
          <RowStat label="תקופה" value={formatDuration(summary.months)} />
        </div>
      </div>
    </motion.div>
  );
}

function RowStat({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-1.5 text-center">
      <span className="block text-[10px] font-semibold text-slate-500">{label}</span>
      <span className={`block font-black text-slate-900 ${emphasized ? 'text-sm' : 'text-xs'}`}>
        {value}
      </span>
    </div>
  );
}
