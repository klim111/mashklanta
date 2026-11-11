import { describe, expect, it } from 'vitest';
import { isZeroValue } from './caret';

describe('isZeroValue', () => {
  it('treats a lone zero as a starting value', () => {
    expect(isZeroValue('0')).toBe(true);
    expect(isZeroValue('0.0')).toBe(true);
    expect(isZeroValue('0,00')).toBe(true);
  });

  it('keeps anything the user typed', () => {
    expect(isZeroValue('')).toBe(false);
    expect(isZeroValue('10')).toBe(false);
    expect(isZeroValue('0.5')).toBe(false);
  });
});
