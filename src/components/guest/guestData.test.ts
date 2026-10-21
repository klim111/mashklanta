import { describe, expect, it } from 'vitest';
import { GUEST_DATA_TTL_MS, guestDataExpired } from './guestData';

describe('נתוני אורח בדפדפן', () => {
  const now = Date.UTC(2026, 9, 10, 12);

  it('נשמרים בזמן שעובר בין הכלים לבין אישור ההרשמה', () => {
    expect(guestDataExpired(String(now - 10 * 60 * 1000), now)).toBe(false);
    expect(guestDataExpired(String(now - GUEST_DATA_TTL_MS + 1000), now)).toBe(false);
  });

  it('נמחקים בכניסה מאוחרת יותר לאתר', () => {
    expect(guestDataExpired(String(now - GUEST_DATA_TTL_MS - 1000), now)).toBe(true);
    expect(guestDataExpired(String(now - 24 * 60 * 60 * 1000), now)).toBe(true);
  });

  it('בלי חותמת זמן אין מה למחוק', () => {
    expect(guestDataExpired(null, now)).toBe(false);
    expect(guestDataExpired('garbage', now)).toBe(false);
  });
});
