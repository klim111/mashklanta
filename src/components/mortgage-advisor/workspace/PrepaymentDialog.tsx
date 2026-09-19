'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, CalendarClock, TrendingDown } from 'lucide-react';
import {
  computeMix,
  formatDuration,
  formatFullDate,
  prepaymentCapacity,
  recurringPaymentAfter,
} from '../engine';
import type { MixResult, PrepaymentEvent, PrepaymentMode, WorkspaceMix } from '../engine';
import { SliderField, formatShekel } from './primitives';
import type { SavedMix } from '../savedMixes';
import { isIndexLinked } from '../scenarioCalculations';

interface QueuedAllocation {
  trackId: string;
  amount: number;
}

interface PrepaymentDialogProps {
  open: boolean;
  mix: WorkspaceMix;
  baseResult: MixResult;
  /** מסלול שנבחר מראש כשהדיאלוג נפתח משורת מסלול או מייעוד סכום עתידי */
  initialTrackId?: string;
  /** סכום ברירת מחדל — מה שהוצהר בפרופיל, או מה שנבחר בייעוד */
  initialAmount?: number;
  /** חודש הפרעון שהוצהר בפרופיל */
  initialMonth?: number;
  /** תווית האירוע כשמגיעים מהצהרת הכנסה עתידית */
  initialLabel?: string;
  /** תמהילים שמורים אחרים לאותו נכס — לייעוד יתרה אחרי סגירת מסלול */
  otherMixes?: SavedMix[];
  onContinueToMix?: (
    item: SavedMix,
    trackId: string,
    leftover: number,
    month: number,
    events: Array<Omit<PrepaymentEvent, 'id' | 'kind'>>
  ) => void;
  onClose: () => void;
  onConfirm: (event: Omit<PrepaymentEvent, 'id' | 'kind'>) => void;
}

const MODE_LABELS: Record<PrepaymentMode, string> = {
  shorten_term: 'קיצור התקופה (ההחזר החודשי נשמר)',
  reduce_payment: 'הקטנת ההחזר החודשי (התקופה נשמרת)',
};

const SPREAD = 'spread';

export function PrepaymentDialog({
  open,
  mix,
  baseResult,
  initialTrackId,
  initialAmount,
  initialMonth,
  initialLabel,
  otherMixes = [],
  onContinueToMix,
  onClose,
  onConfirm,
}: PrepaymentDialogProps) {
  const maxMonth = Math.max(1, baseResult.schedule.length - 1);
  const [amount, setAmount] = useState(100_000);
  const [month, setMonth] = useState(13);
  const [mode, setMode] = useState<PrepaymentMode>('shorten_term');
  const [target, setTarget] = useState<string>(SPREAD);
  const [queued, setQueued] = useState<QueuedAllocation[]>([]);

  useEffect(() => {
    if (!open) return;
    const seededAmount = initialAmount && initialAmount > 0 ? initialAmount : 100_000;
    const seededMonth = initialMonth && initialMonth > 0 ? Math.min(initialMonth, maxMonth) : 13;
    setTarget(initialTrackId ?? SPREAD);
    setAmount(seededAmount);
    setMonth(Math.min(seededMonth, maxMonth));
    setMode('shorten_term');
    setQueued([]);
  }, [open, initialTrackId, initialAmount, initialMonth, maxMonth]);

  const trackId = target === SPREAD ? undefined : target;
  const maxBalance = Math.max(0, Math.round(prepaymentCapacity(baseResult, month, trackId)));
  const appliedAmount = Math.min(amount, maxBalance);
  const leftover = Math.max(0, amount - appliedAmount);
  const sliderMax = Math.max(1, maxBalance);

  const otherTracks = mix.tracks.filter(
    (track) => track.id !== trackId && !queued.some((item) => item.trackId === track.id)
  );

  const preview = useMemo(() => {
    if (!open || appliedAmount <= 0) return null;
    const extra: PrepaymentEvent[] = [
      ...queued.map((item, index) => ({
        id: `queued-${index}`,
        kind: 'prepayment' as const,
        amount: item.amount,
        month,
        mode,
        trackId: item.trackId,
      })),
      {
        id: 'preview',
        kind: 'prepayment' as const,
        amount: appliedAmount,
        month,
        mode,
        trackId,
      },
    ];
    return computeMix({ ...mix, events: [...mix.events, ...extra] });
  }, [open, mix, appliedAmount, month, mode, trackId, queued]);

  const interestSaved = preview ? baseResult.summary.totalInterest - preview.summary.totalInterest : 0;
  const monthsSaved = preview ? baseResult.summary.months - preview.summary.months : 0;
  const newMonthly = preview ? recurringPaymentAfter(preview, month) : 0;
  const date = baseResult.schedule[Math.min(month, baseResult.schedule.length) - 1]?.date;

  const untilPoint = useMemo(() => {
    const track = trackId ? baseResult.tracks.find((item) => item.track.id === trackId) : undefined;
    const rows = track
      ? track.schedule.filter((row) => row.month <= month)
      : baseResult.schedule.filter((row) => row.month <= month);
    const last = rows[rows.length - 1];
    const indexation = rows.reduce((sum, row) => sum + row.indexation, 0);
    const linked = track
      ? isIndexLinked(track.track.type)
      : mix.tracks.some((item) => isIndexLinked(item.type));
    return {
      interest: last?.cumulativeInterest ?? 0,
      indexation,
      linked,
    };
  }, [baseResult, mix.tracks, month, trackId]);

  const commitCurrent = () => {
    queued.forEach((item) => {
      onConfirm({
        amount: item.amount,
        month,
        mode,
        trackId: item.trackId,
        label: initialLabel,
      });
    });
    if (appliedAmount > 0) {
      onConfirm({
        amount: appliedAmount,
        month,
        mode,
        trackId,
        label: initialLabel,
      });
    }
  };

  const assignLeftoverTo = (value: string) => {
    if (appliedAmount <= 0 || leftover <= 0) return;
    const separator = value.indexOf('::');
    const mixId = separator > 0 ? value.slice(0, separator) : mix.id;
    const nextTrackId = separator > 0 ? value.slice(separator + 2) : value;

    if (mixId !== mix.id) {
      const item = otherMixes.find((entry) => entry.mix.id === mixId);
      if (!item || !onContinueToMix) return;
      const events: Array<Omit<PrepaymentEvent, 'id' | 'kind'>> = [
        ...queued.map((entry) => ({
          amount: entry.amount,
          month,
          mode,
          trackId: entry.trackId,
          label: initialLabel,
        })),
        ...(appliedAmount > 0
          ? [{ amount: appliedAmount, month, mode, trackId, label: initialLabel }]
          : []),
      ];
      onContinueToMix(item, nextTrackId, leftover, month, events);
      return;
    }

    if (trackId) {
      setQueued((current) => [...current, { trackId, amount: appliedAmount }]);
    }
    setTarget(nextTrackId);
    setAmount(leftover);
  };

  const confirm = () => {
    commitCurrent();
    onClose();
  };

  const leftoverOptions = otherMixes.filter((item) => item.mix.tracks.length > 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            סכום חד-פעמי לפרעון מוקדם
          </DialogTitle>
          <DialogDescription>
            הזרמת סכום חד-פעמי לתוך המשכנתא. הבחירה בין קיצור תקופה להקטנת ההחזר משנה את החיסכון בריבית.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1">
            <Label className="text-xs">מיועד ל</Label>
            <Select
              value={target}
              onValueChange={(next) => {
                setTarget(next);
                setQueued([]);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SPREAD}>פיזור יחסי בין כל המסלולים</SelectItem>
                {mix.tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1 min-w-[12rem] flex-1">
                <Label className="text-xs">סכום הפרעון (₪)</Label>
                <FormattedNumberValueInput
                  className="h-9"
                  value={amount}
                  onValueChange={(value) => setAmount(Math.max(0, value))}
                />
              </div>
              <p className="text-[11px] text-slate-500 pb-2">
                מקסימום {trackId ? 'במסלול' : 'ביתרת החוב'}: {formatShekel(maxBalance)}
              </p>
            </div>
            <SliderField
              label="סכום הפרעון"
              icon={<Banknote className="h-3.5 w-3.5 text-emerald-600" />}
              value={Math.min(sliderMax, appliedAmount)}
              onChange={setAmount}
              min={0}
              max={sliderMax}
              step={1_000}
              display={formatShekel(appliedAmount)}
              minLabel="0"
              maxLabel={trackId ? `יתרת המסלול ${formatShekel(maxBalance)}` : `יתרת החוב ${formatShekel(maxBalance)}`}
            />
          </div>

          {leftover > 0 && trackId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-[12px] leading-relaxed text-amber-950">
                ישנם עוד {formatShekel(leftover)} — בחרו איזו תוכנית תרצו לפרוע איתו. הפרעון למסלול
                הנוכחי יישמר עד {formatShekel(appliedAmount)}.
              </p>
              {otherTracks.length > 0 || leftoverOptions.length > 0 ? (
                <Select key={`${target}-${queued.length}`} onValueChange={assignLeftoverTo}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="בחירת מסלול ליתרה" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherTracks.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="pr-3 text-right text-[11px] font-black text-slate-700">
                          {mix.name || 'התמהיל הנוכחי'}
                        </SelectLabel>
                        {otherTracks.map((track) => (
                          <SelectItem key={track.id} value={`${mix.id}::${track.id}`}>
                            {track.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {leftoverOptions.map((item) => (
                      <SelectGroup key={item.mix.id}>
                        <SelectLabel className="pr-3 text-right text-[11px] font-black text-slate-700">
                          {item.mix.name || 'תמהיל ללא שם'}
                        </SelectLabel>
                        {item.mix.tracks.map((track) => (
                          <SelectItem key={`${item.mix.id}::${track.id}`} value={`${item.mix.id}::${track.id}`}>
                            {track.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[11px] text-amber-800">אין מסלול נוסף פתוח בתמהיל הזה לייעוד היתרה.</p>
              )}
            </div>
          )}

          {queued.length > 0 && (
            <ul className="space-y-1 text-[11px] text-slate-600">
              {queued.map((item) => {
                const name = mix.tracks.find((track) => track.id === item.trackId)?.name ?? item.trackId;
                return (
                  <li key={item.trackId}>
                    יוקצה {formatShekel(item.amount)} ל{name}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-2">
            <SliderField
              label="מועד הפרעון"
              icon={<CalendarClock className="h-3.5 w-3.5 text-violet-600" />}
              value={month}
              onChange={setMonth}
              min={1}
              max={maxMonth}
              step={1}
              display={date ? `תשלום ${month} · ${formatFullDate(date)}` : `תשלום ${month}`}
              minLabel="תחילת המשכנתא"
              maxLabel="סוף התקופה"
            />
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 space-y-1">
              <p className="text-[12px] leading-relaxed text-violet-950">
                עד לנקודת זמן זאת תשולם ריבית של{' '}
                <span className="font-black">{formatShekel(untilPoint.interest)}</span>
                {untilPoint.linked && (
                  <span className="text-violet-800">
                    {' '}
                    כולל ריבית שנוספה בגלל שינוי הקרן הצפוי מהמדד
                  </span>
                )}
                .
              </p>
              {untilPoint.linked && (
                <p className="text-[12px] leading-relaxed text-violet-950">
                  עד לנקודת זמן זאת צפויה הקרן{' '}
                  {untilPoint.indexation >= 0 ? 'להתייקר' : 'להוזיל'} ב-{' '}
                  <span className="font-black">{formatShekel(Math.abs(untilPoint.indexation))}</span>
                  {untilPoint.indexation < -0.5 ? ' אם המדד ירד' : ''}.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">איך הפרעון משפיע</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(MODE_LABELS) as PrepaymentMode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`text-right rounded-xl border p-2.5 text-[11px] leading-snug transition-colors ${
                    mode === option
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {MODE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          {preview && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                השפעת הפרעון
              </p>
              <div
                className={`grid gap-2 ${
                  mode === 'reduce_payment' ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
                }`}
              >
                <PreviewStat label="חיסכון בריבית" value={formatShekel(interestSaved)} highlight />
                {mode === 'shorten_term' ? (
                  <PreviewStat
                    label="קיצור התקופה"
                    value={monthsSaved > 0 ? formatDuration(monthsSaved) : 'ללא שינוי'}
                  />
                ) : (
                  <PreviewStat
                    label="הקטנת ההחזר"
                    value={
                      newMonthly + 1 < baseResult.summary.monthlyPayment
                        ? formatShekel(baseResult.summary.monthlyPayment - newMonthly)
                        : 'ללא שינוי'
                    }
                  />
                )}
                <PreviewStat
                  label={mode === 'reduce_payment' ? 'החזר חודשי חדש' : 'החזר חודשי'}
                  value={formatShekel(mode === 'reduce_payment' ? newMonthly : preview.summary.monthlyPayment)}
                />
                {mode === 'shorten_term' && (
                  <PreviewStat label="משך חדש" value={formatDuration(preview.summary.months)} />
                )}
              </div>
              {mode === 'reduce_payment' && (
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  אורך ההלוואה לא משתנה. רק ההחזר החודשי קטן.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button disabled={appliedAmount <= 0 && queued.length === 0} onClick={confirm}>
            הוסף פרעון מוקדם
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-white border border-emerald-200 p-2 text-center">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-xs font-bold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
