import { describe, expect, it } from 'vitest';
import { emptyPlanData } from './mortgage-plan';
import type { PreApprovalData } from './mortgage-plan';
import { banksToHand, emptyBankRow, keepAdvisorRows, submissionChannelOf } from './preapproval-handoff';

function applications(rows: PreApprovalData['bankApprovals']): PreApprovalData {
  return { ...emptyPlanData().APPLICATIONS, bankApprovals: rows };
}

describe('submissionChannelOf', () => {
  it('asks for a choice on a fresh bank', () => {
    expect(submissionChannelOf(null)).toBeNull();
    expect(submissionChannelOf(emptyBankRow('לאומי'))).toBeNull();
  });

  it('treats work done before the choice existed as self submission', () => {
    expect(submissionChannelOf({ ...emptyBankRow('לאומי'), submittedAt: '2026-10-01' })).toBe('SELF');
    expect(submissionChannelOf(null, true)).toBe('SELF');
  });

  it('keeps the chosen channel', () => {
    expect(submissionChannelOf({ ...emptyBankRow('לאומי'), channel: 'ADVISOR' })).toBe('ADVISOR');
  });
});

describe('keepAdvisorRows', () => {
  const advisorRow = {
    ...emptyBankRow('מזרחי'),
    channel: 'ADVISOR' as const,
    handedAt: '2026-10-05T06:00:00.000Z',
    bankerName: 'דנה',
    bankerEmail: 'dana@bank.co.il',
    approved: true,
    approvedAt: '2026-10-04',
  };

  it('keeps what the advisor entered when the client saves a stale copy', () => {
    const stale = applications([{ ...emptyBankRow('מזרחי'), channel: 'ADVISOR' }, emptyBankRow('לאומי')]);
    const result = keepAdvisorRows(applications([advisorRow]), stale);
    const row = result.bankApprovals.find((item) => item.bank === 'מזרחי');
    expect(row?.bankerEmail).toBe('dana@bank.co.il');
    expect(row?.approved).toBe(true);
    expect(result.bank).toBe('מזרחי');
    expect(result.approved).toBe(true);
    expect(result.bankApprovals).toHaveLength(2);
  });

  it('puts back a handed bank the client copy does not have', () => {
    const result = keepAdvisorRows(applications([advisorRow]), applications([]));
    expect(result.bankApprovals.map((item) => item.bank)).toEqual(['מזרחי']);
  });

  it('leaves self-submitted banks to the client', () => {
    const incoming = applications([{ ...emptyBankRow('לאומי'), channel: 'SELF', bankerName: 'רון' }]);
    expect(keepAdvisorRows(applications([]), incoming)).toBe(incoming);
  });
});

describe('banksToHand', () => {
  it('hands every bank except those the client already submitted to', () => {
    const rows = [
      { ...emptyBankRow('לאומי'), channel: 'SELF' as const, submittedAt: '2026-10-01' },
      { ...emptyBankRow('הפועלים'), channel: 'SELF' as const },
      { ...emptyBankRow('דיסקונט'), channel: 'ADVISOR' as const },
    ];
    expect(banksToHand(rows, ['לאומי', 'הפועלים', 'מזרחי', 'דיסקונט'])).toEqual(['הפועלים', 'מזרחי', 'דיסקונט']);
  });
});

describe('keepAdvisorRows and the client switching a bank to self submission', () => {
  it('keeps the switch to self submission', () => {
    const saved = applications([{ ...emptyBankRow('מזרחי'), channel: 'ADVISOR', bankerName: 'דנה' }]);
    const incoming = applications([{ ...emptyBankRow('מזרחי'), channel: 'SELF' }]);
    expect(keepAdvisorRows(saved, incoming).bankApprovals[0].channel).toBe('SELF');
  });
});
