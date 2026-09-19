/**
 * Bridge from the per-bank approvals collected in the intake to the plan's
 * single-bank `PreApprovalData`.
 *
 * Stages 3–5 (בניית תמהיל, מכרז ריביות, חתימה) and the stage-completion rule
 * all read `PlanData.APPLICATIONS`, so the intake keeps feeding it. The plan
 * carries one bank, and the bank carried forward is the **first approved** one
 * in the order the user added them — deterministic, and shown in the UI so it
 * is never a hidden choice.
 *
 * Basket rows keep any `mixKey` / `mixRecordId` already saved for them, so the
 * link to a saved mix survives a re-sync.
 */

import { UNIFORM_BASKETS } from '@/lib/mortgage-plan';
import type { PreApprovalBasket, PreApprovalData } from '@/lib/mortgage-plan';
import { addMonths } from './format';
import { APPROVAL_VALIDITY_MONTHS } from './schema';

export interface ApprovalSummary {
  entityId: string;
  bankName: string | null;
  submittedAt: string | null;
  bankerName: string | null;
  approved: boolean;
  approvedAt: string | null;
  approvedAmount: number | null;
  /** basketId → trackType → rate */
  basketRates: Record<string, Record<string, number>>;
}

/** Reads one approval entity's values into a plain summary. */
export function toApprovalSummary(
  entityId: string,
  values: Record<string, unknown>,
): ApprovalSummary {
  const rawRates =
    values.basketRates && typeof values.basketRates === 'object' && !Array.isArray(values.basketRates)
      ? (values.basketRates as Record<string, Record<string, unknown>>)
      : {};

  const basketRates: Record<string, Record<string, number>> = {};
  for (const basket of UNIFORM_BASKETS) {
    const perBasket = rawRates[basket.id];
    if (!perBasket || typeof perBasket !== 'object') continue;
    const rates: Record<string, number> = {};
    for (const track of basket.tracks) {
      const rate = Number(perBasket[track.type]);
      if (Number.isFinite(rate) && rate >= 0) rates[track.type] = rate;
    }
    if (Object.keys(rates).length > 0) basketRates[basket.id] = rates;
  }

  const str = (key: string) =>
    typeof values[key] === 'string' && values[key] !== '' ? (values[key] as string) : null;

  return {
    entityId,
    bankName: str('bankName'),
    submittedAt: str('submittedAt'),
    bankerName: str('bankerName'),
    approved: values.approved === true,
    approvedAt: str('approvedAt'),
    approvedAmount: typeof values.approvedAmount === 'number' ? values.approvedAmount : null,
    basketRates,
  };
}

/** The approval whose details the plan carries forward: the first approved one. */
export function carriedApproval(approvals: ApprovalSummary[]): ApprovalSummary | null {
  return approvals.find((approval) => approval.approved) ?? approvals[0] ?? null;
}

/**
 * Maps the approvals onto the plan's stage data, preserving the mix linkage that
 * the mix stage wrote onto each basket row.
 */
export function toPreApprovalData(
  existing: PreApprovalData,
  approvals: ApprovalSummary[],
): PreApprovalData {
  const carried = carriedApproval(approvals);
  if (!carried) {
    return { ...existing, bank: null, approved: false, approvedAmount: null, baskets: [] };
  }

  const baskets: PreApprovalBasket[] = UNIFORM_BASKETS.map((basket) => {
    const previous = existing.baskets.find((row) => row.basketId === basket.id);
    return {
      basketId: basket.id,
      rates: carried.basketRates[basket.id] ?? {},
      mixKey: previous?.mixKey ?? null,
      mixRecordId: previous?.mixRecordId ?? null,
      monthlyPayment: previous?.monthlyPayment ?? null,
      averageRate: previous?.averageRate ?? null,
      totalPaid: previous?.totalPaid ?? null,
    };
  });

  return {
    ...existing,
    bank: carried.bankName,
    submittedAt: carried.submittedAt,
    approved: carried.approved,
    approvedAmount: carried.approvedAmount,
    validUntil: addMonths(carried.approvedAt, APPROVAL_VALIDITY_MONTHS),
    note: carried.bankerName ?? existing.note,
    baskets,
  };
}

/** Cheapest rate per track across every approved bank, for the comparison table. */
export interface TrackComparisonRow {
  trackType: string;
  /** bank name → rate */
  byBank: Record<string, number>;
  bestBank: string | null;
  bestRate: number | null;
}

export function compareRatesByTrack(approvals: ApprovalSummary[]): TrackComparisonRow[] {
  const trackTypes: string[] = [];
  for (const basket of UNIFORM_BASKETS) {
    for (const track of basket.tracks) {
      if (!trackTypes.includes(track.type)) trackTypes.push(track.type);
    }
  }

  return trackTypes.map((trackType) => {
    const byBank: Record<string, number> = {};
    for (const approval of approvals) {
      if (!approval.bankName) continue;
      // A bank may quote the same track in several baskets; the lowest wins.
      let best: number | null = null;
      for (const rates of Object.values(approval.basketRates)) {
        const rate = rates[trackType];
        if (rate === undefined) continue;
        if (best === null || rate < best) best = rate;
      }
      if (best !== null) byBank[approval.bankName] = best;
    }

    let bestBank: string | null = null;
    let bestRate: number | null = null;
    for (const [bank, rate] of Object.entries(byBank)) {
      if (bestRate === null || rate < bestRate) {
        bestRate = rate;
        bestBank = bank;
      }
    }

    return { trackType, byBank, bestBank, bestRate };
  });
}
