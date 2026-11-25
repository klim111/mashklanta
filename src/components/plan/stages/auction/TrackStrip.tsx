'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import type { MortgageTrack } from '@/components/mortgage-advisor/types';
import { formatDuration } from '@/components/mortgage-advisor/engine';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel, trackColor } from '@/components/mortgage-advisor/workspace/primitives';

/**
 * פס הרכב המסלולים.
 *
 * רוחב כל קטע הוא חלקו של המסלול בתמהיל, והכיתוב יושב מתחת לקטע שלו ובאותו
 * רוחב — כך שאפשר לקרוא את התמהיל בסריקה אחת במקום להצליב שורות בטבלה.
 *
 * `structure` מציג את המבנה בלבד: מסלול, סכום ותקופה. זו התצוגה של התמהיל
 * שהולך לתמחור, שבו הריבית עדיין לא ידועה ואין טעם להראות את ריבית התכנון
 * כאילו היא מה שהבנק ייתן.
 *
 * `rates` מציג את הריבית שהבנק נקב בתוך הקטע הצבעוני עצמו, בפונט גדול —
 * בהשוואה בין הצעות זה המספר היחיד שמשתנה, ולכן הוא מקבל את הפס.
 *
 * `preview` הוא אותו דבר, אבל זמני: העברת עכבר על שם בנק גורמת לפסים לגדול
 * ולהציג את הריביות שאותו בנק הציע, והסרת העכבר מחזירה אותם למבנה. כך אפשר
 * לסרוק את ההצעות בלי ללחוץ ובלי לעזוב את המסך.
 */
export function TrackStrip({
  tracks,
  variant,
  trackMonths,
  preview,
}: {
  tracks: MortgageTrack[];
  variant: 'structure' | 'rates';
  /** משך הסילוקין בפועל, כשהוא שונה מהתקופה שהוזנה */
  trackMonths?: Record<string, number>;
  /**
   * הריביות שמוצגות בהצצה, לפי מזהה המסלול. המסלולים זהים בכל ההצעות —
   * הן עותקים של אותו מבנה — ולכן ההתאמה לפי מזהה, עם נפילה למיקום.
   */
  preview?: { rates: Record<string, number>; order: number[] } | null;
}) {
  const total = tracks.reduce((sum, track) => sum + track.amount, 0) || 1;

  return (
    <div className="flex w-full flex-wrap gap-1.5">
      {tracks.map((track, index) => {
        const share = (track.amount / total) * 100;
        const months = trackMonths?.[track.id] ?? Math.round(track.years * 12);
        const color = trackColor(track.type);

        const previewRate = preview
          ? preview.rates[track.id] ?? preview.order[index] ?? null
          : null;
        const rate = variant === 'rates' ? track.interestRate : previewRate;
        const showRate = rate !== null && Number.isFinite(rate);

        return (
          <div
            key={track.id}
            style={{ width: `calc(${Math.max(share, 0)}% - 0.375rem)`, minWidth: '150px' }}
            className="grow text-center"
          >
            <motion.span
              layout
              animate={{ height: showRate ? 40 : 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="flex w-full items-center justify-center overflow-hidden rounded-lg"
              style={{ backgroundColor: color }}
            >
              <AnimatePresence mode="wait">
                {showRate && (
                  <motion.span
                    key={rate}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="text-lg font-black tabular-nums text-white drop-shadow-sm"
                  >
                    {formatPercentage(rate as number)}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.span>

            <span className="mt-1 block text-sm font-black leading-tight text-slate-900">
              {TRACK_TYPES[track.type]}
            </span>
            <span className="block text-xs font-bold leading-tight text-slate-600">
              {formatShekel(track.amount)} · {formatDuration(months)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
