import { describe, expect, it } from 'vitest';
import { ADVISOR_IDLE_MINUTES, ADVISOR_MAX_HOURS, advisorSessionValid } from './advisor-session';

const now = Date.UTC(2026, 9, 17, 10, 0, 0);
const token = { role: 'ADVISOR', advisorLink: true, advisorSession: 'abc123', advisorAt: now - 60_000, advisorSeen: now - 60_000 };

describe('advisorSessionValid', () => {
  it('accepts the browser that signed in, while the area is in use', () => {
    expect(advisorSessionValid(token, 'abc123', now)).toBe(true);
  });

  it('rejects a browser without the session cookie (closed and reopened)', () => {
    expect(advisorSessionValid(token, null, now)).toBe(false);
    expect(advisorSessionValid(token, 'other1', now)).toBe(false);
  });

  it('rejects a token from before this change, with no session binding', () => {
    expect(advisorSessionValid({ role: 'ADVISOR', advisorLink: true }, 'abc123', now)).toBe(false);
  });

  it('expires after the idle limit', () => {
    const idle = { ...token, advisorSeen: now - (ADVISOR_IDLE_MINUTES * 60_000 + 1) };
    expect(advisorSessionValid(idle, 'abc123', now)).toBe(false);
  });

  it('expires after the hard limit even while in use', () => {
    const old = { ...token, advisorAt: now - (ADVISOR_MAX_HOURS * 3_600_000 + 1), advisorSeen: now };
    expect(advisorSessionValid(old, 'abc123', now)).toBe(false);
  });
});
