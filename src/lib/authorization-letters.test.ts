import { describe, expect, it } from 'vitest';
import {
  AUTHORIZATION_FORMS,
  AUTHORIZATION_TASK_KEY,
  authorizationBankSlug,
  authorizationDocumentKey,
  authorizationLettersHref,
  authorizationTaskSpec,
  isAuthorizationDocumentKey,
} from './authorization-letters';
import { buildCalendarEvents, buildClientTasks, EMPTY_AGENDA_INPUT } from './client-agenda';
import type { ClientTaskView } from './client-tasks';
import { PRE_APPROVAL_BANKS } from '@/components/plan/stages/preapproval/banks';

const NOW = new Date(2026, 8, 23, 14, 30);

describe('authorization letter keys', () => {
  it('keys each bank letter separately and reads the bank back', () => {
    const key = authorizationDocumentKey('leumi');
    expect(isAuthorizationDocumentKey(key)).toBe(true);
    expect(authorizationBankSlug(key)).toBe('leumi');
    expect(isAuthorizationDocumentKey('preapproval-leumi')).toBe(false);
    expect(authorizationBankSlug('b1:payslips')).toBeNull();
  });

  it('has a form slot for every bank in the approval-in-principle list', () => {
    expect(Object.keys(AUTHORIZATION_FORMS).sort()).toEqual(PRE_APPROVAL_BANKS.map((bank) => bank.slug).sort());
  });
});

describe('authorizationTaskSpec', () => {
  it('lands in the approval-in-principle stage three days out at ten', () => {
    const spec = authorizationTaskSpec('דנה', NOW);
    expect(spec.templateKey).toBe(AUTHORIZATION_TASK_KEY);
    expect(spec.stage).toBe('APPLICATIONS');
    expect(spec.details).toContain('היועץ דנה');
    expect(spec.dueAt).toEqual(new Date(2026, 8, 26, 10, 0, 0));
  });
});

describe('the advisor task in the client agenda', () => {
  const task: ClientTaskView = {
    id: 't1',
    planId: 'p1',
    stage: 'APPLICATIONS',
    kind: 'TASK',
    templateKey: AUTHORIZATION_TASK_KEY,
    title: 'חתמו על כתבי הסמכה ליועץ והעלו אותם',
    details: null,
    bank: null,
    dueAt: new Date(2026, 8, 26, 10).toISOString(),
    status: 'OPEN',
    documentId: null,
    completedAt: null,
    createdAt: NOW.toISOString(),
  };
  const input = { ...EMPTY_AGENDA_INPUT, clientTasks: [task] };

  it('opens the letters module from the task list and the calendar', () => {
    const tasks = buildClientTasks(input, NOW);
    const own = tasks.find((item) => item.id.endsWith('t1'));
    expect(own?.target).toEqual({ kind: 'href', href: authorizationLettersHref('p1') });
    expect(own?.hint).toContain('משימה מהיועץ');

    const event = buildCalendarEvents(input, tasks).find((item) => item.id.endsWith('t1'));
    expect(event?.target).toEqual({ kind: 'href', href: authorizationLettersHref('p1') });
  });
});
