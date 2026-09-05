'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Banknote, CalendarClock, Coins, RefreshCcw, Trash2 } from 'lucide-react';
import { formatTrackTypeWithAmortization } from './types';
import { formatPercentage } from './mortgageCalculations';
import { computeMix, formatDuration, inflationIsApplied, withFrozenInflation } from './engine';
import type { MixSummary, WorkspaceMix } from './engine';
import { MixRow } from './workspace/MixRow';
import { formatShekel, trackColor } from './workspace/primitives';

interface MixSummaryCardProps {
  mix: WorkspaceMix;
  /** סיכום שנשמר יחד עם התמהיל; אם לא הועבר, הוא מחושב מחדש */
  summary?: MixSummary;
  savedAt?: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
  /** תג להצגה בכרטיס, למשל "התמהיל הזול ביותר" */
  highlight?: string;
  /** תגיות מעל הכרטיס — מי הציע את התמהיל, ולאיזה נכס הוא משויך */
  badges?: React.ReactNode;
}

/**
 * כרטיס תמהיל אחיד — שורת התמהיל הרגילה, ולחיצה עליה חושפת את שאר הפרטים:
 * המסלולים, השינויים המתוכננים והפעולות.
 */
export function MixSummaryCard({
  mix,
  summary,
  savedAt,
  selected = false,
  onToggleSelect,
  onOpen,
  onDelete,
  onRename,
  highlight,
  badges,
}: MixSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const computed = useMemo(() => (summary ? null : computeMix(mix)), [mix, summary]);
  const stats = summary ?? computed!.summary;
  const tracksDetail = useMemo(() => (expanded ? computeMix(mix) : null), [expanded, mix]);
  const inflationCost = useMemo(() => {
    if (!tracksDetail || tracksDetail.summary.totalIndexation <= 1) return 0;
    if (!inflationIsApplied(mix.assumptions)) return 0;
    const frozen = computeMix(withFrozenInflation(mix));
    return Math.max(0, tracksDetail.summary.totalPaid - frozen.summary.totalPaid);
  }, [tracksDetail, mix]);

  const row = (
    <MixRow
      mix={mix}
      summary={stats}
      result={tracksDetail ?? computed ?? undefined}
      selected={selected}
      onToggleSelect={onToggleSelect}
      expanded={expanded}
      onClick={() => setExpanded((open) => !open)}
      onRename={onRename}
      highlight={highlight}
      hint="לפרטים המלאים"
      detail={
        <div className="border-t border-slate-100 bg-slate-50/70 p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <DetailStat
              icon={<CalendarClock className="h-3 w-3" />}
              label="משך בפועל"
              value={formatDuration(stats.months)}
            />
            <DetailStat
              icon={<Coins className="h-3 w-3" />}
              label="עלות לכל ש״ח"
              value={`${stats.costPerShekel.toFixed(2)} ₪`}
            />
            {stats.totalIndexation > 1 && (
              <DetailStat
                icon={<Coins className="h-3 w-3" />}
                label="תוספת הצמדה"
                value={formatShekel(stats.totalIndexation)}
              />
            )}
            {inflationCost > 1 && (
              <DetailStat
                icon={<Coins className="h-3 w-3" />}
                label="נשרף על אינפלציה"
                value={formatShekel(inflationCost)}
              />
            )}
            {stats.ltv !== undefined && (
              <DetailStat
                icon={<Coins className="h-3 w-3" />}
                label="אחוז מימון"
                value={`${stats.ltv.toFixed(1)}%`}
              />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-600">מסלולים</p>
            {(tracksDetail?.tracks ?? []).map((t) => (
              <div
                key={t.track.id}
                className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2"
              >
                <span
                  className="w-1.5 h-7 rounded-full shrink-0"
                  style={{ backgroundColor: trackColor(t.track.type) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-800 truncate">
                    {formatTrackTypeWithAmortization(t.track)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatShekel(t.track.amount)} · {t.track.percentage.toFixed(1)}% ·{' '}
                    {formatPercentage(t.track.interestRate)} · {formatDuration(t.months)}
                    {t.months < Math.round(t.track.years * 12) - 0.5
                      ? ` · קוצר מ-${formatDuration(Math.round(t.track.years * 12))}`
                      : ''}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-[10px] text-slate-400">החזר</p>
                  <p className="text-[11px] font-bold text-slate-800">
                    {t.monthlyPayment > 0.01 ? formatShekel(t.monthlyPayment) : 'אין'}
                  </p>
                  {t.schedule.some((row) => row.prepayment > 1) &&
                    t.monthlyPayment - t.lastMonthlyPayment > 1 &&
                    t.lastMonthlyPayment > 0.01 && (
                    <p className="text-[9px] text-slate-500">
                      יורד ל-{formatShekel(t.lastMonthlyPayment)}
                    </p>
                  )}
                  {t.schedule.some((row) => row.prepayment > 1) && (
                    <p className="text-[9px] text-emerald-700">
                      ריבית עד הפרעון:{' '}
                      {formatShekel(
                        t.schedule.find((row) => row.prepayment > 1)?.cumulativeInterest ?? 0
                      )}
                    </p>
                  )}
                  {t.balloonPayment > 1 && (
                    <p className="text-[9px] text-amber-700">
                      בלון {formatShekel(t.balloonPayment)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {mix.events.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-600">שינויים מתוכננים</p>
              {mix.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2 text-[10px] text-slate-600"
                >
                  {event.kind === 'prepayment' ? (
                    <>
                      <Banknote className="h-3 w-3 text-emerald-600 shrink-0" />
                      פרעון מוקדם {formatShekel(event.amount)} בתשלום {event.month} —{' '}
                      {event.mode === 'shorten_term' ? 'קיצור תקופה' : 'הקטנת החזר'}
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-3 w-3 text-blue-600 shrink-0" />
                      מחזור בתשלום {event.month} לריבית {formatPercentage(event.newRate)} ל-
                      {formatDuration(Math.round(event.newYears * 12))}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onOpen && (
              <Button size="sm" className="h-8 text-xs" onClick={onOpen}>
                פתח בכלי התכנון
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 ml-1" />
                מחק
              </Button>
            )}
            {savedAt && (
              <span className="text-[10px] text-slate-400 mr-auto">
                נשמר {new Date(savedAt).toLocaleDateString('he-IL')}
              </span>
            )}
          </div>
        </div>
      }
    />
  );

  if (!badges) return row;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
      {row}
    </div>
  );
}

function DetailStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-2">
      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}
