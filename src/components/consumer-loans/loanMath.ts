import type { AmortRow, Loan, LoanDraft, LoanPrepayment, PrepaymentParams } from './types';

/**
 * חישוב תשלום חודשי לפי נוסחת האנונה
 * @param P קרן ההלוואה
 * @param apr ריבית שנתית נומינלית באחוזים
 * @param n מספר חודשים
 * @returns תשלום חודשי
 */
export function annuityPayment(P: number, apr: number, n: number): number {
  if (P <= 0 || n <= 0) return 0;
  
  const r = apr / 100 / 12; // ריבית חודשית
  
  // אם הריבית קרובה לאפס, חישוב ליניארי
  if (Math.abs(r) < 1e-12) {
    return P / n;
  }
  
  // נוסחת האנונה
  const factor = Math.pow(1 + r, n);
  return (P * r * factor) / (factor - 1);
}

/** קרן לפי תשלום חודשי, ריבית ותקופה (הפוך מ-annuityPayment) */
export function principalFromAnnuityPayment(payment: number, apr: number, n: number): number {
  if (payment <= 0 || n <= 0) return 0;

  const r = apr / 100 / 12;

  if (Math.abs(r) < 1e-12) {
    return payment * n;
  }

  const factor = Math.pow(1 + r, n);
  return (payment * (factor - 1)) / (r * factor);
}

/**
 * בניית טבלת סילוקין עם אפשרות לפרעון מוקדם
 */
export function buildAmortSchedule(params: {
  principal: number;
  apr: number;
  months: number;
  prepayAmount?: number;
  prepayMonth?: number;
  mode?: 'reduce' | 'shorten';
}): {
  rows: AmortRow[];
  totalInterest: number;
  totalPaid: number;
  paymentInitial: number;
  monthsActual: number;
} {
  const { principal, apr, months, prepayAmount = 0, prepayMonth = 0, mode = 'reduce' } = params;
  
  const r = apr / 100 / 12; // ריבית חודשית
  const initialPayment = annuityPayment(principal, apr, months);
  
  const rows: AmortRow[] = [];
  let balance = principal;
  let currentPayment = initialPayment;
  let monthsRemaining = months;
  let totalPaid = 0;
  
  for (let m = 1; m <= months && balance > 0.01; m++) {
    const balStart = balance;
    
    // חישוב ריבית החודש
    const interestPayment = balance * r;
    
    // פרעון מוקדם
    if (m === prepayMonth && prepayAmount > 0) {
      const actualPrepay = Math.min(prepayAmount, balance);
      balance -= actualPrepay;
      totalPaid += actualPrepay;
      
      // אם נותר יתרה, מחשבים תשלום חדש לפי המצב
      if (balance > 0.01) {
        if (mode === 'reduce') {
          // מצב reduce: תקופה נשארת, תשלום קטן
          monthsRemaining = months - m;
          currentPayment = annuityPayment(balance, apr, monthsRemaining);
        } else {
          // מצב shorten: תשלום נשאר, תקופה קטנה (לא מיושם כאן)
          currentPayment = initialPayment;
        }
      }
      
      // רשומה לפרעון המוקדם
      rows.push({
        m,
        balStart,
        pay: actualPrepay,
        interest: 0,
        principal: actualPrepay,
        balEnd: balance,
      });
      
      continue;
    }
    
    // תשלום רגיל
    let payment = currentPayment;
    let principalPayment = payment - interestPayment;
    
    // אם התשלום גדול מהיתרה, מתאימים
    if (principalPayment > balance) {
      principalPayment = balance;
      payment = interestPayment + principalPayment;
    }
    
    balance -= principalPayment;
    totalPaid += payment;
    
    rows.push({
      m,
      balStart,
      pay: payment,
      interest: interestPayment,
      principal: principalPayment,
      balEnd: balance,
    });
  }
  
  const totalInterest = totalPaid - principal;
  
  return {
    rows,
    totalInterest,
    totalPaid,
    paymentInitial: initialPayment,
    monthsActual: rows.length,
  };
}

/** הלוואה שכל השדות שלה הוזנו — רק היא נכנסת לחישובים ולדאשבורד */
export function isCompleteLoan(loan: LoanDraft): loan is Loan {
  return (
    loan.principal !== null &&
    loan.principal > 0 &&
    loan.apr !== null &&
    loan.apr >= 0 &&
    loan.months !== null &&
    loan.months > 0
  );
}

/* ---------------- תאריכים ---------------- */

const DAY_MS = 86_400_000;

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * האם בהלוואה הוזן תאריך לקיחה — רק אז יש לתשלומים תאריכים. יום התשלום רשות:
 * כשלא הוזן, התשלום יורד באותו יום בחודש שבו נלקחה ההלוואה.
 */
export function hasLoanDates(loan: { startDate?: string; paymentDay?: number }): boolean {
  return Boolean(
    loan.startDate &&
      parseDate(loan.startDate) &&
      (loan.paymentDay === undefined || (loan.paymentDay >= 1 && loan.paymentDay <= 31))
  );
}

/** יום התשלום בפועל: מה שהוזן, או יום הלקיחה בחודש */
function effectivePaymentDay(loan: { startDate?: string; paymentDay?: number }): number {
  return loan.paymentDay ?? (parseDate(loan.startDate as string) as Date).getUTCDate();
}

/**
 * תאריך התשלום ה-k. התשלום הראשון יורד ביום התשלום שבחודש שאחרי חודש
 * הלקיחה, וכל תשלום אחריו חודש אחריו. בחודש קצר מיום התשלום, התשלום יורד
 * ביום האחרון של החודש. k = 0 הוא יום הלקיחה עצמו.
 */
export function paymentDate(
  loan: { startDate?: string; paymentDay?: number },
  k: number
): Date | null {
  if (!hasLoanDates(loan)) return null;
  const start = parseDate(loan.startDate as string) as Date;
  if (k <= 0) return start;
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + k;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(effectivePaymentDay(loan), lastDay)));
}

/** היום, כתאריך בלבד (חצות UTC) — כדי להשוות אותו לתאריכי התשלומים */
export function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * כמה תשלומים כבר ירדו עד היום (כולל תשלום שיורד היום). בהלוואה בלי תאריך
 * לקיחה — 0: היא נחשבת כאילו נלקחה היום.
 */
export function paymentsMadeBy(
  loan: { startDate?: string; paymentDay?: number; months: number },
  today: Date = new Date()
): number {
  if (!hasLoanDates(loan)) return 0;
  const limit = dateOnly(today).getTime();
  let k = 0;
  while (k < loan.months && (paymentDate(loan, k + 1) as Date).getTime() <= limit) k += 1;
  return k;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * פירעון לפי תאריך: התשלום האחרון שיורד עד יום הפירעון (כולל), ומספר הימים
 * שעברו מאז. פירעון לפי מספר תשלום, או כשאין בהלוואה תאריכים, נפרע ביום
 * התשלום עצמו — 0 ימים.
 */
export function resolvePrepaymentTiming(
  loan: Pick<Loan, 'startDate' | 'paymentDay' | 'months'>,
  prepayment: Pick<LoanPrepayment, 'month' | 'date'>
): { month: number; days: number } {
  const target = prepayment.date ? parseDate(prepayment.date) : null;
  if (!target || !hasLoanDates(loan)) return { month: prepayment.month, days: 0 };
  let k = 0;
  while (k < loan.months) {
    const next = paymentDate(loan, k + 1) as Date;
    if (next.getTime() > target.getTime()) break;
    k += 1;
  }
  const last = paymentDate(loan, k) as Date;
  return { month: k, days: Math.max(0, daysBetween(last, target)) };
}

export interface LoanSchedule {
  rows: AmortRow[];
  totalInterest: number;
  /** כל מה שישולם — כולל הפירעונות המוקדמים */
  totalPaid: number;
  paymentInitial: number;
  monthsActual: number;
  totalPrepaid: number;
}

/**
 * לוח הסילוקין של הלוואה, כולל הפירעונות המוקדמים שהוזנו בה.
 *
 * הפירעון משולם יחד עם התשלום שנבחר: קודם התשלום הרגיל, ואחריו הסכום
 * החד-פעמי יורד מהיתרה. ממנו והלאה, בקיצור תקופה ההחזר נשמר וההלוואה נגמרת
 * מוקדם; בהקטנת החזר ההחזר מחושב מחדש על היתרה לתקופה שנותרה.
 */
export function buildLoanSchedule(loan: Loan): LoanSchedule {
  const r = loan.apr / 100 / 12;
  const daily = loan.apr / 100 / 365;
  const paymentInitial = annuityPayment(loan.principal, loan.apr, loan.months);
  const dated = hasLoanDates(loan);
  const events = (loan.prepayments ?? [])
    .map((item) => ({ ...item, ...resolvePrepaymentTiming(loan, item) }))
    .filter((item) => item.amount > 0 && item.month >= 1 && item.month < loan.months)
    .sort((a, b) => a.month - b.month || a.days - b.days);

  const rows: AmortRow[] = [];
  let balance = loan.principal;
  let payment = paymentInitial;
  let totalPaid = 0;
  let totalInterest = 0;
  let totalPrepaid = 0;

  for (let m = 1; m <= loan.months && balance > 0.005; m += 1) {
    const balStart = balance;
    const interest = balance * r;
    const pay = Math.min(payment, balance + interest);
    const principalPart = pay - interest;
    balance = Math.max(0, balance - principalPart);

    // הפירעונות של החודש — לפי הסדר. על כל סכום שנפרע אחרי יום התשלום
    // משולמת גם הריבית היומית שהצטברה עליו מאז התשלום ועד יום הפירעון
    const today = events.filter((item) => item.month === m);
    let prepay = 0;
    let prepayInterest = 0;
    for (const item of today) {
      const applied = Math.min(item.amount, balance - prepay);
      if (applied <= 0) continue;
      prepay += applied;
      prepayInterest += applied * daily * item.days;
    }
    balance -= prepay;

    if (prepay > 0 && balance > 0.005) {
      const mode = today[today.length - 1].mode;
      if (mode === 'reduce') payment = annuityPayment(balance, loan.apr, loan.months - m);
    }

    totalPaid += pay + prepay + prepayInterest;
    totalInterest += interest + prepayInterest;
    totalPrepaid += prepay;
    const date = dated ? paymentDate(loan, m) : null;
    rows.push({
      m,
      balStart,
      pay,
      interest,
      principal: principalPart,
      ...(prepay > 0 ? { prepay } : {}),
      ...(prepayInterest > 0 ? { prepayInterest } : {}),
      ...(date ? { date: toISODate(date) } : {}),
      balEnd: balance,
    });
  }

  return {
    rows,
    totalInterest,
    totalPaid,
    paymentInitial,
    monthsActual: rows.length,
    totalPrepaid,
  };
}

/**
 * איפה ההלוואה עומדת היום, כשהוזן תאריך הלקיחה: כמה תשלומים כבר ירדו, כמה
 * שולם עד כה ומה נותר לשלם, היתרה וההחזר הנוכחי. התשלום הבא הוא זה שאחרי
 * האחרון ששולם — למשל בהלוואה שנלקחה לפני שנתיים בדיוק, תשלום 25.
 */
export interface LoanProgress {
  paymentsMade: number;
  totalPayments: number;
  /** התשלום הבא, או null כשההלוואה נגמרה */
  nextPayment: number | null;
  nextPaymentDate: string | null;
  paidSoFar: number;
  interestPaidSoFar: number;
  remainingToPay: number;
  remainingInterest: number;
  /** יתרת הקרן היום, אחרי התשלום האחרון ששולם */
  balanceNow: number;
  /** ההחזר החודשי מהתשלום הבא */
  currentPayment: number;
}

export function loanProgress(
  loan: Loan,
  schedule: LoanSchedule = buildLoanSchedule(loan),
  today: Date = new Date()
): LoanProgress | null {
  if (!hasLoanDates(loan)) return null;
  const rows = schedule.rows;
  const made = Math.min(paymentsMadeBy(loan, today), rows.length);
  const rowTotal = (row: AmortRow) => row.pay + (row.prepay ?? 0) + (row.prepayInterest ?? 0);
  const rowInterest = (row: AmortRow) => row.interest + (row.prepayInterest ?? 0);
  const past = rows.slice(0, made);
  const paidSoFar = past.reduce((sum, row) => sum + rowTotal(row), 0);
  const interestPaidSoFar = past.reduce((sum, row) => sum + rowInterest(row), 0);
  const next = made < rows.length ? made + 1 : null;
  return {
    paymentsMade: made,
    totalPayments: rows.length,
    nextPayment: next,
    nextPaymentDate: next ? toISODate(paymentDate(loan, next) as Date) : null,
    paidSoFar,
    interestPaidSoFar,
    remainingToPay: Math.max(0, schedule.totalPaid - paidSoFar),
    remainingInterest: Math.max(0, schedule.totalInterest - interestPaidSoFar),
    balanceNow: made === 0 ? loan.principal : rows[made - 1].balEnd,
    currentPayment: next ? rows[next - 1].pay : 0,
  };
}

/**
 * ההלוואה כפי שהיא מהיום והלאה: היתרה של היום כקרן, התשלומים שנותרו כתקופה,
 * והפירעונות המוקדמים שעוד לא הגיע מועדם. כך הדאשבורד, האיחוד והאסטרטגיה
 * עובדים על החוב שבאמת נשאר — ולא על הסכום שנלקח במקור. הלוואה בלי תאריך
 * לקיחה, או שעוד לא ירד בה תשלום, חוזרת כמו שהיא. הלוואה שנגמרה — null.
 */
export function loanFromToday(loan: Loan, today: Date = new Date()): Loan | null {
  const schedule = buildLoanSchedule(loan);
  const made = Math.min(paymentsMadeBy(loan, today), schedule.rows.length);
  if (made === 0) return loan;
  const remaining = schedule.rows.length - made;
  const balance = schedule.rows[made - 1].balEnd;
  if (remaining <= 0 || balance <= 0.005) return null;
  const prepayments = (loan.prepayments ?? [])
    .map((item) => ({ item, timing: resolvePrepaymentTiming(loan, item) }))
    .filter(({ timing }) => timing.month > made)
    .map(({ item, timing }) => ({ ...item, month: timing.month - made }));
  return {
    ...loan,
    principal: balance,
    months: remaining,
    // מהתשלום האחרון ששולם — כך התשלום הראשון של ההלוואה הנותרת הוא התשלום הבא
    startDate: toISODate(paymentDate(loan, made) as Date),
    paymentDay: effectivePaymentDay(loan),
    prepayments,
  };
}

/**
 * חישוב מהיר של נתוני הלוואה בלי טבלת סילוקין מלאה
 */
export function calculateLoanSummary(loan: Loan): {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
} {
  if (loan.prepayments?.length) {
    const schedule = buildLoanSchedule(loan);
    return {
      monthlyPayment: schedule.paymentInitial,
      totalPaid: schedule.totalPaid,
      totalInterest: schedule.totalInterest,
    };
  }

  const monthlyPayment = annuityPayment(loan.principal, loan.apr, loan.months);
  const totalPaid = monthlyPayment * loan.months;
  const totalInterest = totalPaid - loan.principal;
  
  return {
    monthlyPayment,
    totalPaid,
    totalInterest,
  };
}

/**
 * חישוב יתרה נוכחית של הלוואה לאחר מספר תשלומים
 */
export function getRemainingBalance(loan: Loan, monthsPaid: number): number {
  if (monthsPaid >= loan.months) return 0;
  
  const r = loan.apr / 100 / 12;
  const payment = annuityPayment(loan.principal, loan.apr, loan.months);
  
  if (Math.abs(r) < 1e-12) {
    return loan.principal - (payment * monthsPaid);
  }
  
  const factor1 = Math.pow(1 + r, loan.months);
  const factor2 = Math.pow(1 + r, monthsPaid);
  
  return loan.principal * (factor1 - factor2) / (factor1 - 1);
}