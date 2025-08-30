import type { AmortRow, Loan, PrepaymentParams } from './types';

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

/**
 * חישוב מהיר של נתוני הלוואה בלי טבלת סילוקין מלאה
 */
export function calculateLoanSummary(loan: Loan): {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
} {
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