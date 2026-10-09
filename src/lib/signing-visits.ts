/**
 * ההגעות לסניף הבנק בשלב החתימה: הגשת מקורות מסמכי הבטחונות, והחתימה על תיק
 * המשכנתא.
 *
 * לכל הגעה הלקוח קובע תאריך, ואז היא נשמרת כמשימה עם מועד ומופיעה בלוח השנה.
 * סימון "בוצע" אפשרי מתת-השלב או מהמשימה בלוח השנה, והמשימה היא המקור: השלב
 * שומר העתק (כדי שאפשר יהיה לבדוק בשרת אם השלב הושלם, ולמי שאין לו משימות —
 * יועץ או הסיור).
 *
 * הקובץ טהור, ואינו מייבא את mortgage-plan.
 */

export const SIGNING_VISIT_KEYS = ['collateral-submit', 'bank-sign'] as const;
export type SigningVisitKey = (typeof SIGNING_VISIT_KEYS)[number];

export interface SigningVisit {
  /** התאריך שנקבע (YYYY-MM-DD) */
  date: string | null;
  /** מתי סומן כבוצע */
  doneAt: string | null;
}

export type SigningVisits = Record<SigningVisitKey, SigningVisit>;

export const EMPTY_VISIT: SigningVisit = { date: null, doneAt: null };

export function emptyVisits(): SigningVisits {
  return { 'collateral-submit': { ...EMPTY_VISIT }, 'bank-sign': { ...EMPTY_VISIT } };
}

export interface SigningVisitSpec {
  key: SigningVisitKey;
  /** מפתח המשימה של הלקוח */
  templateKey: string;
  title: string;
  /** שם קצר לניווט בין תת-השלבים */
  short: string;
  details: string;
}

export const SIGNING_VISITS: Record<SigningVisitKey, SigningVisitSpec> = {
  'collateral-submit': {
    key: 'collateral-submit',
    templateKey: 'signing:collateral-submit',
    title: 'הגשת מקורות מסמכי הבטחונות בסניף הבנק',
    short: 'הגשת הבטחונות בסניף',
    details:
      'מגיעים לסניף הבנק עם המקורות של מסמכי הבטחונות שעורך הדין והמוכרים הכינו, ומגישים אותם לפקיד המשכנתאות.',
  },
  'bank-sign': {
    key: 'bank-sign',
    templateKey: 'signing:bank-sign',
    title: 'חתימה על תיק המשכנתא בבנק',
    short: 'חתימה על תיק המשכנתא',
    details:
      'מגיעים לסניף הבנק לחתום על תיק המשכנתא. לפני החתימה ודאו שהתמהיל שבתיק הוא התמהיל הסופי שאושר.',
  },
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseVisit(value: unknown): SigningVisit {
  if (!value || typeof value !== 'object') return { ...EMPTY_VISIT };
  const source = value as Record<string, unknown>;
  const date = typeof source.date === 'string' && DAY.test(source.date) ? source.date : null;
  const doneAt =
    typeof source.doneAt === 'string' && !Number.isNaN(new Date(source.doneAt).getTime())
      ? source.doneAt.slice(0, 40)
      : null;
  return { date, doneAt };
}

export function parseVisits(value: unknown): SigningVisits {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    'collateral-submit': parseVisit(source['collateral-submit']),
    'bank-sign': parseVisit(source['bank-sign']),
  };
}

/** מועד המשימה בלוח השנה: עשר בבוקר ביום שנקבע, בשעון המקומי */
export function visitDueAt(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 10, 0, 0).toISOString();
}

/** היום של מועד המשימה (YYYY-MM-DD), בשעון המקומי */
export function visitDay(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
