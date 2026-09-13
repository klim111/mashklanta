'use client';

import React from 'react';
import { Building2, Crown, Radio, Trash2 } from 'lucide-react';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { formatQuoteDate } from '@/components/mortgage-advisor/bankQuote/quote';
import { TrackStrip } from './TrackStrip';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { StageEmpty, StageSubtitle } from './ui';

interface BankOffersTableProps {
  /** כל ההצעות שהתקבלו, מהזולה ליקרה */
  items: PricedMix[];
  /** הבנקים שכבר תמחרו */
  banks: readonly string[];
  /** הבנקים שסומנו. ריק — הכול */
  selectedBanks: readonly string[];
  onToggleBank: (bank: string) => void;
  onClearBanks: () => void;
  /** ההצעה שמוצגת כרגע בדאשבורד */
  featuredId: string | null;
  onFeature: (mixId: string) => void;
  winnerId: string | null;
  /** מחיקת הצעה שהוזנה בטעות */
  onRemove?: (mixId: string) => void;
  /** ההצעות שכבר שודרו ללקוח. קיים רק במסך של היועץ */
  broadcastIds?: readonly string[];
  onBroadcast?: (item: PricedMix) => void;
  emptyHint: string;
}

/**
 * הבנקים שתמחרו, וטבלת ההצעות שלהם.
 *
 * שורת הבנקים עושה שתי עבודות בבת אחת: היא מצמצמת את הטבלה לבנקים שסומנו,
 * וגם מעלה את ההצעה הזולה של הבנק שנלחץ לדאשבורד שמתחת. זה מה שמצופה מלחיצה
 * על שם בנק — לראות מה הוא הציע.
 *
 * בכל שורה בטבלה הריביות שהבנק נקב יושבות בתוך קטעי הפס עצמם, בפונט גדול:
 * כל ההצעות הן על אותו מבנה בדיוק, ולכן הריביות הן כל מה שמשתנה ביניהן.
 */
export function BankOffersTable({
  items,
  banks,
  selectedBanks,
  onToggleBank,
  onClearBanks,
  featuredId,
  onFeature,
  winnerId,
  onRemove,
  broadcastIds,
  onBroadcast,
  emptyHint,
}: BankOffersTableProps) {
  return (
    <div className="space-y-4">
      <StageSubtitle>הבנקים שכבר תמחרו</StageSubtitle>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {banks.length === 0 ? (
          <span className="text-sm font-bold text-slate-500">אף בנק לא תמחר עדיין</span>
        ) : (
          banks.map((bank) => {
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
                className={`inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition-all ${
                  active ? 'text-white shadow-md' : 'bg-white text-slate-800 hover:shadow-sm'
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
          })
        )}

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

      {items.length === 0 ? (
        <StageEmpty>{emptyHint}</StageEmpty>
      ) : (
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200">
          <div className="hidden bg-slate-100 px-4 py-2.5 text-center text-sm font-black text-slate-700 lg:grid lg:grid-cols-[200px_minmax(0,1fr)_repeat(3,120px)_44px]">
            <span>הבנק</span>
            <span>הריביות שתומחרו לכל מסלול</span>
            <span>החזר חודשי</span>
            <span>סך ריבית</span>
            <span>סך תשלום</span>
            <span />
          </div>

          <div className="divide-y-2 divide-slate-100">
            {items.map((item) => (
              <OfferRow
                key={item.mix.id}
                item={item}
                featured={item.mix.id === featuredId}
                isWinner={item.mix.id === winnerId}
                onSelect={() => onFeature(item.mix.id)}
                onRemove={onRemove ? () => onRemove(item.mix.id) : undefined}
                broadcast={
                  onBroadcast
                    ? { sent: broadcastIds?.includes(item.mix.id) ?? false, send: () => onBroadcast(item) }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OfferRow({
  item,
  featured,
  isWinner,
  onSelect,
  onRemove,
  broadcast,
}: {
  item: PricedMix;
  featured: boolean;
  isWinner: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  /** שידור ההצעה ללקוח — קיים רק במסך של היועץ */
  broadcast?: { sent: boolean; send: () => void };
}) {
  const tone = bankTone(item.bank);

  return (
    /*
      השורה כולה לחיצה, ולכן היא אינה כפתור: כפתור המחיקה יושב בתוכה, וכפתור
      בתוך כפתור אינו תקין.
    */
    <div
      role="button"
      tabIndex={0}
      aria-pressed={featured}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`grid w-full cursor-pointer gap-3 px-4 py-3 text-center transition-colors lg:grid-cols-[200px_minmax(0,1fr)_repeat(3,120px)_44px] lg:items-center ${
        featured ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex flex-col items-center gap-1">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black text-white"
          style={{ backgroundColor: tone.dot }}
        >
          <Building2 className="h-3.5 w-3.5" />
          {item.bank}
        </span>
        {isWinner && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
            <Crown className="h-3 w-3" />
            הזולה ביותר
          </span>
        )}
        <span className="text-xs font-bold text-slate-500">
          {formatQuoteDate(item.receivedAt)}
        </span>

        {broadcast &&
          (broadcast.sent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">
              <Radio className="h-3 w-3" />
              שודר ללקוח
            </span>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                broadcast.send();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-violet-700"
            >
              <Radio className="h-3.5 w-3.5" />
              שדר ללקוח
            </button>
          ))}
      </div>

      <div className="min-w-0">
        <TrackStrip tracks={item.mix.tracks} variant="rates" />
      </div>

      <MobileLabelled label="החזר חודשי" value={formatShekel(item.summary.monthlyPayment)} strong />
      <MobileLabelled label="סך ריבית" value={formatShekel(item.summary.totalInterest)} />
      <MobileLabelled
        label="סך תשלום"
        value={formatShekel(item.summary.totalPaid)}
        note={formatPercentage(item.summary.averageRate)}
      />

      <div className="flex justify-center">
        {onRemove && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            aria-label={`מחיקת ההצעה של ${item.bank}`}
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** בעמודה רחבה התווית מיותרת; בצר היא מה שמסביר את המספר */
function MobileLabelled({
  label,
  value,
  note,
  strong = false,
}: {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div className="text-center">
      <span className="block text-xs font-bold text-slate-600 lg:hidden">{label}</span>
      <span
        className={`block font-black tabular-nums text-slate-900 ${strong ? 'text-lg' : 'text-base'}`}
      >
        {value}
      </span>
      {note && <span className="block text-xs font-bold text-slate-500">{note}</span>}
    </div>
  );
}
