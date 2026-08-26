import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { resetEncryptionKeyCache } from './crypto';
import {
  decryptFinancials,
  encryptFinancials,
  incomeBucketFor,
} from './client-financials';

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  resetEncryptionKeyCache();
});

describe('incomeBucketFor', () => {
  it('לא מייצר טווח כשאין נתוני הכנסה כלל', () => {
    expect(incomeBucketFor(null, null)).toBeNull();
  });

  it('סוכם את הכנסת שני בני הזוג', () => {
    expect(incomeBucketFor(9_000, 5_000)).toBe('FROM_10K_TO_15K');
    expect(incomeBucketFor(20_000, 20_000)).toBe('ABOVE_40K');
  });

  it('משייך לגבולות הטווחים לפי הקצה התחתון', () => {
    expect(incomeBucketFor(0, null)).toBe('UNDER_10K');
    expect(incomeBucketFor(9_999, null)).toBe('UNDER_10K');
    expect(incomeBucketFor(10_000, null)).toBe('FROM_10K_TO_15K');
    expect(incomeBucketFor(15_000, null)).toBe('FROM_15K_TO_25K');
    expect(incomeBucketFor(25_000, null)).toBe('FROM_25K_TO_40K');
    expect(incomeBucketFor(40_000, null)).toBe('ABOVE_40K');
  });
});

describe('encryptFinancials', () => {
  it('מפענח בחזרה את כל השדות, כולל null', () => {
    const original = {
      income: 18_000,
      partnerIncome: 12_500.5,
      expenses: 9_000,
      existingLoans: 2_300,
      creditScore: 720,
      downPayment: null,
    };

    expect(decryptFinancials(encryptFinancials(original))).toEqual(original);
  });

  it('לא שומר את הערך הגולמי בטקסט המוצפן', () => {
    const encrypted = encryptFinancials({
      income: 18_000,
      partnerIncome: null,
      expenses: null,
      existingLoans: null,
      creditScore: null,
      downPayment: null,
    });

    expect(encrypted.incomeEnc).not.toContain('18000');
    expect(encrypted.partnerIncomeEnc).toBeNull();
  });
});
