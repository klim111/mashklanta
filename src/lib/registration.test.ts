import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(), emailTemplates: {} }));

import {
  MAX_SENDS_PER_HOUR,
  generateToken,
  hashToken,
  maskEmail,
  safeCallbackUrl,
  sameHash,
  sendDecision,
  usernameFromEmail,
} from './registration';

describe('טוקן האימות', () => {
  it('אקראי וארוך מספיק', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it('נשמר רק כ-hash, ואותו טוקן נותן אותו hash', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(sameHash(hashToken(token), hashToken(token))).toBe(true);
    expect(sameHash(hashToken(token), hashToken(generateToken()))).toBe(false);
    expect(sameHash(null, hashToken(token))).toBe(false);
  });
});

describe('יעד אחרי האישור', () => {
  it('מקבל רק נתיב יחסי באתר', () => {
    expect(safeCallbackUrl('/dashboard?goal=NEW_MORTGAGE&service=SELF')).toBe('/dashboard?goal=NEW_MORTGAGE&service=SELF');
    expect(safeCallbackUrl('https://evil.example')).toBeNull();
    expect(safeCallbackUrl('//evil.example')).toBeNull();
    expect(safeCallbackUrl('/\\evil.example')).toBeNull();
    expect(safeCallbackUrl(undefined)).toBeNull();
  });
});

describe('הגבלת שליחות', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it('מאפשרת שליחה ראשונה', () => {
    expect(sendDecision(null, now)).toBe('send');
  });

  it('חוסמת שליחה חוזרת בתוך דקה', () => {
    expect(sendDecision({ sendCount: 1, lastSentAt: ago(20), createdAt: ago(20) }, now)).toBe('cooldown');
  });

  it(`חוסמת אחרי ${MAX_SENDS_PER_HOUR} שליחות בשעה, ומשחררת אחרי שעה`, () => {
    expect(sendDecision({ sendCount: MAX_SENDS_PER_HOUR, lastSentAt: ago(120), createdAt: ago(600) }, now)).toBe('limit');
    expect(sendDecision({ sendCount: MAX_SENDS_PER_HOUR, lastSentAt: ago(120), createdAt: ago(3700) }, now)).toBe('send');
  });
});

describe('תצוגה', () => {
  it('מסתירה את רוב המייל', () => {
    expect(maskEmail('israel@gmail.com')).toBe('is••••@gmail.com');
    expect(maskEmail('ab@x.co')).toBe('a•••@x.co');
  });

  it('גוזרת שם משתמש מהמייל', () => {
    expect(usernameFromEmail('Israel.Cohen+tag@gmail.com')).toBe('israel.cohentag');
  });
});
