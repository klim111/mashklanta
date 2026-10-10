import { describe, expect, it } from 'vitest';
import {
  carriedApproval,
  compareRatesByTrack,
  toApprovalSummary,
  toPreApprovalData,
  type ApprovalSummary,
} from '@/lib/principal-approval/plan-bridge';
import { emptyStageData } from '@/lib/mortgage-plan';
import { addDays, addMonths, daysUntil } from '@/lib/principal-approval/format';
import {
  APPROVAL_RATES_VALIDITY_DAYS,
  APPROVAL_VALIDITY_MONTHS,
  getFieldDef,
  isFieldRequired,
  isFieldVisible,
} from '@/lib/principal-approval/schema';
import { validateValue } from '@/lib/principal-approval/validation';

const approval = (over: Partial<ApprovalSummary> = {}): ApprovalSummary => ({
  entityId: 'e1',
  bankName: 'לאומי',
  submittedAt: '2026-01-05',
  bankerName: 'דנה',
  approved: true,
  approvedAt: '2026-01-20',
  approvedAmount: 1_200_000,
  basketRates: { fixed: { fixed_unlinked: 4.5 } },
  ...over,
});

describe('automatic validity dates', () => {
  it('gives an approval three months and its rates 24 days', () => {
    expect(addMonths('2026-01-20', APPROVAL_VALIDITY_MONTHS)).toBe('2026-04-20');
    expect(addDays('2026-01-20', APPROVAL_RATES_VALIDITY_DAYS)).toBe('2026-02-13');
  });

  it('clamps to the end of a shorter month', () => {
    expect(addMonths('2026-01-31', 3)).toBe('2026-04-30');
    expect(addMonths('2025-11-30', 3)).toBe('2026-02-28');
  });

  it('crosses a year boundary', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addDays('2026-12-25', 24)).toBe('2027-01-18');
  });

  it('counts the days left, negative once expired', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    expect(daysUntil('2026-02-13', now)).toBe(12);
    expect(daysUntil('2026-01-20', now)).toBe(-12);
  });

  it('never asks for the validity — there is no such field', () => {
    expect(getFieldDef('bankApproval', 'validUntil')).toBeUndefined();
    expect(getFieldDef('bankApproval', 'ratesValidUntil')).toBeUndefined();
    expect(getFieldDef('bankApproval', 'approvedAt')).toBeDefined();
  });
});

describe('approval fields', () => {
  it('asks for the amount and rates only once the approval arrived', () => {
    const amount = getFieldDef('bankApproval', 'approvedAmount')!;
    const rates = getFieldDef('bankApproval', 'basketRates')!;
    expect(isFieldVisible(amount, { approved: false })).toBe(false);
    expect(isFieldVisible(amount, { approved: true })).toBe(true);
    expect(isFieldRequired(amount, { approved: true })).toBe(true);
    expect(isFieldVisible(rates, { approved: true })).toBe(true);
  });

  it('keeps the approved amount encrypted at rest', () => {
    expect(getFieldDef('bankApproval', 'approvedAmount')!.sensitive).toBe(true);
  });

  it('rejects an impossible rate', () => {
    const rates = getFieldDef('bankApproval', 'basketRates')!;
    expect(validateValue(rates, { fixed: { fixed_unlinked: 4.5 } }).valid).toBe(true);
    expect(validateValue(rates, { fixed: { fixed_unlinked: 45 } }).valid).toBe(false);
    expect(validateValue(rates, { fixed: { fixed_unlinked: -1 } }).valid).toBe(false);
  });
});

describe('reading an approval entity', () => {
  it('keeps only rates that belong to the basket', () => {
    const summary = toApprovalSummary('e1', {
      bankName: 'מזרחי',
      approved: true,
      approvedAmount: 900000,
      basketRates: {
        fixed: { fixed_unlinked: 4.2, prime: 5 }, // prime is not in basket 1
        nonsense: { fixed_unlinked: 3 },
      },
    });
    expect(summary.basketRates.fixed).toEqual({ fixed_unlinked: 4.2 });
    expect(summary.basketRates.nonsense).toBeUndefined();
  });

  it('treats blank strings as absent', () => {
    const summary = toApprovalSummary('e1', { bankName: '', approvedAt: '' });
    expect(summary.bankName).toBeNull();
    expect(summary.approvedAt).toBeNull();
    expect(summary.approved).toBe(false);
  });
});

describe('feeding the plan stage', () => {
  const empty = emptyStageData('APPLICATIONS');

  it('carries the first approved bank', () => {
    const list = [
      approval({ entityId: 'a', bankName: 'לאומי', approved: false }),
      approval({ entityId: 'b', bankName: 'מזרחי' }),
    ];
    expect(carriedApproval(list)?.bankName).toBe('מזרחי');
    expect(toPreApprovalData(empty, list).bank).toBe('מזרחי');
  });

  it('derives the plan validity from the approval date', () => {
    const next = toPreApprovalData(empty, [approval()]);
    expect(next.validUntil).toBe('2026-04-20');
    expect(next.approved).toBe(true);
    expect(next.approvedAmount).toBe(1_200_000);
  });

  it('fills every uniform basket, with the bank rates where given', () => {
    const next = toPreApprovalData(empty, [approval()]);
    expect(next.baskets).toHaveLength(3);
    expect(next.baskets[0].rates).toEqual({ fixed_unlinked: 4.5 });
    expect(next.baskets[1].rates).toEqual({});
  });

  it('preserves the mix a basket was already saved as', () => {
    const withMix = {
      ...empty,
      baskets: [
        {
          basketId: 'fixed',
          rates: {},
          mixKey: 'mix-1',
          mixRecordId: 'rec-1',
          monthlyPayment: 5000,
          averageRate: 4.5,
          totalPaid: 1_800_000,
        },
      ],
    };
    const next = toPreApprovalData(withMix, [approval()]);
    expect(next.baskets[0].mixKey).toBe('mix-1');
    expect(next.baskets[0].mixRecordId).toBe('rec-1');
    expect(next.baskets[0].monthlyPayment).toBe(5000);
  });

  it('clears the plan when every bank is removed', () => {
    const next = toPreApprovalData(empty, []);
    expect(next.bank).toBeNull();
    expect(next.approved).toBe(false);
    expect(next.baskets).toEqual([]);
  });
});

describe('comparing banks per track', () => {
  const banks = [
    approval({
      entityId: 'a',
      bankName: 'לאומי',
      basketRates: { fixed: { fixed_unlinked: 4.5 }, balanced: { fixed_unlinked: 4.4, prime: 5.9 } },
    }),
    approval({
      entityId: 'b',
      bankName: 'מזרחי',
      basketRates: { fixed: { fixed_unlinked: 4.3 }, balanced: { fixed_unlinked: 4.6, prime: 6.1 } },
    }),
  ];

  it('takes a bank’s best quote for a track across baskets', () => {
    const rows = compareRatesByTrack(banks);
    const fixed = rows.find((row) => row.trackType === 'fixed_unlinked')!;
    expect(fixed.byBank).toEqual({ לאומי: 4.4, מזרחי: 4.3 });
  });

  it('marks the cheapest bank per track', () => {
    const rows = compareRatesByTrack(banks);
    expect(rows.find((r) => r.trackType === 'fixed_unlinked')!.bestBank).toBe('מזרחי');
    expect(rows.find((r) => r.trackType === 'prime')!.bestBank).toBe('לאומי');
  });

  it('covers every track the uniform baskets use', () => {
    const rows = compareRatesByTrack(banks);
    expect(rows.map((r) => r.trackType)).toContain('variable_unlinked');
    const unquoted = rows.find((r) => r.trackType === 'variable_unlinked')!;
    expect(unquoted.bestBank).toBeNull();
    expect(unquoted.byBank).toEqual({});
  });
});
