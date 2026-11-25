import { describe, expect, it } from 'vitest';
import { deviceIssueMessage } from './devices';

describe('deviceIssueMessage', () => {
  it('explains a blocked camera with how to allow it', () => {
    expect(deviceIssueMessage('camera', 'NotAllowedError')).toContain('חוסם את המצלמה');
  });
  it('says when there is no camera at all', () => {
    expect(deviceIssueMessage('camera', 'NotFoundError')).toBe('לא מצאנו מצלמה במכשיר הזה.');
  });
  it('points to another app holding the device', () => {
    expect(deviceIssueMessage('mic', 'NotReadableError')).toContain('תפוסה');
  });
  it('suggests a real browser for unknown failures', () => {
    expect(deviceIssueMessage('camera', undefined)).toContain('כרום או בספארי');
  });
});
