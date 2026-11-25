/**
 * מעקב המשכנתא — "המשכנתא שלי" באזור האישי אחרי שהתהליך הסתיים.
 *
 * המעקב נבנה מהתמהיל הסופי שנחתם ומתאריך התשלום הראשון. מה שהלקוח מוסיף כאן
 * נשמר בשלב החתימה: תאריך התשלום הראשון (כשהוא שונה ממה שנגזר מתאריך החתימה)
 * ופירעונות מוקדמים — שבוצעו או שמתוכננים.
 */

/** כמו `PrepaymentMode` של מנוע התמהילים: קיצור התקופה או הקטנת ההחזר */
export type TrackerPrepaymentMode = 'shorten_term' | 'reduce_payment';

export interface TrackerPrepayment {
  id: string;
  /** חודש התשלום שבו מתבצע הפירעון (YYYY-MM) — כך הוא נשאר במקומו גם כשתאריך ההתחלה משתנה */
  month: string;
  amount: number;
  mode: TrackerPrepaymentMode;
  /** מסלול מסוים, או בלי — פיזור יחסי בין המסלולים */
  trackId?: string;
}

export interface LoanTrackerState {
  /** תאריך התשלום הראשון (YYYY-MM-DD), כשהלקוח הזין אותו */
  firstPaymentDate: string | null;
  prepayments: TrackerPrepayment[];
}

export function emptyLoanTracker(): LoanTrackerState {
  return { firstPaymentDate: null, prepayments: [] };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

export function parseLoanTracker(value: unknown): LoanTrackerState {
  if (!value || typeof value !== 'object') return emptyLoanTracker();
  const source = value as Record<string, unknown>;
  const first = typeof source.firstPaymentDate === 'string' && DAY.test(source.firstPaymentDate) ? source.firstPaymentDate : null;
  const prepayments = Array.isArray(source.prepayments)
    ? source.prepayments.flatMap((raw): TrackerPrepayment[] => {
        if (!raw || typeof raw !== 'object') return [];
        const item = raw as Record<string, unknown>;
        const amount = typeof item.amount === 'number' && Number.isFinite(item.amount) ? item.amount : 0;
        if (typeof item.id !== 'string' || typeof item.month !== 'string' || !MONTH.test(item.month) || amount <= 0) {
          return [];
        }
        return [
          {
            id: item.id,
            month: item.month,
            amount,
            mode: item.mode === 'reduce_payment' ? 'reduce_payment' : 'shorten_term',
            ...(typeof item.trackId === 'string' && item.trackId ? { trackId: item.trackId } : {}),
          },
        ];
      })
    : [];
  return { firstPaymentDate: first, prepayments };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** תאריך YYYY-MM-DD מקומי */
export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * התשלום הראשון כשהלקוח לא הזין אותו: חודש אחרי החתימה על התיק, באותו יום
 * בחודש (ועד ה-28, כדי שכל חודש יכיל אותו).
 */
export function defaultFirstPayment(signingDate: string | null): string | null {
  if (!signingDate || !DAY.test(signingDate.slice(0, 10))) return null;
  const [y, m, d] = signingDate.slice(0, 10).split('-').map(Number);
  const next = new Date(y, m, Math.min(d, 28));
  return isoDay(next);
}

/** תאריך התשלום הראשון שהמעקב נשען עליו, ומאיפה הוא הגיע */
export function trackerStart(
  tracker: LoanTrackerState,
  signingDate: string | null
): { date: string; source: 'client' | 'signing' } | null {
  if (tracker.firstPaymentDate) return { date: tracker.firstPaymentDate, source: 'client' };
  const derived = defaultFirstPayment(signingDate);
  return derived ? { date: derived, source: 'signing' } : null;
}

/** YYYY-MM של תאריך ISO */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** מספר התשלום (1 = הראשון) של חודש YYYY-MM, ביחס לתאריך התשלום הראשון */
export function paymentNumberOf(month: string, firstPaymentDate: string): number {
  const [fy, fm] = firstPaymentDate.split('-').map(Number);
  const [y, m] = month.split('-').map(Number);
  return (y - fy) * 12 + (m - fm) + 1;
}

/** חודש YYYY-MM של תשלום מספר n */
export function monthOfPayment(n: number, firstPaymentDate: string): string {
  const [fy, fm] = firstPaymentDate.split('-').map(Number);
  const date = new Date(fy, fm - 1 + (n - 1), 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** כמה תשלומים כבר ירדו עד היום (כולל) — מספר החודשים שעברו מתחילת המשכנתא */
export function paymentsMadeBy(schedule: ReadonlyArray<{ date: string }>, today: Date = new Date()): number {
  const limit = today.getTime();
  let count = 0;
  for (const row of schedule) {
    if (new Date(row.date).getTime() <= limit) count += 1;
    else break;
  }
  return count;
}
