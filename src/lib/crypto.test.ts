import { randomBytes } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  decryptField,
  decryptNumber,
  encryptField,
  encryptNumber,
  isEncrypted,
  resetEncryptionKeyCache,
} from './crypto';

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  resetEncryptionKeyCache();
});

describe('הצפנת שדות', () => {
  it('מפענח בחזרה את הערך שהוצפן', () => {
    const encrypted = encryptField('12500.5', 'income');
    expect(encrypted).not.toContain('12500');
    expect(decryptField(encrypted, 'income')).toBe('12500.5');
  });

  it('מייצר טקסט מוצפן שונה לאותו ערך בכל הצפנה', () => {
    expect(encryptField('12500', 'income')).not.toBe(encryptField('12500', 'income'));
  });

  it('דוחה פענוח של ערך שהוצפן עבור שדה אחר', () => {
    const encrypted = encryptField('720', 'creditScore');
    expect(() => decryptField(encrypted, 'income')).toThrow();
  });

  it('דוחה טקסט מוצפן שהשתנה', () => {
    const [version, iv, tag, ciphertext] = encryptField('12500', 'income').split('.');
    const flipped = Buffer.from(ciphertext, 'base64');
    flipped[0] ^= 0xff;
    const tampered = [version, iv, tag, flipped.toString('base64')].join('.');

    expect(() => decryptField(tampered, 'income')).toThrow();
  });

  it('דוחה מבנה שאינו טקסט מוצפן תקין', () => {
    expect(() => decryptField('12500', 'income')).toThrow();
    expect(() => decryptField('v1.a.b', 'income')).toThrow();
    expect(() => decryptField('v2.a.b.c', 'income')).toThrow();
  });

  it('מזהה מה מוצפן ומה עדיין גלוי', () => {
    expect(isEncrypted(encryptField('12500', 'income'))).toBe(true);
    expect(isEncrypted('12500')).toBe(false);
  });
});

describe('הצפנת מספרים', () => {
  it('שומר על ערכי null', () => {
    expect(encryptNumber(null, 'income')).toBeNull();
    expect(decryptNumber(null, 'income')).toBeNull();
  });

  it('מפענח מספרים בחזרה כמספרים', () => {
    expect(decryptNumber(encryptNumber(0, 'income'), 'income')).toBe(0);
    expect(decryptNumber(encryptNumber(-1250.75, 'expenses'), 'expenses')).toBe(-1250.75);
    expect(decryptNumber(encryptNumber(720, 'creditScore'), 'creditScore')).toBe(720);
  });

  it('מסרב להצפין ערך שאינו מספר סופי', () => {
    expect(() => encryptNumber(Number.NaN, 'income')).toThrow();
    expect(() => encryptNumber(Number.POSITIVE_INFINITY, 'income')).toThrow();
  });
});

/** NODE_ENV is typed read-only, but the fallback is exactly what we need to exercise. */
function setNodeEnv(value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
}

describe('missing FIELD_ENCRYPTION_KEY', () => {
  const original = process.env.FIELD_ENCRYPTION_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (original === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = original;
    setNodeEnv(originalNodeEnv);
    resetEncryptionKeyCache();
  });

  it('falls back to a derived key outside production, so dev runs unconfigured', () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    setNodeEnv('development');
    resetEncryptionKeyCache();

    const payload = encryptField('סודי', 'ctx');
    expect(decryptField(payload, 'ctx')).toBe('סודי');
  });

  it('still refuses to run in production without a key', () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    setNodeEnv('production');
    resetEncryptionKeyCache();

    expect(() => encryptField('סודי', 'ctx')).toThrow(/FIELD_ENCRYPTION_KEY is not set/);
  });
});
