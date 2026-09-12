import { decryptNumber, encryptNumber } from './crypto';

export { incomeBucketFor } from './income-buckets';

/**
 * הנתונים הפיננסיים של הלקוח נשמרים מוצפנים, ולכן כל קריאה וכתיבה שלהם עוברת
 * דרך המודול הזה. בשאר הקוד הם נראים כמספרים רגילים.
 */

export const ENCRYPTED_FINANCIAL_FIELDS = [
  'income',
  'partnerIncome',
  'expenses',
  'existingLoans',
  'creditScore',
  'downPayment',
] as const;

export type EncryptedFinancialField = (typeof ENCRYPTED_FINANCIAL_FIELDS)[number];

/** שדות שהם מספר שלם מטבעם, ולכן מעוגלים לפני ההצפנה */
const INTEGER_FIELDS = new Set<EncryptedFinancialField>(['creditScore']);

export type ClientFinancials = Record<EncryptedFinancialField, number | null>;

/** צורת העמודות במסד: אותם שמות עם סיומת Enc */
export type EncryptedFinancialColumns = {
  [Field in EncryptedFinancialField as `${Field}Enc`]: string | null;
};

export function encryptedColumnFor(field: EncryptedFinancialField): keyof EncryptedFinancialColumns {
  return `${field}Enc` as keyof EncryptedFinancialColumns;
}

export function decryptFinancials(row: Partial<EncryptedFinancialColumns>): ClientFinancials {
  const result = {} as ClientFinancials;

  for (const field of ENCRYPTED_FINANCIAL_FIELDS) {
    // שם השדה משמש כ-AAD בהצפנה, ולכן חייב להיות זהה בכיוון השני
    result[field] = decryptNumber(row[encryptedColumnFor(field)], field);
  }

  return result;
}

export function encryptFinancialField(
  field: EncryptedFinancialField,
  value: number | null
): string | null {
  if (value === null) return null;
  return encryptNumber(INTEGER_FIELDS.has(field) ? Math.round(value) : value, field);
}

export function encryptFinancials(financials: ClientFinancials): EncryptedFinancialColumns {
  const result = {} as EncryptedFinancialColumns;
  for (const field of ENCRYPTED_FINANCIAL_FIELDS) {
    result[encryptedColumnFor(field)] = encryptFinancialField(field, financials[field]);
  }
  return result;
}

