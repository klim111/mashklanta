'use client';

import React from 'react';
import { Building2, Crown, Radio, Trash2 } from 'lucide-react';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { formatQuoteDate } from '@/components/mortgage-advisor/bankQuote/quote';
import { TrackStrip } from './TrackStrip';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { StageEmpty } from './ui';

interface AdvisorOffersListProps {
  /** ההצעות שהוזנו, מהזולה ליקרה */
  items: PricedMix[];
  /** ההצעות שכבר שודרו ללקוח */
  broadcastIds: readonly string[];
  onBroadcast: (item: PricedMix) => void;
  onRemove?: (mixId: string) => void;
  winnerId: string | null;
  featuredId: string | null;
  onFeature: (mixId: string) => void;
}

/**
 * רשימת העבודה של היועץ.
 *
 * זה המקום היחיד שבו מוצגות כל ההצעות יחד, והוא קיים רק אצל היועץ: הוא זה
 * שמזין אותן ומחליט מה משודר ללקוח, ולכן הוא צריך לראות מה כבר יצא ומה עדיין
 * טיוטה. אצל הלקוח המסך מציג הצעה אחת בכל רגע, ולכן הרשימה הזו אינה מופיעה שם.
 */
export function AdvisorOffersList({
  items,
  broadcastIds,
  onBroadcast,
  onRemove,
  winnerId,
  featuredId,
  onFeature,
}: AdvisorOffersListProps) {
  if (items.length === 0) {
    return (
      <StageEmpty>
        עדיין לא הוזנה אף הצעה. לחצו למעלה על הבנק שחזר עם ריביות, הזינו אותן ולחצו ״שמור
        הצעה״ — ואז שדרו אותה ללקוח.
      </StageEmpty>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const tone = bankTone(item.bank);
        const sent = broadcastIds.includes(item.mix.id);
        const featured = item.mix.id === featuredId;

        return (
          <div
            key={item.mix.id}
            role="button"
            tabIndex={0}
            aria-pressed={featured}
            onClick={() => onFeature(item.mix.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onFeature(item.mix.id);
              }
            }}
            className={`cursor-pointer rounded-2xl border-2 p-3 transition-colors ${
              featured ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black text-white"
                style={{ backgroundColor: tone.dot }}
              >
                <Building2 className="h-3.5 w-3.5" />
                {item.bank}
              </span>

              {item.mix.id === winnerId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-black text-white">
                  <Crown className="h-3 w-3" />
                  הזולה ביותר
                </span>
              )}

              <span className="text-sm font-bold text-slate-700">
                החזר {formatShekel(item.summary.monthlyPayment)} · סך תשלום{' '}
                {formatShekel(item.summary.totalPaid)} ·{' '}
                {formatPercentage(item.summary.averageRate)}
              </span>

              <span className="text-xs font-bold text-slate-500">
                {formatQuoteDate(item.receivedAt)}
              </span>

              {sent ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                  <Radio className="h-3.5 w-3.5" />
                  שודר ללקוח
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onBroadcast(item);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-button font-black text-white transition-colors hover:bg-violet-700"
                >
                  <Radio className="h-4 w-4" />
                  שדר תמהיל ללקוח
                </button>
              )}

              {onRemove && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(item.mix.id);
                  }}
                  aria-label={`מחיקת ההצעה של ${item.bank}`}
                  className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-2">
              <TrackStrip tracks={item.mix.tracks} variant="rates" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
