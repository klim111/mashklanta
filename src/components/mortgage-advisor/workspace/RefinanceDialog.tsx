'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Coins, RefreshCcw, TrendingDown } from 'lucide-react';
import { AMORTIZATION_TYPES, DEFAULT_INTEREST_RATES, TRACK_TYPES } from '../types';
import type { MortgageTrack } from '../types';
import { formatPercentage } from '../mortgageCalculations';
import { computeMix, formatDuration, formatFullDate } from '../engine';
import type { MixResult, RefinanceEvent, WorkspaceMix } from '../engine';
import { SliderField, formatShekel } from './primitives';

interface RefinanceDialogProps {
  open: boolean;
  mix: WorkspaceMix;
  baseResult: MixResult;
  initialTrackId?: string;
  onClose: () => void;
  onConfirm: (event: Omit<RefinanceEvent, 'id' | 'kind'>) => void;
}

export function RefinanceDialog({
  open,
  mix,
  baseResult,
  initialTrackId,
  onClose,
  onConfirm,
}: RefinanceDialogProps) {
  const [trackId, setTrackId] = useState(initialTrackId ?? mix.tracks[0]?.id ?? '');
  const [month, setMonth] = useState(37);
  const [newType, setNewType] = useState<MortgageTrack['type']>('fixed_unlinked');
  const [newRate, setNewRate] = useState(DEFAULT_INTEREST_RATES.fixed_unlinked);
  const [newYears, setNewYears] = useState(20);
  const [newAmortization, setNewAmortization] = useState<NonNullable<MortgageTrack['amortizationType']>>('spitzer');
  const [fee, setFee] = useState(0);

  const track = mix.tracks.find((t) => t.id === trackId);
  const trackResult = baseResult.tracks.find((t) => t.track.id === trackId);
  const maxMonth = Math.max(2, (trackResult?.schedule.length ?? 12) - 1);

  useEffect(() => {
    if (!open) return;
    const id = initialTrackId ?? mix.tracks[0]?.id ?? '';
    setTrackId(id);
    const source = mix.tracks.find((t) => t.id === id);
    if (source) {
      setNewType(source.type);
      setNewRate(source.interestRate);
      setNewAmortization(source.amortizationType ?? 'spitzer');
    }
  }, [open, initialTrackId, mix.tracks]);

  useEffect(() => {
    setMonth((current) => Math.min(Math.max(2, current), maxMonth));
  }, [maxMonth]);

  const remainingBalance = trackResult?.schedule[Math.max(0, month - 2)]?.balanceEnd ?? track?.amount ?? 0;
  const remainingMonths = Math.max(1, (trackResult?.schedule.length ?? 0) - month + 1);

  const event = useMemo<Omit<RefinanceEvent, 'id' | 'kind'>>(
    () => ({
      trackId,
      month,
      newRate,
      newYears,
      newType,
      newAmortizationType: newAmortization,
      fee: fee > 0 ? fee : undefined,
    }),
    [trackId, month, newRate, newYears, newType, newAmortization, fee]
  );

  const preview = useMemo(() => {
    if (!open || !trackId) return null;
    return computeMix({ ...mix, events: [...mix.events, { ...event, id: 'preview', kind: 'refinance' }] });
  }, [open, mix, event, trackId]);

  const interestSaved = preview ? baseResult.summary.totalInterest - preview.summary.totalInterest : 0;
  const monthlyDelta = preview
    ? preview.summary.monthlyPayment - baseResult.summary.monthlyPayment
    : 0;
  const date = trackResult?.schedule[Math.min(month, trackResult.schedule.length) - 1]?.date;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-blue-600" />
            מחזור מסלול
          </DialogTitle>
          <DialogDescription>
            יתרת החוב של המסלול במועד המחזור נלקחת מחדש בתנאים חדשים — ריבית, תקופה, סוג מסלול ולוח סילוקין.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">המסלול למחזור</Label>
              <Select value={trackId} onValueChange={setTrackId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mix.tracks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">עמלות מחזור (₪)</Label>
              <FormattedNumberValueInput
                className="h-9"
                value={fee}
                onValueChange={(value) => setFee(Math.max(0, value))}
              />
            </div>
          </div>

          <SliderField
            label="מועד המחזור"
            icon={<CalendarClock className="h-3.5 w-3.5 text-violet-600" />}
            value={month}
            onChange={setMonth}
            min={2}
            max={maxMonth}
            step={1}
            display={date ? `תשלום ${month} · ${formatFullDate(date)}` : `תשלום ${month}`}
            minLabel="תחילת המשכנתא"
            maxLabel="סוף התקופה"
          />

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-600">
            במועד זה יתרת החוב במסלול היא <strong>{formatShekel(remainingBalance)}</strong> ונותרו{' '}
            <strong>{formatDuration(remainingMonths)}</strong> לפי התנאים הקיימים.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">סוג המסלול החדש</Label>
              <Select
                value={newType}
                onValueChange={(value) => {
                  const type = value as MortgageTrack['type'];
                  setNewType(type);
                  setNewRate(DEFAULT_INTEREST_RATES[type]);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRACK_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">לוח סילוקין</Label>
              <Select
                value={newAmortization}
                onValueChange={(value) => setNewAmortization(value as NonNullable<MortgageTrack['amortizationType']>)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AMORTIZATION_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <SliderField
              label="ריבית חדשה"
              icon={<Coins className="h-3.5 w-3.5 text-amber-600" />}
              value={newRate}
              onChange={setNewRate}
              min={0}
              max={12}
              step={0.05}
              display={formatPercentage(newRate)}
              minLabel="0%"
              maxLabel="12%"
            />
            <SliderField
              label="תקופה חדשה"
              icon={<CalendarClock className="h-3.5 w-3.5 text-violet-600" />}
              value={newYears}
              onChange={setNewYears}
              min={2}
              max={30}
              step={1}
              display={`${newYears} שנים`}
              minLabel="2 שנים"
              maxLabel="30 שנים"
            />
          </div>

          {preview && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                השפעת המחזור על התמהיל
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <PreviewStat
                  label="שינוי בסך ריבית"
                  value={`${interestSaved >= 0 ? 'חיסכון ' : 'תוספת '}${formatShekel(Math.abs(interestSaved))}`}
                  tone={interestSaved >= 0 ? 'good' : 'bad'}
                />
                <PreviewStat
                  label="החזר חודשי"
                  value={formatShekel(preview.summary.monthlyPayment)}
                  hint={`${monthlyDelta >= 0 ? '+' : '−'}${formatShekel(Math.abs(monthlyDelta))}`}
                />
                <PreviewStat label="משך התמהיל" value={formatDuration(preview.summary.months)} />
                <PreviewStat label="סך תשלום" value={formatShekel(preview.summary.totalPaid)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button
            disabled={!trackId}
            onClick={() => {
              onConfirm(event);
              onClose();
            }}
          >
            הוסף מחזור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewStat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const valueClass = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-600' : 'text-slate-800';
  return (
    <div className="rounded-lg bg-white border border-blue-200 p-2 text-center">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-xs font-bold ${valueClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
