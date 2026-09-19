'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, CheckCircle2, CloudOff, Gavel, Loader2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/mortgage-advisor/mortgageCalculations';
import { REFINANCE_GOAL_LABELS } from '@/lib/refinance';
import { RateRequestDialog } from '@/components/mortgage-advisor/rateRequest/RateRequestDialog';
import {
  MixResultRow,
  MixRowsHeader,
  StateBlocksRow,
  mixStatsOf,
  snapshotOf,
} from '@/components/mortgage-refinance/RefinanceResultsDashboard';
import type { RefinanceSaveOutcome, RefinanceSavePayload } from './refinancePlan';

type Phase = 'review' | 'saving' | 'saved' | 'error';

/**
 * "שמור מצב נוכחי כתמהיל למיחזור".
 *
 * לפני השמירה — סיכום התמהיל שנבנה: המצב היום מול המצב לאחר המיחזור, באותם
 * בלוקים ושורות של הדאשבורד. אחרי אישור השמירה — התהליך באזור האישי מתעדכן,
 * ומכאן אפשר להכין בקשה להצעת מחיר לבנק (בדיוק כמו במשכנתא חדשה) או להמשיך
 * לביצוע המיחזור.
 */
export function RefinanceSaveDialog({
  open,
  onOpenChange,
  payload,
  onConfirm,
  context,
  onClosedAfterSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: RefinanceSavePayload | null;
  onConfirm: (payload: RefinanceSavePayload) => Promise<RefinanceSaveOutcome>;
  /** מכלי המיחזור — ממשיכים לתהליך; מתוך התהליך — נשארים בו */
  context: 'tool' | 'plan';
  /** החלון נסגר אחרי שמירה שהצליחה — מי שפתח את הכלי לעריכה חוזר לתצוגת הסיכום */
  onClosedAfterSave?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('review');
  const [outcome, setOutcome] = useState<RefinanceSaveOutcome | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase('review');
    setOutcome(null);
    setQuoteOpen(false);
  }, [open]);

  if (!payload) return null;

  const { baseCalc, refinedCalc, currentMix, refinancedMix, goal } = payload;
  const monthlyDelta = refinedCalc.summary.totalMonthlyPayment - baseCalc.summary.totalMonthlyPayment;
  const interestDelta = refinedCalc.summary.totalInterest - baseCalc.summary.totalInterest;
  const monthsOf = (calc: typeof baseCalc) =>
    Object.fromEntries(calc.trackCalculations.map((tc) => [tc.track.id, tc.amortSchedule.length]));

  const confirm = async () => {
    setPhase('saving');
    try {
      const result = await onConfirm(payload);
      setOutcome(result);
      setPhase('saved');
    } catch {
      setPhase('error');
    }
  };

  const changeOpen = (next: boolean) => {
    onOpenChange(next);
    if (!next && phase === 'saved') onClosedAfterSave?.();
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] max-w-4xl flex-col gap-3 overflow-y-auto">
        <DialogHeader className="shrink-0 pr-7 text-right">
          <DialogTitle className="flex items-center gap-2">
            {phase === 'saved' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <Save className="h-5 w-5 text-blue-600" />
            )}
            {phase === 'saved' ? 'התמהיל למיחזור נשמר באזור האישי' : 'סיכום התמהיל למיחזור'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'saved'
              ? context === 'tool'
                ? 'התהליך נפתח באזור האישי עם התמהיל שבניתם. אפשר להכין ממנו בקשה להצעת מחיר לבנק, ולהמשיך לבחירת אופן המיחזור.'
                : 'התהליך עודכן עם התמהיל הערוך. אפשר להכין ממנו בקשה להצעת מחיר לבנק.'
              : 'כך ייראה המיחזור לפי מה שבפאנל השליטה. אישור השמירה מעדכן את התהליך באזור האישי עם התמהיל הזה.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              {currentMix.bank ?? 'המשכנתא הנוכחית'}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              מטרה: {REFINANCE_GOAL_LABELS[goal]}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                monthlyDelta < -1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              החזר חודשי {monthlyDelta < 0 ? '−' : '+'}
              {formatCurrency(Math.abs(monthlyDelta))}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                interestDelta < -1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              סך ריבית {interestDelta < 0 ? '−' : '+'}
              {formatCurrency(Math.abs(interestDelta))}
            </span>
          </div>

          <StateBlocksRow
            title="המצב הנוכחי"
            caption={`${currentMix.bank ?? 'המשכנתא הנוכחית'} · ${formatCurrency(currentMix.totalAmount)} קרן`}
            snapshot={snapshotOf(baseCalc)}
            tone="current"
          />
          <StateBlocksRow
            title="התמהיל למיחזור"
            caption="לפי פאנל השליטה"
            snapshot={snapshotOf(refinedCalc)}
            baseline={snapshotOf(baseCalc)}
            tone="refinanced"
          />

          <div className="space-y-2 border-t border-slate-100 pt-2.5">
            <MixRowsHeader />
            <MixResultRow
              title="התמהיל היום"
              stats={mixStatsOf(baseCalc)}
              tone="current"
              tracks={currentMix.tracks}
              trackMonths={monthsOf(baseCalc)}
            />
            <MixResultRow
              title="התמהיל למיחזור"
              subtitle={`${refinancedMix.tracks.length} מסלולים`}
              stats={mixStatsOf(refinedCalc)}
              baseline={mixStatsOf(baseCalc)}
              tone="refinanced"
              tracks={refinancedMix.tracks}
              trackMonths={monthsOf(refinedCalc)}
            />
          </div>
        </div>

        {phase === 'error' && (
          <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
            <CloudOff className="h-4 w-4" />
            השמירה לא הושלמה. בדקו את החיבור ונסו שוב.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
          {phase === 'saved' && outcome ? (
            <>
              <Button variant="outline" onClick={() => setQuoteOpen(true)} className="gap-2">
                <Gavel className="h-4 w-4" />
                הכנת בקשה להצעת מחיר לבנק
              </Button>
              {context === 'tool' && outcome.href ? (
                <Link
                  href={outcome.href}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700"
                >
                  המשך לביצוע המיחזור
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              ) : (
                <Button onClick={() => changeOpen(false)} className="bg-slate-900 text-white hover:bg-slate-700">
                  סגירה
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => changeOpen(false)} disabled={phase === 'saving'}>
                חזרה לעריכה
              </Button>
              <Button
                onClick={() => void confirm()}
                disabled={phase === 'saving'}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {phase === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {phase === 'error' ? 'נסו שוב' : 'אישור השמירה'}
              </Button>
            </>
          )}
        </div>

        {outcome && (
          <RateRequestDialog
            open={quoteOpen}
            onOpenChange={setQuoteOpen}
            mix={outcome.mix}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
