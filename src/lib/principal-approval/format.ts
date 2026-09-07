/**
 * Number / date formatting helpers shared by the principal-approval form,
 * its validation layer and the printable report.
 *
 * The number helpers are written for *live* formatting: they must cope with the
 * half-typed input a user produces while entering a value ("1,2", "12.", "-").
 */

const HEBREW_LOCALE = 'he-IL';

/** Strips grouping commas / spaces so a display string can be parsed. */
export function stripGrouping(value: string): string {
  return value.replace(/[,\s٬ ]/g, '');
}

/**
 * Groups the integer part of a (possibly partial) numeric string with commas,
 * keeping whatever the user typed after the decimal point untouched.
 * Returns the input unchanged when it is not numeric at all, so the caller can
 * surface a validation error instead of silently dropping characters.
 */
export function formatNumberWithCommas(input: string, maxDecimals = 2): string {
  if (input === null || input === undefined) return '';
  const raw = stripGrouping(String(input));
  if (raw === '') return '';
  if (raw === '-') return '-';

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;

  // Reject anything that is not digits with at most one decimal separator.
  if (!/^\d*\.?\d*$/.test(unsigned)) return input;

  const [intPart = '', decPartRaw] = unsigned.split('.');
  const hasDot = unsigned.includes('.');
  const decPart = decPartRaw === undefined ? '' : decPartRaw.slice(0, maxDecimals);

  const groupedInt = intPart === '' ? '' : intPart.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let out = groupedInt;
  if (hasDot) out += '.' + decPart;
  return (negative ? '-' : '') + out;
}

/** Parses a display string ("1,234.5") into a number, or null when empty/invalid. */
export function parseNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const raw = stripGrouping(input);
  if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return null;
  if (!/^-?\d*\.?\d*$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** ₪ formatting for read-only surfaces (report, summaries). */
export function formatCurrency(value: number | null | undefined, withSymbol = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const formatted = new Intl.NumberFormat(HEBREW_LOCALE, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value);
  return withSymbol ? `${formatted} ₪` : formatted;
}

/** Plain grouped number for read-only surfaces. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(HEBREW_LOCALE).format(value);
}

/** ISO date (yyyy-mm-dd) -> dd/mm/yyyy for display. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Whole years between an ISO date and now (used for age / seniority hints). */
export function yearsSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let years = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) years -= 1;
  return years;
}

/** Months between an ISO date and now — drives the "less than a year" rule. */
export function monthsSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  return months;
}

/** Digits-only helper used by ID / phone / zip inputs. */
export function digitsOnly(value: string, maxLength?: number): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return maxLength ? digits.slice(0, maxLength) : digits;
}

/** 05X-XXXXXXX presentation for Israeli phone numbers. */
export function formatPhone(value: string | null | undefined): string {
  const digits = digitsOnly(String(value ?? ''));
  if (digits.length < 4) return digits;
  if (digits.startsWith('05') || digits.startsWith('07')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`;
}
