import { describe, expect, it } from 'vitest';
import {
  detectBrand,
  expiryValid,
  formatCardNumber,
  formatExpiry,
  luhnValid,
  validateCheckout,
} from './platform-access';

const NOW = new Date('2026-09-16T10:00:00Z');

const valid = {
  holderName: 'ישראל ישראלי',
  email: 'israel@example.com',
  phone: '050-1234567',
  idNumber: '123456789',
  cardNumber: '4580 4580 4580 4580',
  expiry: '12/28',
  cvv: '123',
};

describe('luhnValid', () => {
  it('מקבל מספרים תקינים ודוחה שגויים', () => {
    expect(luhnValid('4580458045804580')).toBe(true);
    expect(luhnValid('4580458045804581')).toBe(false);
    expect(luhnValid('123')).toBe(false);
  });
});

describe('expiryValid', () => {
  it('תקף עד סוף החודש הנקוב', () => {
    expect(expiryValid('09/26', NOW)).toBe(true);
    expect(expiryValid('08/26', NOW)).toBe(false);
    expect(expiryValid('13/27', NOW)).toBe(false);
    expect(expiryValid('1/2030', NOW)).toBe(true);
  });
});

describe('validateCheckout', () => {
  it('פרטים תקינים — שומרים רק מותג וארבע ספרות', () => {
    const result = validateCheckout(valid, NOW);
    expect(result.ok).toBe(true);
    expect(result.card).toEqual({ brand: 'visa', last4: '4580' });
  });

  it('קוד אבטחה חייב להיות שלוש ספרות', () => {
    const result = validateCheckout({ ...valid, cvv: '12' }, NOW);
    expect(result.ok).toBe(false);
    expect(result.errors.cvv).toBeTruthy();
    expect(result.card).toBeNull();
  });

  it('כרטיס שפג תוקפו נדחה', () => {
    const result = validateCheckout({ ...valid, expiry: '01/20' }, NOW);
    expect(result.errors.expiry).toBeTruthy();
  });

  it('מספר כרטיס שגוי נדחה', () => {
    const result = validateCheckout({ ...valid, cardNumber: '4580 4580 4580 4581' }, NOW);
    expect(result.errors.cardNumber).toBeTruthy();
  });

  it('טלפון ותעודת זהות הם רשות, אבל כשמוזנים חייבים להיות תקינים', () => {
    expect(validateCheckout({ ...valid, phone: '', idNumber: '' }, NOW).ok).toBe(true);
    expect(validateCheckout({ ...valid, idNumber: '12' }, NOW).errors.idNumber).toBeTruthy();
  });
});

describe('formatting', () => {
  it('מרווח את מספר הכרטיס ומוסיף סלאש לתוקף', () => {
    expect(formatCardNumber('4580458045804580')).toBe('4580 4580 4580 4580');
    expect(formatExpiry('1228')).toBe('12/28');
    expect(detectBrand('5412')).toBe('mastercard');
  });
});
