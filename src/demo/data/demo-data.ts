/**
 * הנתונים הפיקטיביים של מצב ההדגמה — במקום אחד.
 *
 * כל מה שההדגמות מקלידות, מציגות ומחזירות מ"השרת" מוגדר כאן: הפרסונה, ערכי
 * המחשבונים, המשימות, הפגישות, ההערות, התמהילים והפרופיל. שינוי כאן משנה את
 * כל ההדגמות בבת אחת, ואף ערך כאן אינו שייך ללקוח אמיתי.
 *
 * הקובץ טהור (בלי React), כדי שגם הבדיקות וגם השרת המדומה יוכלו לקרוא ממנו.
 */

import { computeMix, createTrack, createWorkspaceMix } from '@/components/mortgage-advisor/engine';
import type { SavedMix } from '@/components/mortgage-advisor/mixRecord';
import type { ClientTaskView } from '@/lib/client-tasks';
import type { AdvisorMeetingView, AdvisorNoteView } from '@/lib/advisor-crm';
import type { ClientProfile } from '@/lib/client-profile';
import { emptyClientProfile } from '@/lib/client-profile';
import {
  DEMO_ADDRESS,
  DEMO_MORTGAGE,
  DEMO_PLAN_ID,
  DEMO_PROPERTY_VALUE,
  demoPlanData,
  demoSavedMix,
} from '@/lib/demo-plan';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';

export { DEMO_PLAN_ID, DEMO_ADDRESS, DEMO_MORTGAGE, DEMO_PROPERTY_VALUE };

import { DEMO_PERSONA, demoSession } from './demo-session';

export { DEMO_PERSONA, demoSession };

/** ערכי המחשבונים שההדגמות מקלידות — ניתנים לדריסה בהתנסות */
export const DEMO_INPUTS = {
  /** "מה אני יכול להרשות לעצמי" */
  affordability: {
    ownCapital: 700_000,
    age: 34,
    monthlyIncome: 25_000,
    years: 30,
  },
  /** תכנון הון עצמי */
  equity: {
    propertyPrice: 2_100_000,
    financingProfile: 'first-home',
  },
  /** מיחזור */
  refinance: {
    bank: 'בנק לאומי',
    totalAmount: 1_180_000,
  },
  /** דשבורד — משימה ופגישה שההדגמה מוסיפה */
  dashboard: {
    taskTitle: 'להביא תלושי שכר של 3 חודשים',
    meetingTitle: 'פגישה עם היועץ — סיכום התמהיל',
  },
} as const;

function daysFromNow(days: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** תמהיל שני — חלופה שמרנית יותר, להשוואה מול התמהיל לדוגמה */
export function demoAlternativeMix(): SavedMix {
  const mix = createWorkspaceMix({
    id: 'demo-mix-alt',
    name: 'חלופה — יותר קבועה',
    totalAmount: DEMO_MORTGAGE,
    propertyValue: DEMO_PROPERTY_VALUE,
    propertyAddress: DEMO_ADDRESS,
    dealType: 'first_home',
    tracks: [
      createTrack({ type: 'fixed_unlinked', amount: DEMO_MORTGAGE * 0.6, years: 25, interestRate: 5.05 }),
      createTrack({ type: 'prime', amount: DEMO_MORTGAGE * 0.4, years: 25, interestRate: 5.4 }),
    ],
  });
  const now = new Date().toISOString();
  return {
    recordId: 'demo-mix-alt-record',
    mix,
    summary: computeMix(mix).summary,
    savedAt: now,
    planId: DEMO_PLAN_ID,
    planAddress: DEMO_ADDRESS,
    isFinal: false,
    locked: false,
    sharedWithClient: true,
  };
}

export function demoMixes(): SavedMix[] {
  return [demoSavedMix(), demoAlternativeMix()];
}

export function demoMeetings(): AdvisorMeetingView[] {
  return [
    {
      id: 'demo-meeting-1',
      clientId: DEMO_PERSONA.id,
      clientName: DEMO_PERSONA.name,
      clientEmail: DEMO_PERSONA.email,
      advisorName: DEMO_PERSONA.advisorName,
      stage: 'MIX',
      title: 'סקירת התמהיל המומלץ',
      startsAt: daysFromNow(2, 11),
      durationMinutes: 45,
      location: 'שיחת וידאו בפלטפורמה',
      note: 'נעבור יחד על שלושת המסלולים ועל רגישות ההחזר לעליית ריבית.',
      status: 'PROPOSED',
      respondedAt: null,
    },
    {
      id: 'demo-meeting-2',
      clientId: DEMO_PERSONA.id,
      clientName: DEMO_PERSONA.name,
      clientEmail: DEMO_PERSONA.email,
      advisorName: DEMO_PERSONA.advisorName,
      stage: 'ANALYSIS',
      title: 'שיחת היכרות',
      startsAt: daysFromNow(-6, 16),
      durationMinutes: 30,
      location: 'טלפון',
      note: null,
      status: 'CONFIRMED',
      respondedAt: daysFromNow(-7),
    },
  ];
}

export function demoNotes(): AdvisorNoteView[] {
  return [
    {
      id: 'demo-note-1',
      clientId: DEMO_PERSONA.id,
      stage: 'APPLICATIONS',
      body: 'שלושת האישורים העקרוניים התקבלו. בשלב הבא נבקש תמחור על התמהיל הסופי מכל בנק.',
      visibility: 'SHARED',
      advisorName: DEMO_PERSONA.advisorName,
      createdAt: daysFromNow(-3),
    },
  ] as AdvisorNoteView[];
}

export function demoClientTasks(): ClientTaskView[] {
  return [
    {
      id: 'demo-task-1',
      planId: DEMO_PLAN_ID,
      stage: 'APPLICATIONS',
      kind: 'DOCUMENT',
      templateKey: null,
      title: 'תדפיס עו״ש 3 חודשים אחרונים',
      details: 'מהחשבון המשותף',
      bank: null,
      dueAt: daysFromNow(3, 18),
      status: 'OPEN',
      documentId: null,
      completedAt: null,
      createdAt: daysFromNow(-4),
    },
    {
      id: 'demo-task-2',
      planId: DEMO_PLAN_ID,
      stage: 'AUCTION',
      kind: 'TASK',
      templateKey: null,
      title: 'לשלוח את התמהיל הסופי לבנק מזרחי',
      details: null,
      bank: 'מזרחי טפחות',
      dueAt: daysFromNow(5, 12),
      status: 'OPEN',
      documentId: null,
      completedAt: null,
      createdAt: daysFromNow(-2),
    },
    {
      id: 'demo-task-3',
      planId: DEMO_PLAN_ID,
      stage: 'ANALYSIS',
      kind: 'TASK',
      templateKey: null,
      title: 'לאשר את הפרופיל הפיננסי',
      details: null,
      bank: null,
      dueAt: daysFromNow(-1, 9),
      status: 'DONE',
      documentId: null,
      completedAt: daysFromNow(-1),
      createdAt: daysFromNow(-8),
    },
  ] as ClientTaskView[];
}

export function demoProfile(): ClientProfile {
  const analysis = demoPlanData().ANALYSIS;
  return {
    ...emptyClientProfile(),
    household: analysis.household,
    bankAccountMode: analysis.bankAccountMode,
    age: analysis.age,
    partnerAge: analysis.partnerAge,
    income: analysis.income,
    partnerIncome: analysis.partnerIncome,
    employmentType: analysis.employmentType,
    partnerEmploymentType: analysis.partnerEmploymentType,
    expenses: analysis.expenses,
    equity: analysis.equity,
    primaryBank: analysis.primaryBank,
    years: analysis.years,
    name: DEMO_PERSONA.name,
    email: DEMO_PERSONA.email,
    username: DEMO_PERSONA.username,
  };
}

export function demoPlatformAccess() {
  return {
    active: true,
    since: daysFromNow(-20),
    paid: PLATFORM_PROCESS_PRICE,
    price: PLATFORM_PROCESS_PRICE,
    accessDays: PLATFORM_ACCESS_DAYS,
    passExpiresAt: daysFromNow(15),
  };
}
