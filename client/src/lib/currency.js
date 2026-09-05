/** מעצב מספר בזמן הקלדה עם פסיקים */
export function formatNumberInput(value) {
  const cleanValue = String(value).replace(/[^\d]/g, '');
  if (cleanValue === '') return '';
  const numValue = parseInt(cleanValue, 10);
  if (isNaN(numValue)) return '';
  return new Intl.NumberFormat('he-IL').format(numValue);
}

/** מפרסר ערך מעוצב עם פסיקים למספר */
export function parseFormattedNumberInput(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleanValue = String(value).replace(/[^\d]/g, '');
  return parseInt(cleanValue, 10) || 0;
}
