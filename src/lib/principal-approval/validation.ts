/**
 * Field-level validation for the principal-approval intake.
 * Everything here is pure so the same rules run while typing in the browser and
 * again on the server before a value is persisted.
 */

import { digitsOnly, parseNumber, stripGrouping } from './format';

export type ValidationResult = { valid: boolean; error?: string };

export const OK: ValidationResult = { valid: true };
export const fail = (error: string): ValidationResult => ({ valid: false, error });

/**
 * Israeli ID (תעודת זהות) check digit — the standard weighted-sum algorithm.
 * IDs shorter than 9 digits are right-padded with leading zeros, as printed on
 * older certificates.
 */
export function isValidIsraeliId(value: string): boolean {
  const digits = digitsOnly(String(value ?? ''));
  if (digits.length === 0 || digits.length > 9) return false;
  const padded = digits.padStart(9, '0');
  if (/^0{9}$/.test(padded)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    let step = Number(padded[i]) * ((i % 2) + 1);
    if (step > 9) step -= 9;
    sum += step;
  }
  return sum % 10 === 0;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(String(value ?? '').trim());
}

/** Israeli mobile / landline numbers, with or without separators. */
export function isValidIsraeliPhone(value: string): boolean {
  const digits = digitsOnly(String(value ?? ''));
  if (/^0(5\d|7\d)\d{7}$/.test(digits)) return true; // mobile / VOB, 10 digits
  if (/^0[23489]\d{7}$/.test(digits)) return true; // landline, 9 digits
  return false;
}

/** Israeli postal code — 7 digits since 2013. */
export function isValidZipCode(value: string): boolean {
  return /^\d{7}$/.test(digitsOnly(String(value ?? '')));
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return value === d.toISOString().slice(0, 10);
}

export function isValidBankAccountNumber(value: string): boolean {
  const digits = digitsOnly(String(value ?? ''));
  return digits.length >= 4 && digits.length <= 12;
}

/** Names: Hebrew/Latin letters, spaces, quotes and hyphens only. */
export function isValidPersonName(value: string): boolean {
  const v = String(value ?? '').trim();
  return v.length >= 2 && v.length <= 40 && /^[\u0590-\u05FFA-Za-z'"\u2019\-\s]+$/.test(v);
}

export type FieldKind =
  | 'text'
  | 'name'
  | 'israeliId'
  | 'date'
  | 'pastDate'
  | 'futureDate'
  | 'email'
  | 'phone'
  | 'zip'
  | 'number'
  | 'money'
  | 'percent'
  | 'integer'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'bankAccount'
  | 'textarea'
  /** מפת מסמך→נאסף */
  | 'documents'
  /** ריביות הסלים האחידים: סל → מסלול → ריבית */
  | 'basketRates';

export interface ValidatableField {
  kind: FieldKind;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Validates a raw (display) value against a field definition.
 * Empty values only fail when the field is required, so the form can validate
 * on every keystroke without shouting at a user who has not finished typing.
 */
export function validateValue(field: ValidatableField, rawValue: unknown): ValidationResult {
  const isEmpty =
    rawValue === null ||
    rawValue === undefined ||
    (typeof rawValue === 'string' && rawValue.trim() === '') ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (isEmpty) {
    return field.required ? fail(`יש למלא ${field.label}`) : OK;
  }

  const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

  switch (field.kind) {
    case 'name':
      return isValidPersonName(String(value)) ? OK : fail('שם יכול להכיל אותיות בלבד (2-40 תווים)');

    case 'israeliId':
      return isValidIsraeliId(String(value)) ? OK : fail('תעודת זהות אינה תקינה — יש להזין 9 ספרות כולל ספרת ביקורת');

    case 'email':
      return isValidEmail(String(value)) ? OK : fail('כתובת אימייל אינה תקינה');

    case 'phone':
      return isValidIsraeliPhone(String(value)) ? OK : fail('מספר טלפון אינו תקין (לדוגמה 050-1234567)');

    case 'zip':
      return isValidZipCode(String(value)) ? OK : fail('מיקוד חייב להכיל 7 ספרות');

    case 'bankAccount':
      return isValidBankAccountNumber(String(value)) ? OK : fail('מספר חשבון חייב להכיל בין 4 ל-12 ספרות');

    case 'date':
    case 'pastDate':
    case 'futureDate': {
      const v = String(value);
      if (!isValidIsoDate(v)) return fail('תאריך אינו תקין');
      if (field.kind === 'pastDate' && v > todayIso()) return fail('התאריך לא יכול להיות עתידי');
      if (field.kind === 'futureDate' && v < todayIso()) return fail('התאריך חייב להיות עתידי');
      return OK;
    }

    case 'number':
    case 'money':
    case 'percent':
    case 'integer': {
      const raw = typeof value === 'string' ? stripGrouping(value) : value;
      const n = parseNumber(raw as string);
      if (n === null) return fail('יש להזין מספר תקין');
      if (field.kind === 'integer' && !Number.isInteger(n)) return fail('יש להזין מספר שלם');
      if (field.kind === 'money' && n < 0) return fail('הסכום לא יכול להיות שלילי');
      if (field.kind === 'percent' && (n < 0 || n > 100)) return fail('אחוז חייב להיות בין 0 ל-100');
      if (field.min !== undefined && n < field.min) return fail(`הערך חייב להיות לפחות ${field.min}`);
      if (field.max !== undefined && n > field.max) return fail(`הערך לא יכול לעלות על ${field.max}`);
      return OK;
    }

    case 'select':
      if (field.options && !field.options.some((o) => o.value === String(value))) {
        return fail('יש לבחור ערך מהרשימה');
      }
      return OK;

    case 'multiselect': {
      const arr = Array.isArray(value) ? value : [value];
      if (field.options && !arr.every((v) => field.options!.some((o) => o.value === String(v)))) {
        return fail('אחת הבחירות אינה מהרשימה');
      }
      return OK;
    }

    case 'boolean':
      return typeof value === 'boolean' || value === 'true' || value === 'false'
        ? OK
        : fail('יש לבחור כן או לא');

    case 'documents': {
      if (typeof value !== 'object' || Array.isArray(value)) return fail('רשימת המסמכים אינה תקינה');
      return OK;
    }

    case 'basketRates': {
      if (typeof value !== 'object' || Array.isArray(value)) return fail('הריביות אינן תקינות');
      for (const perBasket of Object.values(value as Record<string, unknown>)) {
        if (perBasket === null || typeof perBasket !== 'object') return fail('הריביות אינן תקינות');
        for (const rate of Object.values(perBasket as Record<string, unknown>)) {
          if (rate === null || rate === undefined || rate === '') continue;
          const n = Number(rate);
          if (!Number.isFinite(n) || n < 0 || n > 20) return fail('ריבית חייבת להיות בין 0 ל-20 אחוזים');
        }
      }
      return OK;
    }

    case 'textarea':
    case 'text':
    default: {
      const v = String(value);
      if (v.length > 500) return fail('הטקסט ארוך מדי (עד 500 תווים)');
      return OK;
    }
  }
}

/**
 * Checks that the declared funding sources add up to the declared total equity.
 * A tolerance of 1 ₪ absorbs rounding.
 */
export function validateFundingTotals(
  sources: { amount: number | null }[],
  declaredEquity: number | null,
  tolerance = 1,
): ValidationResult & { sum: number; difference: number } {
  const sum = sources.reduce((acc, s) => acc + (s.amount ?? 0), 0);
  const target = declaredEquity ?? 0;
  const difference = Number((sum - target).toFixed(2));
  if (declaredEquity === null) {
    return { valid: false, error: 'יש להזין את סכום ההון העצמי הכולל', sum, difference };
  }
  if (Math.abs(difference) <= tolerance) {
    return { valid: true, sum, difference };
  }
  const verb = difference > 0 ? 'גבוה מ' : 'נמוך מ';
  return {
    valid: false,
    error: `סך מקורות המימון ${verb}הון העצמי שהוזן בהפרש של ${Math.abs(difference).toLocaleString('he-IL')} ₪`,
    sum,
    difference,
  };
}
