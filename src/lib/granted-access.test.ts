import { describe, expect, it } from 'vitest';
import { addMonths, endOfIsraelDay, grantActive, grantedAccessOf, israelDateInput, readGrantInput } from './granted-access';

const now = new Date('2026-10-15T09:00:00Z');

describe('addMonths', () => {
  it('keeps the day of month and clamps to the end of a short month', () => {
    expect(addMonths('2026-10-15T09:00:00Z', 1).toISOString()).toBe('2026-11-15T09:00:00.000Z');
    expect(addMonths('2027-01-31T09:00:00Z', 1).toISOString()).toBe('2027-02-28T09:00:00.000Z');
    expect(addMonths('2026-10-15T09:00:00Z', 12).toISOString()).toBe('2027-10-15T09:00:00.000Z');
  });
});

describe('endOfIsraelDay', () => {
  it('ends the chosen day by Israel time in summer and winter', () => {
    expect(endOfIsraelDay('2026-10-15')?.toISOString()).toBe('2026-10-15T20:59:59.999Z');
    expect(endOfIsraelDay('2026-12-15')?.toISOString()).toBe('2026-12-15T21:59:59.999Z');
    expect(israelDateInput(endOfIsraelDay('2026-12-15') as Date)).toBe('2026-12-15');
  });

  it('rejects invalid dates', () => {
    expect(endOfIsraelDay('2026-02-30')).toBeNull();
    expect(endOfIsraelDay('tomorrow')).toBeNull();
  });
});

describe('readGrantInput', () => {
  it('reads an end date, inclusive of that day', () => {
    const read = readGrantInput({ until: '2026-12-15', note: '  שילם  בהעברה ' }, now);
    expect('input' in read && read.input.until.toISOString()).toBe('2026-12-15T21:59:59.999Z');
    expect('input' in read && read.input.from).toEqual(now);
    expect('input' in read && read.input.note).toBe('שילם בהעברה');
  });

  it('reads a number of months from the start date', () => {
    const read = readGrantInput({ months: 3 }, now);
    expect('input' in read && read.input.until.toISOString()).toBe('2027-01-15T09:00:00.000Z');
  });

  it('refuses a past, reversed or far-off period', () => {
    expect(readGrantInput({ until: '2026-10-01' }, now)).toEqual({ error: 'תאריך הסיום כבר עבר' });
    expect(readGrantInput({ from: '2027-01-01', until: '2026-12-01' }, now)).toEqual({
      error: 'תאריך הסיום לפני תאריך ההתחלה',
    });
    expect('error' in readGrantInput({ until: '2035-01-01' }, now)).toBe(true);
    expect(readGrantInput({}, now)).toEqual({ error: 'נדרש עד מתי הגישה' });
  });
});

describe('grantedAccessOf', () => {
  it('reports whether the grant is still open and how many days are left', () => {
    const grant = grantedAccessOf(
      { paidAccessFrom: '2026-10-01T00:00:00Z', paidAccessUntil: '2026-10-20T09:00:00Z', paidAccessNote: null },
      now
    );
    expect(grant).toMatchObject({ active: true, daysLeft: 5 });
    expect(grantedAccessOf({ paidAccessFrom: null, paidAccessUntil: null })).toBeNull();
    expect(grantActive('2026-10-14T00:00:00Z', now)).toBe(false);
  });
});
