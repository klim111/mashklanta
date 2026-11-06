/**
 * תת-השלב "אישור לבנק לפתיחת תיק משכנתא" בשלב החתימה.
 *
 * אחרי שנבחר התמהיל הסופי במכרז, מאשרים לבנק להתקדם איתו ושולחים לו מסמכים
 * עדכניים לפתיחת התיק. משנפתח התיק הבנק מנפיק רשימת בטחונות, ואותה מעבירים
 * לעורך הדין שמלווה את העסקה. כל הנחיה כאן נשמרת כמשימה של הלקוח (ClientTask)
 * עם מפתח קבוע, כדי שתופיע ברשימת המשימות ובלוח השנה ותיסגר מכל מקום.
 *
 * הקובץ טהור — בלי React ובלי Prisma.
 */

import type { ClientTaskKind } from './client-tasks';
import { dayKey, parseDay } from './rate-validity';

export const BANK_FILE_KEY_PREFIX = 'bank-file:';

export const BANK_FILE_AUTHORIZE_KEY = `${BANK_FILE_KEY_PREFIX}authorize`;
export const BANK_FILE_COLLATERAL_KEY = `${BANK_FILE_KEY_PREFIX}collateral-to-lawyer`;
/** מפתח המסמך של רשימת הבטחונות בתיק המסמכים */
export const COLLATERAL_LIST_DOCUMENT_KEY = `${BANK_FILE_KEY_PREFIX}collateral-list`;

export interface BankFileDocument {
  /** מפתח המשימה, וגם מפתח המסמך בתיק כשהוא מועלה */
  key: string;
  name: string;
  hint: string;
}

/** המסמכים העדכניים שהבנק מבקש לפתיחת התיק */
export const BANK_FILE_DOCUMENTS: BankFileDocument[] = [
  {
    key: `${BANK_FILE_KEY_PREFIX}payslips`,
    name: 'תלושי שכר עדכניים',
    hint: 'שלושת התלושים האחרונים של כל לווה שכיר',
  },
  {
    key: `${BANK_FILE_KEY_PREFIX}bank-statements`,
    name: 'דפי חשבון עדכניים',
    hint: 'תדפיס עובר ושב של שלושת החודשים האחרונים',
  },
  {
    key: `${BANK_FILE_KEY_PREFIX}appraisal`,
    name: 'אישור שמאות',
    hint: 'דוח השמאי שהבנק אישר, על הנכס שנרכש',
  },
  {
    key: `${BANK_FILE_KEY_PREFIX}purchase-contract`,
    name: 'חוזה רכישה',
    hint: 'החוזה החתום, בגרסה העדכנית ביותר',
  },
];

/** רשימת הבטחונות האופיינית, להסבר בחלון — הרשימה המחייבת היא זו שהבנק שולח */
export const TYPICAL_COLLATERALS: string[] = [
  'רישום משכנתא או הערת אזהרה לטובת הבנק',
  'מכתב התחייבות של עורך הדין לרישום המשכנתא',
  'ביטוח חיים לכל הלווים, משועבד לבנק',
  'ביטוח מבנה לנכס, משועבד לבנק',
  'שטר משכנתא וייפוי כוח בלתי חוזר חתומים',
];

export interface BankFileTaskSpec {
  templateKey: string;
  kind: ClientTaskKind;
  title: string;
  details: string;
  /** בעוד כמה ימים המשימה מתוזמנת, מיום יצירתה */
  dueInDays: number;
}

/**
 * ההנחיות של תת-השלב כמשימות. כשיועץ מלווה את התהליך, המסמכים הם משימות
 * העלאה לתיק (היועץ שולח אותם לבנק); כשהלקוח מטפל לבד — משימות לשלוח אותם
 * לבנק ולסמן "בוצע".
 */
export function bankFileTaskSpecs(bank: string | null, advisor: boolean): BankFileTaskSpec[] {
  const toBank = bank ? `לבנק ${bank}` : 'לבנק';
  return [
    {
      templateKey: BANK_FILE_AUTHORIZE_KEY,
      kind: 'TASK',
      title: `אשרו ${toBank} להתקדם עם התמהיל שאושר סופית`,
      details: 'האישור פותח את תיק המשכנתא בבנק על התמהיל שנבחר במכרז.',
      dueInDays: 1,
    },
    ...BANK_FILE_DOCUMENTS.map<BankFileTaskSpec>((document) =>
      advisor
        ? {
            templateKey: document.key,
            kind: 'DOCUMENT',
            title: `העלו לתיק: ${document.name} לפתיחת תיק המשכנתא`,
            details: `${document.hint}. היועץ יעביר את המסמך לבנק.`,
            dueInDays: 3,
          }
        : {
            templateKey: document.key,
            kind: 'TASK',
            title: `שלחו ${toBank}: ${document.name} לפתיחת תיק המשכנתא`,
            details: document.hint,
            dueInDays: 3,
          }
    ),
  ];
}

/** המשימה של רשימת הבטחונות — נוצרת כשהחלון שלה קופץ */
export function collateralTaskSpec(bank: string | null): BankFileTaskSpec {
  return {
    templateKey: BANK_FILE_COLLATERAL_KEY,
    kind: 'TASK',
    title: 'העבירו את רשימת הבטחונות מהבנק לעורך הדין שמלווה את העסקה',
    details: bank
      ? `הרשימה שבנק ${bank} הנפיק אחרי פתיחת התיק. עורך הדין דואג לבטחונות לפני העמדת ההלוואה.`
      : 'עורך הדין דואג לבטחונות לפני העמדת ההלוואה.',
    dueInDays: 3,
  };
}

/**
 * מועד המשימה: בעוד כמה ימים, בעשר בבוקר — ולא אחרי שהריביות פוקעות, כי כל
 * ההנחיות כאן צריכות להסתיים לפני כן.
 */
export function bankFileDueAt(dueInDays: number, ratesExpireOn: string | null, now = new Date()): string {
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dueInDays, 10, 0, 0);
  const expires = ratesExpireOn ? parseDay(ratesExpireOn) : null;
  if (expires) {
    const cap = new Date(expires.getFullYear(), expires.getMonth(), expires.getDate(), 10, 0, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    if (cap < due) return (cap < today ? today : cap).toISOString();
  }
  return due.toISOString();
}

/** לבדיקה ולתצוגה: היום של המועד */
export function dueDay(iso: string): string {
  const date = parseDay(iso);
  return date ? dayKey(date) : iso;
}
