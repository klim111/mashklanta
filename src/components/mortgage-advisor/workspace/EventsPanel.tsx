'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, CalendarClock, RefreshCcw, Trash2 } from 'lucide-react';
import { formatPercentage } from '../mortgageCalculations';
import { formatFullDate, formatDuration } from '../engine';
import type { MixResult } from '../engine';
import { formatShekel } from './primitives';

interface EventsPanelProps {
  result: MixResult;
  onRemove: (id: string) => void;
  onAddPrepayment: () => void;
  onAddRefinance: () => void;
}

/** רשימת השינויים המתוכננים בתמהיל — פרעונות מוקדמים ומחזורים. */
export function EventsPanel({ result, onRemove, onAddPrepayment, onAddRefinance }: EventsPanelProps) {
  const { mix } = result;
  const events = [...mix.events].sort((a, b) => a.month - b.month);

  const dateFor = (month: number) => {
    const row = result.schedule[Math.min(month, result.schedule.length) - 1];
    return row ? formatFullDate(row.date) : `תשלום ${month}`;
  };

  const trackName = (trackId?: string) =>
    trackId ? mix.tracks.find((t) => t.id === trackId)?.name ?? 'מסלול שהוסר' : 'פיזור יחסי';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            שינויים מתוכננים
            {events.length > 0 && (
              <span className="text-xs font-normal text-slate-500">{events.length}</span>
            )}
          </CardTitle>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAddPrepayment}>
              <Banknote className="h-3.5 w-3.5 ml-1" />
              פרעון מוקדם
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAddRefinance}>
              <RefreshCcw className="h-3.5 w-3.5 ml-1" />
              מחזור מסלול
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {events.length === 0 ? (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            אין שינויים מתוכננים. הוסיפו סכום חד-פעמי לפרעון מוקדם או מחזור של מסלול, וההשפעה תיכנס מיד
            לגרפים, לסיכום וללוח ההחזרים.
          </p>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5"
              >
                {event.kind === 'prepayment' ? (
                  <>
                    <Banknote className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">
                        פרעון מוקדם {formatShekel(event.amount)}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {dateFor(event.month)} · {trackName(event.trackId)} ·{' '}
                        {event.mode === 'shorten_term' ? 'קיצור תקופה' : 'הקטנת החזר'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4 text-blue-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">
                        מחזור ל-{formatPercentage(event.newRate)} · {formatDuration(Math.round(event.newYears * 12))}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {dateFor(event.month)} · {trackName(event.trackId)}
                        {event.fee ? ` · עמלות ${formatShekel(event.fee)}` : ''}
                      </p>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(event.id)}
                  title="הסר"
                  className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
