/**
 * אימות פרטי התשלום לרכישת גישה לפלטפורמה.
 *
 * טהור בכוונה — נבדק בבדיקות יחידה ורץ בשרת. מספר הכרטיס המלא לעולם אינו
 * נשמר: אחרי האימות נשארות רק ארבע הספרות האחרונות והמותג, לרשומת התשלום.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | 'isracard' | 'unknown';

export interface CheckoutInput {
  holderName: string;
  email: string;
  phone?: string;
  idNumber?: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export interface CheckoutValidation {
  ok: boolean;
  /** הודעה בעברית לכל שדה שנכשל */
  errors: Partial<Record<keyof CheckoutInput, string>>;
  /** הפרטים שמותר לשמור */
  card: { brand: CardBrand; last4: string } | null;
}

export function digitsOnly(value: string): string {
  return (value ?? '').replace(/\D+/g, '');
}

/** בדיקת Luhn על ספרות הכרטיס */
export function luhnValid(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^3(0[0-5]|[68])/.test(digits)) return 'diners';
  return 'unknown';
}

/** MM/YY או MM/YYYY → האם הכרטיס עדיין בתוקף בסוף החודש הנקוב */
export function expiryValid(expiry: string, now = new Date()): boolean {
  const match = /^\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})\s*$/.exec(expiry ?? '');
  if (!match) return false;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return false;
  const rawYear = Number(match[2]);
  const year = match[2].length === 2 ? 2000 + rawYear : rawYear;
  // הכרטיס תקף עד סוף החודש, ולכן משווים לתחילת החודש שאחריו
  const expiresAt = new Date(year, month, 1);
  return expiresAt > now;
}

export function validateCheckout(input: CheckoutInput, now = new Date()): CheckoutValidation {
  const errors: CheckoutValidation['errors'] = {};

  const holder = (input.holderName ?? '').trim();
  if (holder.length < 2) errors.holderName = 'נדרש שם בעל הכרטיס';

  const email = (input.email ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'כתובת המייל אינה תקינה';

  const phone = digitsOnly(input.phone ?? '');
  if (input.phone && (phone.length < 9 || phone.length > 13)) errors.phone = 'מספר הטלפון אינו תקין';

  const idNumber = digitsOnly(input.idNumber ?? '');
  if (input.idNumber && idNumber.length !== 9) errors.idNumber = 'תעודת זהות היא 9 ספרות';

  const digits = digitsOnly(input.cardNumber ?? '');
  const brand = detectBrand(digits);
  if (!luhnValid(digits)) errors.cardNumber = 'מספר הכרטיס אינו תקין';

  if (!expiryValid(input.expiry ?? '', now)) errors.expiry = 'תוקף הכרטיס אינו תקין או שפג';

  const cvv = digitsOnly(input.cvv ?? '');
  const cvvLength = brand === 'amex' ? 4 : 3;
  if (cvv.length !== cvvLength) errors.cvv = `קוד האבטחה הוא ${cvvLength} ספרות בגב הכרטיס`;

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    card: ok ? { brand, last4: digits.slice(-4) } : null,
  };
}

/** "4580 1234 5678 9012" — ריווח כל ארבע ספרות בזמן ההקלדה */
export function formatCardNumber(value: string): string {
  return digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** "12/28" — סלאש אוטומטי אחרי החודש */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
