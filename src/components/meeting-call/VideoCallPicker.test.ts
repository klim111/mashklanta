import { describe, expect, it } from 'vitest';
import { joinableMeetings } from './VideoCallPicker';

const now = new Date('2026-10-14T10:00:00Z').getTime();
const meeting = (id: string, startsAt: string, status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED') => ({
  id,
  title: id,
  startsAt,
  durationMinutes: 45,
  status,
});

describe('joinableMeetings', () => {
  it('keeps live meetings that have not ended, nearest first', () => {
    const result = joinableMeetings(
      [
        meeting('later', '2026-10-15T10:00:00Z'),
        meeting('ended', '2026-10-14T08:00:00Z'),
        meeting('now', '2026-10-14T09:30:00Z'),
        meeting('cancelled', '2026-10-14T11:00:00Z', 'CANCELLED'),
        meeting('proposed', '2026-10-14T12:00:00Z', 'PROPOSED'),
      ],
      now
    );
    expect(result.map((m) => m.id)).toEqual(['now', 'proposed', 'later']);
  });
});
