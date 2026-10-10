import { describe, expect, it } from 'vitest';
import {
  daysInMonthOf,
  passDays,
  PROCESS_PRICE,
  daysUntil,
  ONE_PROCESS_PER_PAYMENT_SINCE,
  openPass,
  passExpiresAt,
  processAccess,
  processLocked,
} from './process-access';

const base = {
  planStatus: 'IN_PROGRESS',
  planCreatedAt: '2026-10-01T00:00:00Z',
  payments: [],
  hasPaidAdvisory: false,
  ownerIsAdvisor: false,
  ownerHadLegacyAccess: false,
};

describe('passExpiresAt', () => {
  it('opens the tools for as many days as the calendar month of the payment', () => {
    // אוקטובר: 31 יום
    expect(passExpiresAt('2026-10-08T10:00:00Z').toISOString()).toBe('2026-11-08T10:00:00.000Z');
    // נובמבר: 30 יום
    expect(passExpiresAt('2026-11-10T10:00:00Z').toISOString()).toBe('2026-12-10T10:00:00.000Z');
    // פברואר: 28 יום, ובשנה מעוברת 29
    expect(passDays('2027-02-05T10:00:00Z')).toBe(28);
    expect(passDays('2028-02-05T10:00:00Z')).toBe(29);
    // סוף ינואר: 31 יום, גם כשהחודש הבא קצר יותר
    expect(passExpiresAt('2027-01-31T10:00:00Z').toISOString()).toBe('2027-03-03T10:00:00.000Z');
  });

  it('decides the month by Israel time', () => {
    // 1 באפריל 01:00 שעון ישראל = 31 במרץ 22:00 UTC → אפריל, 30 יום
    expect(daysInMonthOf('2027-03-31T22:00:00Z')).toBe(30);
    expect(daysInMonthOf('2027-03-31T20:00:00Z')).toBe(31);
  });
});

describe('daysUntil', () => {
  it('rounds partial days up and never goes below zero', () => {
    expect(daysUntil('2026-10-03T12:00:00Z', new Date('2026-10-01T00:00:00Z'))).toBe(3);
    expect(daysUntil('2026-09-01T00:00:00Z', new Date('2026-10-01T00:00:00Z'))).toBe(0);
  });
});

describe('openPass', () => {
  it('picks the newest payment that is still inside its month', () => {
    const now = new Date('2026-10-20T00:00:00Z');
    const old = { id: 'old', createdAt: '2026-08-01T00:00:00Z' };
    const recent = { id: 'recent', createdAt: '2026-10-10T00:00:00Z' };
    const older = { id: 'older', createdAt: '2026-10-01T00:00:00Z' };
    expect(openPass([old, older, recent], now)?.id).toBe('recent');
    expect(openPass([old], now)).toBeNull();
  });
});

describe('processAccess', () => {
  const now = new Date('2026-10-20T00:00:00Z');

  it('is active inside the month and reports what was paid', () => {
    const access = processAccess(
      { ...base, payments: [{ createdAt: '2026-10-10T00:00:00Z', amountAgorot: PROCESS_PRICE * 100 }] },
      now
    );
    expect(access.state).toBe('ACTIVE');
    // אוקטובר: 31 יום מ-10.10, ומ-20.10 נשארו 21
    expect(access.daysLeft).toBe(21);
    expect(access.paid).toBe(PROCESS_PRICE);
  });

  it('locks after the month until another package is bought', () => {
    const opened = { ...base, planCreatedAt: '2026-09-05T00:00:00Z' };
    const expired = processAccess({ ...opened, payments: [{ createdAt: '2026-09-01T00:00:00Z' }] }, now);
    expect(expired.state).toBe('EXPIRED');
    expect(processLocked(expired)).toBe(true);

    const renewed = processAccess(
      { ...opened, payments: [{ createdAt: '2026-09-01T00:00:00Z' }, { createdAt: '2026-10-19T00:00:00Z' }] },
      now
    );
    expect(renewed.state).toBe('ACTIVE');
    expect(renewed.daysLeft).toBe(30);
  });

  it('asks for payment on a process that was opened without one', () => {
    expect(processAccess(base, now).state).toBe('UNPAID');
  });

  it('keeps a completed process open for viewing', () => {
    const access = processAccess(
      { ...base, planStatus: 'COMPLETED', payments: [{ createdAt: '2026-01-01T00:00:00Z' }] },
      now
    );
    expect(access.state).toBe('COMPLETED');
    expect(processLocked(access)).toBe(false);
  });

  it('never locks a process with paid advisory or an advisor owner', () => {
    expect(processAccess({ ...base, hasPaidAdvisory: true }, now).state).toBe('ACTIVE');
    expect(processAccess({ ...base, ownerIsAdvisor: true }, now).state).toBe('ACTIVE');
  });

  it('keeps paid advisory open with no time limit until the advisor ends it', () => {
    // הליווי אושר לפני חודשים, והיועץ עוד לא סימן סיום — עדיין פתוח
    const advised = { ...base, planCreatedAt: '2026-01-01T00:00:00Z', hasPaidAdvisory: true };
    const open = processAccess(advised, now);
    expect(open.state).toBe('ACTIVE');
    expect(open.expiresAt).toBeNull();
    expect(open.advisoryEndedAt).toBeNull();

    // היועץ סימן סיום, והלקוח לא שילם על חודש — ננעל, עם הצעה להמשיך לבד
    const ended = processAccess({ ...advised, advisoryEndedAt: '2026-10-05T00:00:00Z' }, now);
    expect(ended.state).toBe('UNPAID');
    expect(processLocked(ended)).toBe(true);
    expect(ended.advisoryEndedAt).toBe('2026-10-05T00:00:00.000Z');
  });

  it('after advisory ends, a month paid before it still runs out on its own date', () => {
    const access = processAccess(
      {
        ...base,
        planCreatedAt: '2026-09-01T00:00:00Z',
        hasPaidAdvisory: true,
        advisoryEndedAt: '2026-10-05T00:00:00Z',
        payments: [{ createdAt: '2026-09-25T00:00:00Z' }],
      },
      now
    );
    // ספטמבר: 30 יום — פתוח עד 25 באוקטובר, וההצעה להמשך כבר מוצגת
    expect(access.state).toBe('ACTIVE');
    expect(access.expiresAt).toBe('2026-10-25T00:00:00.000Z');
    expect(access.advisoryEndedAt).toBe('2026-10-05T00:00:00.000Z');
  });

  it('a payment after advisory ended opens a regular month and clears the offer', () => {
    const access = processAccess(
      {
        ...base,
        planCreatedAt: '2026-09-01T00:00:00Z',
        hasPaidAdvisory: true,
        advisoryEndedAt: '2026-10-05T00:00:00Z',
        payments: [{ createdAt: '2026-10-07T00:00:00Z' }],
      },
      now
    );
    expect(access.state).toBe('ACTIVE');
    expect(access.expiresAt).toBe('2026-11-07T00:00:00.000Z');
    expect(access.advisoryEndedAt).toBeNull();
  });

  it('keeps legacy monthly subscribers open only on processes from before the change', () => {
    expect(
      processAccess({ ...base, ownerHadLegacyAccess: true, planCreatedAt: '2026-09-10T00:00:00Z' }, now).state
    ).toBe('ACTIVE');
    expect(processAccess({ ...base, ownerHadLegacyAccess: true }, now).state).toBe('UNPAID');
  });
});

describe('one payment, one process', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  const paid = { createdAt: '2026-10-12T00:00:00Z' };
  const opened = { ...base, planCreatedAt: '2026-10-12T01:00:00Z' };

  it('opens only the process the payment is bound to', () => {
    expect(new Date(opened.planCreatedAt) >= ONE_PROCESS_PER_PAYMENT_SINCE).toBe(true);
    const own = processAccess({ ...opened, payments: [paid], ownerPayments: [paid] }, now);
    expect(own.state).toBe('ACTIVE');
    expect(own.expiresAt).toBe('2026-11-12T00:00:00.000Z');

    // תהליך שני שנפתח אחרי אותו תשלום — לא נפתח עליו, צריך לשלם עליו בנפרד
    const second = processAccess(
      { ...base, planCreatedAt: '2026-10-15T00:00:00Z', payments: [], ownerPayments: [paid], ownerCompletions: [] },
      now
    );
    expect(second.state).toBe('UNPAID');
    expect(processLocked(second)).toBe(true);
  });

  it('a payment freed by deleting its process opens a new one with the same expiry', () => {
    // התשלום מתהליך שנמחק נקשר לתהליך החדש
    const reopened = processAccess({ ...base, planCreatedAt: '2026-10-18T00:00:00Z', payments: [paid] }, now);
    expect(reopened.state).toBe('ACTIVE');
    expect(reopened.expiresAt).toBe('2026-11-12T00:00:00.000Z');
  });

  it('a free payment is one that is unbound and still inside its month', () => {
    expect(openPass([paid], now)).toBe(paid);
    expect(openPass([], now)).toBeNull();
    expect(openPass([paid], new Date('2026-11-12T00:00:00Z'))).toBeNull();
  });

  it('a renewal reopens only its own process', () => {
    const later = new Date('2026-11-20T00:00:00Z');
    const renewal = { createdAt: '2026-11-15T00:00:00Z' };
    const renewed = processAccess({ ...opened, payments: [paid, renewal], ownerPayments: [paid, renewal] }, later);
    expect(renewed.state).toBe('ACTIVE');
    expect(renewed.expiresAt).toBe('2026-12-15T00:00:00.000Z');

    const other = processAccess(
      { ...base, planCreatedAt: '2026-10-13T00:00:00Z', payments: [], ownerPayments: [paid, renewal] },
      later
    );
    expect(other.state).toBe('UNPAID');
  });
});

describe('processes opened before one payment per process', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  const paid = { createdAt: '2026-10-01T00:00:00Z' };

  it('keep opening on any payment of the owner, as before', () => {
    const second = processAccess(
      { ...base, planCreatedAt: '2026-10-05T00:00:00Z', ownerPayments: [paid], ownerCompletions: [] },
      now
    );
    expect(second.state).toBe('ACTIVE');
    expect(second.expiresAt).toBe('2026-11-01T00:00:00.000Z');
    expect(second.paid).toBe(0);
  });

  it('a completion after the payment still closes the package to later processes', () => {
    const afterCompletion = processAccess(
      {
        ...base,
        planCreatedAt: '2026-10-08T00:00:00Z',
        ownerPayments: [paid],
        ownerCompletions: ['2026-10-03T00:00:00Z'],
      },
      now
    );
    expect(afterCompletion.state).toBe('UNPAID');
  });

  it('reopen on a later payment of the owner', () => {
    const later = new Date('2026-11-20T00:00:00Z');
    const renewal = { createdAt: '2026-11-15T00:00:00Z' };
    const access = processAccess(
      { ...base, planCreatedAt: '2026-10-05T00:00:00Z', ownerPayments: [paid, renewal], ownerCompletions: [] },
      later
    );
    expect(access.state).toBe('ACTIVE');
    expect(access.expiresAt).toBe('2026-12-15T00:00:00.000Z');
  });
});
