/**
 * תהליך ההדגמה של הסיור בכלי.
 *
 * הסיור רץ על תהליך שחי בדפדפן בלבד: הוא אינו נשמר ואינו נטען, אבל הוא מלא
 * מספיק כדי שכל שלב ייראה כמו אצל לקוח אמיתי — פרופיל פיננסי, תמהיל סופי
 * לדוגמה, אישורים עקרוניים משלושה בנקים, ומכרז שאפשר להזין בו ריביות.
 *
 * הקובץ טהור — בלי React ובלי Prisma — ומשמש את שלושת המקורות שהכלי קורא
 * מהם: התהליך עצמו, התמהילים השמורים ותיק המסמכים.
 */

import { computeMix, createWorkspaceMix, createTrack } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import type { SavedMix } from '@/components/mortgage-advisor/mixRecord';
import { buildQuotedMix } from '@/components/mortgage-advisor/bankQuote/quote';
import type { MortgageBank } from '@/components/mortgage-advisor/types';
import { emptyPlanData } from './mortgage-plan';
import type { PlanData } from './mortgage-plan';
import type { PlanDocumentView } from './plan-documents';
import { PRE_APPROVAL_BANKS, preApprovalDocumentKey } from '@/components/plan/stages/preapproval/banks';

export const DEMO_PLAN_ID = 'demo';

export function isDemoPlan(planId: string | null | undefined): boolean {
  return planId === DEMO_PLAN_ID;
}

export const DEMO_MIX_ID = 'demo-mix';
export const DEMO_ADDRESS = 'רחוב הדוגמה 12, תל אביב';
export const DEMO_PROPERTY_VALUE = 2_100_000;
export const DEMO_MORTGAGE = 1_500_000;

/** הבנקים שכבר "אישרו" בתהליך ההדגמה — אלה שנפתחים לתמחור בשלב המכרז */
export const DEMO_APPROVED_SLUGS = ['leumi', 'hapoalim', 'mizrahi'] as const;

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/** התמהיל הסופי לדוגמה — שלושה מסלולים, כמו תמהיל טיפוסי */
export function demoMix(): WorkspaceMix {
  return createWorkspaceMix({
    id: DEMO_MIX_ID,
    name: 'התמהיל לדוגמה',
    totalAmount: DEMO_MORTGAGE,
    propertyValue: DEMO_PROPERTY_VALUE,
    propertyAddress: DEMO_ADDRESS,
    dealType: 'first_home',
    locked: true,
    tracks: [
      createTrack({ type: 'fixed_unlinked', amount: DEMO_MORTGAGE * 0.4, years: 25, interestRate: 4.9 }),
      createTrack({ type: 'prime', amount: DEMO_MORTGAGE * 0.35, years: 25, interestRate: 5.4 }),
      createTrack({
        type: 'variable_unlinked',
        amount: DEMO_MORTGAGE * 0.25,
        years: 20,
        interestRate: 4.6,
        variablePeriod: 5,
      }),
    ],
  });
}

export function demoSavedMix(): SavedMix {
  const mix = demoMix();
  const now = new Date().toISOString();
  return {
    recordId: 'demo-mix-record',
    mix,
    summary: computeMix(mix).summary,
    savedAt: now,
    planId: DEMO_PLAN_ID,
    planAddress: DEMO_ADDRESS,
    isFinal: true,
    locked: true,
    sharedWithClient: true,
  };
}

/** הצעות הריבית של שלושת הבנקים על התמהיל הסופי — כך שלב המכרז מציג השוואה */
export function demoPricedMixes(): SavedMix[] {
  const source = demoSavedMix().mix;
  const offers: Array<{ bank: MortgageBank; days: number; rates: [number, number, number] }> = [
    { bank: 'לאומי', days: -4, rates: [4.85, 5.35, 4.55] },
    { bank: 'הפועלים', days: -3, rates: [4.7, 5.25, 4.45] },
    { bank: 'מזרחי', days: -2, rates: [4.55, 5.15, 4.3] },
  ];
  return offers.map(({ bank, days, rates }, index) => {
    const mix = buildQuotedMix({
      source,
      bank,
      receivedAt: daysFromNow(days),
      rates: Object.fromEntries(source.tracks.map((track, i) => [track.id, rates[i]])),
    });
    return {
      recordId: `demo-priced-${index}`,
      mix,
      summary: computeMix(mix).summary,
      savedAt: daysFromNow(days),
      planId: DEMO_PLAN_ID,
      planAddress: DEMO_ADDRESS,
      isFinal: false,
      locked: false,
      sharedWithClient: true,
    };
  });
}

/** האישורים העקרוניים לדוגמה, כקבצים בתיק המסמכים — כך שלב 3 מציג אותם */
export function demoDocuments(): PlanDocumentView[] {
  return PRE_APPROVAL_BANKS.filter((info) =>
    (DEMO_APPROVED_SLUGS as readonly string[]).includes(info.slug)
  ).map((info, index) => ({
    id: `demo-doc-${info.slug}`,
    planId: DEMO_PLAN_ID,
    key: preApprovalDocumentKey(info.slug),
    name: `אישור עקרוני · ${info.bank}`,
    fileName: `אישור-עקרוני-${info.bank}.pdf`,
    contentType: 'application/pdf',
    size: 180_000 + index * 20_000,
    uploadedAt: daysFromNow(-(5 - index)),
  }));
}

/** נתוני חמשת השלבים של תהליך ההדגמה */
export function demoPlanData(): PlanData {
  const data = emptyPlanData();
  const saved = demoSavedMix();
  const approved = PRE_APPROVAL_BANKS.filter((info) =>
    (DEMO_APPROVED_SLUGS as readonly string[]).includes(info.slug)
  );

  data.ANALYSIS = {
    ...data.ANALYSIS,
    intent: 'HAS_PROPERTY',
    profileScreen: 'overview',
    household: 'COUPLE',
    bankAccountMode: 'JOINT',
    age: 34,
    partnerAge: 33,
    income: 18_000,
    partnerIncome: 14_000,
    employmentType: 'SALARIED',
    partnerEmploymentType: 'SALARIED',
    expenses: 9_000,
    equity: DEMO_PROPERTY_VALUE - DEMO_MORTGAGE,
    dealType: 'first_home',
    propertyValue: DEMO_PROPERTY_VALUE,
    mortgageAmount: DEMO_MORTGAGE,
    propertyAddress: DEMO_ADDRESS,
    years: 25,
    primaryBank: 'לאומי',
  };

  data.MIX = {
    ...data.MIX,
    mixRecordId: saved.recordId ?? null,
    mixKey: DEMO_MIX_ID,
    mixName: saved.mix.name,
    totalAmount: saved.mix.totalAmount,
    monthlyPayment: saved.summary.monthlyPayment,
    averageRate: saved.summary.averageRate,
    totalInterest: saved.summary.totalInterest,
    totalPaid: saved.summary.totalPaid,
    months: saved.summary.months,
    propertyAddress: DEMO_ADDRESS,
    propertyValue: DEMO_PROPERTY_VALUE,
    isFinal: true,
    finalLocked: true,
  };

  data.APPLICATIONS = {
    ...data.APPLICATIONS,
    bank: approved[0]?.bank ?? null,
    submittedAt: daysFromNow(-9),
    approved: true,
    approvedAmount: DEMO_MORTGAGE,
    validUntil: daysFromNow(60),
    bankApprovals: approved.map((info, index) => ({
      bank: info.bank,
      submittedAt: daysFromNow(-9 + index),
      approved: true,
      approvedAt: daysFromNow(-(5 - index)),
      approvedAmount: DEMO_MORTGAGE,
      documentName: `אישור-עקרוני-${info.bank}.pdf`,
      note: '',
    })),
  };

  data.AUCTION = { ...data.AUCTION, mode: 'self' };

  return data;
}

// ───────────────────────────── תהליך מיחזור לדוגמה ─────────────────────────────

/** תהליך מיחזור לדוגמה — לצד המשכנתא החדשה, כדי שההדגמה תראה גם תהליך מיחזור */
export const DEMO_REFINANCE_PLAN_ID = 'demo-refi';
export const DEMO_REFINANCE_ADDRESS = 'רחוב הדקל 8, רמת גן';
export const DEMO_REFINANCE_AMOUNT = 980_000;

function refinanceSnapshot(id: string, name: string, tracks: ReturnType<typeof createTrack>[]) {
  const mix = createWorkspaceMix({ id, name, totalAmount: DEMO_REFINANCE_AMOUNT, tracks });
  const summary = computeMix(mix).summary;
  return {
    snapshot: { id, name, bank: 'בנק לאומי', totalAmount: DEMO_REFINANCE_AMOUNT, tracks },
    figures: {
      monthlyPayment: summary.monthlyPayment,
      totalInterest: summary.totalInterest,
      totalPaid: summary.totalPaid,
      averageRate: summary.averageRate,
      months: summary.months,
    },
  };
}

/** נתוני תהליך המיחזור לדוגמה: המשכנתא הנוכחית, התמהיל למיחזור, ומיחזור חיצוני */
export function demoRefinancePlanData(): PlanData {
  const data = emptyPlanData();
  const current = refinanceSnapshot('demo-refi-current', 'המשכנתא הנוכחית - בנק לאומי', [
    createTrack({ type: 'fixed_unlinked', amount: DEMO_REFINANCE_AMOUNT * 0.5, years: 22, interestRate: 5.9 }),
    createTrack({ type: 'prime', amount: DEMO_REFINANCE_AMOUNT * 0.5, years: 22, interestRate: 6.1 }),
  ]);
  const refinanced = refinanceSnapshot('demo-refi-mix', 'תמהיל למיחזור · בנק לאומי', [
    createTrack({ type: 'fixed_unlinked', amount: DEMO_REFINANCE_AMOUNT * 0.5, years: 25, interestRate: 4.7 }),
    createTrack({ type: 'prime', amount: DEMO_REFINANCE_AMOUNT * 0.5, years: 25, interestRate: 5.2 }),
  ]);

  data.ANALYSIS = {
    ...data.ANALYSIS,
    household: 'COUPLE',
    bankAccountMode: 'JOINT',
    age: 41,
    partnerAge: 39,
    income: 21_000,
    partnerIncome: 15_000,
    employmentType: 'SALARIED',
    partnerEmploymentType: 'SALARIED',
    expenses: 10_000,
    propertyAddress: DEMO_REFINANCE_ADDRESS,
    mortgageAmount: DEMO_REFINANCE_AMOUNT,
    years: 25,
    primaryBank: 'לאומי',
  };

  data.MIX = {
    ...data.MIX,
    mixKey: refinanced.snapshot.id,
    mixName: refinanced.snapshot.name,
    totalAmount: DEMO_REFINANCE_AMOUNT,
    monthlyPayment: refinanced.figures.monthlyPayment,
    averageRate: refinanced.figures.averageRate,
    totalInterest: refinanced.figures.totalInterest,
    totalPaid: refinanced.figures.totalPaid,
    months: refinanced.figures.months,
    propertyAddress: DEMO_REFINANCE_ADDRESS,
    isFinal: true,
    finalLocked: true,
    refinance: {
      bank: 'בנק לאומי',
      goal: 'reduce_payment',
      scope: 'whole',
      selectedTrackId: null,
      currentMix: current.snapshot,
      refinancedMix: refinanced.snapshot,
      current: current.figures,
      refinanced: refinanced.figures,
      mode: 'EXTERNAL',
      savedAt: daysFromNow(-12),
    },
  };

  return data;
}
