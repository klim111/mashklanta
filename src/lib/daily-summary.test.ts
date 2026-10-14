import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ prisma: {} }));

import { dailySummaryEmail, israelDayRange, previousIsraelDay } from './daily-summary';

describe('israel day range', () => {
  it('runs from midnight to midnight Israel time, summer and winter', () => {
    // קיץ: UTC+3
    expect(israelDayRange('2026-10-14')).toEqual({
      from: new Date('2026-10-13T21:00:00.000Z'),
      to: new Date('2026-10-14T21:00:00.000Z'),
    });
    // חורף: UTC+2
    expect(israelDayRange('2026-12-01').from.toISOString()).toBe('2026-11-30T22:00:00.000Z');
  });

  it('summarizes the day that just ended when it runs after midnight', () => {
    // 22:15 UTC בחורף = 00:15 שעון ישראל, ובקיץ = 01:15
    expect(previousIsraelDay(new Date('2026-12-01T22:15:00Z'))).toBe('2026-12-01');
    expect(previousIsraelDay(new Date('2026-10-14T22:15:00Z'))).toBe('2026-10-14');
  });
});

describe('daily summary email', () => {
  it('counts visits, signups and payers, and lists who signed up and paid', () => {
    const { subject, html, text } = dailySummaryEmail(
      {
        day: '2026-10-14',
        visits: { views: 340, visitors: 95, sessions: 120, signedInVisitors: 12 },
        startedSignup: 7,
        signups: [{ name: 'דנה <b>כהן</b>', email: 'dana@example.com', at: '2026-10-14T08:00:00Z' }],
        payments: [
          { who: 'דנה כהן', what: 'גישה לפלטפורמה לחודש', amount: 49, at: '2026-10-14T09:00:00Z' },
          { who: 'דנה כהן', what: 'שיחת ייעוץ', amount: 500, at: '2026-10-14T10:00:00Z' },
        ],
      },
      'https://mashkalanta.com'
    );
    expect(subject).toContain('120 ביקורים, 1 נרשמו, 1 שילמו');
    expect(html).toContain('דנה &lt;b&gt;כהן&lt;/b&gt;');
    expect(html).toContain('https://mashkalanta.com/advisor-dashboard?tab=clients');
    expect(text).toContain('2 תשלומים');
    expect(text).toContain('שיחת ייעוץ');
  });
});
