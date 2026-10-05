import { describe, expect, it } from 'vitest';
import {
  buildUnfinishedSignups,
  normalizePath,
  referrerHost,
  summarizeVisits,
  type DraftRow,
  type VisitRow,
} from './site-analytics';

describe('normalizePath', () => {
  it('drops query strings so verification tokens are never stored', () => {
    expect(normalizePath('/auth/verify?token=abc123secret')).toBe('/auth/verify');
  });
  it('folds ids into [id]', () => {
    expect(normalizePath('/dashboard/plans/cmf1abc2def3ghi4jkl5')).toBe('/dashboard/plans/[id]');
    expect(normalizePath('/dashboard/plans/cmf1abc2def3ghi4jkl5/authorization-letters')).toBe(
      '/dashboard/plans/[id]/authorization-letters'
    );
  });
  it('never stores the hidden advisor entry', () => {
    expect(normalizePath('/auth/team-entry?token=x')).toBeNull();
    expect(normalizePath('/auth/advisor-verify')).toBeNull();
  });
  it('rejects anything that is not a site path', () => {
    expect(normalizePath('https://evil.example/')).toBeNull();
    expect(normalizePath('//evil.example')).toBeNull();
    expect(normalizePath(42)).toBeNull();
  });
});

describe('referrerHost', () => {
  it('keeps only the host and ignores the site itself', () => {
    expect(referrerHost('https://www.google.com/search?q=משכנתא', 'mashkalanta.com')).toBe('google.com');
    expect(referrerHost('https://mashkalanta.com/pricing', 'mashkalanta.com')).toBeNull();
    expect(referrerHost('', 'mashkalanta.com')).toBeNull();
  });
});

const at = (iso: string) => new Date(iso);
const row = (over: Partial<VisitRow>): VisitRow => ({
  visitorId: 'v1',
  sessionId: 's1',
  path: '/',
  referrer: null,
  device: 'desktop',
  userId: null,
  durationMs: 10_000,
  startedAt: at('2026-10-03T10:00:00Z'),
  ...over,
});

describe('summarizeVisits', () => {
  it('counts views, visitors, time on page, entries, exits and bounces', () => {
    const rows = [
      row({ path: '/', referrer: 'google.com', startedAt: at('2026-10-03T10:00:00Z'), durationMs: 20_000 }),
      row({ path: '/pricing', startedAt: at('2026-10-03T10:01:00Z'), durationMs: 40_000 }),
      row({ visitorId: 'v2', sessionId: 's2', path: '/', device: 'phone', durationMs: 0 }),
      // לשונית שנשכחה פתוחה נחתכת בחצי שעה
      row({ visitorId: 'v3', sessionId: 's3', path: '/pricing', durationMs: 5 * 3600 * 1000 }),
    ];
    const summary = summarizeVisits(rows, at('2026-10-02T00:00:00Z'), at('2026-10-03T12:00:00Z'));

    expect(summary.views).toBe(4);
    expect(summary.visitors).toBe(3);
    expect(summary.sessions).toBe(3);
    expect(summary.bounceRate).toBe(67);
    const home = summary.pages.find((page) => page.path === '/')!;
    expect(home).toMatchObject({ label: 'דף הבית', views: 2, visitors: 2, avgSeconds: 20, entries: 2, exits: 1 });
    const pricing = summary.pages.find((page) => page.path === '/pricing')!;
    expect(pricing.totalSeconds).toBe(40 + 1800);
    expect(summary.referrers).toEqual([
      { key: 'כניסה ישירה', count: 2 },
      { key: 'google.com', count: 1 },
    ]);
    expect(summary.days.map((day) => day.day)).toEqual(['2026-10-02', '2026-10-03']);
    expect(summary.days[1].views).toBe(4);
  });
});

const draft = (over: Partial<DraftRow>): DraftRow => ({
  id: 'd1',
  visitorId: 'v1',
  source: 'register',
  path: '/auth/register',
  name: 'דנה כהן',
  username: null,
  email: null,
  lastField: 'name',
  submitted: false,
  createdAt: at('2026-10-03T10:00:00Z'),
  updatedAt: at('2026-10-03T10:00:00Z'),
  ...over,
});

describe('buildUnfinishedSignups', () => {
  const now = at('2026-10-04T10:00:00Z');

  it('lists a half-typed form with where it stopped', () => {
    const [signup] = buildUnfinishedSignups([draft({ email: 'dana@gm' , lastField: 'email' })], [], new Set(), new Map(), now);
    expect(signup).toMatchObject({ status: 'typing', name: 'דנה כהן', lastField: 'email', emailLooksValid: false });
  });

  it('drops people who already have an account or signed in from the same browser', () => {
    const list = buildUnfinishedSignups(
      [draft({ id: 'a', email: 'dana@gmail.com' }), draft({ id: 'b', visitorId: 'v9' })],
      [],
      new Set(['dana@gmail.com']),
      new Map(),
      now,
      new Set(['v9'])
    );
    expect(list).toEqual([]);
  });

  it('marks submitted sign-ups by their link state and adds server-only pending ones', () => {
    const list = buildUnfinishedSignups(
      [draft({ id: 'a', email: 'dana@gmail.com', submitted: true })],
      [
        {
          id: 'p1',
          email: 'dana@gmail.com',
          name: 'דנה כהן',
          username: 'dana',
          provider: null,
          expires: at('2026-10-04T10:30:00Z'),
          sendCount: 1,
          createdAt: at('2026-10-04T09:30:00Z'),
          lastSentAt: at('2026-10-04T09:30:00Z'),
        },
        {
          id: 'p2',
          email: 'yossi@gmail.com',
          name: 'יוסי',
          username: null,
          provider: 'google',
          expires: at('2026-10-01T00:00:00Z'),
          sendCount: 2,
          createdAt: at('2026-09-30T23:00:00Z'),
          lastSentAt: at('2026-09-30T23:00:00Z'),
        },
      ],
      new Set(),
      new Map(),
      now
    );
    expect(list.map((item) => [item.id, item.status, item.source])).toEqual([
      ['a', 'awaiting-link', 'register'],
      ['pending:p2', 'link-expired', 'google'],
    ]);
    expect(list[1].deletable).toBe(false);
  });
});
