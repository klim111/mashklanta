/**
 * תבניות הכתוביות: `{{key}}`, `{{key|money}}`, `{{key|years}}`, `{{key|pct}}`.
 * הערכים מגיעים ממצב ההדגמה — כולל מה שהמשתמש שינה בהתנסות — ולכן הכתוביות
 * שאחרי "המשך בהדגמה" מדברות על המספרים שלו.
 */

import type { DemoState, DemoText, DemoValue } from '../types';

const formatters: Record<string, (value: unknown) => string> = {
  money: (value) => `₪${Math.round(Number(value) || 0).toLocaleString('he-IL')}`,
  number: (value) => (Number(value) || 0).toLocaleString('he-IL'),
  years: (value) => `${Number(value) || 0} שנים`,
  months: (value) => `${Number(value) || 0} חודשים`,
  pct: (value) => `${(Number(value) || 0).toLocaleString('he-IL', { maximumFractionDigits: 1 })}%`,
};

export function renderTemplate(template: string, state: DemoState): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*(?:\|\s*(\w+))?\s*\}\}/g, (_, key: string, format?: string) => {
    const value = state.values[key];
    if (value === undefined || value === null) return '';
    const formatter = format ? formatters[format] : undefined;
    return formatter ? formatter(value) : String(value);
  });
}

export function resolveText(text: DemoText | undefined, state: DemoState): string {
  if (!text) return '';
  return typeof text === 'function' ? text(state) : renderTemplate(text, state);
}

export function resolveValue<T>(value: DemoValue<T>, state: DemoState): T {
  return typeof value === 'function' ? (value as (state: DemoState) => T)(state) : value;
}

/** משך ההצגה של כתובית — לפי אורך הטקסט, בגבולות סבירים */
export function readingTime(text: string): number {
  const base = 2200 + text.length * 48;
  return Math.max(3000, Math.min(9500, base));
}
