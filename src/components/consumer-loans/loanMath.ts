import type { AmortRow, Loan, LoanDraft, PrepaymentParams } from './types';

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
  const paymentInitial = annuityPayment(loan.principal, loan.apr, loan.months);
  const events = [...(loan.prepayments ?? [])]
    .filter((item) => item.amount > 0 && item.month >= 1 && item.month < loan.months)
    .sort((a, b) => a.month - b.month);

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

    const today = events.filter((item) => item.month === m);
    let prepay = 0;
    for (const item of today) prepay += item.amount;
    prepay = Math.min(prepay, balance);
    balance -= prepay;

    if (prepay > 0 && balance > 0.005) {
      const mode = today[today.length - 1].mode;
      if (mode === 'reduce') payment = annuityPayment(balance, loan.apr, loan.months - m);
    }

    totalPaid += pay + prepay;
    totalInterest += interest;
    totalPrepaid += prepay;
    rows.push({
      m,
      balStart,
      pay,
      interest,
      principal: principalPart,
      ...(prepay > 0 ? { prepay } : {}),
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