/** רק נתיב יחסי באתר — כדי שפרמטר בכתובת לא יוכל לשלוח את הלקוח החוצה */
export function safeCallbackUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (value.length > 500) return null;
  return value;
}
