'use client';

import type { MortgageCalculation, MortgageMix, MortgageTrack } from '@/components/mortgage-advisor/types';
import { toWorkspaceMix } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import type { RefinanceFigures, RefinanceMixData, RefinanceMixSnapshot, RefinanceScope } from '@/lib/mortgage-plan';
import type { RefinanceGoal } from '@/lib/refinance';
import { createRefinancePlan } from '@/components/plan/usePlan';
import type { PlanView } from '@/components/plan/usePlan';

/**
 * הגשר בין כלי המיחזור לתהליך המיחזור באזור האישי.
 *
 * הכלי עובד על תמהיל "קלאסי" (`MortgageMix`) ועל טיוטות בפאנל השליטה; התהליך
 * שומר תמונת מצב של המשכנתא הנוכחית ושל התמהיל למיחזור, וכלי התכנון צריך
 * `WorkspaceMix`. הפונקציות כאן מתרגמות ביניהם — בכיוון השמירה ובכיוון
 * הפתיחה מחדש לעריכה — כדי ששום מסך לא יחזיק לוגיקה של תרגום בעצמו.
 */

/** מה שכלי המיחזור מוסר כשלוחצים "שמור מצב נוכחי כתמהיל למיחזור" */
export interface RefinanceSavePayload {
  goal: RefinanceGoal;
  scope: RefinanceScope;
  selectedTrackId: string | null;
  /** המשכנתא הנוכחית, עם התקופה שנותרה בפועל לכל מסלול */
  currentMix: MortgageMix;
  /** התמהיל לאחר המיחזור, לפי פאנל השליטה */
  refinancedMix: MortgageMix;
  baseCalc: MortgageCalculation;
  refinedCalc: MortgageCalculation;
}

/** מה חוזר אחרי שהשמירה הצליחה — לאן ממשיכים, ועם איזה תמהיל מכינים בקשה לבנק */
export interface RefinanceSaveOutcome {
  /** התהליך שנפתח או עודכן */
  planId: string;
  /** קישור להמשך — למסך הבחירה בין מיחזור פנימי לחיצוני */
  href: string | null;
  mix: WorkspaceMix;
}

/** ערכי הפתיחה של כלי המיחזור כשפותחים תמהיל שמור לעריכה */
export interface RefinanceDraftState {
  goal: RefinanceGoal;
  scope: RefinanceScope;
  selectedTrackId: string | null;
  /** המסלולים כפי שנשמרו למיחזור — מהם משוחזרות הטיוטות בפאנל */
  refinancedTracks: MortgageTrack[];
}

export function refinanceFiguresOf(calc: MortgageCalculation): RefinanceFigures {
  return {
    monthlyPayment: calc.summary.totalMonthlyPayment,
    totalInterest: calc.summary.totalInterest,
    totalPaid: calc.summary.totalPaid,
    averageRate: calc.summary.averageRate,
    months: calc.trackCalculations.reduce((max, tc) => Math.max(max, tc.amortSchedule.length), 0),
  };
}

/**
 * מסלול של התמהיל למיחזור. מועדי התשלומים שייכים למשכנתא הנוכחית בלבד: אחרי
 * המיחזור התקופה היא מה שנבחר בפאנל, ולכן היא נשמרת כשנים ולא כתאריך סיום.
 */
function refinancedTrack(track: MortgageTrack): MortgageTrack {
  const { endDate: _endDate, paymentDay: _paymentDay, monthlyPayment, totalInterest, totalPaid, ...rest } = track;
  void _endDate;
  void _paymentDay;
  void monthlyPayment;
  void totalInterest;
  void totalPaid;
  return rest;
}

function snapshotOf(mix: MortgageMix, id: string, name: string, tracks: MortgageTrack[]): RefinanceMixSnapshot {
  return {
    id,
    name,
    bank: mix.bank ?? null,
    totalAmount: Math.max(
      mix.totalAmount,
      tracks.reduce((sum, track) => sum + track.amount, 0)
    ),
    tracks,
  };
}

export function newRefinanceMixId(): string {
  return `refinance-mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * נתוני המיחזור לשמירה בתהליך. תהליך קיים שומר על מזהה התמהיל ועל הבחירה בין
 * פנימי לחיצוני — עריכה של התמהיל אינה מאפסת את ההחלטה שכבר התקבלה.
 */
export function refinanceMixDataFrom(
  payload: RefinanceSavePayload,
  existing: RefinanceMixData | null = null
): RefinanceMixData {
  const bank = payload.currentMix.bank ?? existing?.bank ?? '';
  const mixId = existing?.refinancedMix.id ?? newRefinanceMixId();
  return {
    bank,
    goal: payload.goal,
    scope: payload.scope,
    selectedTrackId: payload.selectedTrackId,
    currentMix: snapshotOf(
      payload.currentMix,
      existing?.currentMix.id ?? 'refinance-current',
      `המשכנתא הנוכחית${bank ? ` - ${bank}` : ''}`,
      payload.currentMix.tracks
    ),
    refinancedMix: snapshotOf(
      payload.refinancedMix,
      mixId,
      `תמהיל למיחזור${bank ? ` · ${bank}` : ''}`,
      payload.refinancedMix.tracks.map(refinancedTrack)
    ),
    current: refinanceFiguresOf(payload.baseCalc),
    refinanced: refinanceFiguresOf(payload.refinedCalc),
    mode: existing?.mode ?? null,
    savedAt: new Date().toISOString(),
  };
}

/** תמהיל "קלאסי" מתוך תמונת מצב שנשמרה — הקלט של כלי המיחזור */
export function mortgageMixOf(snapshot: RefinanceMixSnapshot, savedAt: string): MortgageMix {
  return {
    id: snapshot.id,
    name: snapshot.name,
    bank: (snapshot.bank ?? undefined) as MortgageMix['bank'],
    totalAmount: snapshot.totalAmount,
    tracks: snapshot.tracks,
    createdAt: new Date(savedAt),
  };
}

/** התמהיל למיחזור כתמהיל של כלי התכנון — לתמהילים השמורים ולבקשת הצעת המחיר */
export function refinanceWorkspaceMix(refinance: RefinanceMixData): WorkspaceMix {
  const mix = toWorkspaceMix(mortgageMixOf(refinance.refinancedMix, refinance.savedAt));
  return { ...mix, id: refinance.refinancedMix.id, name: refinance.refinancedMix.name };
}

/** ערכי הפתיחה של הכלי מתוך מה שנשמר — כדי לפתוח תמהיל נבחר לעריכה */
export function draftStateOf(refinance: RefinanceMixData): RefinanceDraftState {
  return {
    goal: refinance.goal,
    scope: refinance.scope,
    selectedTrackId: refinance.selectedTrackId,
    refinancedTracks: refinance.refinancedMix.tracks,
  };
}

export function planHrefOf(plan: Pick<PlanView, 'id'>): string {
  return `/dashboard/plans/${plan.id}`;
}

/** שמירה ראשונה מכלי המיחזור: פותחת תהליך מיחזור באזור האישי */
export async function saveRefinanceAsNewPlan(payload: RefinanceSavePayload): Promise<RefinanceSaveOutcome> {
  const refinance = refinanceMixDataFrom(payload);
  const mix = refinanceWorkspaceMix(refinance);
  const plan = await createRefinancePlan(refinance, mix);
  return { planId: plan.id, href: planHrefOf(plan), mix };
}
