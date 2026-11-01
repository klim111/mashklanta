import { describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => {
  const count = vi.fn(async () => 0);
  const rows = (items: unknown[] = []) => ({ findMany: vi.fn(async () => items), count, deleteMany: vi.fn() });
  const db = {
    user: rows([
      {
        id: 'u-keep',
        name: 'ghasan  gleb',
        email: 'g@example.com',
        username: null,
        createdAt: new Date('2026-10-30'),
        advisedAs: [{ id: 'c-keep', name: 'GHASAN GLEB', email: 'g@example.com' }],
      },
      {
        id: 'u-test',
        name: 'בדיקה',
        email: 'test@example.com',
        username: null,
        createdAt: new Date('2026-09-01'),
        advisedAs: [{ id: 'c-test', name: 'בדיקה', email: 'test@example.com' }],
      },
    ]),
    advisorLead: rows([
      { id: 'l-keep', name: 'Ghasan Gleb', email: 'other@example.com', topic: 'ליווי', createdAt: new Date(), ownerId: null, clientId: null },
      { id: 'l-keep2', name: 'x', email: 'G@example.com', topic: 'ליווי', createdAt: new Date(), ownerId: null, clientId: null },
      { id: 'l-guest', name: 'אורח', email: 'guest@example.com', topic: 'שאלה', createdAt: new Date(), ownerId: null, clientId: null },
      { id: 'l-test', name: 'בדיקה', email: 'test@example.com', topic: 'שאלה', createdAt: new Date(), ownerId: 'u-test', clientId: 'c-test' },
    ]),
    advisorTask: rows([
      { id: 't-keep', title: 'משימה', stage: 'INTAKE', status: 'OPEN', createdAt: new Date(), clientId: 'c-keep' },
      { id: 't-general', title: 'כללית', stage: 'INTAKE', status: 'OPEN', createdAt: new Date(), clientId: null },
    ]),
    signupDraft: rows([]),
    pendingRegistration: rows([]),
    departedClient: rows([]),
    mortgagePlan: rows(),
    advisorServiceOrder: rows(),
    advisorMeeting: rows(),
    mortgageMix: rows(),
    planDocument: rows(),
    conversationMessage: rows(),
    platformPayment: rows(),
  };
  return { db };
});

vi.mock('./db', () => ({ prisma: db }));
vi.mock('./account-deletion', () => ({ deleteClientAccount: vi.fn() }));

import {
  buildCleanupPreview,
  isProtectedName,
  parseSelection,
  selectionToken,
  validateSelection,
} from './test-data-cleanup';

describe('זיהוי הלקוח שנשמר', () => {
  it('מזהה את GHASAN GLEB בלי תלות ברישיות, ברווחים ובסדר', () => {
    expect(isProtectedName('GHASAN GLEB')).toBe(true);
    expect(isProtectedName('  ghasan   gleb ')).toBe(true);
    expect(isProtectedName('Gleb Ghasan')).toBe(true);
    expect(isProtectedName('ghasan.gleb@gmail.com')).toBe(true);
    expect(isProtectedName('Gleb')).toBe(false);
    expect(isProtectedName(null, '')).toBe(false);
  });
});

describe('רשימת הניקוי', () => {
  it('משאירה את הלקוח, הפניות והמשימות שלו מחוץ לרשימת המחיקה', async () => {
    const preview = await buildCleanupPreview();
    expect(preview.protectedFound).toBe(true);
    expect(preview.keep.accounts.map((row) => row.userId)).toEqual(['u-keep']);
    expect(preview.accounts.map((row) => row.userId)).toEqual(['u-test']);
    expect(preview.keep.leads.map((row) => row.id).sort()).toEqual(['l-keep', 'l-keep2']);
    expect(preview.guestLeads.map((row) => row.id)).toEqual(['l-guest']);
    expect(preview.keep.tasks.map((row) => row.id)).toEqual(['t-keep']);
    expect(preview.generalTasks.map((row) => row.id)).toEqual(['t-general']);
  });

  it('מסרבת למחוק את הלקוח שנשמר גם אם נשלח בבקשה', async () => {
    const result = await validateSelection(parseSelection({ userIds: ['u-test', 'u-keep'] }));
    expect(result.ok).toBe(false);
    const leads = await validateSelection(parseSelection({ leadIds: ['l-keep'] }));
    expect(leads.ok).toBe(false);
  });

  it('מאשרת בחירה שכולה מתוך רשימת המחיקה', async () => {
    const result = await validateSelection(parseSelection({ userIds: ['u-test'], leadIds: ['l-guest'] }));
    expect(result.ok).toBe(true);
  });

  it('טביעת האצבע לא תלויה בסדר ומשתנה כשהבחירה משתנה', () => {
    const a = selectionToken(parseSelection({ userIds: ['b', 'a'] }));
    const b = selectionToken(parseSelection({ userIds: ['a', 'b'] }));
    const c = selectionToken(parseSelection({ userIds: ['a'] }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
