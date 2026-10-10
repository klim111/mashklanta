/**
 * מה שהאורח הזין בבדיקת המיחזור המהירה נשמר בדפדפן (localStorage): חזרה
 * מההצצה בכלי המלא מחזירה אותו לתוצאה, וההצצה נפתחת עם המסלולים שכבר הזין.
 * האחסון משותף לכל הלשוניות, כי קישור אישור ההרשמה נפתח בלשונית חדשה — ושם
 * הנתונים עוברים לחשבון (src/components/tool-data/toolData.ts).
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
/** המשכנתא הנוכחית כפי שהאורח ערך אותה במסך ההצצה של הכלי המלא */
const MIX_KEY = 'mashklanta:refinance-mix';

export function loadDraft(): RefinanceCheckDraft | null {
  try {
    // טיוטה מגרסה קודמת, שנשמרה רק ללשונית, עדיין נקראת
    const raw = window.localStorage.getItem(DRAFT_KEY) ?? window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RefinanceCheckDraft;
    return parsed && Array.isArray(parsed.tracks) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: RefinanceCheckDraft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
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
    ...(typeof track.spread === 'number' && Number.isFinite(track.spread) ? { rateSpread: track.spread } : {}),
    ...(track.variablePeriod ? { variablePeriod: track.variablePeriod } : {}),
  }));
  return {
    id: 'refinance-current',
    name: 'המשכנתא הנוכחית',
    totalAmount: total,
    tracks: mixTracks,
    createdAt: new Date(),
  };
}

/** תמהיל שנשמר כ-JSON: תאריך היצירה חוזר להיות Date */
export function reviveMix(value: unknown): MortgageMix | null {
  if (!value || typeof value !== 'object') return null;
  const mix = value as MortgageMix;
  if (!Array.isArray(mix.tracks)) return null;
  const createdAt = new Date(mix.createdAt as unknown as string);
  return {
    ...mix,
    id: mix.id || 'refinance-current',
    name: mix.name || 'המשכנתא הנוכחית',
    totalAmount: Number(mix.totalAmount) || 0,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
  };
}

export function loadGuestMix(): MortgageMix | null {
  try {
    const raw = window.localStorage.getItem(MIX_KEY);
    return raw ? reviveMix(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveGuestMix(mix: MortgageMix) {
  try {
    window.localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    // אחסון חסום — ההצצה ממשיכה לעבוד בלי לזכור
  }
}

/** מה שהאורח הזין בכלי המיחזור: מה שערך בהצצה, ואם לא — המסלולים מהבדיקה המהירה */
export function guestRefinanceMix(): MortgageMix | null {
  const mix = loadGuestMix();
  if (mix && mix.tracks.length > 0) return mix;
  return draftAsMix(loadDraft());
}

/** אחרי שהנתונים עברו לחשבון — כדי שמי שייכנס אחר כך מאותו דפדפן לא יקבל אותם */
export function clearGuestRefinance() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(MIX_KEY);
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // אין מה לעשות
  }
}
