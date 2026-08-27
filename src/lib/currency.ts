/**
 * פונקציות עזר לעיצוב מטבע ישראלי
 */

const ilsFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ilsFormatterWithDecimals = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatILS(amount: number, showDecimals = false): string {
  if (showDecimals) {
    return ilsFormatterWithDecimals.format(amount);
  }
  return ilsFormatter.format(amount);
}

export function formatPercent(rate: number, decimals = 2): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rate / 100);
}

export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/** מעצב מספר בזמן הקלדה עם פסיקים (למשל 100000 → 100,000) */
export function formatNumberInput(value: string): string {
  const cleanValue = value.replace(/[^\d]/g, '');
  if (cleanValue === '') return '';
  const numValue = parseInt(cleanValue, 10);
  if (isNaN(numValue)) return '';
  return new Intl.NumberFormat('he-IL').format(numValue);
}

/** מפרסר ערך מעוצב עם פסיקים למספר */
export function parseFormattedNumberInput(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleanValue = String(value).replace(/[^\d]/g, '');
  return parseInt(cleanValue, 10) || 0;
}

/** משאיר רק ספרות ונקודה עשרונית אחת — כדי שאפשר יהיה להקליד 4.7 בלי שהנקודה תיעלם */
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const first = cleaned.indexOf('.');
  if (first === -1) return cleaned;
  return cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/\./g, '');
}

/** מפרסר קלט עשרוני. מחרוזת ריקה או נקודה בלבד → null, לא אפס */
export function parseDecimalInput(raw: string): number | null {
  const cleaned = sanitizeDecimalInput(raw);
  if (cleaned === '' || cleaned === '.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

const MONEY_FIELD_KEYS = [
  'ownCapital',
  'monthlyIncome',
  'monthlyLoanPayment',
  'propertyPrice',
  'currentPropertyPrice',
  'remainingMortgageAmount',
  'allowanceAmount',
  'expectedLumpSum',
] as const;

export type MoneyFieldKey = (typeof MONEY_FIELD_KEYS)[number];

/** מעצב שדות כספיים בטעינה מ-localStorage */
export function formatMoneyFields<T extends Record<string, unknown>>(data: T): T {
  const formatted = { ...data };
  for (const key of MONEY_FIELD_KEYS) {
    const val = formatted[key];
    if (typeof val === 'string' && val !== '') {
      (formatted as Record<string, unknown>)[key] = formatNumberInput(val);
    }
  }
  return formatted;
}