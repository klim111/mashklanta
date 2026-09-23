import { describe, expect, it } from 'vitest';
import {
  PROCESS_ACCESS_DAYS,
  PROCESS_PRICE,
  daysUntil,
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
  it('opens the tools for 35 days from the payment', () => {
    expect(PROCESS_ACCESS_DAYS).toBe(35);
    expect(passExpiresAt('2026-10-01T00:00:00Z').toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });
});

describe('daysUntil', () => {
  it('rounds partial days up and never goes below zero', () => {
    expect(daysUntil('2026-10-03T12:00:00Z', new Date('2026-10-01T00:00:00Z'))).toBe(3);
    expect(daysUntil('2026-09-01T00:00:00Z', new Date('2026-10-01T00:00:00Z'))).toBe(0);
  });
});

describe('openPass', () => {
  it('picks the newest payment that is still inside its 35 days', () => {
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

  it('is active inside the 35 days and reports what was paid', () => {
    const access = processAccess(
      { ...base, payments: [{ createdAt: '2026-10-10T00:00:00Z', amountAgorot: PROCESS_PRICE * 100 }] },
      now
    );
    expect(access.state).toBe('ACTIVE');
    expect(access.daysLeft).toBe(25);
    expect(access.paid).toBe(PROCESS_PRICE);
  });

  it('locks after 35 days until a renewal is paid', () => {
    const expired = processAccess({ ...base, payments: [{ createdAt: '2026-09-01T00:00:00Z' }] }, now);
    expect(expired.state).toBe('EXPIRED');
    expect(processLocked(expired)).toBe(true);

    const renewed = processAccess(
      { ...base, payments: [{ createdAt: '2026-09-01T00:00:00Z' }, { createdAt: '2026-10-19T00:00:00Z' }] },
      now
    );
    expect(renewed.state).toBe('ACTIVE');
    expect(renewed.daysLeft).toBe(34);
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

  it('keeps legacy monthly subscribers open only on processes from before the change', () => {
    expect(
      processAccess({ ...base, ownerHadLegacyAccess: true, planCreatedAt: '2026-09-10T00:00:00Z' }, now).state
    ).toBe('ACTIVE');
    expect(processAccess({ ...base, ownerHadLegacyAccess: true }, now).state).toBe('UNPAID');
  });
});
