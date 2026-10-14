import { describe, expect, it, vi } from 'vitest';
import { TokenVerifier } from 'livekit-server-sdk';

const findUnique = vi.fn();
const findFirst = vi.fn();
vi.mock('./db', () => ({
  prisma: { advisorMeeting: { findUnique: (...args: unknown[]) => findUnique(...args) }, mortgagePlan: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}));

import { meetingCallInfo, meetingCallOpen, meetingCallToken, meetingRoomName } from './meeting-call';

const meeting = {
  id: 'm1',
  title: 'פגישת ייעוץ',
  startsAt: new Date('2026-10-14T10:00:00Z'),
  durationMinutes: 45,
  status: 'CONFIRMED',
  advisorId: 'adv',
  clientId: 'c1',
  advisor: { name: 'דנה', email: 'd@x.dev' },
  client: { name: 'רון', userId: 'cli' },
};

describe('meetingCallInfo', () => {
  it('opens the call to the advisor and the client of the meeting only', async () => {
    findUnique.mockResolvedValue(meeting);
    findFirst.mockResolvedValue({ id: 'plan1' });

    const advisor = await meetingCallInfo('adv', 'm1');
    expect(advisor).toMatchObject({ role: 'ADVISOR', clientUserId: 'cli', planId: 'plan1' });

    const client = await meetingCallInfo('cli', 'm1');
    expect(client?.role).toBe('CLIENT');

    expect(await meetingCallInfo('someone-else', 'm1')).toBeNull();
  });

  it('closes the call once the meeting was cancelled or declined', () => {
    expect(meetingCallOpen({ status: 'CONFIRMED' })).toBe(true);
    expect(meetingCallOpen({ status: 'PROPOSED' })).toBe(true);
    expect(meetingCallOpen({ status: 'CANCELLED' })).toBe(false);
    expect(meetingCallOpen({ status: 'DECLINED' })).toBe(false);
  });
});

describe('meetingCallToken', () => {
  it('grants the meeting room only, under the participant role', async () => {
    findUnique.mockResolvedValue(meeting);
    findFirst.mockResolvedValue(null);
    const info = (await meetingCallInfo('cli', 'm1'))!;
    const config = { apiKey: 'key', apiSecret: 'secret-that-is-long-enough-for-hs256' };
    const jwt = await meetingCallToken(info, 'cli', config);
    const claims = await new TokenVerifier(config.apiKey, config.apiSecret).verify(jwt);
    expect(claims.sub).toBe('client:cli');
    expect(claims.name).toBe('רון');
    expect(claims.video).toMatchObject({ room: meetingRoomName('m1'), roomJoin: true, canPublishData: true });
  });
});
