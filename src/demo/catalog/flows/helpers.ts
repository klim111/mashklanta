/**
 * עזרי כתיבה לצעדי ההדגמה — כדי שכל קובץ צעדים יישאר קריא ותוכני.
 */

import type { DemoState } from '../../types';

export const money = (value: unknown) => `₪${Math.round(Number(value) || 0).toLocaleString('he-IL')}`;

export const num = (state: DemoState, key: string, fallback = 0) => {
  const value = Number(state.values[key]);
  return Number.isFinite(value) ? value : fallback;
};

/** תאריך ושעה בפורמט של שדה datetime-local, בעוד `days` ימים בשעה `hour` */
export function localDateTime(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
