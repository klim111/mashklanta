import { describe, expect, it } from 'vitest';
import { meetingAlertKey, pendingMeetingAlerts } from './meeting-alerts';

const now = new Date('2026-10-14T10:00:00Z').getTime();
const meeting = (
  id: string,
  startsAt: string,
  status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED' = 'PROPOSED',
  proposedBy: 'ADVISOR' | 'CLIENT' = 'ADVISOR'
) => ({ id, startsAt, durationMinutes: 45, status, proposedBy });

describe('pendingMeetingAlerts', () => {
  it('alerts on upcoming meetings the advisor set, nearest first', () => {
    const result = pendingMeetingAlerts(
      [
        meeting('later', '2026-10-20T10:00:00Z', 'CONFIRMED'),
        meeting('soon', '2026-10-15T10:00:00Z'),
        meeting('past', '2026-10-13T10:00:00Z'),
        meeting('cancelled', '2026-10-16T10:00:00Z', 'CANCELLED'),
        meeting('mine', '2026-10-16T10:00:00Z', 'PROPOSED', 'CLIENT'),
      ],
      new Set(),
      now
    );
    expect(result.map((m) => m.id)).toEqual(['soon', 'later']);
  });

  it('skips seen alerts, but alerts again when the time moves', () => {
    const seen = new Set([meetingAlertKey(meeting('a', '2026-10-15T10:00:00Z'))]);
    expect(pendingMeetingAlerts([meeting('a', '2026-10-15T10:00:00Z')], seen, now)).toEqual([]);
    expect(pendingMeetingAlerts([meeting('a', '2026-10-16T10:00:00Z')], seen, now)).toHaveLength(1);
  });
});
