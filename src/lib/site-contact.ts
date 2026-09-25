/**
 * פרטי הקשר ופרטי המפעיל של משכלנתא — מקור אחד לפוטר, לדאשבורד ולמסמכים
 * המשפטיים (מדיניות הפרטיות ותנאי השימוש).
 */
export const SITE_CONTACT = {
  brand: 'משכלנתא',
  phone: '050-882-2207',
  /** לקישור tel: — בפורמט בינלאומי */
  phoneHref: 'tel:+972508822207',
  email: 'mashkalanta@gmail.com',
  emailHref: 'mailto:mashkalanta@gmail.com',
  /**
   * השם המשפטי של מפעיל הפלטפורמה ומספר העוסק / החברה. כשהם ריקים, המסמכים
   * המשפטיים מציגים את שם המותג בלבד.
   */
  legalName: '',
  businessId: '',
} as const;

/** מועד העדכון האחרון של מדיניות הפרטיות ותנאי השימוש */
export const LEGAL_UPDATED_AT = '25 בספטמבר 2026';

/** "משכלנתא" או "משכלנתא (שם משפטי, ח.פ. …)" — מי שמפעיל את הפלטפורמה */
export function operatorDescription(): string {
  const { brand, legalName, businessId } = SITE_CONTACT;
  if (!legalName) return brand;
  return businessId ? `${brand} (${legalName}, מס׳ ${businessId})` : `${brand} (${legalName})`;
}
