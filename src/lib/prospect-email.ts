/**
 * המיילים הפנימיים של החשבונות הזמניים של תיקי לקוחות מתעניינים
 * (src/lib/prospect-client.ts). קובץ קל, בלי תלויות, כדי ששליחת המיילים תוכל לייבא אותו.
 */

/** הדומיין של המיילים הפנימיים. `.invalid` שמור לפי RFC 2606, ושום מייל לא יוצא אליו */
export const PROSPECT_EMAIL_DOMAIN = 'prospect.mashkalanta.invalid';

export function isProspectEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${PROSPECT_EMAIL_DOMAIN}`));
}

/** תנאי Prisma שמוציא את החשבונות הזמניים מספירות של נרשמים */
export const NOT_PROSPECT_USER = { NOT: { email: { endsWith: `@${PROSPECT_EMAIL_DOMAIN}` } } } as const;

