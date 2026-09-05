'use client';

import { TRACK_TYPES } from '../types';
import { formatDuration } from '../engine';
import type { MixSummary, WorkspaceMix } from '../engine';
import { CompositionBar, formatShekel, trackColor } from './primitives';

/** מאיפה הגיע התמהיל — ברירת מחדל של הבנק, או תמהיל שנבנה בכלי */
export type MixOrigin = 'bank' | 'custom';

const ORIGIN_STYLES: Record<MixOrigin, { card: string; badge: string; label: string }> = {
  bank: {
    card: 'border-amber-300 bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-900',
    label: 'ברירת מחדל של הבנק',
  },
  custom: {
    card: 'border-violet-300 bg-violet-50/50',
    badge: 'bg-violet-100 text-violet-900',
    label: 'מותאם אישית',
  },
};

interface MixStripCardProps {
  mix: WorkspaceMix;
  summary: MixSummary;
  origin: MixOrigin;
  selected?: boolean;
  onToggleSelect?: () => void;
  onActivate: () => void;
}

/**
 * כרטיס קומפקטי לסרגל התמהילים — בלי חץ פתיחה. לחיצה מעלה לאזור העבודה,
 * והעיגול בפינה הימנית העליונה מוסיף להשוואה.
 *
 * המקור מסומן בגוון ובתווית קטנה בלבד, כדי שההבחנה בין תמהיל של הבנק לתמהיל
 * מותאם אישית לא תבוא על חשבון תוכן הכרטיס.
 */
export function MixStripCard({
  mix,
  summary,
  origin,
  selected = false,
  onToggleSelect,
  onActivate,
}: MixStripCardProps) {
  const tone = ORIGIN_STYLES[origin];

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
      className={`relative mx-auto w-full max-w-[19rem] snap-center cursor-pointer rounded-2xl border p-3 pt-9 text-center shadow-sm transition-all sm:mx-0 sm:w-[250px] sm:max-w-none sm:shrink-0 sm:text-right ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : `${tone.card} hover:border-slate-400`
      }`}
    >
      <span
        className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-black ${tone.badge}`}
      >
        {tone.label}
      </span>
      {onToggleSelect && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect();
          }}
          title={selected ? 'הסירו מאזור העבודה' : 'הוסיפו לאזור העבודה להשוואה'}
          aria-label="סימון להשוואה באזור העבודה"
          aria-pressed={selected}
          className={`absolute top-2 right-2 h-5 w-5 rounded-full border-2 transition-colors ${
            selected
              ? 'border-blue-600 bg-blue-600'
              : 'border-slate-300 bg-white hover:border-blue-400'
          }`}
        >
          {selected && <span className="block h-full w-full rounded-full border-2 border-white" />}
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
