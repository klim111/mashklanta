import { describe, expect, it } from 'vitest';
import {
  formatNumberWithCommas,
  parseNumber,
  formatCurrency,
  formatDate,
  monthsSince,
  yearsSince,
  digitsOnly,
} from '@/lib/principal-approval/format';
import {
  isValidIsraeliId,
  isValidIsraeliPhone,
  isValidZipCode,
  isValidEmail,
  isValidIsoDate,
  validateValue,
  validateFundingTotals,
} from '@/lib/principal-approval/validation';
import {
  BORROWER_FIELDS,
  GUARANTOR_FIELDS,
  INCOME_FIELDS,
  completeness,
  getFieldDef,
  isFieldRequired,
  isFieldVisible,
} from '@/lib/principal-approval/schema';
import {
  employmentStatusToProfile,
  profileKeyFor,
  profileToEmploymentStatus,
  splitFullName,
  valuesDiffer,
} from '@/lib/principal-approval/profile';
import { canEditField } from '@/lib/principal-approval/access';
import type { FieldMeta, ViewerContext } from '@/lib/principal-approval/types';

describe('live number formatting', () => {
  it('groups thousands as the user types', () => {
    expect(formatNumberWithCommas('1')).toBe('1');
    expect(formatNumberWithCommas('12')).toBe('12');
    expect(formatNumberWithCommas('1234')).toBe('1,234');
    expect(formatNumberWithCommas('12345')).toBe('12,345');
    expect(formatNumberWithCommas('123456')).toBe('123,456');
    expect(formatNumberWithCommas('1234567')).toBe('1,234,567');
    expect(formatNumberWithCommas('1234567890')).toBe('1,234,567,890');
  });

  it('re-groups a value that already contains separators', () => {
    expect(formatNumberWithCommas('1,234')).toBe('1,234');
    expect(formatNumberWithCommas('1,2345')).toBe('12,345');
  });

  it('keeps a partially typed decimal intact', () => {
    expect(formatNumberWithCommas('1234.')).toBe('1,234.');
    expect(formatNumberWithCommas('1234.5')).toBe('1,234.5');
    expect(formatNumberWithCommas('1234.567')).toBe('1,234.56');
  });

  it('handles empty, negative and zero-prefixed input', () => {
    expect(formatNumberWithCommas('')).toBe('');
    expect(formatNumberWithCommas('-')).toBe('-');
    expect(formatNumberWithCommas('-12345')).toBe('-12,345');
    expect(formatNumberWithCommas('0012345')).toBe('12,345');
  });

  it('round-trips through parseNumber', () => {
    expect(parseNumber('1,234,567')).toBe(1234567);
    expect(parseNumber('1,234.56')).toBe(1234.56);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber(2500)).toBe(2500);
  });

  it('formats currency and dates for read-only surfaces', () => {
    expect(formatCurrency(1250000)).toContain('₪');
    expect(formatCurrency(null)).toBe('—');
    expect(formatDate('2024-03-07')).toBe('07/03/2024');
    expect(formatDate(null)).toBe('—');
  });

  it('strips non-digits with an optional max length', () => {
    expect(digitsOnly('05-01 234 567')).toBe('0501234567');
    expect(digitsOnly('123456789012', 9)).toBe('123456789');
  });
});

describe('Israeli ID validation', () => {
  it('accepts IDs with a correct check digit', () => {
    // Check digit computed with the standard weighted-sum algorithm.
    expect(isValidIsraeliId('123456782')).toBe(true);
    expect(isValidIsraeliId('000000018')).toBe(true);
  });

  it('pads short IDs on the right side of the number', () => {
    expect(isValidIsraeliId('18')).toBe(true); // same as 000000018
  });

  it('rejects wrong check digits, empty and all-zero IDs', () => {
    expect(isValidIsraeliId('123456789')).toBe(false);
    expect(isValidIsraeliId('')).toBe(false);
    expect(isValidIsraeliId('000000000')).toBe(false);
    expect(isValidIsraeliId('1234567890')).toBe(false);
  });
});

describe('contact detail validation', () => {
  it('validates Israeli mobile and landline numbers', () => {
    expect(isValidIsraeliPhone('050-1234567')).toBe(true);
    expect(isValidIsraeliPhone('0501234567')).toBe(true);
    expect(isValidIsraeliPhone('03-1234567')).toBe(true);
    expect(isValidIsraeliPhone('12345')).toBe(false);
    expect(isValidIsraeliPhone('05012345')).toBe(false);
  });

  it('validates 7-digit postal codes', () => {
    expect(isValidZipCode('1234567')).toBe(true);
    expect(isValidZipCode('12345')).toBe(false);
  });

  it('validates emails and ISO dates', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2023-02-29')).toBe(false);
    expect(isValidIsoDate('07/03/2024')).toBe(false);
  });
});

describe('field-level validation', () => {
  const idField = getFieldDef('borrower', 'idNumber')!;

  it('only complains about an empty value when the field is required', () => {
    expect(validateValue({ ...idField, required: false }, '').valid).toBe(true);
    expect(validateValue({ ...idField, required: true }, '').valid).toBe(false);
  });

  it('reports a specific message per field kind', () => {
    expect(validateValue(idField, '123456789').error).toContain('תעודת זהות');
    const zip = getFieldDef('borrower', 'zipCode')!;
    expect(validateValue(zip, '123').error).toContain('7 ספרות');
    const money = getFieldDef('case', 'totalEquity')!;
    expect(validateValue(money, '-5').valid).toBe(false);
    expect(validateValue(money, '350,000').valid).toBe(true);
  });

  it('enforces integer bounds on the children count', () => {
    const children = getFieldDef('borrower', 'childrenUnder21')!;
    expect(validateValue(children, 3).valid).toBe(true);
    expect(validateValue(children, 3.5).valid).toBe(false);
    expect(validateValue(children, 30).valid).toBe(false);
  });

  it('restricts select values to the declared options', () => {
    const employment = getFieldDef('borrower', 'employmentStatus')!;
    expect(validateValue(employment, 'employee').valid).toBe(true);
    expect(validateValue(employment, 'astronaut').valid).toBe(false);
  });
});

describe('conditional fields', () => {
  it('shows the citizenship countries only after "yes"', () => {
    const field = getFieldDef('borrower', 'foreignCitizenshipCountries')!;
    expect(isFieldVisible(field, { hasForeignCitizenship: false })).toBe(false);
    expect(isFieldVisible(field, { hasForeignCitizenship: true })).toBe(true);
    expect(isFieldRequired(field, { hasForeignCitizenship: true })).toBe(true);
    expect(isFieldRequired(field, { hasForeignCitizenship: false })).toBe(false);
  });

  it('shows employer details only for salaried and self-employed income', () => {
    const employer = INCOME_FIELDS.find((f) => f.key === 'employerName')!;
    expect(isFieldVisible(employer, { incomeType: 'salary' })).toBe(true);
    expect(isFieldVisible(employer, { incomeType: 'self_employed' })).toBe(true);
    expect(isFieldVisible(employer, { incomeType: 'pension' })).toBe(false);
  });

  it('shows the eligibility amount only when eligibility exists', () => {
    const amount = getFieldDef('case', 'eligibilityAmount')!;
    expect(isFieldVisible(amount, { hasEligibility: true })).toBe(true);
    expect(isFieldVisible(amount, { hasEligibility: false })).toBe(false);
  });

  it('counts only visible required fields towards completeness', () => {
    const withoutForeign = completeness('borrower', { hasForeignCitizenship: false });
    const withForeign = completeness('borrower', { hasForeignCitizenship: true });
    expect(withForeign.total).toBe(withoutForeign.total + 1);
    // The answered "אזרחות זרה" question itself counts as one filled field.
    expect(withoutForeign.filled).toBe(1);
    expect(withoutForeign.missing.some((f) => f.key === 'foreignCitizenshipCountries')).toBe(false);
    expect(withForeign.missing.some((f) => f.key === 'foreignCitizenshipCountries')).toBe(true);
    expect(completeness('borrower', {}).ratio).toBe(0);
  });
});

describe('guarantors mirror the borrower field set', () => {
  it('collects every borrower field plus the relation to the borrower', () => {
    for (const field of BORROWER_FIELDS) {
      expect(GUARANTOR_FIELDS.some((f) => f.key === field.key)).toBe(true);
    }
    expect(GUARANTOR_FIELDS.some((f) => f.key === 'relationToBorrower')).toBe(true);
  });
});

describe('funding sources reconciliation', () => {
  it('accepts sources that add up to the declared equity', () => {
    const result = validateFundingTotals(
      [{ amount: 500000 }, { amount: 250000 }, { amount: 100000 }],
      850000,
    );
    expect(result.valid).toBe(true);
    expect(result.sum).toBe(850000);
  });

  it('reports the gap when the sources do not add up', () => {
    const result = validateFundingTotals([{ amount: 500000 }], 850000);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(-350000);
    expect(result.error).toContain('נמוך');
  });

  it('requires the equity figure itself', () => {
    expect(validateFundingTotals([{ amount: 1000 }], null).valid).toBe(false);
  });

  it('absorbs rounding of up to one shekel', () => {
    expect(validateFundingTotals([{ amount: 849999.5 }], 850000).valid).toBe(true);
  });
});

describe('profile sync', () => {
  it('maps the equity field on the case', () => {
    expect(profileKeyFor('case', 'totalEquity', null)).toBe('equity');
    expect(profileKeyFor('case', 'propertyCity', null)).toBeNull();
    expect(profileKeyFor('income', 'employerName', null)).toBeNull();
  });

  it('maps employment status to the borrower and their partner by position', () => {
    expect(profileKeyFor('borrower', 'employmentStatus', 0)).toBe('employmentType');
    expect(profileKeyFor('borrower', 'employmentStatus', 1)).toBe('partnerEmploymentType');
    // The profile only describes a borrower and one partner.
    expect(profileKeyFor('borrower', 'employmentStatus', 2)).toBeNull();
  });

  it('does not sync fields the profile cannot express', () => {
    expect(profileKeyFor('borrower', 'firstName', 0)).toBeNull();
    expect(profileKeyFor('borrower', 'idNumber', 0)).toBeNull();
  });

  it('converts employment status both ways, and refuses what does not map', () => {
    expect(employmentStatusToProfile('employee')).toBe('SALARIED');
    expect(employmentStatusToProfile('employee_and_self')).toBe('SALARIED');
    expect(employmentStatusToProfile('self_employed')).toBe('SELF_EMPLOYED');
    // The profile has no value for these, so no false conflict is raised.
    expect(employmentStatusToProfile('pensioner')).toBeNull();
    expect(employmentStatusToProfile('unemployed')).toBeNull();

    expect(profileToEmploymentStatus('SALARIED')).toBe('employee');
    expect(profileToEmploymentStatus('SELF_EMPLOYED')).toBe('self_employed');
    expect(profileToEmploymentStatus(null)).toBeNull();
  });

  it('splits a stored full name for pre-fill', () => {
    expect(splitFullName('ישראל ישראלי')).toEqual({ firstName: 'ישראל', lastName: 'ישראלי' });
    expect(splitFullName('  דוד  בן  גוריון ')).toEqual({ firstName: 'דוד', lastName: 'בן גוריון' });
    expect(splitFullName('מדונה')).toEqual({ firstName: 'מדונה', lastName: '' });
    expect(splitFullName('')).toBeNull();
    expect(splitFullName(null)).toBeNull();
  });

  it('treats normalised equal values as identical', () => {
    expect(valuesDiffer('ישראל', 'ישראל')).toBe(false);
    expect(valuesDiffer(1000, '1000')).toBe(false);
    expect(valuesDiffer(true, 'true')).toBe(false);
    expect(valuesDiffer(['US', 'FR'], ['FR', 'US'])).toBe(false);
  });

  it('flags genuinely different values as a conflict', () => {
    expect(valuesDiffer('ישראל', 'ישראלה')).toBe(true);
    expect(valuesDiffer(1000, 2000)).toBe(true);
  });

  it('never raises a conflict against an empty side', () => {
    expect(valuesDiffer('', 'ישראל')).toBe(false);
    expect(valuesDiffer(null, 'ישראל')).toBe(false);
  });
});

describe('advisor edit permissions', () => {
  const advisorNoGrant: ViewerContext = { id: 'a1', name: 'יועץ', role: 'advisor', canEditClientFields: false };
  const advisorGranted: ViewerContext = { ...advisorNoGrant, canEditClientFields: true };
  const client: ViewerContext = { id: 'c1', name: 'לקוח', role: 'client', canEditClientFields: true };

  const meta = (source: FieldMeta['source']): FieldMeta => ({ source, updatedAt: new Date().toISOString() });

  it('lets the client edit anything in their own file', () => {
    expect(canEditField(client, meta('advisor'))).toBe(true);
    expect(canEditField(client, meta('client'))).toBe(true);
  });

  it('locks client-entered fields for an advisor without a grant', () => {
    expect(canEditField(advisorNoGrant, meta('client'))).toBe(false);
    expect(canEditField(advisorNoGrant, meta('profile'))).toBe(false);
  });

  it('lets an advisor edit empty fields and their own entries', () => {
    expect(canEditField(advisorNoGrant, undefined)).toBe(true);
    expect(canEditField(advisorNoGrant, meta('advisor'))).toBe(true);
  });

  it('unlocks everything once the client grants permission', () => {
    expect(canEditField(advisorGranted, meta('client'))).toBe(true);
  });
});

describe('employment seniority', () => {
  it('measures months and years since a date', () => {
    const now = new Date('2025-06-15T00:00:00Z');
    expect(monthsSince('2025-01-15', now)).toBe(5);
    expect(monthsSince('2024-06-15', now)).toBe(12);
    expect(yearsSince('1990-06-16', now)).toBe(34);
    expect(monthsSince(null)).toBeNull();
  });
});
