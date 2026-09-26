/**
 * מה שהאורח הזין בבדיקת המיחזור המהירה נשמר ב-sessionStorage של הלשונית:
 * חזרה מההצצה בכלי המלא מחזירה אותו לתוצאה, וההצצה נפתחת עם המסלולים שכבר
 * הזין. כלום לא נשלח לשרת.
 */

import type { MortgageMix, MortgageTrack } from '@/components/mortgage-advisor/types';
import { endDateFromMonths, toDateInputValue, DEFAULT_PAYMENT_DAY } from '@/lib/refinance';
import {
  TRACK_TYPE_LABELS,
  type RefiCheckGoal,
  type RefiCheckLoan,
  type RefiCheckTrack,
} from '@/lib/refinance-check';

export interface RefinanceCheckDraft {
  goal: RefiCheckGoal | null;
  income: number;
  loans: RefiCheckLoan[];
  tracks: RefiCheckTrack[];
  step: 'goal' | 'income' | 'tracks' | 'result';
}

const DRAFT_KEY = 'mashklanta:refinance-check';

export function loadDraft(): RefinanceCheckDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RefinanceCheckDraft;
    return parsed && Array.isArray(parsed.tracks) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: RefinanceCheckDraft) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // אחסון חסום (גלישה פרטית) — הכלי ממשיך לעבוד בלי לזכור
  }
}

/** המסלולים שהאורח הזין, כתמהיל שהכלי המלא יודע לפתוח */
export function draftAsMix(draft: RefinanceCheckDraft | null): MortgageMix | null {
  if (!draft || draft.tracks.length === 0) return null;
  const tracks = draft.tracks.filter((t) => t.balance > 0 && t.months > 0);
  if (tracks.length === 0) return null;
  const total = tracks.reduce((sum, t) => sum + t.balance, 0);
  const mixTracks: MortgageTrack[] = tracks.map((track, index) => ({
    id: `preview-${index}-${track.id}`,
    name: TRACK_TYPE_LABELS[track.type],
    type: track.type,
    amount: track.balance,
    percentage: total > 0 ? (track.balance / total) * 100 : 0,
    interestRate: track.rate,
    years: Math.max(1, Math.round(track.months / 12)),
    amortizationType: 'spitzer',
    endDate: toDateInputValue(endDateFromMonths(track.months, DEFAULT_PAYMENT_DAY)),
    paymentDay: DEFAULT_PAYMENT_DAY,
  }));
  return {
    id: 'refinance-current',
    name: 'המשכנתא הנוכחית',
    totalAmount: total,
    tracks: mixTracks,
    createdAt: new Date(),
  };
}
