'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormattedNumberValueInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calculator, RefreshCw, PieChart, Building2 } from 'lucide-react';
import type { MortgageMix, MortgageTrack, MortgageBank } from '@/components/mortgage-advisor/types';
import { MORTGAGE_BANKS, DEFAULT_INTEREST_RATES } from '@/components/mortgage-advisor/types';
import { MortgageTrackCard } from '@/components/mortgage-advisor/MortgageTrackCard';
import { RefinanceAnalysis } from '@/components/mortgage-refinance/RefinanceAnalysis';
import { formatCurrency, calculateMortgageMix } from '@/components/mortgage-advisor/mortgageCalculations';
import { cn } from '@/lib/utils';

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
}: RefinanceMortgageInputProps) {
  const { tracks, totalAmount, bank } = mix;
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [mixSummaryRevealed, setMixSummaryRevealed] = useState(false);

  const hideMixSummary = () => {
    setMixSummaryRevealed(false);
    onMixSummaryRevealedChange?.(false);
  };

  const updateMix = (patch: Partial<MortgageMix>, resetSummary = false) => {
    onMixChange({ ...mix, ...patch });
    if (resetSummary) hideMixSummary();
  };

  const sumTrackAmounts = (trackList: MortgageTrack[]) =>
    trackList.reduce((sum, track) => sum + track.amount, 0);

  const handlePerTrackModeToggle = () => {
    const next = !perTrackRefinanceEnabled;
    if (next) {
      onMixChange({ ...mix, totalAmount: sumTrackAmounts(tracks) });
    } else {
      hideMixSummary();
      onReadyForGoalChange?.(false);
    }
    onPerTrackRefinanceEnabledChange(next);
  };

  const handlePerTrackRefinanceCheck = () => {
    onReadyForGoalChange?.(true);
    onProceedToRefinanceOptions?.();
  };

  const addTrack = (preferredAmount?: number) => {
    const allocated = sumTrackAmounts(tracks);
    const remainingAmount = perTrackRefinanceEnabled ? 0 : totalAmount - allocated;
    const suggestedAmount =
      preferredAmount !== undefined
        ? Math.max(1, preferredAmount)
        : perTrackRefinanceEnabled
          ? 100000
          : Math.max(100000, remainingAmount);

    const newTrack: MortgageTrack = {
      id: `track-${Date.now()}`,
      name: `מסלול ${tracks.length + 1}`,
      type: 'fixed_unlinked',
      amount: suggestedAmount,
      percentage: totalAmount > 0 ? (suggestedAmount / totalAmount) * 100 : 0,
      interestRate: DEFAULT_INTEREST_RATES.fixed_unlinked,
      years: 20,
      amortizationType: 'spitzer',
    };

    const nextTracks = [...tracks, newTrack];
    updateMix(
      {
        tracks: nextTracks,
        ...(perTrackRefinanceEnabled ? { totalAmount: sumTrackAmounts(nextTracks) } : {}),
      },
      true
    );
    setEditingTrackId(newTrack.id);
  };

  const updateTrack = (updatedTrack: MortgageTrack) => {
    const nextTracks = tracks.map((track) => (track.id === updatedTrack.id ? updatedTrack : track));
    updateMix(
      {
        tracks: nextTracks,
        ...(perTrackRefinanceEnabled ? { totalAmount: sumTrackAmounts(nextTracks) } : {}),
      },
      true
    );
    setEditingTrackId(null);
  };

  const deleteTrack = (id: string) => {
    const nextTracks = tracks.filter((track) => track.id !== id);
    updateMix(
      {
        tracks: nextTracks,
        ...(perTrackRefinanceEnabled ? { totalAmount: sumTrackAmounts(nextTracks) } : {}),
      },
      true
    );
    if (editingTrackId === id) setEditingTrackId(null);
  };

  const totalTracksAmount = sumTrackAmounts(tracks);
  const effectiveTotal = perTrackRefinanceEnabled ? totalTracksAmount : totalAmount;
  const isAmountBalanced =
    totalAmount > 0 && tracks.length > 0 && Math.abs(totalTracksAmount - totalAmount) < 1000;
  const showSummarizeButton =
    !perTrackRefinanceEnabled && !mixSummaryRevealed && isAmountBalanced;
  const showPerTrackRefinanceButton =
    perTrackRefinanceEnabled &&
    tracks.length > 0 &&
    editingTrackId === null &&
    !readyForGoal;
  const amountDifference = totalAmount - totalTracksAmount;
  const remainingToComplete = Math.max(0, Math.round(amountDifference));
  const excessToReduce = Math.max(0, Math.round(-amountDifference));
  const showCompletionCta =
    !perTrackRefinanceEnabled && totalAmount > 0 && !isAmountBalanced && remainingToComplete > 0;
  const showReductionCta =
    !perTrackRefinanceEnabled && totalAmount > 0 && !isAmountBalanced && excessToReduce > 0;
  const canAddFirstTrack = !!bank && (perTrackRefinanceEnabled || totalAmount > 0);

  useEffect(() => {
    if (!isAmountBalanced && mixSummaryRevealed && !perTrackRefinanceEnabled) {
      setMixSummaryRevealed(false);
      onMixSummaryRevealedChange?.(false);
      onReadyForGoalChange?.(false);
    }
  }, [
    isAmountBalanced,
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

  const buildDisplayMix = (): MortgageMix => {
    const calc = calculateMortgageMix(mix);
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

  const reduceLastTrackByExcess = () => {
    if (tracks.length === 0 || excessToReduce <= 0) return;
    const lastTrack = tracks[tracks.length - 1];
    const nextAmount = Math.max(1, lastTrack.amount - excessToReduce);
    updateTrack({
      ...lastTrack,
      amount: nextAmount,
      percentage: totalAmount > 0 ? (nextAmount / totalAmount) * 100 : 0,
    });
  };

  const summaryShown = mixSummaryRevealed && isAmountBalanced && !perTrackRefinanceEnabled;

  return (
    <div className="space-y-6" dir="rtl">
      <AnimatePresence mode="wait" initial={false}>
        {summaryShown ? (
          <motion.div
            key="mix-header"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-center py-2"
          >
            <p className="text-sm text-gray-500">המשכנתא הנוכחית</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">{bank}</h2>
            </div>
            <p className="text-lg font-semibold text-blue-600 mt-1">{formatCurrency(effectiveTotal)}</p>
          </motion.div>
        ) : (
          <motion.div
            key="mix-input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden"
          >
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl text-gray-900">נתוני המשכנתא</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank">בנק</Label>
              <Select
                value={bank ?? ''}
                onValueChange={(value) => updateMix({ bank: value as MortgageBank }, true)}
              >
                <SelectTrigger
                  id="bank"
                  dir="rtl"
                  className="[&>span:first-of-type]:flex-1 [&>span:first-of-type]:text-right"
                >
                  <SelectValue placeholder="בחר בנק" />
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
            </div>
            <div>
              <Label htmlFor="totalAmount">סכום הקרן בכל המסלולים (₪)</Label>
              <div className="flex items-center gap-2">
                <FormattedNumberValueInput
                  id="totalAmount"
                  value={perTrackRefinanceEnabled ? effectiveTotal : totalAmount}
                  onValueChange={(value) => updateMix({ totalAmount: value }, true)}
                  placeholder="סך המשכנתא"
                  disabled={perTrackRefinanceEnabled}
                  className="h-10 flex-1 text-center"
                />
                <Button
                  type="button"
                  variant={perTrackRefinanceEnabled ? 'default' : 'outline'}
                  className={cn(
                    'h-10 shrink-0 px-3 text-sm',
                    perTrackRefinanceEnabled && 'bg-purple-600 hover:bg-purple-700'
                  )}
                  onClick={handlePerTrackModeToggle}
                >
                  <RefreshCw className="h-4 w-4 ml-1.5 shrink-0" />
                  <span className="hidden sm:inline">בדוק מיחזור לכל מסלול</span>
                  <span className="sm:hidden">מיחזור למסלול</span>
                </Button>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {tracks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין מסלולים</h3>
            <p className="text-gray-500 mb-6">התחל בהוספת המסלול הראשון של המשכנתא הנוכחית</p>
            <Button onClick={() => addTrack()} className="px-6 py-3" disabled={!canAddFirstTrack}>
              <Plus className="h-5 w-5 ml-2" />
              הוסף מסלול ראשון
            </Button>
            {!canAddFirstTrack && (
              <p className="text-sm text-gray-500 mt-3">
                {perTrackRefinanceEnabled
                  ? 'יש לבחור בנק לפני הוספת מסלול'
                  : 'יש לבחור בנק ולהזין סכום משכנתא, או להפעיל "בדוק מיחזור לכל מסלול"'}
              </p>
            )}
          </CardContent>
        </Card>
      ) : summaryShown ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <RefinanceAnalysis currentMix={buildDisplayMix()} onEdit={hideMixSummary} />
        </motion.div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track, index) => (
              <React.Fragment key={track.id}>
                <MortgageTrackCard
                  track={track}
                  totalMortgageAmount={effectiveTotal || totalAmount || 1}
                  onUpdate={updateTrack}
                  onDelete={deleteTrack}
                  isEditing={editingTrackId === track.id}
                  onStartEditing={() => setEditingTrackId(track.id)}
                />

                {showCompletionCta && index === tracks.length - 1 && (
                  <Card className="border-2 border-dashed border-blue-300 bg-blue-50/80">
                    <CardContent className="h-full flex items-center justify-center p-6">
                      <Button
                        onClick={() => addTrack(remainingToComplete)}
                        className="h-auto min-h-10 max-w-full whitespace-normal px-4 py-3 text-sm leading-snug"
                      >
                        <Plus className="h-5 w-5 ml-2 shrink-0" />
                        הוסף מסלול להשלמת {formatCurrency(remainingToComplete)} לגובה ההלוואה
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {showReductionCta && index === tracks.length - 1 && (
                  <Card className="border-2 border-dashed border-amber-300 bg-amber-50/80">
                    <CardContent className="h-full flex items-center justify-center p-6">
                      <Button
                        onClick={reduceLastTrackByExcess}
                        variant="outline"
                        className="h-auto min-h-10 max-w-full whitespace-normal border-amber-400 px-4 py-3 text-sm leading-snug text-amber-800 hover:bg-amber-100"
                      >
                        הפחת מהמסלול האחרון {formatCurrency(excessToReduce)} כדי להגיע לגובה ההלוואה
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </React.Fragment>
            ))}
          </div>

          {showSummarizeButton && (
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={revealMixSummary}
                className="px-8 py-6 text-lg h-auto flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PieChart className="h-8 w-8" />
                <span className="font-bold">סכם משכנתא נוכחית</span>
              </Button>
            </div>
          )}

          {showPerTrackRefinanceButton && (
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={handlePerTrackRefinanceCheck}
                className="px-8 py-6 text-lg h-auto flex-col gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <RefreshCw className="h-8 w-8" />
                <span className="font-bold">בדוק אפשרויות מיחזור</span>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
