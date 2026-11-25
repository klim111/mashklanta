import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ prisma: {} }));

import { parseAdvisorApplication } from './advisor-applications';
import { parseIdentifier } from './advisor-access';

describe('advisor application form', () => {
  const valid = {
    name: '  דנה   כהן ',
    email: 'Dana@Office.co.il',
    phone: '050-1234567',
    officeName: 'כהן משכנתאות',
    licenseNumber: '',
    website: 'cohen-mortgage.co.il',
    message: 'שלום',
  };

  it('normalizes a valid application', () => {
    const parsed = parseAdvisorApplication(valid);
    expect(parsed).toEqual({
      ok: true,
      input: {
        name: 'דנה כהן',
        email: 'dana@office.co.il',
        phone: '050-1234567',
        officeName: 'כהן משכנתאות',
        licenseNumber: null,
        website: 'cohen-mortgage.co.il',
        message: 'שלום',
      },
    });
  });

  it('rejects missing or broken fields with a Hebrew message', () => {
    expect(parseAdvisorApplication({ ...valid, name: 'ד' })).toMatchObject({ ok: false });
    expect(parseAdvisorApplication({ ...valid, email: 'not-an-email' })).toMatchObject({ ok: false });
    expect(parseAdvisorApplication({ ...valid, phone: '123' })).toMatchObject({ ok: false });
    expect(parseAdvisorApplication({ ...valid, officeName: '' })).toMatchObject({ ok: false });
    expect(parseAdvisorApplication(null)).toMatchObject({ ok: false });
  });
});

describe('advisor login link identifier', () => {
  it('carries the advisor, the browser and the wrong-password count', () => {
    expect(parseIdentifier('advisor-login:adv1:hash')).toEqual({ advisorId: 'adv1', deviceHash: 'hash', attempts: 0 });
    expect(parseIdentifier('advisor-login:adv1:hash:3')).toEqual({ advisorId: 'adv1', deviceHash: 'hash', attempts: 3 });
  });

  it('leaves links in the old single-advisor format without a browser, so they never work', () => {
    expect(parseIdentifier('advisor-login:hash').deviceHash).toBe('');
  });
});
