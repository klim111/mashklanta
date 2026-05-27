import type { MortgageTrack, MortgageMix, MortgageCalculation, TrackCalculation, AmortRow } from './types';
import {
  calculateTrack,
  calculateMonthlyPayment,
  calculateEqualPrincipalFirstPayment,
} from './mortgageCalculations';

export type TrackScenarioKind = 'stable' | 'rate' | 'cpi';

/** מסלול קבוע לא צמוד — יציב; שאר המסלולים רגישים לריבית או למדד */
export function getTrackScenarioKind(type: MortgageTrack['type']): TrackScenarioKind {
  if (type === 'fixed_unlinked' || type === 'grant') return 'stable';
  if (type.includes('linked') || type === 'makam') return 'cpi';
  return 'rate';
}

export const SCENARIO_RATE_DELTA = { optimistic: -1, pessimistic: 2 };
export const SCENARIO_CPI_ANNUAL = { optimistic: 1, pessimistic: 5, base: 2.5 };

export interface TrackScenarioValues {
  interestRate?: number;
  annualInflation?: number;
}

export function getDefaultTrackScenario(track: MortgageTrack): TrackScenarioValues {
  const kind = getTrackScenarioKind(track.type);
  if (kind === 'rate') {
    return { interestRate: track.interestRate };
  }
  if (kind === 'cpi') {
    return { annualInflation: SCENARIO_CPI_ANNUAL.base };
  }
  return {};
}

export function getOptimisticTrackScenario(track: MortgageTrack): TrackScenarioValues {
  const kind = getTrackScenarioKind(track.type);
  if (kind === 'rate') {
    return { interestRate: Math.max(0.1, track.interestRate + SCENARIO_RATE_DELTA.optimistic) };
  }
  if (kind === 'cpi') {
    return { annualInflation: SCENARIO_CPI_ANNUAL.optimistic };
  }
  return {};
}

export function getPessimisticTrackScenario(track: MortgageTrack): TrackScenarioValues {
  const kind = getTrackScenarioKind(track.type);
  if (kind === 'rate') {
    return { interestRate: track.interestRate + SCENARIO_RATE_DELTA.pessimistic };
  }
  if (kind === 'cpi') {
    return { annualInflation: SCENARIO_CPI_ANNUAL.pessimistic };
  }
  return {};
}

function generateIndexedAmortizationSchedule(
  principal: number,
  annualRate: number,
  years: number,
  annualInflationPercent: number,
  amortizationType: MortgageTrack['amortizationType'] = 'spitzer'
): AmortRow[] {
  const monthlyInflation = annualInflationPercent / 100 / 12;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  const schedule: AmortRow[] = [];
  let balance = principal;
  const isEqualPrincipal = amortizationType === 'equal_principal';
  const equalPrincipalPayment = numPayments > 0 ? principal / numPayments : 0;

  for (let month = 1; month <= numPayments; month++) {
    balance = balance * (1 + monthlyInflation);
    const interestPayment = balance * monthlyRate;
    const remainingMonths = numPayments - month + 1;

    let principalPayment: number;
    let actualPayment: number;

    if (isEqualPrincipal) {
      principalPayment = Math.min(equalPrincipalPayment, balance);
      actualPayment = principalPayment + interestPayment;
    } else {
      const remainingYears = remainingMonths / 12;
      const monthlyPayment =
        remainingMonths > 0
          ? calculateMonthlyPayment(balance, annualRate, remainingYears)
          : balance + interestPayment;
      principalPayment = Math.min(balance, monthlyPayment - interestPayment);
      actualPayment = principalPayment + interestPayment;
    }

    const newBalance = Math.max(0, balance - principalPayment);
    schedule.push({
      month,
      balanceStart: balance,
      payment: actualPayment,
      interest: interestPayment,
      principal: principalPayment,
      balanceEnd: newBalance,
    });
    balance = newBalance;
    if (balance <= 0.01) break;
  }

  return schedule;
}

/** חישוב מסלול צמוד מדד עם הנחת אינפלציה שנתית */
export function calculateTrackWithInflation(
  track: MortgageTrack,
  annualInflationPercent: number
): TrackCalculation {
  const amortSchedule = generateIndexedAmortizationSchedule(
    track.amount,
    track.interestRate,
    track.years,
    annualInflationPercent,
    track.amortizationType || 'spitzer'
  );

  const monthlyPayment = amortSchedule[0]?.payment ?? 0;
  const totalPaid = amortSchedule.reduce((sum, row) => sum + row.payment, 0);
  const totalInterest = totalPaid - track.amount;
  const indexedPrincipalEnd = amortSchedule[amortSchedule.length - 1]?.balanceStart ?? track.amount;

  return {
    track: {
      ...track,
      monthlyPayment,
      totalInterest,
      totalPaid,
      cpiIndex: indexedPrincipalEnd,
    },
    monthlyPayment,
    totalInterest,
    totalPaid,
    amortSchedule,
  };
}

export function calculateTrackWithScenario(
  track: MortgageTrack,
  scenario: TrackScenarioValues
): TrackCalculation {
  const kind = getTrackScenarioKind(track.type);
  if (kind === 'stable') return calculateTrack(track);
  if (kind === 'cpi' && scenario.annualInflation !== undefined) {
    return calculateTrackWithInflation(track, scenario.annualInflation);
  }
  if (kind === 'rate' && scenario.interestRate !== undefined) {
    return calculateTrack({ ...track, interestRate: scenario.interestRate });
  }
  return calculateTrack(track);
}

export function calculateMixWithScenarios(
  mix: MortgageMix,
  scenariosByTrackId: Record<string, TrackScenarioValues>
): MortgageCalculation {
  const trackCalculations = mix.tracks.map((track) =>
    calculateTrackWithScenario(track, scenariosByTrackId[track.id] ?? getDefaultTrackScenario(track))
  );

  const totalMonthlyPayment = trackCalculations.reduce((sum, c) => sum + c.monthlyPayment, 0);
  const totalInterest = trackCalculations.reduce((sum, c) => sum + c.totalInterest, 0);
  const totalPaid = trackCalculations.reduce((sum, c) => sum + c.totalPaid, 0);

  const weightedRateSum = mix.tracks.reduce((sum, track) => sum + track.interestRate * track.amount, 0);
  const averageRate = mix.totalAmount > 0 ? weightedRateSum / mix.totalAmount : 0;
  const weightedYearsSum = mix.tracks.reduce((sum, track) => sum + track.years * track.amount, 0);
  const weightedAverageYears = mix.totalAmount > 0 ? weightedYearsSum / mix.totalAmount : 0;

  return {
    mix: {
      ...mix,
      totalMonthlyPayment,
      totalInterest,
      totalPaid,
      averageRate,
      tracks: trackCalculations.map((c) => c.track),
    },
    trackCalculations,
    summary: {
      totalMonthlyPayment,
      totalInterest,
      totalPaid,
      averageRate,
      weightedAverageYears,
    },
  };
}

export function buildScenariosMap(
  tracks: MortgageTrack[],
  picker: (track: MortgageTrack) => TrackScenarioValues
): Record<string, TrackScenarioValues> {
  return Object.fromEntries(tracks.map((t) => [t.id, picker(t)]));
}
