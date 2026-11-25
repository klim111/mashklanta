/**
 * טפסי כתבי ההסמכה של הבנקים — מה ממלאים ואיפה.
 *
 * הטפסים הם קובצי PDF של הבנקים בלי שדות מילוי מובנים, ולכן לכל טופס נשמרת
 * כאן מפה: באיזה עמוד, באיזו תיבה ומה נכתב בה, ואיפה מוטבעת החתימה של כל
 * לווה. הקואורדינטות בנקודות PDF (1/72 אינץ'), מהפינה השמאלית העליונה של
 * העמוד — כפי שהן נמדדו על הקבצים המקוריים. הטפסים עצמם יושבים ב-
 * public/forms/authorization/<slug>.pdf.
 *
 * מה שנשאר ריק בכוונה: אימות החתימה (בידי היועץ, עו"ד או נציג הבנק),
 * יועץ נוסף, והסכמות משניות שאינן חלק מההסמכה (למשל העברת פרטים לסוכנות
 * ביטוח במרכנתיל).
 *
 * הקובץ טהור — בלי React ובלי Prisma.
 */

export interface AuthorizationBank {
  slug: string;
  /** השם הקצר, כפי שהוא מופיע במסכים */
  bank: string;
  fullName: string;
  initials: string;
  color: string;
}

/** הבנקים שיש להם טופס כתב הסמכה, לפי הסדר במסך */
export const AUTHORIZATION_BANKS: readonly AuthorizationBank[] = [
  { slug: 'leumi', bank: 'לאומי', fullName: 'בנק לאומי לישראל', initials: 'לא', color: '#4f46e5' },
  { slug: 'hapoalim', bank: 'הפועלים', fullName: 'בנק הפועלים', initials: 'הפ', color: '#e11d48' },
  { slug: 'mizrahi', bank: 'מזרחי', fullName: 'בנק מזרחי טפחות', initials: 'מז', color: '#d97706' },
  { slug: 'mercantile', bank: 'מרכנטיל', fullName: 'בנק מרכנתיל דיסקונט', initials: 'מר', color: '#0284c7' },
  { slug: 'discount', bank: 'דיסקונט', fullName: 'בנק דיסקונט לישראל', initials: 'די', color: '#059669' },
  { slug: 'fibi', bank: 'הבינלאומי', fullName: 'הבנק הבינלאומי הראשון', initials: 'בי', color: '#7c3aed' },
  { slug: 'jerusalem', bank: 'ירושלים', fullName: 'בנק ירושלים', initials: 'יר', color: '#b45309' },
];

export function authorizationBank(slug: string): AuthorizationBank | null {
  return AUTHORIZATION_BANKS.find((bank) => bank.slug === slug) ?? null;
}

/** הטופס הריק של הבנק */
export function authorizationFormPath(slug: string): string {
  return `/forms/authorization/${slug}.pdf`;
}

/** הגופן שבו נכתבים הפרטים בטופס — Assistant, עברית ולטינית בקובץ אחד */
export const AUTHORIZATION_FONT_PATH = '/fonts/Assistant-Regular.ttf';

// ───────────────────────────── הערכים ─────────────────────────────

export interface AuthorizationBorrower {
  name: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
}

/** פרטי היועץ כפי שהוא שמר אותם בהגדרות, לטפסים */
export interface AdvisorFormDetails {
  name: string;
  idNumber: string;
  phone: string;
  companyName: string;
  companyNumber: string;
}

export const MAX_AUTHORIZATION_BORROWERS = 2;

export function emptyBorrower(name = ''): AuthorizationBorrower {
  return { name, idNumber: '', phone: '', email: '', address: '' };
}

export function emptyAdvisorDetails(name = ''): AdvisorFormDetails {
  return { name, idNumber: '', phone: '', companyName: '', companyNumber: '' };
}

export interface AuthorizationFillInput {
  borrowers: AuthorizationBorrower[];
  advisor: AdvisorFormDetails;
  /** היישוב שבו נחתם הטופס */
  place: string;
  date: Date;
  /** "לקוח הבנק" לכל לווה — רק בטפסים ששואלים על כך */
  customer: Array<boolean | null>;
}

export type AuthorizationField =
  | `b${1 | 2}.${keyof AuthorizationBorrower}`
  | `adv.${keyof AdvisorFormDetails}`
  | 'place'
  | 'date'
  | 'day'
  | 'month'
  | 'year';

/** הטקסט שנכתב בשדה. לווה שני שלא הוזן — שדות ריקים */
export function fieldValue(field: AuthorizationField, input: AuthorizationFillInput): string {
  const [scope, key] = field.split('.') as [string, string | undefined];
  if (scope === 'b1' || scope === 'b2') {
    const borrower = input.borrowers[scope === 'b1' ? 0 : 1];
    return borrower ? String(borrower[key as keyof AuthorizationBorrower] ?? '').trim() : '';
  }
  if (scope === 'adv') return String(input.advisor[key as keyof AdvisorFormDetails] ?? '').trim();
  const date = input.date;
  switch (field) {
    case 'place':
      return input.place.trim();
    case 'date':
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    case 'day':
      return String(date.getDate());
    case 'month':
      return String(date.getMonth() + 1);
    case 'year':
      return String(date.getFullYear());
    default:
      return '';
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

// ───────────────────────────── המפות ─────────────────────────────

/** [x0, y0, x1, y1] — מהפינה השמאלית העליונה של העמוד, בנקודות */
export type Box = [number, number, number, number];

export type Placement =
  | {
      kind: 'text';
      page: number;
      field: AuthorizationField;
      box: Box;
      align?: 'right' | 'center';
      /** middle — תא בטבלה; bottom — קו מילוי */
      valign?: 'middle' | 'bottom';
    }
  | { kind: 'signature'; page: number; signer: 0 | 1; box: Box }
  | { kind: 'check'; page: number; signer: 0 | 1; answer: boolean; at: [number, number] };

/** תא בטבלה */
function cell(page: number, field: AuthorizationField, x0: number, x1: number, y0: number, y1: number): Placement {
  return { kind: 'text', page, field, box: [x0 + 3, y0, x1 - 3, y1], valign: 'middle' };
}

/** קו מילוי — הטקסט יושב מעליו */
function line(
  page: number,
  field: AuthorizationField,
  x0: number,
  x1: number,
  y: number,
  align: 'right' | 'center' = 'center'
): Placement {
  return { kind: 'text', page, field, box: [x0, y - 14, x1, y - 1], valign: 'bottom', align };
}

function signature(page: number, signer: 0 | 1, x0: number, x1: number, y0: number, y1: number): Placement {
  return { kind: 'signature', page, signer, box: [x0, y0, x1, y1] };
}

/** שורות הלווים בטבלה: לכל עמודה — השדה והטווח האופקי שלה */
function borrowerRows(
  page: number,
  rows: Array<[number, number]>,
  columns: Array<[keyof AuthorizationBorrower, number, number]>
): Placement[] {
  return rows.flatMap(([y0, y1], index) =>
    columns.map(([key, x0, x1]) => cell(page, `b${(index + 1) as 1 | 2}.${key}`, x0, x1, y0, y1))
  );
}

export interface AuthorizationFormSpec {
  /** שאלת "לקוח הבנק" מופיעה בטופס */
  asksCustomer: boolean;
  /** השדות שהטופס מבקש מהלווים, מעבר לשם ולת"ז */
  borrowerFields: Array<keyof AuthorizationBorrower>;
  placements: Placement[];
}

export const AUTHORIZATION_FORMS: Record<string, AuthorizationFormSpec> = {
  leumi: {
    asksCustomer: false,
    borrowerFields: [],
    placements: [
      line(0, 'b1.name', 426, 498, 106.7),
      line(0, 'b1.idNumber', 341, 405, 106.7),
      line(0, 'b2.name', 266, 338, 106.7),
      line(0, 'b2.idNumber', 181, 245, 106.7),
      line(0, 'adv.companyName', 343, 487, 138.5),
      line(0, 'adv.companyNumber', 239, 322, 138.5),
      line(0, 'adv.name', 405, 511, 158.3),
      line(0, 'adv.idNumber', 289, 388, 158.3),
      line(1, 'place', 390, 440, 170.2),
      line(1, 'day', 345, 367, 170.2),
      line(1, 'month', 275, 314, 170.2),
      line(1, 'year', 220, 254, 170.2),
      line(1, 'b1.name', 428, 505, 212.1),
      signature(1, 0, 329, 390, 196, 213),
      line(1, 'b2.name', 428, 505, 226.3),
      signature(1, 1, 329, 390, 214, 227),
    ],
  },
  hapoalim: {
    asksCustomer: false,
    borrowerFields: ['phone'],
    placements: [
      ...borrowerRows(0, [[132.2, 149.2], [149.2, 165.7]], [
        ['name', 335.3, 545.9],
        ['idNumber', 213.1, 335.3],
        ['phone', 49.1, 213.1],
      ]),
      cell(0, 'adv.companyName', 335.3, 488, 230.7, 247.1),
      cell(0, 'adv.companyNumber', 49.1, 281, 230.7, 247.1),
      cell(0, 'adv.name', 335.3, 482, 247.1, 263.7),
      cell(0, 'adv.idNumber', 49.1, 282, 247.1, 263.7),
      line(2, 'place', 313, 389, 114.9),
      line(2, 'day', 254, 289, 114.9),
      line(2, 'month', 178, 218, 114.9),
      line(2, 'year', 83, 153, 114.9),
      line(2, 'b1.name', 413, 513, 182.2),
      signature(2, 0, 305, 400, 160, 181),
      line(2, 'b2.name', 192, 292, 182.2),
      signature(2, 1, 84, 179, 160, 181),
    ],
  },
  mizrahi: {
    asksCustomer: false,
    borrowerFields: ['phone'],
    placements: [
      ...borrowerRows(0, [[156.1, 171.3], [171.3, 186.4]], [
        ['name', 364.7, 539.8],
        ['idNumber', 194.3, 364.7],
        ['phone', 30, 194.3],
      ]),
      cell(0, 'adv.name', 284.4, 539.8, 224.2, 239.7),
      cell(0, 'adv.idNumber', 30, 284.4, 224.2, 239.7),
      ...borrowerRows(1, [[523.5, 537.5], [537.5, 551.2]], [
        ['name', 426.3, 525.4],
        ['idNumber', 312.5, 426.3],
      ]),
      signature(1, 0, 140, 308, 522, 539),
      signature(1, 1, 140, 308, 536, 553),
      cell(1, 'date', 30.8, 135.3, 523.5, 537.5),
      cell(1, 'date', 30.8, 135.3, 537.5, 551.2),
    ],
  },
  mercantile: {
    asksCustomer: true,
    borrowerFields: ['phone'],
    placements: [
      ...borrowerRows(0, [[129.7, 146.8], [146.8, 164]], [
        ['name', 392.2, 567.1],
        ['idNumber', 288.6, 392.2],
        ['phone', 169.6, 288.6],
      ]),
      { kind: 'check', page: 0, signer: 0, answer: true, at: [134.7, 138] },
      { kind: 'check', page: 0, signer: 0, answer: false, at: [105.5, 138] },
      { kind: 'check', page: 0, signer: 1, answer: true, at: [134.7, 155.1] },
      { kind: 'check', page: 0, signer: 1, answer: false, at: [105.5, 155.1] },
      cell(0, 'adv.name', 448.1, 567.1, 217, 232.4),
      cell(0, 'adv.idNumber', 360.7, 448.1, 217, 232.4),
      cell(0, 'adv.phone', 271.1, 360.7, 217, 232.4),
      cell(0, 'adv.companyName', 125.6, 271.1, 217, 232.4),
      cell(0, 'adv.companyNumber', 56.6, 125.6, 217, 232.4),
      line(0, 'b1.name', 418, 502, 752.6),
      signature(0, 0, 330, 398, 728, 751),
      line(0, 'b2.name', 224, 309, 752.6),
      signature(0, 1, 134, 202, 728, 751),
      line(1, 'b1.name', 407, 485, 307),
      line(1, 'b1.phone', 312, 367, 307),
      signature(1, 0, 195, 272, 283, 306),
      line(1, 'date', 92, 148, 307),
      line(1, 'b2.name', 407, 485, 359),
      line(1, 'b2.phone', 312, 368, 359),
      signature(1, 1, 195, 272, 335, 358),
      line(1, 'date', 92, 148, 359),
    ],
  },
  discount: {
    asksCustomer: true,
    borrowerFields: ['phone'],
    placements: [
      ...borrowerRows(0, [[107.1, 122.4], [122.4, 137.9]], [
        ['name', 392.3, 567.2],
        ['idNumber', 288.6, 392.3],
        ['phone', 169.5, 288.6],
      ]),
      { kind: 'check', page: 0, signer: 0, answer: true, at: [135, 113.6] },
      { kind: 'check', page: 0, signer: 0, answer: false, at: [105.7, 113.6] },
      { kind: 'check', page: 0, signer: 1, answer: true, at: [135, 128.7] },
      { kind: 'check', page: 0, signer: 1, answer: false, at: [105.7, 128.7] },
      cell(0, 'adv.name', 448.3, 567.2, 186, 201.4),
      cell(0, 'adv.idNumber', 360.6, 448.3, 186, 201.4),
      cell(0, 'adv.phone', 271.1, 360.6, 186, 201.4),
      cell(0, 'adv.companyName', 125.6, 271.1, 186, 201.4),
      cell(0, 'adv.companyNumber', 56.6, 125.6, 186, 201.4),
      line(0, 'b1.name', 437, 520.5, 756.7),
      signature(0, 0, 316.7, 400.2, 731, 755),
      line(0, 'b2.name', 196.4, 280, 756.7),
      signature(0, 1, 75.9, 159.4, 731, 755),
      line(1, 'b1.name', 437, 520.5, 539.4),
      line(1, 'b1.phone', 316.7, 400.2, 538.5),
      signature(1, 0, 196.4, 280, 515, 538),
      line(1, 'date', 75.9, 159.4, 539.4),
      line(1, 'b2.name', 437, 520.5, 572.3),
      line(1, 'b2.phone', 316.7, 400.2, 572.3),
      signature(1, 1, 196.4, 280, 548, 571),
      line(1, 'date', 75.9, 159.4, 572.3),
    ],
  },
  fibi: {
    asksCustomer: false,
    borrowerFields: [],
    placements: [
      ...borrowerRows(0, [[282.5, 300.5], [300.5, 318.6]], [
        ['name', 345, 553.1],
        ['idNumber', 42.9, 345],
      ]),
      cell(0, 'adv.name', 345, 553.1, 354.5, 370.5),
      cell(0, 'adv.idNumber', 42.9, 345, 354.5, 370.5),
      line(1, 'place', 322, 377, 568.5),
      line(1, 'day', 261, 300, 568.5),
      line(1, 'month', 185, 229, 568.5),
      line(1, 'year', 118, 162, 568.5),
      signature(1, 0, 345, 470, 574, 597),
      signature(1, 1, 129, 254, 574, 597),
    ],
  },
  jerusalem: {
    asksCustomer: false,
    borrowerFields: ['phone', 'email', 'address'],
    placements: [
      ...borrowerRows(0, [[152.7, 169.2], [169.2, 185.7]], [
        ['name', 409, 510.9],
        ['idNumber', 345.2, 409],
        ['address', 231.8, 345.2],
        ['phone', 160.9, 231.8],
        ['email', 84.6, 160.9],
      ]),
      cell(0, 'adv.name', 297.7, 510.9, 281.2, 295.7),
      cell(0, 'adv.idNumber', 84.6, 297.7, 281.2, 295.7),
      signature(3, 0, 283, 342, 420, 442),
      signature(3, 1, 221, 280, 420, 442),
    ],
  },
};

export function authorizationFormSpec(slug: string): AuthorizationFormSpec | null {
  return AUTHORIZATION_FORMS[slug] ?? null;
}

// ───────────────────────────── בדיקת השלמות ─────────────────────────────

const ID_PATTERN = /^[0-9A-Za-z-]{5,12}$/;

/**
 * מה עוד חסר כדי להפיק את הטופס של הבנק הזה. רשימה ריקה — אפשר להפיק.
 * החתימות נבדקות בנפרד, כי הן לא חלק מהפרטים שמוקלדים.
 */
export function missingForBank(
  slug: string,
  input: Pick<AuthorizationFillInput, 'borrowers' | 'place' | 'customer'>
): string[] {
  const spec = authorizationFormSpec(slug);
  if (!spec) return ['הטופס של הבנק הזה אינו זמין'];
  const missing: string[] = [];
  const usesPlace = spec.placements.some((item) => item.kind === 'text' && item.field === 'place');

  input.borrowers.forEach((borrower, index) => {
    const who = input.borrowers.length > 1 ? ` (לווה ${index + 1})` : '';
    if (borrower.name.trim().length < 2) missing.push(`שם מלא${who}`);
    if (!ID_PATTERN.test(borrower.idNumber.trim())) missing.push(`מספר ת"ז${who}`);
    if (spec.borrowerFields.includes('phone') && borrower.phone.trim().length < 9) missing.push(`טלפון${who}`);
    if (spec.borrowerFields.includes('address') && !borrower.address.trim()) missing.push(`כתובת מגורים${who}`);
    if (spec.borrowerFields.includes('email') && !borrower.email.includes('@')) missing.push(`אימייל${who}`);
    if (spec.asksCustomer && input.customer[index] == null) missing.push(`האם לקוח/ה של הבנק${who}`);
  });
  if (usesPlace && !input.place.trim()) missing.push('היישוב שבו אתם חותמים');
  return missing;
}

/** שם הקובץ של הכתב החתום */
export function signedLetterFileName(bank: AuthorizationBank): string {
  return `כתב הסמכה ליועץ - ${bank.bank}.pdf`;
}

// ───────────────────────────── פרטי היועץ ─────────────────────────────

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** פרטי היועץ מה-JSON שנשמר עליו. השם נופל לשם המשתמש כשלא הוזן אחר */
export function parseAdvisorDetails(raw: unknown, fallbackName: string | null): AdvisorFormDetails {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: clean(value.name, 80) || (fallbackName ?? '').trim(),
    idNumber: clean(value.idNumber, 20),
    phone: clean(value.phone, 30),
    companyName: clean(value.companyName, 120),
    companyNumber: clean(value.companyNumber, 20),
  };
}

/** מה חסר בפרטי היועץ כדי שהטפסים ייצאו מלאים */
export function missingAdvisorDetails(details: AdvisorFormDetails): string[] {
  const missing: string[] = [];
  if (details.name.length < 2) missing.push('שם');
  if (!ID_PATTERN.test(details.idNumber)) missing.push('ת"ז');
  if (details.phone.length < 9) missing.push('טלפון');
  return missing;
}
