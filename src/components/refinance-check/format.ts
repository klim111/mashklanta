const numberFormat = new Intl.NumberFormat('he-IL');

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export function formatShekel(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '−' : ''}₪${numberFormat.format(Math.abs(rounded))}`;
}

export function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** YYYY-MM → "יולי 2026" */
export function formatMonth(period: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(period);
  return match ? `${HEBREW_MONTHS[Number(match[2]) - 1]} ${match[1]}` : period;
}
