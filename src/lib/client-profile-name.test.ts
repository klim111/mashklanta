import { describe, expect, it } from 'vitest';
import { splitFullName, withRegisteredName } from './client-profile';

describe('שם הלווה מתוך שם ההרשמה', () => {
  it('מפצלת לשם פרטי ושם משפחה', () => {
    expect(splitFullName('  ישראל  ישראלי כהן ')).toEqual({ firstName: 'ישראל', lastName: 'ישראלי כהן' });
    expect(splitFullName('דנה')).toEqual({ firstName: 'דנה', lastName: '' });
    expect(splitFullName(null)).toEqual({ firstName: '', lastName: '' });
  });

  it('ממלאת רק כשלא הוזן שם', () => {
    expect(withRegisteredName({ firstName: '', lastName: '' }, 'ישראל ישראלי')).toEqual({
      firstName: 'ישראל',
      lastName: 'ישראלי',
    });
    const typed = { firstName: 'משה', lastName: '' };
    expect(withRegisteredName(typed, 'ישראל ישראלי')).toBe(typed);
    const empty = { firstName: '', lastName: '' };
    expect(withRegisteredName(empty, '  ')).toBe(empty);
  });
});
