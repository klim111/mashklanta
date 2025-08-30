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