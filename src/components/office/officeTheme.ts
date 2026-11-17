import type { CSSProperties } from 'react';
import { officeColor } from '@/lib/office';

/**
 * הצבע של המשרד כמשתני CSS: `--office`, `--office-dark`, `--office-soft`. כל
 * רכיב של המשרד צובע את עצמו דרכם (`bg-[var(--office)]`), כך שכל המיתוג
 * מתחלף בהגדרה אחת.
 */
export function officeStyle(colorId: string | null | undefined): CSSProperties {
  const color = officeColor(colorId);
  return {
    ['--office' as string]: color.main,
    ['--office-dark' as string]: color.dark,
    ['--office-soft' as string]: color.soft,
  } as CSSProperties;
}
