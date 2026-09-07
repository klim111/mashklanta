'use client';

import { BadgePercent, Gavel } from 'lucide-react';
import { TRACK_TYPES } from '../types';
import { formatDuration } from '../engine';
import type { MixSummary, WorkspaceMix } from '../engine';
import { CompositionBar, formatShekel, trackColor } from './primitives';
import { formatQuoteDate } from '../bankQuote/quote';

/**
 * מאיפה הגיע התמהיל — ברירת מחדל של הבנק, תמהיל שנבנה בכלי, או תמהיל שהריביות
 * בו התקבלו מבנק אחרי שהוגש לו למיקוח.
 */
export type MixOrigin = 'bank' | 'custom' | 'quote';

/** מי בנה את התמהיל — הלקוח באזור שלו, או היועץ שמלווה אותו */
export type MixAuthor = 'client' | 'advisor';

const ORIGIN_LABELS: Record<MixOrigin, string> = {
  bank: 'ברירת מחדל של הבנק',
  custom: 'מותאם אישית',
  quote: 'התקבלו ריביות מבנק',
};

/** תמהיל שהריביות בו כבר התקבלו מבנק — מצב שגובר על הגוון של מי שבנה אותו */
const QUOTE_STYLE = {
  card: 'border-emerald-400 bg-emerald-50/70',
  badge: 'bg-emerald-600 text-white',
};

/**
 * הגוונים לפי מי שבנה את התמהיל. זו ההבחנה הראשונה שצריך לראות בשורת
 * התמהילים, ולכן היא זו שצובעת את הכרטיס כולו.
 */
const AUTHOR_STYLES: Record<MixAuthor, { card: string; badge: string; label: string; dot: string }> =
  {
    client: {
      card: 'border-sky-300 bg-sky-50/60',
      badge: 'bg-sky-100 text-sky-900',
      label: 'נוצר על ידי הלקוח',
      dot: 'bg-sky-400',
    },
    advisor: {
      card: 'border-violet-300 bg-violet-50/50',
      badge: 'bg-violet-100 text-violet-900',
      label: 'נוצר על ידי היועץ',
      dot: 'bg-violet-400',
    },
  };

export { AUTHOR_STYLES };

interface MixStripCardProps {
  mix: WorkspaceMix;
  summary: MixSummary;
  origin: MixOrigin;
  author: MixAuthor;
  selected?: boolean;
  onToggleSelect?: () => void;
  onActivate: () => void;
  /** הפקת בקשת הצעת ריביות לבנקים מהתמהיל שבכרטיס */
  onRequestQuote?: () => void;
  /** הזנת הריביות שהתקבלו מבנק על מבנה התמהיל שבכרטיס */
  onEnterQuote?: () => void;
}

/**
 * כרטיס קומפקטי לסרגל התמהילים — בלי חץ פתיחה. לחיצה מעלה לאזור העבודה,
 * והעיגול בפינה הימנית העליונה מוסיף להשוואה.
 *
 * הכרטיס נושא שתי הבחנות: מי בנה את התמהיל — הלקוח או היועץ — בגוון הכרטיס
 * ובתווית שבראשו, ומאיפה הגיע ההרכב — ברירת מחדל של הבנק או תמהיל שנבנה בכלי —
 * בשורת משנה, כדי שההבחנה השנייה לא תתחרה בראשונה.
 */
export function MixStripCard({
  mix,
  summary,
  origin,
  author,
  selected = false,
  onToggleSelect,
  onActivate,
  onRequestQuote,
  onEnterQuote,
}: MixStripCardProps) {
  const quote = mix.quote;
  const author_ = AUTHOR_STYLES[author];
  // הריביות שהתקבלו צובעות את הכרטיס, אבל התווית ממשיכה לומר מי בנה אותו
  const tone = quote ? { ...author_, ...QUOTE_STYLE } : author_;

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
        {author_.label}
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
      {quote ? (
        <p className="mt-0.5 truncate text-[10px] font-bold text-emerald-800">
          התקבלו ריביות מבנק {quote.bank} · {formatQuoteDate(quote.receivedAt)}
        </p>
      ) : (
        <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
          {ORIGIN_LABELS[origin]}
        </p>
      )}
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

      {(onRequestQuote || onEnterQuote) && (
        <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          {onRequestQuote && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRequestQuote();
              }}
              title="הכנת הצעת התמהיל למיקוח מול הבנקים — מכתב בקשה בלי ריביות"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-[11px] font-bold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-100"
            >
              <Gavel className="h-3.5 w-3.5" />
              הצעה לבנקים
            </button>
          )}
          {onEnterQuote && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEnterQuote();
              }}
              title="הזנת הריביות שהתקבלו מהבנק על מבנה התמהיל הזה"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-2 text-[11px] font-bold text-emerald-900 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
            >
              <BadgePercent className="h-3.5 w-3.5" />
              ריביות מהבנק
            </button>
          )}
        </div>
      )}
    </div>
  );
}
