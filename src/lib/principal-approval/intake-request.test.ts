import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/mortgage-plans', () => ({ createEmptyRefinancePlan: vi.fn() }));
vi.mock('@/lib/advisor-link', () => ({ ensureClientLinkSafely: vi.fn(), primaryAdvisor: vi.fn() }));
vi.mock('@/lib/clients', () => ({ syncStageDocuments: vi.fn() }));

import { contactFrom, parseIntakePayload, parseRequestKind } from './intake-request';

describe('הטופס שמגיע ממבקר שלא מחובר', () => {
  const payload = {
    caseValues: { refinanceGoal: 'fast-payoff', totalEquity: 500000, unknownField: 'x', dealType: 'not-a-deal' },
    entities: [
      { id: 'b1', type: 'borrower', parentId: null, values: { firstName: 'דנה', lastName: 'כהן', phone: '050-1234567', idNumber: '123' } },
      { id: 'i1', type: 'income', parentId: 'b1', values: { incomeType: 'salary', monthlyAmount: 14000 } },
      { id: 'p1', type: 'prevEmployment', parentId: 'i1', values: { employerName: 'א' } },
      { id: 'orphan', type: 'income', parentId: 'nope', values: { incomeType: 'rent' } },
      { id: 'a1', type: 'bankApproval', parentId: null, values: {} },
      { id: 'f1', type: 'fundingSource', parentId: null, values: { sourceType: 'savings', amount: 500000 } },
    ],
  };

  it('שומר רק ערכים תקינים ושדות מוכרים', () => {
    const parsed = parseIntakePayload(payload);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.payload.caseValues).toEqual({ refinanceGoal: 'fast-payoff', totalEquity: 500000 });
    const borrower = parsed.payload.entities.find((e) => e.id === 'b1')!;
    // ת"ז לא תקינה לא נשמרת
    expect(borrower.values.idNumber).toBeUndefined();
    expect(borrower.values.firstName).toBe('דנה');
  });

  it('זורק רשומות בלי הורה תקין ואישורים לפי בנק', () => {
    const parsed = parseIntakePayload(payload);
    if (!parsed.ok) throw new Error('parse failed');
    const ids = parsed.payload.entities.map((e) => e.id);
    expect(ids).toEqual(['b1', 'i1', 'p1', 'f1']);
  });

  it('מוציא שם ופרטי קשר מהלווה הראשון', () => {
    const parsed = parseIntakePayload(payload);
    if (!parsed.ok) throw new Error('parse failed');
    expect(contactFrom(parsed.payload)).toEqual({ name: 'דנה כהן', email: null, phone: '050-1234567' });
  });

  it('מקבל רק את שני סוגי הבקשות', () => {
    expect(parseRequestKind('TENDER')).toBe('TENDER');
    expect(parseRequestKind('REFINANCE_CHECK')).toBe('REFINANCE_CHECK');
    expect(parseRequestKind('OTHER')).toBeNull();
  });
});
