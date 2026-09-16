import { describe, expect, it } from 'vitest';
import {
  EMPTY_AGENDA_INPUT,
  buildCalendarEvents,
  buildClientTasks,
  daysUntil,
  planCreatedLabel,
  planHeadline,
  summarizePlan,
  upcomingEvents,
} from './client-agenda';
import type { AgendaPlan } from './client-agenda';
import { PLAN_STAGES, emptyPlanData } from './mortgage-plan';
import type { AdvisorMeetingView } from './advisor-crm';

const NOW = new Date('2026-09-14T09:00:00');

function plan(overrides: Partial<AgendaPlan> = {}): AgendaPlan {
  return {
    id: 'p1',
    name: 'המשכנתא שלי',
    createdAt: '2026-09-10T08:30:00.000Z',
    status: 'IN_PROGRESS',
    currentStage: 'ANALYSIS',
    propertyAddress: 'הרצל 5, תל אביב',
    propertyValue: 2_000_000,
    mortgageAmount: 1_400_000,
    stages: PLAN_STAGES.map((stage) => ({ stage, status: 'PENDING' as const })),
    data: emptyPlanData(),
    ...overrides,
  };
}

function meeting(overrides: Partial<AdvisorMeetingView> = {}): AdvisorMeetingView {
  return {
    id: 'm1',
    clientId: 'c1',
    clientName: 'ישראל',
    clientEmail: 'a@b.c',
    advisorName: 'דנה',
    stage: 'MIX',
    title: 'פגישת תמהיל',
    startsAt: '2026-09-16T10:00:00',
    durationMinutes: 45,
    location: null,
    note: null,
    status: 'PROPOSED',
    respondedAt: null,
    ...overrides,
  };
}

describe('סדר היום של הלקוח', () => {
  it('פגישה שממתינה לאישור היא המשימה הדחופה הראשונה', () => {
    const tasks = buildClientTasks(
      { ...EMPTY_AGENDA_INPUT, plans: [plan()], meetings: [meeting()] },
      NOW
    );
    expect(tasks[0].id).toBe('meeting:m1');
    expect(tasks[0].tone).toBe('urgent');
    // פגישה מאושרת כבר לא דורשת פעולה
    const confirmed = buildClientTasks(
      { ...EMPTY_AGENDA_INPUT, meetings: [meeting({ status: 'CONFIRMED' })] },
      NOW
    );
    expect(confirmed.some((task) => task.id === 'meeting:m1')).toBe(false);
  });

  it('תהליך פתוח מקבל משימת "המשיכו" בשלב הנוכחי, ותהליך שהושלם לא', () => {
    const tasks = buildClientTasks(
      { ...EMPTY_AGENDA_INPUT, plans: [plan({ currentStage: 'MIX' }), plan({ id: 'p2', status: 'COMPLETED' })] },
      NOW
    );
    const continues = tasks.filter((task) => task.id.startsWith('continue:'));
    expect(continues).toHaveLength(1);
    expect(continues[0].title).toContain('שלב 2');
    expect(continues[0].target).toEqual({ kind: 'href', href: '/dashboard/plans/p1' });
  });

  it('פרטי נכס חסרים הופכים למשימה שמובילה לתהליך עצמו', () => {
    const tasks = buildClientTasks(
      { ...EMPTY_AGENDA_INPUT, plans: [plan({ propertyValue: null })] },
      NOW
    );
    expect(tasks.find((task) => task.id === 'deal:p1')?.target).toEqual({
      kind: 'href',
      href: '/dashboard/plans/p1',
    });
  });

  it('כשהיועץ מטפל בשלב — אין משימת "המשיכו", יש רק עדכון', () => {
    const tasks = buildClientTasks(
      { ...EMPTY_AGENDA_INPUT, plans: [plan({ currentStage: 'AUCTION' })], advisorStages: { p1: ['AUCTION'] } },
      NOW
    );
    expect(tasks.some((task) => task.id.startsWith('continue:'))).toBe(false);
    expect(tasks.find((task) => task.id === 'advisor:p1:AUCTION')?.tone).toBe('info');
  });

  it('אישור עקרוני שפג בקרוב הוא דחוף, ומופיע גם בלוח השנה', () => {
    const data = emptyPlanData();
    data.APPLICATIONS.approved = true;
    data.APPLICATIONS.validUntil = '2026-09-20T00:00:00';
    const input = { ...EMPTY_AGENDA_INPUT, plans: [plan({ currentStage: 'AUCTION', data })] };

    const tasks = buildClientTasks(input, NOW);
    expect(tasks[0].id).toBe('approval-expiring:p1');
    expect(tasks[0].title).toContain('6 ימים');

    const events = buildCalendarEvents(input);
    expect(events.map((event) => event.kind)).toEqual(['deadline']);
    expect(upcomingEvents(events, NOW)).toHaveLength(1);
  });

  it('בקשת ריביות בלי הצעות ותמהילים ללא שיוך הופכים למשימות', () => {
    const tasks = buildClientTasks(
      {
        ...EMPTY_AGENDA_INPUT,
        rateRequests: [
          { id: 'r1', mixName: 'תמהיל א', bankName: 'לאומי', offers: 0 },
          { id: 'r2', mixName: 'תמהיל ב', bankName: null, offers: 2 },
        ],
        unassignedMixes: 2,
      },
      NOW
    );
    expect(tasks.map((task) => task.id)).toEqual(['rate-request:r1', 'unassigned-mixes']);
  });

  it('לוח השנה מכיל רק פגישות חיות, ממוינות לפי מועד', () => {
    const events = buildCalendarEvents({
      ...EMPTY_AGENDA_INPUT,
      meetings: [
        meeting({ id: 'late', startsAt: '2026-09-20T10:00:00', status: 'CONFIRMED' }),
        meeting({ id: 'cancelled', status: 'CANCELLED' }),
        meeting({ id: 'early', startsAt: '2026-09-15T10:00:00' }),
      ],
    });
    expect(events.map((event) => event.id)).toEqual(['meeting:early', 'meeting:late']);
    expect(events[1].confirmed).toBe(true);
  });

  it('daysUntil סופר ימים שלמים, ו-summarizePlan סופר שלבים שהושלמו', () => {
    expect(daysUntil('2026-09-16T23:00:00', NOW)).toBe(2);
    expect(daysUntil('2026-09-13T01:00:00', NOW)).toBe(-1);

    expect(planHeadline(plan())).toBe('הרצל 5, תל אביב · משכנתא ₪1,400,000');
    expect(planHeadline(plan({ propertyAddress: null }))).toBe('משכנתא ₪1,400,000');
    expect(planHeadline(plan({ propertyAddress: null, mortgageAmount: null }))).toBe('המשכנתא שלי');
    expect(planCreatedLabel('2026-09-10T08:30:00.000Z')).toContain('נפתח ב-');
    expect(planCreatedLabel('not-a-date')).toBe('');

    const summary = summarizePlan(
      plan({
        currentStage: 'APPLICATIONS',
        stages: [
          { stage: 'ANALYSIS', status: 'COMPLETED' },
          { stage: 'MIX', status: 'COMPLETED' },
          { stage: 'APPLICATIONS', status: 'IN_PROGRESS' },
        ],
      }),
      ['APPLICATIONS']
    );
    expect(summary.completedStages).toBe(2);
    expect(summary.stageNumber).toBe(3);
    expect(summary.stages).toEqual(['COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'PENDING', 'PENDING']);
    expect(summary.advisorStage).toBe(true);
  });
});
