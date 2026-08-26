import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { clientUpdateData } from './clients';
import { decryptFinancials } from './client-financials';
import type { ClientFinancials } from './client-financials';
import { resetEncryptionKeyCache } from './crypto';

const emptyFinancials: ClientFinancials = {
  income: null,
  partnerIncome: null,
  expenses: null,
  existingLoans: null,
  creditScore: null,
  downPayment: null,
};

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  resetEncryptionKeyCache();
});

describe('clientUpdateData', () => {
  it('מצפין שדות פיננסיים ומחשב טווח הכנסה', () => {
    const data = clientUpdateData({ income: 12_000, partnerIncome: 8_000 }, emptyFinancials);

    expect(data.income).toBeUndefined();
    expect(data.incomeEnc).toEqual(expect.any(String));
    expect(data.partnerIncomeEnc).toEqual(expect.any(String));
    expect(data.incomeBucket).toBe('FROM_15K_TO_25K');

    const decrypted = decryptFinancials({
      incomeEnc: data.incomeEnc as string,
      partnerIncomeEnc: data.partnerIncomeEnc as string,
    });
    expect(decrypted.income).toBe(12_000);
    expect(decrypted.partnerIncome).toBe(8_000);
  });

  it('משתמש בערך הקיים של בן הזוג כשמעדכנים הכנסה אחת בלבד', () => {
    const data = clientUpdateData({ income: 30_000 }, { ...emptyFinancials, partnerIncome: 12_000 });
    expect(data.incomeBucket).toBe('ABOVE_40K');
    expect(data.partnerIncomeEnc).toBeUndefined();
  });

  it('לא נוגע בשדות פיננסיים כשמעדכנים רק שם', () => {
    const data = clientUpdateData({ name: 'דנה' }, { ...emptyFinancials, income: 20_000 });
    expect(data.name).toBe('דנה');
    expect(data.incomeEnc).toBeUndefined();
    expect(data.incomeBucket).toBeUndefined();
  });
});
