'use client';

import React from 'react';
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
 */
export function TrackStrip({
  tracks,
  variant,
  trackMonths,
}: {
  tracks: MortgageTrack[];
  variant: 'structure' | 'rates';
  /** משך הסילוקין בפועל, כשהוא שונה מהתקופה שהוזנה */
  trackMonths?: Record<string, number>;
}) {
  const total = tracks.reduce((sum, track) => sum + track.amount, 0) || 1;

  return (
    <div className="flex w-full flex-wrap gap-1.5">
      {tracks.map((track) => {
        const share = (track.amount / total) * 100;
        const months = trackMonths?.[track.id] ?? Math.round(track.years * 12);
        const color = trackColor(track.type);

        return (
          <div
            key={track.id}
            style={{ width: `calc(${Math.max(share, 0)}% - 0.375rem)`, minWidth: '150px' }}
            className="grow text-center"
          >
            {variant === 'rates' ? (
              <span
                className="flex h-10 w-full items-center justify-center rounded-lg text-lg font-black tabular-nums text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                {formatPercentage(track.interestRate)}
              </span>
            ) : (
              <span
                className="block h-3 w-full rounded-full"
                style={{ backgroundColor: color }}
              />
            )}

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
