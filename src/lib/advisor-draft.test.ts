import { describe, expect, it } from 'vitest';
import {
  applyDraft,
  changedPaths,
  clientChangedPaths,
  emptyDraft,
  parseDraft,
  pendingPaths,
  recordEdit,
} from './advisor-draft';

const client = {
  income: 10000,
  screen: 'overview',
  profileScreen: 'overview',
  checklist: { appraisal: false, insurance: false },
  loans: [{ amount: 1 }],
};

describe('advisor draft', () => {
  it('finds changed leaf paths, with lists as one field', () => {
    expect(
      changedPaths(client, { ...client, income: 12000, checklist: { appraisal: true, insurance: false }, loans: [] })
    ).toEqual(['income', 'checklist.appraisal', 'loans']);
  });

  it('records an advisor edit without touching what the client sees', () => {
    const shown = applyDraft(client, null);
    const draft = recordEdit('ANALYSIS', emptyDraft(), client, shown, { ...shown, income: 15000 });
    expect(pendingPaths(draft)).toEqual(['income']);
    expect(draft.base.income).toBe(10000);
    expect(applyDraft(client, draft).income).toBe(15000);
    expect(client.income).toBe(10000);
  });

  it('keeps the client value in every field the advisor did not touch', () => {
    const shown = applyDraft(client, null);
    const draft = recordEdit('SIGNING', emptyDraft(), client, shown, {
      ...shown,
      checklist: { ...shown.checklist, appraisal: true },
    });
    const clientLater = { ...client, income: 9000, checklist: { appraisal: false, insurance: true } };
    expect(applyDraft(clientLater, draft)).toMatchObject({
      income: 9000,
      checklist: { appraisal: true, insurance: true },
    });
  });

  it('drops a field the advisor set back to the client value', () => {
    const shown = applyDraft(client, null);
    const first = recordEdit('ANALYSIS', emptyDraft(), client, shown, { ...shown, income: 15000 });
    const shown2 = applyDraft(client, first);
    const second = recordEdit('ANALYSIS', first, client, shown2, { ...shown2, income: 10000 });
    expect(pendingPaths(second)).toEqual([]);
  });

  it('never broadcasts moving between inner screens', () => {
    const shown = applyDraft(client, null);
    expect(pendingPaths(recordEdit('ANALYSIS', emptyDraft(), client, shown, { ...shown, profileScreen: 'income' }))).toEqual([]);
    expect(pendingPaths(recordEdit('SIGNING', emptyDraft(), client, shown, { ...shown, screen: 'bank-file' }))).toEqual([]);
  });

  it('shows the advisor fields the client changed after the advisor started editing them', () => {
    const shown = applyDraft(client, null);
    const draft = recordEdit('ANALYSIS', emptyDraft(), client, shown, { ...shown, income: 15000 });
    expect(clientChangedPaths(draft, client)).toEqual([]);
    expect(clientChangedPaths(draft, { ...client, income: 11000 })).toEqual(['income']);
  });

  it('folds an inner edit into a field already recorded whole', () => {
    const shown = applyDraft(client, null);
    const whole = recordEdit('SIGNING', emptyDraft(), client, shown, { ...shown, loans: [{ amount: 2 }] });
    const shown2 = applyDraft(client, whole);
    const inner = recordEdit('SIGNING', whole, client, shown2, { ...shown2, loans: [{ amount: 3 }] });
    expect(inner.values).toEqual({ loans: [{ amount: 3 }] });
  });

  it('reads an empty stored draft as no draft', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft({ values: {}, base: {} })).toBeNull();
    expect(parseDraft({ values: { income: 1 }, base: { income: 0 }, updatedAt: 'x' })?.values).toEqual({ income: 1 });
  });
});
