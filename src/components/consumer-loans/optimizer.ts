import type { Loan, Objective, ScenarioResult, OptimizationInput, OptimizationResult } from './types';
import { annuityPayment, getRemainingBalance, calculateLoanSummary } from './loanMath';

/**
 * הקצאת מזומן בשיטת Avalanche (APR גבוה קודם)
 */
export function allocateCashAvalanche(loans: Loan[], cash: number): {
  loans: Loan[];
  cashLeft: number;
  allocation: Record<string, number>;
} {
  if (cash <= 0) {
    return { loans: [...loans], cashLeft: 0, allocation: {} };
  }
  
  // מיון לפי APR יורד
  const sortedLoans = [...loans].sort((a, b) => b.apr - a.apr);
  const allocation: Record<string, number> = {};
  let remainingCash = cash;
  const resultLoans: Loan[] = [];
  
  for (const loan of sortedLoans) {
    if (remainingCash <= 0) {
      resultLoans.push({ ...loan });
      continue;
    }
    
    // כמה נוכל להקצות להלוואה הזו
    const maxAllocation = Math.min(remainingCash, loan.principal);
    
    if (maxAllocation >= loan.principal) {
      // סוגרים את ההלוואה לחלוטין
      allocation[loan.id] = loan.principal;
      remainingCash -= loan.principal;
      // לא מוסיפים להלוואות הנותרות
    } else {
      // פרעון חלקי
      allocation[loan.id] = maxAllocation;
      remainingCash -= maxAllocation;
      
      // יוצרים הלוואה חדשה עם יתרה מופחתת
      const newPrincipal = loan.principal - maxAllocation;
      resultLoans.push({
        ...loan,
        principal: newPrincipal,
      });
    }
  }
  
  // מוסיפים הלוואות שלא נגעו בהן
  for (const loan of loans) {
    if (!allocation[loan.id]) {
      resultLoans.push({ ...loan });
    }
  }
  
  return {
    loans: resultLoans,
    cashLeft: remainingCash,
    allocation,
  };
}

/**
 * הערכת תרחיש ללא איחוד
 */
export function evaluateNoConsolidation(
  existingLoans: Loan[],
  cashAvailable: number,
  upcomingExpense: number,
  newLoanAPR: number,
  candidateTerms: number[]
): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  
  // הקצאת מזומן להלוואות קיימות
  const { loans: loansAfterCash, cashLeft, allocation } = allocateCashAvalanche(existingLoans, cashAvailable);
  
  // חישוב צורך במימון נוסף
  const needNewLoan = Math.max(0, upcomingExpense - cashLeft);
  
  // בדיקת כל תקופה מועמדת להלוואה החדשה
  for (const term of candidateTerms) {
    const allLoans = [...loansAfterCash];
    
    if (needNewLoan > 0) {
      allLoans.push({
        id: 'new-loan',
        name: 'הלוואה חדשה',
        principal: needNewLoan,
        apr: newLoanAPR,
        months: term,
      });
    }
    
    // חישוב סיכומים
    let totalMonthlyPayment = 0;
    let totalInterest = 0;
    let totalPaid = 0;
    let weightedEndTime = 0;
    let totalPaymentForWeighting = 0;
    
    for (const loan of allLoans) {
      const summary = calculateLoanSummary(loan);
      totalMonthlyPayment += summary.monthlyPayment;
      totalInterest += summary.totalInterest;
      totalPaid += summary.totalPaid;
      
      // חישוב זמן סיום משוקלל לפי גודל התשלום החודשי
      weightedEndTime += loan.months * summary.monthlyPayment;
      totalPaymentForWeighting += summary.monthlyPayment;
    }
    
    // אם יש תשלומים, נחשב ממוצע משוקלל, אחרת נקח את המקסימום
    if (totalPaymentForWeighting > 0) {
      weightedEndTime = Math.round(weightedEndTime / totalPaymentForWeighting);
    } else {
      weightedEndTime = Math.max(...allLoans.map(loan => loan.months));
    }
    
    results.push({
      type: 'noConsolidation',
      loans: allLoans,
      totalMonthlyPayment,
      totalInterest,
      totalPaid,
      weightedEndTime: weightedEndTime,
      description: `ללא איחוד - הלוואה חדשה ל-${term} חודשים`,
      cashAllocation: allocation,
    });
  }
  
  return results;
}

/**
 * הערכת תרחיש איחוד מלא
 */
export function evaluateFullConsolidation(
  existingLoans: Loan[],
  cashAvailable: number,
  upcomingExpense: number,
  newLoanAPR: number,
  candidateTerms: number[]
): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  
  // חישוב סכום האיחוד
  const totalExistingPrincipal = existingLoans.reduce((sum, loan) => sum + loan.principal, 0);
  const consolidationAmount = totalExistingPrincipal + upcomingExpense - cashAvailable;
  
  if (consolidationAmount <= 0) {
    // אין צורך בהלוואת איחוד
    return [];
  }
  
  // בדיקת כל תקופה מועמדת
  for (const term of candidateTerms) {
    const consolidationLoan: Loan = {
      id: 'consolidation',
      name: 'הלוואת איחוד',
      principal: consolidationAmount,
      apr: newLoanAPR,
      months: term,
    };
    
    const summary = calculateLoanSummary(consolidationLoan);
    
    results.push({
      type: 'fullConsolidation',
      loans: [consolidationLoan],
      totalMonthlyPayment: summary.monthlyPayment,
      totalInterest: summary.totalInterest,
      totalPaid: summary.totalPaid,
      weightedEndTime: term,
      description: `איחוד מלא - ${term} חודשים`,
    });
  }
  
  return results;
}

/**
 * מציאת התכנית הטובה ביותר
 */
export function findBestPlan(args: OptimizationInput): OptimizationResult {
  const {
    existingLoans,
    cashAvailable,
    upcomingExpense,
    newLoanAPR,
    candidateTerms,
    objective,
    budgetMonthly,
  } = args;
  
  // הערכת כל התרחישים
  const noConsolidationResults = evaluateNoConsolidation(
    existingLoans,
    cashAvailable,
    upcomingExpense,
    newLoanAPR,
    candidateTerms
  );
  
  const fullConsolidationResults = evaluateFullConsolidation(
    existingLoans,
    cashAvailable,
    upcomingExpense,
    newLoanAPR,
    candidateTerms
  );
  
  const allResults = [...noConsolidationResults, ...fullConsolidationResults];
  
  // סינון לפי תקציב חודשי אם הוגדר
  let validResults = allResults;
  let budgetExceeded = false;
  
  if (budgetMonthly && budgetMonthly > 0) {
    validResults = allResults.filter(result => result.totalMonthlyPayment <= budgetMonthly);
    
    if (validResults.length === 0) {
      // אם אין תרחיש תקין, נציג הודעה מתאימה
      budgetExceeded = true;
      // נבחר את 3 התרחישים הקרובים ביותר לתקציב
      validResults = allResults
        .sort((a, b) => a.totalMonthlyPayment - b.totalMonthlyPayment)
        .slice(0, 3);
    }
  }
  
  // בחירת התרחיש הטוב ביותר לפי המטרה
  let best: ScenarioResult;
  let reason: string;
  
  if (objective === 'minTotalInterest') {
    best = validResults.reduce((prev, curr) => 
      curr.totalInterest < prev.totalInterest ? curr : prev
    );
    reason = `נבחר בגלל מינימום סך ריבית: ${Math.round(best.totalInterest).toLocaleString('he-IL')} ₪`;
  } else {
    best = validResults.reduce((prev, curr) => 
      curr.totalMonthlyPayment < prev.totalMonthlyPayment ? curr : prev
    );
    reason = `נבחר בגלל מינימום החזר חודשי: ${Math.round(best.totalMonthlyPayment).toLocaleString('he-IL')} ₪`;
  }
  
  // אם התרחיש הנבחר עדיין חורג מהתקציב, נוסיף התראה
  if (budgetMonthly && best.totalMonthlyPayment > budgetMonthly) {
    budgetExceeded = true;
  }
  
  return {
    best,
    compared: allResults,
    reason: budgetExceeded 
      ? `⚠️ אף תרחיש לא עומד בתקציב החודשי של ${budgetMonthly?.toLocaleString('he-IL')} ₪. מוצגים התרחישים הקרובים ביותר. ${reason}`
      : reason,
    budgetExceeded,
  };
}

/**
 * חישוב יתרות נוכחיות של הלוואות קיימות
 */
export function getCurrentBalances(loans: Loan[], monthsPaid = 0): Loan[] {
  return loans.map(loan => ({
    ...loan,
    principal: getRemainingBalance(loan, monthsPaid),
  }));
}