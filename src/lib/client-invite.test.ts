import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ prisma: {} }));

import { inviteEmail } from './client-invite';
import { carriedGrant } from './prospect-client';

describe('client invite email', () => {
  it('links to the password page, names the login email and escapes names', () => {
    const { subject, html, text } = inviteEmail({
      name: 'דנה <b>כהן</b>',
      advisorName: 'יגור',
      email: 'dana@example.com',
      url: 'https://mashkalanta.com/auth/reset-password?token=abc&invite=1',
    });
    expect(subject).toContain('מוכן');
    expect(html).toContain('דנה &lt;b&gt;כהן&lt;/b&gt;');
    expect(html).not.toContain('<b>כהן</b>');
    expect(html).toContain('https://mashkalanta.com/auth/reset-password?token=abc&amp;invite=1');
    expect(html).toContain('dana@example.com');
    expect(text).toContain('https://mashkalanta.com/auth/reset-password?token=abc&invite=1');
    expect(text).toContain('יגור פתח/ה');
    expect(text).toContain('7 ימים');
  });
});

describe('carrying the advisor grant to the registered account', () => {
  const grant = {
    paidAccessFrom: new Date('2026-11-01T00:00:00Z'),
    paidAccessUntil: new Date('2027-02-01T00:00:00Z'),
    paidAccessSetAt: new Date('2026-11-01T10:00:00Z'),
    paidAccessSetBy: 'advisor-1',
    paidAccessNote: 'שילם בהעברה',
  };

  it('copies the grant set on the prospect file', () => {
    expect(carriedGrant(grant, null)).toEqual(grant);
  });

  it('keeps a longer grant the account already has', () => {
    expect(carriedGrant(grant, new Date('2027-06-01T00:00:00Z'))).toBeNull();
  });

  it('replaces a shorter grant', () => {
    expect(carriedGrant(grant, new Date('2026-12-01T00:00:00Z'))).toEqual(grant);
  });

  it('has nothing to carry without a grant', () => {
    expect(carriedGrant(null, null)).toBeNull();
    expect(carriedGrant({ ...grant, paidAccessUntil: null }, null)).toBeNull();
  });
});
