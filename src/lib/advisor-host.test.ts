import { describe, expect, it } from 'vitest';
import { hostSplit } from './advisor-host';

const origins = { advisorOrigin: 'https://pro.example.com', mainOrigin: 'https://example.com' };

describe('separate advisor address', () => {
  it('does nothing until an advisor address is configured', () => {
    expect(hostSplit({ host: 'example.com', pathname: '/advisor-dashboard', search: '', advisorOrigin: null, mainOrigin: 'https://example.com' })).toBeNull();
  });

  it('sends the advisor area from the main site to the advisor address', () => {
    const decision = hostSplit({ host: 'example.com', pathname: '/advisor-dashboard', search: '?section=office', ...origins });
    expect(decision).toEqual({ onAdvisorHost: false, redirect: 'https://pro.example.com/advisor-dashboard?section=office' });
    expect(hostSplit({ host: 'example.com', pathname: '/auth/team-entry', search: '', ...origins })?.redirect).toBe(
      'https://pro.example.com/auth/team-entry'
    );
  });

  it('sends client sign-in from the advisor address to the main site', () => {
    expect(hostSplit({ host: 'pro.example.com', pathname: '/auth/login', search: '?x=1', ...origins })?.redirect).toBe(
      'https://example.com/auth/login?x=1'
    );
    expect(hostSplit({ host: 'pro.example.com', pathname: '/', search: '', ...origins })?.redirect).toBe(
      'https://pro.example.com/advisor-dashboard'
    );
  });

  it('serves tools, office pages and the API on both addresses', () => {
    for (const pathname of ['/mortgage-advisor', '/o/avi', '/dashboard', '/api/advisor/office']) {
      expect(hostSplit({ host: 'pro.example.com', pathname, search: '', ...origins })?.redirect).toBeNull();
      expect(hostSplit({ host: 'example.com', pathname, search: '', ...origins })?.redirect).toBeNull();
    }
    // אימות ההרשמה של לקוח אינו אימות הכניסה של היועץ
    expect(hostSplit({ host: 'example.com', pathname: '/auth/verify', search: '', ...origins })?.redirect).toBeNull();
    expect(hostSplit({ host: 'example.com', pathname: '/auth/advisor-verify', search: '?token=a', ...origins })?.redirect).toBe(
      'https://pro.example.com/auth/advisor-verify?token=a'
    );
  });
});
