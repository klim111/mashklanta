import { describe, expect, it } from 'vitest';
import { summarizeClientBilling } from './client-billing';

const none = { platformPayments: [], linkPayments: [], advisoryOrders: [] };

describe('summarizeClientBilling', () => {
  it('reports an unpaid client', () => {
    const summary = summarizeClientBilling(none);
    expect(summary.paid).toBe(false);
    expect(summary.accessEndsAt).toBeNull();
    expect(summary.payments).toEqual([]);
  });

  it('ends the paid access with the latest monthly pass', () => {
    const summary = summarizeClientBilling(
      {
        ...none,
        platformPayments: [
          { createdAt: '2026-09-02T10:00:00Z', amountAgorot: 4900, status: 'PAID' },
          { createdAt: '2026-10-08T10:00:00Z', amountAgorot: 4900, status: 'PAID' },
          { createdAt: '2026-10-09T10:00:00Z', amountAgorot: 4900, status: 'REFUNDED' },
        ],
      },
      new Date('2026-10-14T00:00:00Z')
    );
    expect(summary.paid).toBe(true);
    expect(summary.payments).toHaveLength(2);
    expect(summary.lastPaidAt).toBe('2026-10-08T10:00:00.000Z');
    expect(summary.firstPaidAt).toBe('2026-09-02T10:00:00.000Z');
    // אוקטובר: 31 יום
    expect(summary.accessEndsAt).toBe('2026-11-08T10:00:00.000Z');
    expect(summary.accessActive).toBe(true);
    expect(summary.totalPaid).toBe(98);
  });

  it('counts payment links and advisory orders without an access end date', () => {
    const summary = summarizeClientBilling({
      ...none,
      linkPayments: [{ paidAt: '2026-10-01T09:00:00Z', amountAgorot: 150000, title: 'שיחת ייעוץ' }],
      advisoryOrders: [
        { paidAt: '2026-10-03T09:00:00Z', amount: 900 },
        { paidAt: null, amount: 500 },
      ],
    });
    expect(summary.paid).toBe(true);
    expect(summary.payments.map((payment) => payment.kind)).toEqual(['ADVISORY', 'LINK']);
    expect(summary.accessEndsAt).toBeNull();
    expect(summary.accessActive).toBe(false);
    expect(summary.totalPaid).toBe(2400);
  });

  it('uses the legacy subscription only when there is no monthly pass', () => {
    const legacyOnly = summarizeClientBilling(
      { ...none, legacyAccessAt: '2026-08-01T10:00:00Z' },
      new Date('2026-10-14T00:00:00Z')
    );
    expect(legacyOnly.paid).toBe(true);
    expect(legacyOnly.payments[0].kind).toBe('LEGACY');
    expect(legacyOnly.accessActive).toBe(false);

    const both = summarizeClientBilling({
      ...none,
      legacyAccessAt: '2026-08-01T10:00:00Z',
      platformPayments: [{ createdAt: '2026-08-01T10:00:00Z', amountAgorot: 4900 }],
    });
    expect(both.payments.map((payment) => payment.kind)).toEqual(['PLATFORM']);
  });

  it('counts the access the advisor granted as paid, until its end', () => {
    const summary = summarizeClientBilling(
      {
        platformPayments: [],
        linkPayments: [],
        advisoryOrders: [],
        grant: { from: '2026-10-15T09:00:00Z', until: '2027-01-15T21:59:59Z', note: 'העברה בנקאית' },
      },
      new Date('2026-10-20T00:00:00Z')
    );
    expect(summary.paid).toBe(true);
    expect(summary.accessActive).toBe(true);
    expect(summary.accessEndsAt).toBe('2027-01-15T21:59:59.000Z');
    expect(summary.payments[0]).toMatchObject({ kind: 'GRANT', amount: null, title: 'גישה שהיועץ הגדיר · העברה בנקאית' });
  });
});
