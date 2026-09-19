import { describe, expect, it } from 'vitest';
import { EMPTY_AGENDA_INPUT, buildCalendarEvents, buildClientTasks, groupTasks } from './client-agenda';
import type { AgendaPlan } from './client-agenda';
import { PLAN_STAGES, emptyPlanData } from './mortgage-plan';

const NOW = new Date('2026-09-19T09:00:00');

function plan(): AgendaPlan {
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
  };
}

describe('מועדים שהלקוח קובע למשימות', () => {
  it('מועד שנקבע גובר על המועד הנגזר, ומשבץ את המשימה בלוח השנה', () => {
    const due = '2026-09-25T10:00:00.000Z';
    const input = {
      ...EMPTY_AGENDA_INPUT,
      plans: [plan()],
      taskStates: { 'continue:p1': { due, done: false } },
    };

    const tasks = buildClientTasks(input, NOW);
    const target = tasks.find((task) => task.id === 'continue:p1');
    expect(target?.due).toBe(due);
    expect(target?.scheduled).toBe(true);

    const events = buildCalendarEvents(input, tasks);
    expect(events.some((event) => event.id === 'task:continue:p1' && event.kind === 'task')).toBe(true);
  });

  it('משימה שסומנה כבוצעה יורדת מהרשימה', () => {
    const tasks = buildClientTasks(
      {
        ...EMPTY_AGENDA_INPUT,
        plans: [plan()],
        taskStates: { 'continue:p1': { due: null, done: true } },
      },
      NOW
    );
    expect(tasks.some((task) => task.id === 'continue:p1')).toBe(false);
  });

  it('המשימות מתחלקות למועד שעבר, מועד עתידי וללא תאריך', () => {
    /** תהליך בלי פרטי עסקה מייצר גם את משימת "השלימו את פרטי הנכס" */
    const partial = plan();
    partial.propertyValue = null;

    const tasks = buildClientTasks(
      {
        ...EMPTY_AGENDA_INPUT,
        plans: [partial],
        taskStates: {
          'continue:p1': { due: '2026-09-15T10:00:00.000Z', done: false },
          'deal:p1': { due: '2026-09-25T10:00:00.000Z', done: false },
        },
      },
      NOW
    );

    const groups = groupTasks(tasks, NOW);
    expect(groups.overdue.map((task) => task.id)).toContain('continue:p1');
    expect(groups.scheduled.map((task) => task.id)).toContain('deal:p1');
    expect(groups.undated.every((task) => task.due === null)).toBe(true);
  });
});

describe('משימת המסמכים לחתימה', () => {
  it('נפתחת ללא תאריך ברגע שהוגדרה בעלות הנכס', () => {
    const withOwnership = plan();
    withOwnership.data.SIGNING = {
      ...withOwnership.data.SIGNING,
      dealTypeId: 'self_build',
      scenarioId: 'build_tabu',
    };

    const tasks = buildClientTasks(
      { ...EMPTY_AGENDA_INPUT, plans: [withOwnership] },
      NOW
    );
    const task = tasks.find((item) => item.id === 'signing-documents:p1');
    expect(task).toBeTruthy();
    expect(task?.due).toBeNull();
    expect(task?.stage).toBe('SIGNING');

    // בלי הגדרת בעלות אין משימה כזו
    expect(
      buildClientTasks({ ...EMPTY_AGENDA_INPUT, plans: [plan()] }, NOW).some(
        (item) => item.id === 'signing-documents:p1'
      )
    ).toBe(false);
  });
});
