import type { RecipientRole } from './conversation';

/**
 * אנשי המקצוע בעסקת משכנתא, כפי שהם מוצגים בטאב "אנשי הקשר" באזור האישי:
 * מה כל אחד עושה, ובאיזה שלב צריך אותו. הסדר הוא סדר ההופעה בתהליך בערך.
 * יועץ המשכנתאות מופיע ראשון, ובמקומו של טופס יש כפתור לצירוף מומחה משכלנתא.
 */
export interface ContactRoleInfo {
  role: RecipientRole;
  title: string;
  /** מה התפקיד ולמה הוא חשוב — משפט או שניים */
  description: string;
  /** מתי בתהליך צריך אותו */
  when: string;
}

export const CONTACT_ROLES: readonly ContactRoleInfo[] = [
  {
    role: 'ADVISOR',
    title: 'יועץ משכנתאות',
    description: 'בונה איתכם את התמהיל, מגיש את הבקשות לבנקים ומנהל את המשא ומתן על הריביות.',
    when: 'לאורך כל התהליך, מהפרופיל הפיננסי ועד החתימה בבנק',
  },
  {
    role: 'BROKER',
    title: 'מתווך',
    description: 'מאתר את הנכס ומתווך בין הקונה למוכר עד החתימה על החוזה.',
    when: 'לפני שמתחילים, ועד חתימת חוזה הרכישה',
  },
  {
    role: 'LAWYER',
    title: 'עורך דין למקרקעין',
    description:
      'בודק את הזכויות בנכס, מנסח את חוזה הרכישה ומלווה את העסקה. בסוף התהליך מקבל מהבנק את מסמך הבטחונות ומכין את מכתב ההוראות הבלתי חוזרות.',
    when: 'לפני חתימת החוזה, ושוב בשלב 5 (חתימה בבנק)',
  },
  {
    role: 'DEVELOPER',
    title: 'קבלן / יזם',
    description: 'בדירה מקבלן: איש הקשר לפעימות התשלום, לפרטי חשבון הליווי של הפרויקט ולערבויות לפי חוק המכר.',
    when: 'מחתימת החוזה ועד מסירת הדירה',
  },
  {
    role: 'ACCOUNTANT',
    title: 'רואה חשבון',
    description: 'לעצמאים ולבעלי חברות: מכין את הדוחות ואת אישורי ההכנסה שהבנק דורש.',
    when: 'שלב 1 (פרופיל פיננסי) ושלב 3 (אישור עקרוני)',
  },
  {
    role: 'BANKER',
    title: 'בנקאי',
    description: 'מטפל בבקשה בסניף: מקבל את המסמכים, מוציא אישור עקרוני והצעות ריבית, ובסוף מכין את תיק המשכנתא לחתימה.',
    when: 'משלב 3 (אישור עקרוני) ועד שלב 5 (חתימה בבנק)',
  },
  {
    role: 'APPRAISER',
    title: 'שמאי מקרקעין',
    description: 'מעריך את שווי הנכס עבור הבנק. הבנק מממן לפי הנמוך מבין מחיר הרכישה לשווי בשומה.',
    when: 'אחרי האישור העקרוני, לפני האישור הסופי',
  },
  {
    role: 'INSURANCE',
    title: 'סוכן ביטוח',
    description: 'מסדר ביטוח חיים לכל הלווים וביטוח מבנה לנכס, שהבנק דורש לפני העברת הכסף, ומשווה בין חברות.',
    when: 'לפני החתימה בבנק (שלב 5)',
  },
];

export function contactRoleInfo(role: RecipientRole): ContactRoleInfo | null {
  return CONTACT_ROLES.find((item) => item.role === role) ?? null;
}

/** איש קשר כפי שהוא מוצג ונשמר. מייל או טלפון — לפחות אחד מהם */
export interface ContactView {
  id: string;
  role: RecipientRole;
  name: string;
  email: string | null;
  phone: string | null;
  bank: string | null;
  /** בנקאי שהוזן בשלב האישור העקרוני — מוצג כאן, ונערך שם */
  fromStage?: boolean;
}

export interface ContactsPayload {
  contacts: ContactView[];
  /** היועץ המלווה, אם יש */
  advisor: { name: string | null; email: string | null } | null;
  /** מתי נשלחה הבקשה לצרף מומחה משכלנתא, אם עדיין פתוחה */
  expertRequestedAt: string | null;
}

/** טלפון סביר: ספרות, רווחים, מקפים ופלוס, לפחות תשע ספרות */
export function cleanPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const phone = value.replace(/[^\d+\-\s()]/g, '').trim().slice(0, 30);
  return phone.replace(/\D/g, '').length >= 9 ? phone : null;
}
