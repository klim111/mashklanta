'use client';

import React, { useMemo, useState } from 'react';
import { Building2, Check, Loader2, Radio, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { computeMix, formatDuration } from '@/components/mortgage-advisor/engine';
import type { MixSummary } from '@/components/mortgage-advisor/engine';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel, trackColor } from '@/components/mortgage-advisor/workspace/primitives';
import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { bankTone } from './pricedMixes';

interface BroadcastMixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** התמהיל שעומד להישלח ללקוח */
  item: SavedMix;
  /** הבנק שתמחר, כשמדובר בהצעה מתומחרת */
  bank?: string | null;
  /** מה שהלקוח רואה היום — הבסיס שמולו נמדדת ההצעה */
  baseline?: MixSummary | null;
  baselineLabel?: string;
  clientName: string;
  onConfirm: () => Promise<boolean>;
}

/**
 * סיכום ההצעה ואישור סופי לפני שהיא נשלחת ללקוח.
 *
 * שידור הוא הרגע שבו העבודה של היועץ יוצאת מהטיוטה ומגיעה ללקוח, ולכן הוא
 * עובר דרך מסך שמראה בדיוק מה נשלח: המסלולים, המספרים, וההפרש מול מה שהלקוח
 * כבר מכיר. מכאן אין דרך חזרה — התמהיל מופיע אצלו.
 */
export function BroadcastMixDialog({
  open,
  onOpenChange,
  item,
  bank,
  baseline,
  baselineLabel = 'התמהיל שהלקוח מכיר',
  clientName,
  onConfirm,
}: BroadcastMixDialogProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const summary = useMemo(() => item.summary ?? computeMix(item.mix).summary, [item]);
  const tone = bankTone(bank);

  const send = async () => {
    setSending(true);
    try {
      if (await onConfirm()) setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] max-w-2xl flex-col gap-3">
        <DialogHeader className="shrink-0 pr-7 text-center">
          <DialogTitle className="justify-center text-center">
            {sent ? 'התמהיל שודר ללקוח' : 'סיכום ההצעה לפני שידור'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {sent
              ? `${clientName} רואה עכשיו את התמהיל באזור שלו, ויכול להשוות אותו לשאר ההצעות.`
              : `זה בדיוק מה ש${clientName} יראה. עד לשידור התמהיל שמור אצלכם בלבד.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pl-1">
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4 text-center">
            {bank && (
              <span
                className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white"
                style={{ backgroundColor: tone.dot }}
              >
                <Building2 className="h-3.5 w-3.5" />
                בנק {bank}
              </span>
            )}
            <h4 className="text-lg font-black text-slate-900">{item.mix.name}</h4>
            <p className="mt-1 text-sm font-bold text-slate-600">
              {formatShekel(item.mix.totalAmount)} · {item.mix.tracks.length} מסלולים ·{' '}
              {formatDuration(summary.months)}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <BroadcastStat
              label="החזר חודשי"
              value={formatShekel(summary.monthlyPayment)}
              delta={baseline ? summary.monthlyPayment - baseline.monthlyPayment : undefined}
            />
            <BroadcastStat
              label="סך ריבית"
              value={formatShekel(summary.totalInterest)}
              delta={baseline ? summary.totalInterest - baseline.totalInterest : undefined}
            />
            <BroadcastStat
              label="סך תשלום"
              value={formatShekel(summary.totalPaid)}
              delta={baseline ? summary.totalPaid - baseline.totalPaid : undefined}
            />
            <BroadcastStat
              label="ריבית ממוצעת"
              value={formatPercentage(summary.averageRate)}
            />
          </div>

          {baseline && (
            <p className="text-center text-xs font-bold text-slate-500">
              ההפרשים נמדדים מול {baselineLabel}
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border-2 border-slate-200">
            <table className="w-full text-center text-sm">
              <thead>
                <tr className="bg-slate-100 text-xs font-black text-slate-700">
                  <th className="px-2 py-2">המסלול</th>
                  <th className="px-2 py-2">סכום</th>
                  <th className="px-2 py-2">תקופה</th>
                  <th className="px-2 py-2">ריבית</th>
                </tr>
              </thead>
              <tbody>
                {item.mix.tracks.map((track) => (
                  <tr key={track.id} className="border-t border-slate-100">
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1.5 font-black text-slate-900">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: trackColor(track.type) }}
                        />
                        {TRACK_TYPES[track.type]}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-bold text-slate-700">
                      {formatShekel(track.amount)}
                    </td>
                    <td className="px-2 py-2 font-bold text-slate-700">
                      {formatDuration(Math.round(track.years * 12))}
                    </td>
                    <td className="px-2 py-2 font-black text-slate-900">
                      {formatPercentage(track.interestRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-3">
          {sent ? (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700"
            >
              <Check className="h-4 w-4" />
              סיום
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-2xl border-2 border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50"
              >
                חזרה לעריכה
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void send()}
                className={`inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white transition-all ${
                  sending ? 'cursor-wait bg-violet-400' : 'bg-violet-600 hover:bg-violet-700'
                }`}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                אשרו ושדרו ללקוח
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BroadcastStat({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number;
}) {
  const meaningful = typeof delta === 'number' && Math.abs(delta) >= 1;
  const better = (delta ?? 0) < 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
      <div className="text-xs font-bold text-slate-600">{label}</div>
      <div className="mt-0.5 text-lg font-black tabular-nums text-slate-900">{value}</div>
      {meaningful && (
        <div
          className={`mt-0.5 inline-flex items-center gap-1 text-xs font-black ${
            better ? 'text-emerald-700' : 'text-rose-600'
          }`}
        >
          {better ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {formatShekel(Math.abs(delta as number))}
        </div>
      )}
    </div>
  );
}
