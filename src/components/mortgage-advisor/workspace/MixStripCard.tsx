'use client';

import { TRACK_TYPES } from '../types';
import { formatDuration } from '../engine';
import type { MixSummary, WorkspaceMix } from '../engine';
import { CompositionBar, formatShekel, trackColor } from './primitives';

interface MixStripCardProps {
  mix: WorkspaceMix;
  summary: MixSummary;
  selected?: boolean;
  selectDisabled?: boolean;
  onToggleSelect?: () => void;
  onActivate: () => void;
}

/**
 * כרטיס קומפקטי לסרגל התמהילים — בלי חץ פתיחה. לחיצה מעלה לאזור העבודה,
 * והעיגול בפינה הימנית העליונה מוסיף להשוואה.
 */
export function MixStripCard({
  mix,
  summary,
  selected = false,
  selectDisabled = false,
  onToggleSelect,
  onActivate,
}: MixStripCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        }
      }}
      className={`relative mx-auto w-full max-w-[19rem] snap-center cursor-pointer rounded-2xl border bg-white p-3 pt-8 text-center shadow-sm transition-all hover:border-slate-300 sm:mx-0 sm:w-[250px] sm:max-w-none sm:shrink-0 sm:text-right ${
        selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
      }`}
    >
      {onToggleSelect && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (!selectDisabled || selected) onToggleSelect();
          }}
          title={
            selected
              ? 'הסירו מההשוואה'
              : selectDisabled
                ? 'ניתן להשוות עד 3 תמהילים בבת אחת'
                : 'סמנו להשוואה'
          }
          aria-label="סמנו להשוואה"
          aria-pressed={selected}
          className={`absolute top-2 right-2 h-5 w-5 rounded-full border-2 transition-colors ${
            selected
              ? 'border-blue-600 bg-blue-600'
              : selectDisabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                : 'border-slate-300 bg-white hover:border-blue-400'
          }`}
        >
          {selected && (
            <span className="block h-full w-full rounded-full border-2 border-white" />
          )}
        </button>
      )}

      <p className="truncate text-sm font-bold text-slate-900">{mix.name || 'תמהיל ללא שם'}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">
        {formatShekel(summary.monthlyPayment)} לחודש · {mix.tracks.length} מסלולים ·{' '}
        {formatDuration(summary.months)}
      </p>
      <div className="mt-2">
        <CompositionBar tracks={mix.tracks} height={8} />
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 sm:justify-start">
          {mix.tracks.map((track) => (
            <span key={track.id} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: trackColor(track.type) }}
              />
              {TRACK_TYPES[track.type]} {track.percentage.toFixed(0)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
