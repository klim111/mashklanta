import { describe, expect, it } from 'vitest';
import { emptyPlanData } from './mortgage-plan';
import type { BankPreApproval, PlanData } from './mortgage-plan';
import {
  daysLeftLabel,
  finalAuctionBank,
  rateAlertDates,
  rateAlertStep,
  rateValidity,
} from './rate-validity';

const NOW = new Date(2026, 8, 23, 14, 30);

function approval(bank: string, approvedAt: string | null, approved = true): BankPreApproval {
  return {
    bank,
    submittedAt: '2026-09-01',
    approved,
    approvedAt,
    approvedAmount: null,
    documentName: null,
    note: '',
  };
}

function withApprovals(rows: BankPreApproval[]): PlanData {
  const data = emptyPlanData();
  data.APPLICATIONS = { ...data.APPLICATIONS, approved: true, bank: rows[0]?.bank ?? null, bankApprovals: rows };
  return data;
}

describe('rateValidity', () => {
  it('counts 24 days from the receipt date', () => {
    const [row] = rateValidity(withApprovals([approval('לאומי', '2026-09-23')]), NOW);
    expect(row.expiresOn).toBe('2026-10-17');
    expect(row.daysLeft).toBe(24);
  });

  it('shows every approval that has a receipt date, and skips the rest', () => {
    const rows = rateValidity(
      withApprovals([
        approval('לאומי', '2026-09-10'),
        approval('הפועלים', null),
        approval('מזרחי טפחות', '2026-09-01', false),
        approval('דיסקונט', '2026-08-20'),
      ]),
      NOW
    );
    expect(rows.map((row) => [row.bank, row.daysLeft])).toEqual([
      ['לאומי', 11],
      ['דיסקונט', -10],
    ]);
  });

  it('marks the bank chosen as final in the auction', () => {
    const data = withApprovals([approval('לאומי', '2026-09-10'), approval('דיסקונט', '2026-09-12')]);
    data.AUCTION = {
      ...data.AUCTION,
      signedMix: {
        mixKey: 'm',
        mixRecordId: null,
        bank: 'דיסקונט',
        name: 'תמהיל',
        monthlyPayment: null,
        averageRate: null,
        totalInterest: null,
        totalPaid: null,
        months: null,
        chosenAt: '2026-09-20',
      },
    };
    expect(finalAuctionBank(data)).toBe('דיסקונט');
    expect(rateValidity(data, NOW).map((row) => row.final)).toEqual([false, true]);
  });

  it('falls back to the leading bank an advisor filled in', () => {
    const data = emptyPlanData();
    data.APPLICATIONS = { ...data.APPLICATIONS, approved: true, bank: 'לאומי', approvedAt: '2026-09-13' };
    expect(rateValidity(data, NOW)).toMatchObject([{ bank: 'לאומי', daysLeft: 14 }]);
  });
});

describe('rateAlertStep', () => {
  it('returns the lowest threshold already crossed', () => {
    expect(rateAlertStep(24)).toBeNull();
    expect(rateAlertStep(21)).toBeNull();
    expect(rateAlertStep(20)).toBe(20);
    expect(rateAlertStep(16)).toBe(20);
    expect(rateAlertStep(15)).toBe(15);
    expect(rateAlertStep(11)).toBe(15);
    expect(rateAlertStep(10)).toBe(10);
    expect(rateAlertStep(5)).toBe(5);
    expect(rateAlertStep(0)).toBe(5);
    expect(rateAlertStep(-1)).toBeNull();
  });

  it('dates each alert before the expiry', () => {
    const [row] = rateValidity(withApprovals([approval('לאומי', '2026-09-23')]), NOW);
    expect(rateAlertDates(row)).toEqual([
      { days: 20, on: '2026-09-27' },
      { days: 15, on: '2026-10-02' },
      { days: 10, on: '2026-10-07' },
      { days: 5, on: '2026-10-12' },
    ]);
  });
});

describe('daysLeftLabel', () => {
  it('reads naturally in Hebrew', () => {
    expect(daysLeftLabel(12)).toBe('נשארו 12 ימים');
    expect(daysLeftLabel(1)).toBe('נשאר יום אחד');
    expect(daysLeftLabel(0)).toBe('היום האחרון');
    expect(daysLeftLabel(-3)).toBe('פגו לפני 3 ימים');
  });
});
