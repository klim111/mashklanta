/**
 * פרטי הקשר ופרטי המפעיל של משכלנתא — מקור אחד לפוטר, לדאשבורד ולמסמכים
 * המשפטיים (מדיניות הפרטיות ותנאי השימוש).
 */
export const SITE_CONTACT = {
  brand: 'משכלנתא',
  phone: '050-882-2207',
  /** לקישור tel: — בפורמט בינלאומי */
  phoneHref: 'tel:+972508822207',
  email: 'info@mashkalanta.com',
  emailHref: 'mailto:info@mashkalanta.com',
  /**
   * השם המשפטי של מפעיל הפלטפורמה ומספר העוסק / החברה. כשהם ריקים, המסמכים
   * המשפטיים מציגים את שם המותג בלבד.
   */
  legalName: '',
  businessId: '306581380',
} as const;

/** מועד העדכון האחרון של מדיניות הפרטיות ותנאי השימוש */
export const LEGAL_UPDATED_AT = '14 באוקטובר 2026';

/** "משכלנתא (עוסק מס׳ …)" או "משכלנתא (שם משפטי, עוסק מס׳ …)" — מי שמפעיל את הפלטפורמה */
export function operatorDescription(): string {
  const { brand, legalName, businessId } = SITE_CONTACT;
  const parts = [legalName, businessId && `עוסק מס׳ ${businessId}`].filter(Boolean);
  return parts.length ? `${brand} (${parts.join(', ')})` : brand;
}
