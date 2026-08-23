'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, CalendarClock, TrendingDown } from 'lucide-react';
import { computeMix, formatDuration, formatFullDate } from '../engine';
import type { MixResult, PrepaymentEvent, PrepaymentMode, WorkspaceMix } from '../engine';
import { SliderField, formatShekel } from './primitives';

interface PrepaymentDialogProps {
  open: boolean;
  mix: WorkspaceMix;
  baseResult: MixResult;
  /** מסלול שנבחר מראש כשהדיאלוג נפתח משורת מסלול */
  initialTrackId?: string;
  onClose: () => void;
  onConfirm: (event: Omit<PrepaymentEvent, 'id' | 'kind'>) => void;
}

const MODE_LABELS: Record<PrepaymentMode, string> = {
  shorten_term: 'קיצור התקופה (ההחזר החודשי נשמר)',
  reduce_payment: 'הקטנת ההחזר החודשי (התקופה נשמרת)',
};

export function PrepaymentDialog({
  open,
  mix,
  baseResult,
  initialTrackId,
  onClose,
  onConfirm,
}: PrepaymentDialogProps) {
  const maxMonth = Math.max(1, baseResult.schedule.length - 1);
  const [amount, setAmount] = useState(100_000);
  const [month, setMonth] = useState(13);
  const [mode, setMode] = useState<PrepaymentMode>('shorten_term');
  const [target, setTarget] = useState<string>('spread');

  useEffect(() => {
    if (!open) return;
    setTarget(initialTrackId ?? 'spread');
    setMonth((current) => Math.min(current, maxMonth));
  }, [open, initialTrackId, maxMonth]);

  const event = useMemo<Omit<PrepaymentEvent, 'id' | 'kind'>>(
    () => ({
      amount,
      month,
      mode,
      trackId: target === 'spread' ? undefined : target,
    }),
    [amount, month, mode, target]
  );

  const preview = useMemo(() => {
    if (!open || amount <= 0) return null;
    const candidate: WorkspaceMix = {
      ...mix,
      events: [...mix.events, { ...event, id: 'preview', kind: 'prepayment' }],
    };
    return computeMix(candidate);
  }, [open, mix, event, amount]);

  const interestSaved = preview ? baseResult.summary.totalInterest - preview.summary.totalInterest : 0;
  const monthsSaved = preview ? baseResult.summary.months - preview.summary.months : 0;
  const date = baseResult.schedule[Math.min(month, baseResult.schedule.length) - 1]?.date;
  const balanceAt = baseResult.schedule[Math.max(0, month - 2)]?.balanceEnd ?? mix.totalAmount;

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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">סכום הפרעון (₪)</Label>
              <FormattedNumberValueInput
                className="h-9"
                value={amount}
                onValueChange={(value) => setAmount(Math.max(0, value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">מיועד ל</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spread">פיזור יחסי בין כל המסלולים</SelectItem>
                  {mix.tracks.map((track) => (
                    <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SliderField
            label="סכום הפרעון"
            icon={<Banknote className="h-3.5 w-3.5 text-emerald-600" />}
            value={Math.min(balanceAt, amount)}
            onChange={setAmount}
            min={0}
            max={Math.max(10_000, Math.round(balanceAt))}
            step={5_000}
            display={formatShekel(amount)}
            minLabel="0"
            maxLabel={`יתרת החוב ${formatShekel(balanceAt)}`}
          />

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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <PreviewStat label="חיסכון בריבית" value={formatShekel(interestSaved)} highlight />
                <PreviewStat
                  label="קיצור התקופה"
                  value={monthsSaved > 0 ? formatDuration(monthsSaved) : 'ללא שינוי'}
                />
                <PreviewStat label="החזר חודשי חדש" value={formatShekel(preview.summary.monthlyPayment)} />
                <PreviewStat label="משך חדש" value={formatDuration(preview.summary.months)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button
            disabled={amount <= 0}
            onClick={() => {
              onConfirm(event);
              onClose();
            }}
          >
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
