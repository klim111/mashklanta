import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizeUsername } from './find-user-by-login';

describe('נרמול פרטי כניסה', () => {
  it('שומרת שם משתמש באותיות קטנות בלי רווחים בקצוות', () => {
    expect(normalizeUsername('  Israel_92  ')).toBe('israel_92');
  });

  it('שומרת מייל באותיות קטנות', () => {
    expect(normalizeEmail('  Israel@Example.COM ')).toBe('israel@example.com');
  });
});
