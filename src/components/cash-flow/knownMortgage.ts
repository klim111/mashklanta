'use client';

import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import type { MortgageTrack } from '@/components/mortgage-advisor/types';
import { fetchMixes } from '@/components/mortgage-advisor/savedMixes';
import { pickPricedMix } from '@/components/plan/stages/signing/FinalTermsPanel';
import type { PlanView } from '@/components/plan/usePlan';
import { cashFlowId } from '@/lib/cash-flow';
import type { CashFlowMortgageSource, CashFlowTrack } from '@/lib/cash-flow';
import { winningOffer } from '@/lib/mortgage-plan';

export interface KnownMortgage {
  tracks: CashFlowTrack[];
  source: CashFlowMortgageSource;
}

/** כמה חודשים נותרו עד התשלום האחרון של מסלול (במיחזור), או התקופה המלאה שלו */
function trackMonths(track: MortgageTrack, now = new Date()): number | null {
  if (track.endDate) {
    const end = new Date(track.endDate);
    if (!Number.isNaN(end.getTime())) {
      const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
      if (months > 0) return months;
    }
  }
  return track.years > 0 ? Math.round(track.years * 12) : null;
}

export function cashFlowTracks(tracks: MortgageTrack[]): CashFlowTrack[] {
  return tracks
    .filter((track) => track.amount > 0)
    .map((track, index) => ({
      id: cashFlowId('trk'),
      name: track.name?.trim() || TRACK_TYPES[track.type] || `מסלול ${index + 1}`,
      amount: Math.round(track.amount),
      rate: Number.isFinite(track.interestRate) ? Math.round(track.interestRate * 100) / 100 : null,
      months: trackMonths(track),
    }));
}

/** התמהיל הסופי של תהליך משכנתא חדשה — אחרי מכרז הריביות, התמהיל שנחתם או התומחר */
function hasFinalMix(plan: PlanView): boolean {
  return plan.kind === 'NEW' && Boolean(plan.data.AUCTION.signedMix || plan.data.MIX.finalLocked);
}

async function fromFinalMix(plans: PlanView[]): Promise<KnownMortgage | null> {
  const plan = plans.find(hasFinalMix);
  if (!plan) return null;
  const mixes = await fetchMixes();
  const winner = plan.data.AUCTION.signedMix?.bank ?? winningOffer(plan.data.AUCTION)?.bank ?? null;
  const picked = pickPricedMix(
    mixes.filter((item) => !item.planId || item.planId === plan.id),
    plan.data,
    winner
  );
  if (!picked) return null;
  const tracks = cashFlowTracks(picked.mix.tracks);
  if (tracks.length === 0) return null;
  return {
    tracks,
    source: {
      kind: 'mix',
      key: `mix:${picked.mix.id}:${picked.source}`,
      label: picked.source === 'final' ? 'התמהיל הסופי שבחרתם' : 'התמהיל שנבחר במכרז הריביות',
    },
  };
}

/** המשכנתא הנוכחית כפי שהוזנה בכלי המיחזור — בתהליך מיחזור, ואם אין — בכלי עצמו */
async function fromRefinance(plans: PlanView[]): Promise<KnownMortgage | null> {
  const plan = plans.find((item) => item.data.MIX.refinance?.currentMix.tracks.length);
  let mortgage: { id: string; tracks: MortgageTrack[] } | null = plan?.data.MIX.refinance?.currentMix ?? null;
  if (!mortgage) {
    try {
      const response = await fetch('/api/profile/tool-data', { cache: 'no-store' });
      const data = response.ok ? ((await response.json()) as { refinance?: { id?: string; tracks?: MortgageTrack[] } }) : null;
      const tracks = data?.refinance?.tracks;
      if (Array.isArray(tracks) && tracks.length > 0) mortgage = { id: data?.refinance?.id ?? 'tool', tracks };
    } catch {
      mortgage = null;
    }
  }
  if (!mortgage) return null;
  const tracks = cashFlowTracks(mortgage.tracks);
  if (tracks.length === 0) return null;
  const signature = tracks.map((track) => `${track.amount}-${track.rate}-${track.months}`).join('|');
  return {
    tracks,
    source: { kind: 'refinance', key: `refinance:${mortgage.id}:${signature}`, label: 'המשכנתא שהזנתם בכלי המיחזור' },
  };
}

/**
 * המשכנתא שהלקוח כבר הזין בפלטפורמה, מסלול אחר מסלול: התמהיל הסופי של
 * תהליך משכנתא חדשה, ואם אין — המשכנתא הנוכחית מכלי המיחזור.
 */
export async function loadKnownMortgage(plan: PlanView | null): Promise<KnownMortgage | null> {
  let plans: PlanView[] = plan ? [plan] : [];
  try {
    const response = await fetch('/api/plans', { cache: 'no-store' });
    if (response.ok) {
      const all = (await response.json()) as PlanView[];
      if (Array.isArray(all)) plans = [...plans, ...all.filter((item) => item.id !== plan?.id)];
    }
  } catch {
    /* רק התהליך שהועבר */
  }
  try {
    return (await fromFinalMix(plans)) ?? (await fromRefinance(plans));
  } catch {
    return null;
  }
}
