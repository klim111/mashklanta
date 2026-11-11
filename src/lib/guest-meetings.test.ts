import { describe, expect, it } from 'vitest';
import { GUEST_LINK_MINUTES, guestLinkPath, guestMeetingEnds, guestMeetingState } from './guest-meetings';
import { demoPathFor } from './frame-paths';
import { validClientId } from './act-as-shared';
import { isProspectEmail, PROSPECT_EMAIL_DOMAIN } from './prospect-email';

describe('guest meetings', () => {
  const startsAt = new Date('2026-11-01T10:00:00Z');
  const meeting = { startsAt, durationMinutes: GUEST_LINK_MINUTES, cancelledAt: null };

  it('opens the link at the meeting time and closes it ninety minutes later', () => {
    expect(guestMeetingState(meeting, new Date('2026-11-01T09:59:59Z'))).toBe('early');
    expect(guestMeetingState(meeting, new Date('2026-11-01T10:00:00Z'))).toBe('open');
    expect(guestMeetingState(meeting, new Date('2026-11-01T11:29:59Z'))).toBe('open');
    expect(guestMeetingState(meeting, new Date('2026-11-01T11:30:00Z'))).toBe('expired');
    expect(guestMeetingEnds(startsAt).toISOString()).toBe('2026-11-01T11:30:00.000Z');
  });

  it('treats a cancelled meeting as cancelled at any time', () => {
    expect(guestMeetingState({ ...meeting, cancelledAt: new Date() }, new Date('2026-11-01T10:30:00Z'))).toBe('cancelled');
  });

  it('builds the public link path', () => {
    expect(guestLinkPath('abc')).toBe('/m/abc');
  });
});

describe('meeting frames', () => {
  it('routes the signed-in areas to the demo screens inside the demo frame', () => {
    expect(demoPathFor('/dashboard')).toBe('/demo/dashboard');
    expect(demoPathFor('/dashboard/plans/abc')).toBe('/demo/plan');
    expect(demoPathFor('/advisor-dashboard/client/x')).toBe('/demo/dashboard');
    expect(demoPathFor('/consumer-loans')).toBeNull();
    expect(demoPathFor('/demo/plan')).toBeNull();
  });

  it('accepts only card ids for acting as a client', () => {
    expect(validClientId('cmvxxm8th00047dw9d47efnsq')).toBe(true);
    expect(validClientId('../etc')).toBe(false);
    expect(validClientId('')).toBe(false);
    expect(validClientId(null)).toBe(false);
  });

  it('recognises the placeholder emails of prospect files', () => {
    expect(isProspectEmail(`prospect-1@${PROSPECT_EMAIL_DOMAIN}`)).toBe(true);
    expect(isProspectEmail('dani@example.com')).toBe(false);
    expect(isProspectEmail(null)).toBe(false);
  });
});
