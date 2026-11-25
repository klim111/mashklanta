'use client';

import { AdvisorShell } from './shell/AdvisorShell';

/**
 * לוח הבקרה של היועץ.
 *
 * מאז המעבר לפלטפורמה ליועצים, הלוח הוא מעטפת עם תפריט צד ושישה אזורים
 * (src/components/advisor/shell/AdvisorShell.tsx). הקישורים הישנים של
 * הלשוניות (`?tab=requests`) ממשיכים לעבוד ומובילים לאזור החדש.
 */
export function AdvisorConsole() {
  return <AdvisorShell />;
}
