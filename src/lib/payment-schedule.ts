/**
 * פעימות התשלום למוכר — כלי התכנון של משכנתא חדשה.
 *
 * מחיר הנכס מתחלק לשני מקורות: ההון העצמי ומשכנתא מהבנק. לפני שהבנק מעביר את
 * כספי המשכנתא הוא דורש שחלק מההון העצמי כבר שולם — האחוז משתנה מבנק לבנק,
 * ולכן הלקוח מזין אותו. הכלי בודק שעד הפעימה הראשונה מהבנק משולם לפחות החלק
 * הזה, ואינו מחייב לשלם את כל ההון העצמי לפני הבנק.
 *
 * הקובץ טהור: הוא נטען גם בשרת (לניקוי הנתונים לפני שמירה ולבדיקת סגירת שלב
 * החתימה) וגם בדפדפן, ולכן אינו מייבא את mortgage-plan, את Prisma או את React.
 */

export type PaymentSource = 'EQUITY' | 'BANK';

export const PAYMENT_SOURCE_LABELS: Record<PaymentSource, string> = {
  EQUITY: 'הון עצמי',
  BANK: 'כספי המשכנתא מהבנק',
};

/** פעימה אחת: כמה, ממה, למי ומתי */
export interface PaymentInstallment {
  id: string;
  source: PaymentSource;
  amount: number | null;
  /** למי מועבר: המוכר, נאמנות אצל עורך הדין, בנק המוכר לסילוק המשכנתא שלו… */
  payee: string;
  /** באיזה שלב ובמה מותנה, כמו שכתוב בחוזה */
  condition: string;
  /** תאריך משוער, כשידוע (YYYY-MM-DD) */
  dueDate: string | null;
}

export interface PaymentSchedule {
  /** מחיר הנכס בחוזה — מתחיל ממחיר הנכס בפרופיל הפיננסי */
  propertyPrice: number | null;
  /** סכום המשכנתא — מתחיל מסכום המשכנתא בפרופיל */
  bankAmount: number | null;
  /**
   * כמה אחוזים מההון העצמי הבנק דורש שישולמו לפני שהוא מעביר את כספי המשכנתא
   * (לפתיחת תיק המשכנתא). ריק — עוד לא הוזן, ואין בדיקה.
   */
  bankRequiredEquityPercent: number | null;
  installments: PaymentInstallment[];
  /** הלקוח אישר את הפעימות. עריכה אחרי האישור מבטלת אותו */
  confirmedAt: string | null;
  updatedAt: string | null;
}

/** תשובת הלקוח לשאלה "האם כבר חתמתם על חוזה?" שנשאלת בפתיחת משכנתא חדשה */
export type ContractAnswer = 'SIGNED' | 'NOT_YET';

export const MAX_INSTALLMENTS = 12;

/** עד שקל אחד של פער בסכומים — עיגול, לא טעות */
const TOLERANCE = 1;

// ───────────────────────────── חישובים ─────────────────────────────

export function sumBySource(schedule: Pick<PaymentSchedule, 'installments'>, source: PaymentSource): number {
  return schedule.installments
    .filter((item) => item.source === source)
    .reduce((total, item) => total + (item.amount ?? 0), 0);
}

/** החלק של ההון העצמי במחיר הנכס: המחיר פחות המשכנתא */
export function equityShare(schedule: Pick<PaymentSchedule, 'propertyPrice' | 'bankAmount'>): number | null {
  if (!schedule.propertyPrice || schedule.propertyPrice <= 0) return null;
  return Math.max(0, schedule.propertyPrice - (schedule.bankAmount ?? 0));
}

export type ScheduleIssueKind =
  | 'price'
  | 'bank-amount'
  | 'empty'
  | 'amount'
  | 'payee'
  | 'bank-required-equity'
  | 'equity-total'
  | 'bank-total'
  | 'no-bank';

export interface ScheduleIssue {
  kind: ScheduleIssueKind;
  message: string;
  /** הפעימה שהבעיה בה, כשהיא נוגעת לפעימה אחת */
  installmentId?: string;
}

const shekel = (value: number) => `${Math.round(value).toLocaleString('he-IL')} ₪`;

/**
 * הבדיקות של הכלי. כל עוד יש בעיה אחת, פעימות התשלום אינן "מוגדרות" — ושלב
 * החתימה לא נסגר.
 */
export function scheduleIssues(schedule: PaymentSchedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  const price = schedule.propertyPrice ?? 0;
  const bank = schedule.bankAmount ?? 0;

  if (price <= 0) issues.push({ kind: 'price', message: 'חסר מחיר הנכס בחוזה' });
  if (bank < 0 || (price > 0 && bank > price)) {
    issues.push({ kind: 'bank-amount', message: 'סכום המשכנתא גדול ממחיר הנכס' });
  }
  if (schedule.installments.length === 0) {
    issues.push({ kind: 'empty', message: 'עוד לא הוגדרה אף פעימה' });
    return issues;
  }

  schedule.installments.forEach((item, index) => {
    if (!item.amount || item.amount <= 0) {
      issues.push({ kind: 'amount', message: `בפעימה ${index + 1} חסר סכום`, installmentId: item.id });
    }
    if (!item.payee.trim()) {
      issues.push({ kind: 'payee', message: `בפעימה ${index + 1} חסר למי מועבר הכסף`, installmentId: item.id });
    }
  });

  const firstBank = schedule.installments.findIndex((item) => item.source === 'BANK');
  const required = requiredEquityBeforeBank(schedule);
  if (firstBank >= 0 && required !== null) {
    const paidBefore = equityPaidBeforeBank(schedule);
    if (paidBefore + TOLERANCE < required) {
      issues.push({
        kind: 'bank-required-equity',
        message: `הבנק דורש ${schedule.bankRequiredEquityPercent}% מההון העצמי (${shekel(required)}) לפני הפעימה הראשונה מהבנק. עד אליה משולמים ${shekel(paidBefore)}, ולכן צריך לשלם עוד ${shekel(required - paidBefore)} מההון העצמי לפני פעימה ${firstBank + 1}`,
      });
    }
  }

  if (price > 0) {
    const neededEquity = Math.max(0, price - bank);
    const equity = sumBySource(schedule, 'EQUITY');
    if (Math.abs(equity - neededEquity) > TOLERANCE) {
      issues.push({
        kind: 'equity-total',
        message:
          equity < neededEquity
            ? `הפעימות מההון העצמי מסתכמות ב-${shekel(equity)}, חסרים ${shekel(neededEquity - equity)} כדי להגיע ל-${shekel(neededEquity)}`
            : `הפעימות מההון העצמי מסתכמות ב-${shekel(equity)}, ${shekel(equity - neededEquity)} יותר מהחלק של ההון העצמי (${shekel(neededEquity)})`,
      });
    }
  }

  const bankPaid = sumBySource(schedule, 'BANK');
  if (bank > 0 && firstBank < 0) {
    issues.push({ kind: 'no-bank', message: 'חסרה פעימה מכספי המשכנתא' });
  } else if (Math.abs(bankPaid - bank) > TOLERANCE) {
    issues.push({
      kind: 'bank-total',
      message:
        bankPaid < bank
          ? `הפעימות מכספי הבנק מסתכמות ב-${shekel(bankPaid)}, חסרים ${shekel(bank - bankPaid)} כדי להגיע לסכום המשכנתא (${shekel(bank)})`
          : `הפעימות מכספי הבנק מסתכמות ב-${shekel(bankPaid)}, ${shekel(bankPaid - bank)} יותר מסכום המשכנתא (${shekel(bank)})`,
    });
  }

  return issues;
}

/** הפעימות הוגדרו: הלקוח אישר אותן, וכל הבדיקות עוברות */
export function scheduleDefined(schedule: PaymentSchedule | null | undefined): boolean {
  return Boolean(schedule && schedule.confirmedAt && scheduleIssues(schedule).length === 0);
}

/** ההון העצמי שמשולם לפני הפעימה הראשונה מהבנק (כולו, כשאין פעימה מהבנק) */
export function equityPaidBeforeBank(schedule: Pick<PaymentSchedule, 'installments'>): number {
  const firstBank = schedule.installments.findIndex((item) => item.source === 'BANK');
  const before = firstBank < 0 ? schedule.installments : schedule.installments.slice(0, firstBank);
  return before.filter((item) => item.source === 'EQUITY').reduce((total, item) => total + (item.amount ?? 0), 0);
}

/** הסכום מההון העצמי שהבנק דורש לפני כספי המשכנתא; null — האחוז לא הוזן */
export function requiredEquityBeforeBank(
  schedule: Pick<PaymentSchedule, 'propertyPrice' | 'bankAmount' | 'bankRequiredEquityPercent'>
): number | null {
  const percent = schedule.bankRequiredEquityPercent;
  const equity = equityShare(schedule);
  if (percent === null || percent <= 0 || equity === null) return null;
  return Math.round((equity * Math.min(percent, 100)) / 100);
}

/** פעימה חדשה מההון העצמי נכנסת לפני הפעימה הראשונה מהבנק; מהבנק — בסוף */
export function insertInstallment(installments: PaymentInstallment[], item: PaymentInstallment): PaymentInstallment[] {
  if (item.source === 'BANK') return [...installments, item];
  const firstBank = installments.findIndex((row) => row.source === 'BANK');
  if (firstBank < 0) return [...installments, item];
  return [...installments.slice(0, firstBank), item, ...installments.slice(firstBank)];
}

// ───────────────────────────── לוח התחלתי ─────────────────────────────

let counter = 0;
export function installmentId(): string {
  counter += 1;
  return `p${Date.now().toString(36)}${counter.toString(36)}`;
}

export function blankInstallment(source: PaymentSource): PaymentInstallment {
  return {
    id: installmentId(),
    source,
    amount: null,
    payee: source === 'BANK' ? 'המוכר' : '',
    condition: '',
    dueDate: null,
  };
}

/**
 * לוח התחלתי מהפרופיל הפיננסי, בנוסח שמקובל בעסקת יד שנייה: 10% מהמחיר
 * בחתימה לנאמנות אצל עורך הדין של המוכר, יתרת ההון העצמי אחרי רישום הערת
 * האזהרה, ובסוף כספי המשכנתא — ישירות מהבנק לפי מכתב ההוראות הבלתי חוזרות.
 * הלקוח מעדכן אותו לפי החוזה שלו.
 */
export function draftSchedule(propertyPrice: number | null, bankAmount: number | null): PaymentSchedule {
  const price = propertyPrice && propertyPrice > 0 ? Math.round(propertyPrice) : null;
  const bank = bankAmount && bankAmount > 0 ? Math.round(Math.min(bankAmount, price ?? bankAmount)) : null;
  const installments: PaymentInstallment[] = [];

  if (price) {
    const equity = Math.max(0, price - (bank ?? 0));
    const first = Math.min(equity, Math.round(price * 0.1));
    if (first > 0) {
      installments.push({
        id: installmentId(),
        source: 'EQUITY',
        amount: first,
        payee: 'נאמנות אצל עורך הדין של המוכר',
        condition: 'במעמד חתימת החוזה. משתחרר למוכר אחרי רישום הערת אזהרה לטובת הקונים',
        dueDate: null,
      });
    }
    if (equity - first > 0) {
      installments.push({
        id: installmentId(),
        source: 'EQUITY',
        amount: equity - first,
        payee: 'המוכר',
        condition: 'אחרי רישום הערת האזהרה והצגת נסח טאבו או אישור זכויות עדכני',
        dueDate: null,
      });
    }
  }

  if (bank) {
    installments.push({
      id: installmentId(),
      source: 'BANK',
      amount: bank,
      payee: 'המוכר (או בנק המוכר, לסילוק המשכנתא שלו)',
      condition:
        'אחרי ששולם כל ההון העצמי ונרשמו הבטחונות לטובת הבנק, לפי מכתב ההוראות הבלתי חוזרות, כנגד מסירת החזקה',
      dueDate: null,
    });
  }

  return {
    propertyPrice: price,
    bankAmount: bank,
    bankRequiredEquityPercent: null,
    installments,
    confirmedAt: null,
    updatedAt: null,
  };
}

// ───────────────────────────── קריאה מהשרת ─────────────────────────────

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B-\u001F]/g, '').slice(0, max) : '';
}

function cleanAmount(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(Math.min(parsed, 1_000_000_000));
}

function cleanPercent(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(Math.min(parsed, 100) * 10) / 10;
}

function cleanDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function cleanStamp(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

export function parsePaymentSchedule(value: unknown): PaymentSchedule | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const rows = Array.isArray(source.installments) ? source.installments.slice(0, MAX_INSTALLMENTS) : [];
  const installments: PaymentInstallment[] = rows.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string, unknown>;
    return [
      {
        id: typeof row.id === 'string' && row.id ? row.id.slice(0, 40) : `p${index}`,
        source: row.source === 'BANK' ? 'BANK' : 'EQUITY',
        amount: cleanAmount(row.amount),
        payee: cleanText(row.payee, 160),
        condition: cleanText(row.condition, 600),
        dueDate: cleanDate(row.dueDate),
      } satisfies PaymentInstallment,
    ];
  });
  return {
    propertyPrice: cleanAmount(source.propertyPrice),
    bankAmount: cleanAmount(source.bankAmount),
    bankRequiredEquityPercent: cleanPercent(source.bankRequiredEquityPercent),
    installments,
    confirmedAt: cleanStamp(source.confirmedAt),
    updatedAt: cleanStamp(source.updatedAt),
  };
}

export function parseContractAnswer(value: unknown): ContractAnswer | null {
  return value === 'SIGNED' || value === 'NOT_YET' ? value : null;
}

// ───────────────────────────── טופס הבטחונות ─────────────────────────────

/**
 * טופס הבטחונות שהבנק מנפיק אחרי אישור התיק: מה שעורך הדין והמוכרים צריכים
 * להמציא לבנק (רישום הבטחונות, מכתב ההוראות). מועבר לעורך הדין.
 */
export interface CollateralFormState {
  /** המסמך בתיק המסמכים */
  documentId: string | null;
  fileName: string | null;
  /** מתי הועבר לעורך הדין במייל, ולאיזו כתובת */
  sentToLawyerAt: string | null;
  lawyerEmail: string | null;
  /** הלקוח סימן שווידא עם עורך הדין את פריסת התשלומים ואת מכתב ההוראות */
  verifiedWithLawyer: boolean;
}

export const EMPTY_COLLATERAL: CollateralFormState = {
  documentId: null,
  fileName: null,
  sentToLawyerAt: null,
  lawyerEmail: null,
  verifiedWithLawyer: false,
};

export function parseCollateral(value: unknown): CollateralFormState {
  if (!value || typeof value !== 'object') return { ...EMPTY_COLLATERAL };
  const source = value as Record<string, unknown>;
  return {
    documentId: typeof source.documentId === 'string' && source.documentId ? source.documentId.slice(0, 60) : null,
    fileName: cleanText(source.fileName, 160) || null,
    sentToLawyerAt: cleanStamp(source.sentToLawyerAt),
    lawyerEmail: cleanText(source.lawyerEmail, 200) || null,
    verifiedWithLawyer: source.verifiedWithLawyer === true,
  };
}

// ───────────────────────────── טופס טיולים ─────────────────────────────

/**
 * טופס טיולים: רשימת המסמכים שהבנק דורש מהרוכשים להמציא לאישור תיק המשכנתא.
 * הלקוח מעלה אותו, שולח למי שצריך (בלי נמען קבוע) ומסמן שהמסמכים הומצאו.
 */
export interface TiyulimFormState {
  documentId: string | null;
  fileName: string | null;
  /** מתי נשלח במייל, ולאיזו כתובת */
  sentAt: string | null;
  sentTo: string | null;
  /** הלקוח סימן שכל המסמכים שברשימה הומצאו לבנק */
  documentsProvided: boolean;
}

export const EMPTY_TIYULIM: TiyulimFormState = {
  documentId: null,
  fileName: null,
  sentAt: null,
  sentTo: null,
  documentsProvided: false,
};

export function parseTiyulim(value: unknown): TiyulimFormState {
  if (!value || typeof value !== 'object') return { ...EMPTY_TIYULIM };
  const source = value as Record<string, unknown>;
  return {
    documentId: typeof source.documentId === 'string' && source.documentId ? source.documentId.slice(0, 60) : null,
    fileName: cleanText(source.fileName, 160) || null,
    sentAt: cleanStamp(source.sentAt),
    sentTo: cleanText(source.sentTo, 200) || null,
    documentsProvided: source.documentsProvided === true,
  };
}

// ───────────────────────────── נוסחים ─────────────────────────────

/** ההון העצמי שהבנק דורש לפני כספי המשכנתא — מוצג בכלי ובדוח */
export const BANK_EQUITY_EXPLANATION =
  'לפני שהבנק מעביר את כספי המשכנתא הוא דורש שחלק מההון העצמי כבר שולם למוכר. האחוז משתנה מבנק לבנק, ולכן הזינו את האחוז שהבנק שלכם דורש: המערכת תתריע אם עד הפעימה הראשונה מהבנק לא שולם מספיק מההון העצמי.';

/** ההערה על בנקים שדורשים את כל ההון העצמי קודם */
export const FULL_EQUITY_NOTE =
  'יש מקרים שבהם הבנק ידרוש לשלם קודם את כל ההון העצמי, לפני כספי המשכנתא. ודאו זאת מול הבנק: מרבית הבנקים היום מגלים גמישות בנושא.';

/** ההערות לעבודה מול עורך הדין — בכלי, בדוח ובתת-השלב של הבטחונות */
export const LAWYER_NOTES: readonly string[] = [
  'ודאו יחד עם עורך הדין שפריסת התשלומים בחוזה תואמת לפעימות שהוגדרו כאן: אותם סכומים, אותו סדר ואותם תנאים.',
  'ודאו שהפעימות מכספי הבנק כתובות כך גם במכתב ההוראות הבלתי חוזרות שעליו חותם מוכר הנכס: לאיזה חשבון, באיזה סכום ובאיזה שלב.',
  'כשהבנק מנפיק את טופס הבטחונות, העבירו אותו לעורך הדין: הוא דואג יחד עם המוכרים לרישום הבטחונות ולחתימת המוכר על מכתב ההוראות.',
];

export const CONTRACT_REMINDER =
  'חשוב להגדיר בחוזה את פעימות התשלום כך שיעמדו בדרישות הבנק: לפני הפעימה הראשונה מכספי המשכנתא צריך לשלם את חלק ההון העצמי שהבנק דורש.';

// ───────────────────────────── קישורים ─────────────────────────────

/** כלי תכנון הפעימות של התהליך */
export function paymentScheduleHref(planId: string, from?: string | null): string {
  return `/dashboard/plans/${planId}/payment-schedule${from ? `?from=${encodeURIComponent(from)}` : ''}`;
}

/** דוח ה-HTML של הפעימות; `download` — כקובץ להורדה */
export function paymentScheduleReportHref(planId: string, download = false): string {
  return `/api/plans/${planId}/payment-schedule${download ? '?download=1' : ''}`;
}
