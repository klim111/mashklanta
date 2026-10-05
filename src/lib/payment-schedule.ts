/**
 * פעימות התשלום למוכר — כלי התכנון של משכנתא חדשה.
 *
 * מחיר הנכס מתחלק לשני מקורות: ההון העצמי ומשכנתא מהבנק. הבנק מעביר את כספי
 * המשכנתא רק אחרי שהוכח לו שכל ההון העצמי שולם ושהבטחונות לטובתו נרשמו, ולכן
 * בכל לוח תשלומים תקין כל הפעימות מההון העצמי קודמות לפעימה הראשונה מהבנק.
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
  | 'order'
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
  if (firstBank >= 0) {
    schedule.installments.slice(firstBank).forEach((item, offset) => {
      if (item.source === 'EQUITY') {
        issues.push({
          kind: 'order',
          message: `פעימה ${firstBank + offset + 1} מההון העצמי מופיעה אחרי כספי הבנק. כל ההון העצמי משולם לפני הפעימה הראשונה מהבנק`,
          installmentId: item.id,
        });
      }
    });
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

/**
 * סדר תקין: כל פעימות ההון העצמי ואחריהן כל פעימות הבנק, כל קבוצה בסדר שבו
 * הלקוח הזין אותה.
 */
export function orderInstallments(installments: PaymentInstallment[]): PaymentInstallment[] {
  return [
    ...installments.filter((item) => item.source === 'EQUITY'),
    ...installments.filter((item) => item.source === 'BANK'),
  ];
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

  return { propertyPrice: price, bankAmount: bank, installments, confirmedAt: null, updatedAt: null };
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
 * תת-השלב הראשון של החתימה: טופס הבטחונות ("טופס טיולים") שהבנק מנפיק אחרי
 * אישור התיק, והעברתו לעורך הדין.
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

// ───────────────────────────── נוסחים ─────────────────────────────

/** למה כספי הבנק תמיד אחרונים — מוצג בכלי ובדוח */
export const BANK_LAST_EXPLANATION =
  'הבנק מעביר את כספי המשכנתא רק אחרי שהוכח לו שכל ההון העצמי שולם למוכר, ושהבטחונות לטובתו נרשמו (הערת אזהרה או משכון לטובת הבנק, ומכתב הוראות בלתי חוזרות חתום בידי המוכר). לכן כל הפעימות מההון העצמי באות לפני הפעימה הראשונה מהבנק, ואין להתחייב בחוזה לתשלום מההון העצמי אחריה.';

/** ההערות לעבודה מול עורך הדין — בכלי, בדוח ובתת-השלב של טופס הבטחונות */
export const LAWYER_NOTES: readonly string[] = [
  'ודאו יחד עם עורך הדין שפריסת התשלומים בחוזה תואמת לפעימות שהוגדרו כאן: אותם סכומים, אותו סדר ואותם תנאים.',
  'ודאו שהפעימות מכספי הבנק כתובות כך גם במכתב ההוראות הבלתי חוזרות שעליו חותם מוכר הנכס: לאיזה חשבון, באיזה סכום ובאיזה שלב.',
  'כשהבנק מנפיק את טופס הבטחונות ("טופס טיולים"), העבירו אותו לעורך הדין: הוא דואג לרישום הבטחונות ולחתימת המוכר על מכתב ההוראות.',
];

export const CONTRACT_REMINDER =
  'חשוב להגדיר בחוזה את פעימות התשלום כך שיעמדו בדרישות הבנקים והרגולציה: כל ההון העצמי משולם קודם, וכספי המשכנתא מועברים אחרונים.';

// ───────────────────────────── קישורים ─────────────────────────────

/** כלי תכנון הפעימות של התהליך */
export function paymentScheduleHref(planId: string, from?: string | null): string {
  return `/dashboard/plans/${planId}/payment-schedule${from ? `?from=${encodeURIComponent(from)}` : ''}`;
}

/** דוח ה-HTML של הפעימות; `download` — כקובץ להורדה */
export function paymentScheduleReportHref(planId: string, download = false): string {
  return `/api/plans/${planId}/payment-schedule${download ? '?download=1' : ''}`;
}
