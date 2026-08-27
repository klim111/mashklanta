import { describe, expect, it } from 'vitest';
import {
  formatNumberInput,
  parseDecimalInput,
  parseFormattedNumberInput,
  sanitizeDecimalInput,
} from './currency';

describe('הזנת מספרים', () => {
  it('מעצב פסיקי אלפים בלי לאבד ספרות', () => {
    expect(parseFormattedNumberInput(formatNumberInput('1500000'))).toBe(1_500_000);
    expect(parseFormattedNumberInput('1,500,000')).toBe(1_500_000);
    expect(parseFormattedNumberInput('')).toBe(0);
  });

  it('משאיר נקודה עשרונית באמצע ההקלדה', () => {
    expect(sanitizeDecimalInput('4.')).toBe('4.');
    expect(sanitizeDecimalInput('4.7')).toBe('4.7');
    expect(sanitizeDecimalInput('4.7.2')).toBe('4.72');
    expect(sanitizeDecimalInput('1,234.5')).toBe('1234.5');
  });

  it('לא הופך נקודה או שדה ריק לאפס', () => {
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('.')).toBeNull();
    expect(parseDecimalInput('4.')).toBe(4);
    expect(parseDecimalInput('4.75')).toBe(4.75);
  });
});
