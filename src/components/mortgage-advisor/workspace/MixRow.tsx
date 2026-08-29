'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Banknote, ChevronDown, Coins, Pencil, Percent, Wallet } from 'lucide-react';
import { TRACK_TYPES } from '../types';
import { formatPercentage } from '../mortgageCalculations';
import { computeMix, formatDuration, remainingAmount } from '../engine';
import type { MixResult, MixSummary, WorkspaceMix } from '../engine';
import { CompositionBar, formatShekel, trackColor } from './primitives';
import { CURRENT_RATE_PAYMENT_NOTE, usesForwardPricedRate } from './PrimeForwardChart';
import { describePaymentDrop } from './paymentDrop';
import { ForecastDisclaimer } from './ForecastDisclaimer';

interface MixRowProps {
  mix: WorkspaceMix;
  summary: MixSummary;
  /** לוח סילוקין מלא — לדיוק מועד הירידה בהחזר */
  result?: MixResult;
  /** התמהיל שנמצא כרגע בניתוח ובעריכה */
  active?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** התמהיל שבעבודה נכלל תמיד בהשוואה, ולכן הסימון שלו נעול */
  selectionLocked?: boolean;
  expanded?: boolean;
  /** לחיצה על השורה — מעלה את התמהיל לראש הרשימה ופותחת אותו */
  onClick?: () => void;
  onRename?: (name: string) => boolean | void;
  /** פותח את שדה השם מיד — למשל אחרי שכפול */
  startRenaming?: boolean;
  /** לא סוגרים את שדה השם בלי שם תקין */
  requireName?: boolean;
  namePlaceholder?: string;
  /** תג כמו "התמהיל הזול ביותר" */
  highlight?: string;
  /** פעולות שמוצגות בשורה הסגורה עצמה */
  actions?: React.ReactNode;
  /** מה שנפתח מתחת לשורה כשהיא פתוחה */
  detail?: React.ReactNode;
  hint?: string;
  /** הערה לשורת התיאור, למשל שהנתונים מוצגים לפי תרחיש */
  note?: string;
  /** חץ הפתיחה מוצג רק לתמהיל שבאזור העבודה */
  showExpandIcon?: boolean;
}

/**
 * שורת תמהיל — התצוגה האחידה של כל תמהיל בכל מקום במערכת.
 *
 * במצב סגור מוצגים השם, הרכב המסלולים ותת-שורה עם ההחזר החודשי, סך הריבית,
 * סך התשלום והריבית הממוצעת. לחיצה על השורה בוחרת את התמהיל ופותחת את פרטיו,
 * וכל מה שאינטראקטיבי בתוכה — סימון להשוואה, שינוי שם ופעולות — לא מפעיל אותה.
 */
export function MixRow({
  mix,
  summary,
  result,
  active = false,
  selected = false,
  onToggleSelect,
  selectionLocked = false,
  expanded = false,
  onClick,
  onRename,
  startRenaming = false,
  requireName = false,
  namePlaceholder,
  highlight,
  actions,
  detail,
  hint,
  note,
  showExpandIcon = true,
}: MixRowProps) {
  const [renaming, setRenaming] = useState(startRenaming);
  const [draftName, setDraftName] = useState(startRenaming ? '' : mix.name);

  const unallocated = remainingAmount(mix);
  const resolvedResult = useMemo(() => {
    if (result) return result;
    const hasPrepay = mix.events.some((event) => event.kind === 'prepayment');
    const terms = mix.tracks.map((track) => Math.round(track.years * 12));
    const staggered = terms.length > 1 && Math.max(...terms) - Math.min(...terms) > 0.5;
    if (!hasPrepay && !staggered) return undefined;
    return computeMix(mix);
  }, [result, mix]);

  useEffect(() => {
    if (!startRenaming) return;
    setDraftName('');
    setRenaming(true);
  }, [startRenaming]);

  const startRename = () => {
    setDraftName(mix.name);
    setRenaming(true);
  };

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (requireName && !trimmed) {
      setRenaming(true);
      return;
    }
    if (trimmed && trimmed !== mix.name) {
      const accepted = onRename?.(trimmed);
      if (accepted === false) {
        setRenaming(true);
        return;
      }
    }
    setRenaming(false);
  };

  /** הפעולות שבתוך השורה לא אמורות לפתוח או לבחור אותה */
  const stopRowClick = (event: React.MouseEvent | React.KeyboardEvent) => event.stopPropagation();

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-all ${
        active
          ? 'border-blue-500 ring-2 ring-blue-100'
          : selected
            ? 'border-blue-300'
            : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-expanded={onClick ? expanded : undefined}
        onClick={onClick}
        onKeyDown={(event) => {
          if (!onClick) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
        className={`p-3 space-y-2.5 ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <span onClick={stopRowClick} className="mt-0.5">
              <Checkbox
                checked={selected}
                disabled={selectionLocked}
                onCheckedChange={onToggleSelect}
                title={
                  selectionLocked
                    ? 'התמהיל שבניתוח נכלל תמיד בהשוואה'
                    : 'סמנו כדי להוסיף את התמהיל להשוואה'
                }
                aria-label="סמנו להשוואה"
              />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {renaming ? (
                <input
                  value={draftName}
                  autoFocus
                  placeholder={namePlaceholder}
                  onClick={stopRowClick}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') {
                      if (requireName && !draftName.trim()) return;
                      setDraftName(mix.name);
                      setRenaming(false);
                    }
                  }}
                  className="w-full max-w-xs text-sm font-bold text-slate-900 border-b border-blue-400 outline-none bg-transparent placeholder:font-medium placeholder:text-slate-400"
                />
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {mix.name || 'תמהיל ללא שם'}
                  </p>
                  {onRename && (
                    <button
                      type="button"
                      onClick={(event) => {
                        stopRowClick(event);
                        startRename();
                      }}
                      title="שינוי שם התמהיל"
                      className="text-slate-300 hover:text-blue-600 transition-colors shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
              {active && (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[9px] shrink-0">
                  בניתוח
                </Badge>
              )}
              {highlight && (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px] shrink-0">
                  {highlight}
                </Badge>
              )}
            </div>
            {renaming && requireName && (
              <p className="text-[10px] text-blue-700">
                תנו שם לתמהיל החדש כדי להמשיך לערוך אותו באזור העבודה
              </p>
            )}

            <p className="text-[11px] text-slate-500 truncate">
              {formatShekel(mix.totalAmount)} · {mix.tracks.length} מסלולים ·{' '}
              {formatDuration(summary.months)}
              {mix.events.length > 0 && ` · ${mix.events.length} שינויים מתוכננים`}
              {note && <span className="text-amber-600"> · {note}</span>}
            </p>
          </div>

          {actions && (
            <span onClick={stopRowClick} className="flex flex-wrap items-center gap-1.5 shrink-0">
              {actions}
            </span>
          )}

          {onClick && showExpandIcon && (
            <ChevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 mt-1 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>

        {/* תת-השורה האחידה: ההחזר החודשי, סך הריבית, סך התשלום והריבית הממוצעת */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <RowStat
            icon={<Wallet className="h-3 w-3 text-blue-600" />}
            label="החזר חודשי"
            value={
              summary.monthlyPayment > 0.01 ? formatShekel(summary.monthlyPayment) : 'אין החזר שוטף'
            }
            hint={paymentHint(summary, mix, resolvedResult)}
            emphasized
          />
          <RowStat
            icon={<Banknote className="h-3 w-3 text-red-500" />}
            label="סך ריבית"
            value={formatShekel(summary.totalInterest)}
          />
          <RowStat
            icon={<Coins className="h-3 w-3 text-slate-500" />}
            label="סך תשלום"
            value={formatShekel(summary.totalPaid)}
          />
          <RowStat
            icon={<Percent className="h-3 w-3 text-amber-600" />}
            label="ריבית ממוצעת"
            value={formatPercentage(summary.averageRate)}
          />
        </div>

        <ForecastDisclaimer mix={mix} compact />

        <div>
          <CompositionBar tracks={mix.tracks} height={8} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {mix.tracks.map((track) => (
              <span key={track.id} className="flex items-center gap-1 text-[10px] text-slate-500">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: trackColor(track.type) }}
                />
                {TRACK_TYPES[track.type]} {track.percentage.toFixed(0)}%
              </span>
            ))}
            {unallocated > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {formatShekel(unallocated)} לא שובצו
              </span>
            )}
            {hint && !expanded && (
              <span className="text-[10px] text-slate-400 mr-auto">{hint}</span>
            )}
          </div>
        </div>
      </div>

      {expanded && detail}
    </div>
  );
}

function paymentHint(summary: MixSummary, mix: WorkspaceMix, result?: MixResult): string | undefined {
  const parts: string[] = [];
  const drop = describePaymentDrop(mix, summary, result);
  if (drop) parts.push(drop);
  if (summary.balloonPayment > 1) {
    parts.push(`בלון ${formatShekel(summary.balloonPayment)} בסוף`);
  }
  if (mix.tracks.some((track) => usesForwardPricedRate(track.type))) {
    parts.push(CURRENT_RATE_PAYMENT_NOTE);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function RowStat({
  icon,
  label,
  value,
  hint,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2">
      <p className="text-[10px] text-slate-500 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p
        className={`font-bold leading-tight ${
          emphasized ? 'text-base text-blue-600' : 'text-sm text-slate-900'
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-amber-700 leading-tight break-words">{hint}</p>}
    </div>
  );
}
