'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Crown, Trash2 } from 'lucide-react';
import { computeMix } from '@/components/mortgage-advisor/engine';
import type { MixResult } from '@/components/mortgage-advisor/engine';
import { MixRow } from '@/components/mortgage-advisor/workspace/MixRow';
import { WorkspaceCharts } from '@/components/mortgage-advisor/workspace/WorkspaceCharts';
import { formatQuoteDate } from '@/components/mortgage-advisor/bankQuote/quote';
import { bankTone, pricedMixLabel } from './pricedMixes';
import type { PricedMix } from './pricedMixes';

interface PricedMixRowProps {
  item: PricedMix;
  /** התמהיל כפי שתוכנן, לפני התמחור — הבסיס שמולו נמדדת ההצעה בגרפים */
  baseResult: MixResult;
  isWinner: boolean;
  isSigned: boolean;
  onRemove?: () => void;
}

/**
 * הצעה מתומחרת, בתצוגה של שורת תמהיל.
 *
 * זו אותה שורה בדיוק של כלי בניית התמהיל: הכיתובים והמספרים של כל מסלול יושבים
 * מתחת לקטע שמייצג אותו בפס ההרכב, ולכן אפשר לקרוא בסריקה אחת מה הבנק תמחר.
 * לחיצה על מסלול פותחת את הנתונים והגרפים שלו; לחיצה על השורה פותחת את אלה של
 * כל התמהיל — הפעם עם התמחור המדויק שהתקבל, ולא עם ריביות התכנון.
 */
export function PricedMixRow({
  item,
  baseResult,
  isWinner,
  isSigned,
  onRemove,
}: PricedMixRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [focusTrackId, setFocusTrackId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const result = useMemo(() => computeMix(item.mix), [item.mix]);
  const tone = bankTone(item.bank);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`overflow-hidden rounded-2xl border-2 ${
        isSigned ? 'border-emerald-500' : tone.border
      }`}
    >
      {/* פס הצבע של הבנק — ההפרדה הוויזואלית בין ההצעות */}
      <div className="h-1.5 w-full" style={{ backgroundColor: tone.dot }} />

      <div className="bg-white p-2">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white"
            style={{ backgroundColor: tone.dot }}
          >
            <Building2 className="h-3.5 w-3.5" />
            {pricedMixLabel(item.bank)}
          </span>
          <span className="text-xs font-bold text-slate-600">
            התקבל {formatQuoteDate(item.receivedAt)}
          </span>
          {isSigned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
              <Crown className="h-3.5 w-3.5" />
              נבחר לחתימה
            </span>
          ) : isWinner ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
              <Crown className="h-3.5 w-3.5" />
              ההצעה הזולה
            </span>
          ) : null}
        </div>

        <MixRow
          mix={item.mix}
          summary={item.summary}
          result={result}
          expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          focusTrackId={focusTrackId}
          onFocusTrack={setFocusTrackId}
          hint="לחצו על מסלול לנתונים ולגרפים שלו, או על השורה לתמהיל כולו"
          actions={
            onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                aria-label={`מחיקת ההצעה של ${item.bank}`}
                className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : undefined
          }
          detail={
            <div className="border-t border-slate-100 p-2">
              <WorkspaceCharts
                result={result}
                baseResult={baseResult}
                scenarioActive={false}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                focusTrackId={focusTrackId}
                onFocusTrack={setFocusTrackId}
              />
            </div>
          }
        />
      </div>
    </motion.div>
  );
}
