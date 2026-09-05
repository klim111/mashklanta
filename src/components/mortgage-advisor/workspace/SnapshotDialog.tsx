'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Banknote, CalendarClock, Coins, PiggyBank, TrendingDown, Wallet } from 'lucide-react';
import { TRACK_TYPES } from '../types';
import { formatPercentage } from '../mortgageCalculations';
import { formatDuration, formatFullDate, snapshotAt } from '../engine';
import type { MixResult } from '../engine';
import { formatShekel, trackColor } from './primitives';

interface SnapshotDialogProps {
  result: MixResult;
  month: number | null;
  onMonthChange: (month: number) => void;
  onClose: () => void;
}

export function SnapshotDialog({ result, month, onMonthChange, onClose }: SnapshotDialogProps) {
  const snapshot = useMemo(
    () => (month ? snapshotAt(result, month) : null),
    [result, month]
  );

  return (
    <Dialog open={month !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {snapshot && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-blue-600" />
                מצב המשכנתא ב-{formatFullDate(snapshot.date)}
              </DialogTitle>
              <DialogDescription>
                תשלום מספר {snapshot.month} מתוך {result.schedule.length} · נותרו{' '}
                {formatDuration(snapshot.monthsRemaining)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* גרירה מהירה על ציר הזמן בלי לצאת מהחלונית */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>תחילת המשכנתא</span>
                  <span>סוף התקופה</span>
                </div>
                <Slider
                  dir="ltr"
                  value={[snapshot.month]}
                  onValueChange={([value]) => onMonthChange(value)}
                  min={1}
                  max={result.schedule.length}
                  step={1}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <SnapshotStat
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="החזר באותו חודש"
                  value={formatShekel(snapshot.paymentThisMonth)}
                  hint={`ריבית ${formatShekel(snapshot.interestThisMonth)} · קרן ${formatShekel(snapshot.principalThisMonth)}`}
                />
                <SnapshotStat
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                  label="יתרת החוב"
                  value={formatShekel(snapshot.remainingBalance)}
                  hint={`מתוך ${formatShekel(result.mix.totalAmount)} קרן מקורית`}
                  tone="dark"
                />
                <SnapshotStat
                  icon={<Coins className="h-3.5 w-3.5" />}
                  label="ריבית ששולמה עד כה"
                  value={formatShekel(snapshot.interestPaidToDate)}
                  hint={`${((snapshot.interestPaidToDate / Math.max(1, result.summary.totalInterest)) * 100).toFixed(0)}% מסך הריבית`}
                />
                <SnapshotStat
                  icon={<Banknote className="h-3.5 w-3.5" />}
                  label="ריבית שנותרה לשלם"
                  value={formatShekel(snapshot.interestRemaining)}
                  hint={`סך הריבית ${formatShekel(result.summary.totalInterest)}`}
                  tone="warning"
                />
                <SnapshotStat
                  icon={<PiggyBank className="h-3.5 w-3.5" />}
                  label="קרן שנפרעה"
                  value={formatShekel(snapshot.principalPaidToDate)}
                />
                <SnapshotStat
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="סך ששולם עד כה"
                  value={formatShekel(snapshot.totalPaidToDate)}
                />
                <SnapshotStat
                  icon={<Banknote className="h-3.5 w-3.5" />}
                  label="סך שנותר לשלם"
                  value={formatShekel(snapshot.totalRemaining)}
                />
                <SnapshotStat
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                  label="תשלומים שנותרו"
                  value={`${snapshot.monthsRemaining}`}
                  hint={formatDuration(snapshot.monthsRemaining)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ProgressRow
                  label="סילוק הקרן"
                  percent={snapshot.principalProgress}
                  color="bg-blue-500"
                />
                <ProgressRow
                  label="מסך התשלומים"
                  percent={snapshot.paymentProgress}
                  color="bg-emerald-500"
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">פירוט לפי מסלול</h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {snapshot.tracks.map((track) => (
                    <div key={track.trackId} className="flex items-center gap-3 p-2.5">
                      <span
                        className="w-1.5 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: trackColor(track.type) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{track.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {TRACK_TYPES[track.type]} · {formatPercentage(track.annualRate)}
                        </p>
                      </div>
                      {track.closed ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                          נסגר
                        </Badge>
                      ) : (
                        <>
                          <TrackCell label="החזר" value={formatShekel(track.paymentThisMonth)} />
                          <TrackCell label="יתרה" value={formatShekel(track.remainingBalance)} />
                          <TrackCell label="ריבית שנותרה" value={formatShekel(track.interestRemaining)} />
                          <TrackCell label="נותרו" value={`${track.monthsRemaining} ח׳`} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SnapshotStat({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'dark' | 'warning';
}) {
  const toneClass =
    tone === 'dark'
      ? 'bg-gradient-to-br from-slate-900 to-indigo-900 text-white border-transparent'
      : tone === 'warning'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-white border-slate-200';
  const subtle = tone === 'dark' ? 'text-slate-300' : 'text-slate-500';

  return (
    <div className={`rounded-xl border p-2.5 ${toneClass}`}>
      <div className={`flex items-center gap-1.5 text-[10px] ${subtle}`}>
        {icon}
        {label}
      </div>
      <p className={`text-base font-bold mt-0.5 ${tone === 'dark' ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      {hint && <p className={`text-[10px] mt-0.5 ${subtle}`}>{hint}</p>}
    </div>
  );
}

function ProgressRow({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

function TrackCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center hidden sm:block min-w-[76px]">
      <p className="text-[9px] text-slate-400">{label}</p>
      <p className="text-[11px] font-bold text-slate-800">{value}</p>
    </div>
  );
}
