import { describe, expect, it } from 'vitest';
import { readRenewalToken, renewalToken } from './billing-links';

const key = 'test-secret';
const now = new Date('2026-10-08T00:00:00Z');
const expiresAt = new Date('2026-12-01T00:00:00Z');

describe('renewal links', () => {
  it('round-trips the user and process', () => {
    const token = renewalToken({ userId: 'u1', planId: 'p1', expiresAt }, key);
    expect(readRenewalToken(token, now, key)).toEqual({ userId: 'u1', planId: 'p1', expiresAt, reason: 'renewal' });
  });

  it('keeps the reason when the link offers to continue after advisory ended', () => {
    const token = renewalToken({ userId: 'u1', planId: 'p1', expiresAt, reason: 'advisory-ended' }, key);
    expect(readRenewalToken(token, now, key)?.reason).toBe('advisory-ended');
  });

  it('rejects expired, tampered or foreign-key links', () => {
    const token = renewalToken({ userId: 'u1', planId: null, expiresAt }, key);
    expect(readRenewalToken(token, new Date('2026-12-02T00:00:00Z'), key)).toBeNull();
    expect(readRenewalToken(token, now, 'other')).toBeNull();
    const [, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'u2', p: null, e: expiresAt.getTime() / 1000 })).toString('base64url');
    expect(readRenewalToken(`${forged}.${sig}`, now, key)).toBeNull();
    expect(readRenewalToken('garbage', now, key)).toBeNull();
  });
});
