import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ prisma: {} }));

import { advisorRequestEmailContent } from './advisor-notify';
import { cleanSourcePath, pageLabel } from './page-labels';

describe('advisor request email', () => {
  it('names what is waiting and who sent it, and escapes what the client typed', () => {
    const { subject, html, text } = advisorRequestEmailContent(
      {
        what: 'בקשה לפגישה',
        details: [['נושא', 'מיחזור משכנתא · מסלול בליווי'], ['נשלחה מהעמוד', 'כלי המיחזור'], ['ריק', null]],
        from: { name: 'דנה <b>כהן</b>', email: 'dana@example.com', phone: '050-1234567' },
        note: 'אפשר ביום ראשון?',
      },
      'https://mashkalanta.com'
    );
    expect(subject).toBe('מחכה לך בקשה לפגישה מדנה <b>כהן</b>');
    expect(html).toContain('דנה &lt;b&gt;כהן&lt;/b&gt;');
    expect(html).not.toContain('<b>כהן</b>');
    expect(html).toContain('https://mashkalanta.com/advisor-dashboard?tab=requests');
    expect(text).toContain('טלפון: 050-1234567');
    expect(text).toContain('אפשר ביום ראשון?');
    expect(text).not.toContain('ריק:');
  });
});

describe('page labels', () => {
  it('names known pages and keeps unknown paths', () => {
    expect(pageLabel('/')).toBe('דף הבית');
    expect(pageLabel('/mortgage-refinance?x=1')).toBe('כלי המיחזור');
    expect(pageLabel('/dashboard/plans/abc')).toBe('תהליך משכנתא באזור האישי');
    expect(pageLabel('/something')).toBe('/something');
    expect(pageLabel(null)).toBeNull();
  });

  it('accepts only internal paths', () => {
    expect(cleanSourcePath('/consumer-loans')).toBe('/consumer-loans');
    expect(cleanSourcePath('//evil.com')).toBeNull();
    expect(cleanSourcePath('https://evil.com')).toBeNull();
    expect(cleanSourcePath('/a b')).toBeNull();
    expect(cleanSourcePath(5)).toBeNull();
  });
});

describe('contact phone', () => {
  it('keeps a usable phone and rejects short ones', async () => {
    const { cleanPhone } = await import('./contact-roles');
    expect(cleanPhone('050-123 4567')).toBe('050-123 4567');
    expect(cleanPhone('+972 50 1234567')).toBe('+972 50 1234567');
    expect(cleanPhone('1234')).toBeNull();
    expect(cleanPhone(undefined)).toBeNull();
  });

  it('lists every role once, the advisor first', async () => {
    const { CONTACT_ROLES } = await import('./contact-roles');
    const roles = CONTACT_ROLES.map((item) => item.role);
    expect(roles[0]).toBe('ADVISOR');
    expect(new Set(roles).size).toBe(roles.length);
    expect(roles).toEqual(expect.arrayContaining(['LAWYER', 'APPRAISER', 'BANKER', 'INSURANCE']));
  });
});
