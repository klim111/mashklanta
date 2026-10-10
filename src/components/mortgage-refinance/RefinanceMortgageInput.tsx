'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, PieChart, Building2, Landmark } from 'lucide-react';
import type { MortgageMix, MortgageTrack, MortgageBank } from '@/components/mortgage-advisor/types';
import { MORTGAGE_BANKS, TRACK_TYPES } from '@/components/mortgage-advisor/types';
import { RefinanceAnalysis } from '@/components/mortgage-refinance/RefinanceAnalysis';
import { formatCurrency, calculateMortgageMix } from '@/components/mortgage-advisor/mortgageCalculations';
import { MarketRateNotice, RegistrationInvite } from '@/components/mortgage-refinance/RefinanceNotices';
import { CurrentTrackRow, type CurrentTrackPatch } from '@/components/refinance-check/CurrentTrackRow';
import { monthlyPayment } from '@/lib/refinance-check';
import {
  DEFAULT_PAYMENT_DAY,
  clampPaymentDay,
  endDateFromMonths,
  findAboveMarketTracks,
  mixWithRemainingTerms,
  parseIsoDate,
  toDateInputValue,
  trackRemainingMonths,
} from '@/lib/refinance';
import type { MarketRates } from '@/lib/refinance';
import type {
  RefinanceDraftState,
  RefinanceSaveOutcome,
  RefinanceSavePayload,
} from '@/components/mortgage-refinance/refinancePlan';
import { cn } from '@/lib/utils';
import { demoId } from '@/demo/demo-attr';

interface RefinanceMortgageInputProps {
  mix: MortgageMix;
  onMixChange: (mix: MortgageMix) => void;
  perTrackRefinanceEnabled: boolean;
  onPerTrackRefinanceEnabledChange: (enabled: boolean) => void;
  onMixSummaryRevealedChange?: (revealed: boolean) => void;
  readyForGoal?: boolean;
  onReadyForGoalChange?: (ready: boolean) => void;
  onProceedToRefinanceOptions?: () => void;
  onShowDetails?: (mix: MortgageMix) => void;
  onAnalyzeScenarios?: (mix: MortgageMix) => void;
  /** משתמש שאינו רשום — הכלי פתוח לבדיקה אחת בלבד */
  isGuest?: boolean;
  /** ריביות ממוצעות בשוק לפי בנק ישראל */
  market?: MarketRates | null;
  /** פתיחה ישר בניתוח (הסיכום גלוי) — כשחוזרים לתמהיל שכבר נשמר */
  initialSummaryRevealed?: boolean;
  /** תמהיל למיחזור שנשמר — הפאנל נפתח עם הערכים שלו */
  refinanceInitial?: RefinanceDraftState | null;
  /** שמירת התמהיל למיחזור לתהליך באזור האישי */
  onSaveRefinance?: (payload: RefinanceSavePayload) => Promise<RefinanceSaveOutcome>;
  saveContext?: 'tool' | 'plan';
  onRefinanceSaveDone?: () => void;
}

export function RefinanceMortgageInput({
  mix,
  onMixChange,
  perTrackRefinanceEnabled,
  onPerTrackRefinanceEnabledChange,
  onMixSummaryRevealedChange,
  readyForGoal = false,
  onReadyForGoalChange,
  onProceedToRefinanceOptions,
  isGuest = false,
  market = null,
  initialSummaryRevealed = false,
  refinanceInitial = null,
  onSaveRefinance,
  saveContext = 'tool',
  onRefinanceSaveDone,
}: RefinanceMortgageInputProps) {
  const { tracks, bank } = mix;
  const [mixSummaryRevealed, setMixSummaryRevealed] = useState(initialSummaryRevealed);

  const hideMixSummary = () => {
    setMixSummaryRevealed(false);
    onMixSummaryRevealedChange?.(false);
  };

  const sumTrackAmounts = (trackList: MortgageTrack[]) =>
    trackList.reduce((sum, track) => sum + track.amount, 0);

  /*
    כמו בבדיקת המיחזור לאורח, גובה המשכנתא הוא סכום היתרות שהוזנו במסלולים —
    אין סכום כולל נפרד שצריך לאזן מולו. גם האחוז של כל מסלול נגזר מכך.
  */
  const setTracks = (nextTracks: MortgageTrack[]) => {
    const total = sumTrackAmounts(nextTracks);
    onMixChange({
      ...mix,
      tracks: nextTracks.map((track) => ({
        ...track,
        percentage: total > 0 ? (track.amount / total) * 100 : 0,
      })),
      totalAmount: total,
    });
    hideMixSummary();
  };

  const handlePerTrackModeToggle = () => {
    const next = !perTrackRefinanceEnabled;
    if (!next) {
      hideMixSummary();
      onReadyForGoalChange?.(false);
    }
    onPerTrackRefinanceEnabledChange(next);
  };

  const handlePerTrackRefinanceCheck = () => {
    onReadyForGoalChange?.(true);
    onProceedToRefinanceOptions?.();
  };

  const addTrack = () => {
    // ברירת המחדל של מועדי התשלומים: יום החיוב של המסלולים האחרים, וסיום בעוד
    // עשרים שנה. הלקוח מדייק את החודש והשנה בשורת המסלול.
    const paymentDay = tracks[0]?.paymentDay ?? DEFAULT_PAYMENT_DAY;
    const used = new Set(tracks.map((track) => track.type));
    const type = NEW_TRACK_ORDER.find((option) => !used.has(option)) ?? 'fixed_unlinked';
    const newTrack: MortgageTrack = {
      id: `track-${Date.now()}`,
      name: `מסלול ${tracks.length + 1}`,
      type,
      amount: 0,
      percentage: 0,
      interestRate: 0,
      years: 20,
      amortizationType: 'spitzer',
      endDate: toDateInputValue(endDateFromMonths(240, paymentDay)),
      paymentDay,
      ...(type === 'variable_linked' || type === 'variable_unlinked' ? { variablePeriod: 5 } : {}),
    };
    setTracks([...tracks, newTrack]);
  };

  const patchTrack = (track: MortgageTrack, patch: CurrentTrackPatch & { paymentDay?: number }) => {
    const next: MortgageTrack = { ...track };
    if (patch.type) next.type = patch.type;
    if (patch.balance !== undefined) next.amount = patch.balance;
    if (patch.rate !== undefined) next.interestRate = patch.rate;
    if (patch.spread !== undefined) {
      if (patch.spread === null) delete next.rateSpread;
      else next.rateSpread = patch.spread;
    }
    if (patch.variablePeriod !== undefined) next.variablePeriod = patch.variablePeriod;
    if (patch.endYear !== undefined || patch.endMonth !== undefined || patch.paymentDay !== undefined) {
      const end = trackEnd(track);
      const day = clampPaymentDay(patch.paymentDay ?? track.paymentDay ?? DEFAULT_PAYMENT_DAY);
      next.paymentDay = day;
      next.endDate = toDateInputValue(
        new Date(patch.endYear ?? end.year, (patch.endMonth ?? end.month) - 1, day)
      );
      next.years = Math.max(1 / 12, trackRemainingMonths(next) / 12);
    }
    setTracks(tracks.map((t) => (t.id === track.id ? next : t)));
  };

  const deleteTrack = (id: string) => setTracks(tracks.filter((track) => track.id !== id));

  const totalTracksAmount = sumTrackAmounts(tracks);
  const tracksComplete =
    tracks.length > 0 && tracks.every((track) => track.amount > 0 && track.interestRate > 0);
  const totalMonthlyPayment = tracks.reduce(
    (sum, track) =>
      track.amount > 0 && track.interestRate > 0
        ? sum + monthlyPayment(track.amount, track.interestRate, trackRemainingMonths(track))
        : sum,
    0
  );
  const canSummarize = tracksComplete && !!bank;
  const showSummarizeButton = !perTrackRefinanceEnabled && !mixSummaryRevealed;
  const showPerTrackRefinanceButton = perTrackRefinanceEnabled && !readyForGoal;

  useEffect(() => {
    if (!tracksComplete && mixSummaryRevealed && !perTrackRefinanceEnabled) {
      setMixSummaryRevealed(false);
      onMixSummaryRevealedChange?.(false);
      onReadyForGoalChange?.(false);
    }
  }, [
    tracksComplete,
    mixSummaryRevealed,
    perTrackRefinanceEnabled,
    onMixSummaryRevealedChange,
    onReadyForGoalChange,
  ]);

  useEffect(() => {
    if (perTrackRefinanceEnabled) {
      onReadyForGoalChange?.(false);
      setMixSummaryRevealed(false);
      onMixSummaryRevealedChange?.(false);
    }
  }, [tracks.length, perTrackRefinanceEnabled, onReadyForGoalChange, onMixSummaryRevealedChange]);

  /** מסלולים שהריבית בהם גבוהה מהריבית הממוצעת בשוק לפי בנק ישראל */
  const aboveMarketFindings = findAboveMarketTracks(tracks, market);

  const buildDisplayMix = (): MortgageMix => {
    // התקופה של כל מסלול היא הזמן שנותר בפועל עד סוף המשכנתא, לפי התאריך
    // המדויק ויום החיוב שהלקוח הזין — זו נקודת המוצא של המיחזור.
    const calc = calculateMortgageMix(mixWithRemainingTerms(mix));
    return {
      ...calc.mix,
      id: mix.id,
      bank: mix.bank,
      name: mix.name || `המשכנתא הנוכחית${bank ? ` - ${bank}` : ''}`,
      createdAt: mix.createdAt,
      notes: mix.notes,
    };
  };

  const revealMixSummary = () => {
    setMixSummaryRevealed(true);
    onMixSummaryRevealedChange?.(true);
  };

  const summaryShown = mixSummaryRevealed && tracksComplete && !perTrackRefinanceEnabled;

  if (summaryShown) {
    return (
      <div className="space-y-6" dir="rtl">
        <motion.div
          key="mix-header"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-1 text-center"
        >
          <span className="text-xs text-slate-500">המשכנתא הנוכחית</span>
          <Building2 className="h-4 w-4 text-blue-600" />
          <h2 className="text-subtitle font-bold text-slate-900">{bank}</h2>
          <span className="text-slate-300">·</span>
          <p className="text-base font-semibold text-blue-600">{formatCurrency(totalTracksAmount)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <RefinanceAnalysis
            currentMix={buildDisplayMix()}
            onEdit={hideMixSummary}
            isGuest={isGuest}
            market={market}
            initial={refinanceInitial}
            onSave={onSaveRefinance}
            saveContext={saveContext}
            onSaveDone={onRefinanceSaveDone}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* ריבית גבוהה מהממוצע בשוק — הזדמנות למיחזור */}
      {market && aboveMarketFindings.length > 0 && (
        <MarketRateNotice findings={aboveMarketFindings} market={market} />
      )}

      {isGuest && tracks.length > 0 && <RegistrationInvite compact />}

      <AnimatePresence initial={false}>
        <motion.section
          key="tracks-input"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5 lg:grid-cols-[1fr_300px]"
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-subtitle font-black text-slate-900">המסלולים במשכנתא היום</h2>
                <p className="mt-1 text-sm text-slate-500">
                  מהדוח השנתי או מדוח יתרות לסילוק: סוג המסלול, היתרה, הריבית ומועד התשלום האחרון.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block">
                <span className="block text-2xs font-bold text-slate-500">הבנק שבו המשכנתא</span>
                <Select value={bank ?? ''} onValueChange={(value) => onMixChange({ ...mix, bank: value as MortgageBank })}>
                  <SelectTrigger
                    id="bank"
                    {...demoId('refi-bank')}
                    dir="rtl"
                    className="mt-1 h-11 rounded-xl border-slate-300 bg-white text-info font-semibold [&>span:first-of-type]:flex-1 [&>span:first-of-type]:text-right"
                  >
                    <SelectValue placeholder="בחרו בנק" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="text-right">
                    {MORTGAGE_BANKS.map((bankOption) => (
                      <SelectItem
                        key={bankOption}
                        value={bankOption}
                        className="pr-8 pl-2 text-right [&>span:first-child]:right-2 [&>span:first-child]:left-auto"
                      >
                        {bankOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Button
                type="button"
                variant={perTrackRefinanceEnabled ? 'default' : 'outline'}
                className={cn(
                  'h-11 shrink-0 rounded-xl px-3 text-sm',
                  perTrackRefinanceEnabled && 'bg-blue-600 hover:bg-blue-700'
                )}
                onClick={handlePerTrackModeToggle}
                {...demoId('refi-per-track')}
              >
                <RefreshCw className="h-4 w-4 ml-1.5 shrink-0" />
                בדוק מיחזור לכל מסלול
              </Button>
            </div>

            <ul className="mt-5 space-y-3">
              {tracks.map((track, index) => {
                const end = trackEnd(track);
                const months = trackRemainingMonths(track);
                const day = clampPaymentDay(track.paymentDay ?? DEFAULT_PAYMENT_DAY);
                return (
                  <div key={track.id} {...demoId(`refi-track-${index}`)}>
                    <CurrentTrackRow
                      index={index}
                      typeOptions={TRACK_TYPE_OPTIONS}
                      value={{
                        type: track.type,
                        balance: track.amount,
                        rate: track.interestRate,
                        spread: track.rateSpread,
                        variablePeriod: track.variablePeriod,
                        endYear: end.year,
                        endMonth: end.month,
                      }}
                      onChange={(patch) => patchTrack(track, patch)}
                      onDelete={() => deleteTrack(track.id)}
                      footer={
                        <>
                          <span className="text-slate-500">נותרו {months} תשלומים</span>
                          {track.amount > 0 && track.interestRate > 0 && (
                            <span className="text-slate-500">
                              החזר {formatCurrency(monthlyPayment(track.amount, track.interestRate, months))} בחודש
                            </span>
                          )}
                          <label className="inline-flex items-center gap-1 text-slate-500">
                            חיוב ב-
                            <select
                              aria-label="יום החיוב בחודש"
                              value={day}
                              onChange={(e) => patchTrack(track, { paymentDay: Number(e.target.value) })}
                              className="h-6 rounded-md border border-slate-300 bg-white px-1 text-2xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                            >
                              {PAYMENT_DAYS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                            לחודש
                          </label>
                        </>
                      }
                    />
                  </div>
                );
              })}
            </ul>

            {tracks.length === 0 && (
              <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                התחילו בהוספת המסלול הראשון של המשכנתא הנוכחית
              </p>
            )}

            <button
              type="button"
              onClick={addTrack}
              {...demoId('refi-add-track')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/60 py-3 text-button font-bold text-blue-700 transition-colors hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              הוספת מסלול
            </button>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl bg-brand-dark p-5 text-white shadow-xl">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-200">
                <Landmark className="h-4 w-4" />
                המשכנתא היום{bank ? ` · ${bank}` : ''}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-2xs text-slate-300">יתרה</div>
                  <div className="text-xl font-black tabular-nums">{formatCurrency(totalTracksAmount)}</div>
                </div>
                <div>
                  <div className="text-2xs text-slate-300">החזר חודשי</div>
                  <div className="text-xl font-black tabular-nums">{formatCurrency(totalMonthlyPayment)}</div>
                </div>
              </div>
            </div>

            {showSummarizeButton && (
              <Button
                type="button"
                {...demoId('refi-summarize')}
                onClick={revealMixSummary}
                disabled={!canSummarize}
                className="h-auto w-full gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-cta font-black text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-white disabled:shadow-none"
              >
                <PieChart className="h-5 w-5" />
                סכם משכנתא נוכחית
              </Button>
            )}

            {showPerTrackRefinanceButton && (
              <Button
                type="button"
                {...demoId('refi-check-options')}
                onClick={handlePerTrackRefinanceCheck}
                disabled={!canSummarize}
                className="h-auto w-full gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-cta font-black text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-white disabled:shadow-none"
              >
                <RefreshCw className="h-5 w-5" />
                בדוק אפשרויות מיחזור
              </Button>
            )}

            {!canSummarize && (showSummarizeButton || showPerTrackRefinanceButton) && (
              <p className="text-center text-2xs text-slate-500">
                {!bank ? 'בחרו את הבנק שבו המשכנתא, ' : ''}
                {tracksComplete ? '' : 'מלאו יתרה וריבית בכל מסלול '}
                כדי להמשיך
              </p>
            )}
          </aside>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

const TRACK_TYPE_OPTIONS = (Object.keys(TRACK_TYPES) as MortgageTrack['type'][]).map((type) => ({
  value: type,
  label: TRACK_TYPES[type],
}));

/** סדר ההצעה של סוג מסלול חדש — כמו בבדיקת המיחזור לאורח */
const NEW_TRACK_ORDER: MortgageTrack['type'][] = [
  'prime',
  'fixed_unlinked',
  'fixed_linked',
  'variable_linked',
  'variable_unlinked',
  'eligibility',
];

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** החודש והשנה של התשלום האחרון במסלול */
function trackEnd(track: Pick<MortgageTrack, 'endDate' | 'years' | 'paymentDay'>): { year: number; month: number } {
  const date =
    parseIsoDate(track.endDate) ??
    endDateFromMonths(Math.max(1, Math.round((track.years || 20) * 12)), track.paymentDay ?? DEFAULT_PAYMENT_DAY);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}
