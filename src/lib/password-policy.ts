/**
 * כללי הסיסמה של משכלנתא — משותפים לטפסים ולשרת.
 *
 * חלים רק כשסיסמה נקבעת או משתנה (הרשמה, הגדרות החשבון). סיסמאות שכבר
 * שמורות במסד הנתונים לא נבדקות מחדש, והתחברות איתן ממשיכה לעבוד כרגיל.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt מתעלם מכל מה שמעבר ל-72 בתים, ולכן זה הגבול העליון */
export const PASSWORD_MAX_BYTES = 72;

export type PasswordRuleId = 'length' | 'letter' | 'digit' | 'symbol';

export interface PasswordRule {
  id: PasswordRuleId;
  /** איך הכלל מוצג ליד השדה ובהודעת השגיאה */
  label: string;
  test: (password: string) => boolean;
}

// נבנים עם RegExp כי יעד ההידור (ES2017) לא מכיר את \p{...} בביטוי ליטרלי
const LETTER = new RegExp('\\p{L}', 'u');
const DIGIT = new RegExp('\\p{Nd}', 'u');
const SYMBOL = new RegExp('[^\\p{L}\\p{Nd}\\s]', 'u');

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `לפחות ${PASSWORD_MIN_LENGTH} תווים`,
    test: (password) => Array.from(password).length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'letter',
    label: 'אות אחת לפחות',
    test: (password) => LETTER.test(password),
  },
  {
    id: 'digit',
    label: 'ספרה אחת לפחות',
    test: (password) => DIGIT.test(password),
  },
  {
    id: 'symbol',
    label: 'סימן אחד לפחות, כמו # או !',
    test: (password) => SYMBOL.test(password),
  },
];

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** הכללים שהסיסמה לא עומדת בהם */
export function failedPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password));
}

/**
 * הודעת שגיאה שמפרטת מה חסר בסיסמה, או null כשהיא תקינה.
 * משמשת גם בשרת, כדי שהלקוח יקבל את אותה הודעה בדיוק.
 */
export function passwordProblem(password: string): string | null {
  if (byteLength(password) > PASSWORD_MAX_BYTES) {
    return 'הסיסמה ארוכה מדי';
  }
  const failed = failedPasswordRules(password);
  if (failed.length === 0) return null;
  const list = failed.map((rule) => rule.label);
  const joined =
    list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} ו${list[list.length - 1]}`;
  return `הסיסמה אינה עומדת בדרישות. צריך ${joined}.`;
}

// בלי תווים שקל לבלבל ביניהם (l/1/I, O/0)
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?-_+=';

function randomIndex(max: number): number {
  const values = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % max;
}

function pick(chars: string): string {
  return chars[randomIndex(chars.length)];
}

/** סיסמה אקראית של 14 תווים שעומדת בכל הכללים */
export function generatePassword(length = 14): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
