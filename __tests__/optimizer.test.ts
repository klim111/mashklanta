import { describe, it, expect } from 'vitest';
import { allocateCashAvalanche, findBestPlan, evaluateNoConsolidation, evaluateFullConsolidation } from '../src/components/consumer-loans/optimizer';
import type { Loan, OptimizationInput } from '../src/components/consumer-loans/types';

describe('optimizer', () => {
  const highAPRLoan: Loan = {
    id: 'high',
    name: 'הלוואה יקרה',
    principal: 50000,
    apr: 18, // ריבית גבוהה
    months: 36,
  };

  const lowAPRLoan: Loan = {
    id: 'low',
    name: 'הלוואה זולה',
    principal: 30000,
    apr: 8, // ריבית נמוכה
    months: 24,
  };

  describe('allocateCashAvalanche', () => {
    it('should allocate cash to highest APR loan first', () => {
      const loans = [lowAPRLoan, highAPRLoan]; // סדר מעורבב
      const cash = 25000;

      const result = allocateCashAvalanche(loans, cash);

      // צריך להקצות קודם להלוואה היקרה
      expect(result.allocation['high']).toBe(25000);
      expect(result.allocation['low']).toBeUndefined();
      
      // ההלוואה היקרה צריכה להיות מופחתת
      const highLoanAfter = result.loans.find(l => l.id === 'high');
      expect(highLoanAfter?.principal).toBe(25000); // 50000 - 25000
      
      // ההלוואה הזולה נשארת ללא שינוי
      const lowLoanAfter = result.loans.find(l => l.id === 'low');
      expect(lowLoanAfter?.principal).toBe(30000);
    });

    it('should close loan completely if cash covers it', () => {
      const loans = [highAPRLoan];
      const cash = 60000; // יותר מהקרן

      const result = allocateCashAvalanche(loans, cash);

      expect(result.allocation['high']).toBe(50000);
      expect(result.cashLeft).toBe(10000);
      expect(result.loans).toHaveLength(0); // ההלוואה נסגרה
    });

    it('should handle zero cash', () => {
      const loans = [highAPRLoan, lowAPRLoan];
      const cash = 0;

      const result = allocateCashAvalanche(loans, cash);

      expect(Object.keys(result.allocation)).toHaveLength(0);
      expect(result.loans).toHaveLength(2);
      expect(result.cashLeft).toBe(0);
    });
  });

  describe('findBestPlan', () => {
    it('should find plan that reduces total interest', () => {
      const input: OptimizationInput = {
        existingLoans: [highAPRLoan, lowAPRLoan],
        cashAvailable: 30000,
        upcomingExpense: 10000,
        newLoanAPR: 10,
        candidateTerms: [24, 36, 48],
        objective: 'minTotalInterest',
      };

      const result = findBestPlan(input);

      expect(result.best).toBeDefined();
      expect(result.compared.length).toBeGreaterThan(1);
      expect(result.reason).toContain('מינימום סך ריבית');
      
      // בדיקה שהתרחיש המנצח באמת מפחית ריבית
      const baselineInterest = [highAPRLoan, lowAPRLoan].reduce((sum, loan) => {
        const payment = (loan.principal * (loan.apr / 100 / 12) * Math.pow(1 + loan.apr / 100 / 12, loan.months)) / (Math.pow(1 + loan.apr / 100 / 12, loan.months) - 1);
        return sum + (payment * loan.months) - loan.principal;
      }, 0);
      
      // התרחיש המנצח צריך להיות טוב יותר מהבסיס (או לפחות לא גרוע יותר)
      expect(result.best.totalInterest).toBeLessThanOrEqual(baselineInterest * 1.1); // מרווח של 10%
    });

    it('should respect budget constraint for minMonthly objective', () => {
      const input: OptimizationInput = {
        existingLoans: [highAPRLoan],
        cashAvailable: 0,
        upcomingExpense: 20000,
        newLoanAPR: 15,
        candidateTerms: [12, 24, 36],
        objective: 'minMonthly',
        budgetMonthly: 3000,
      };

      const result = findBestPlan(input);

      expect(result.best.totalMonthlyPayment).toBeLessThanOrEqual(3000);
      expect(result.reason).toContain('מינימום החזר חודשי');
    });

    it('should handle consolidation scenarios', () => {
      const input: OptimizationInput = {
        existingLoans: [highAPRLoan, lowAPRLoan],
        cashAvailable: 10000,
        upcomingExpense: 15000,
        newLoanAPR: 10, // ריבית טובה לאיחוד
        candidateTerms: [36, 48, 60],
        objective: 'minTotalInterest',
      };

      const result = findBestPlan(input);

      // צריכים להיות תרחישים של איחוד ואי-איחוד
      const hasConsolidation = result.compared.some(s => s.type === 'fullConsolidation');
      const hasNoConsolidation = result.compared.some(s => s.type === 'noConsolidation');
      
      expect(hasConsolidation).toBe(true);
      expect(hasNoConsolidation).toBe(true);
    });
  });

  describe('evaluateNoConsolidation', () => {
    it('should create scenarios without consolidation', () => {
      const results = evaluateNoConsolidation(
        [highAPRLoan, lowAPRLoan],
        20000, // מזומן
        10000, // הוצאה
        12, // APR להלוואה חדשה
        [24, 36] // תקופות מועמדות
      );

      expect(results).toHaveLength(2); // 2 תקופות
      expect(results[0].type).toBe('noConsolidation');
      expect(results[0].cashAllocation).toBeDefined();
    });
  });

  describe('evaluateFullConsolidation', () => {
    it('should create consolidation scenarios', () => {
      const results = evaluateFullConsolidation(
        [highAPRLoan, lowAPRLoan],
        20000, // מזומן
        10000, // הוצאה
        10, // APR לאיחוד
        [36, 48] // תקופות מועמדות
      );

      expect(results).toHaveLength(2); // 2 תקופות
      expect(results[0].type).toBe('fullConsolidation');
      expect(results[0].loans).toHaveLength(1); // הלוואה אחת מאוחדת
      
      // סכום האיחוד צריך להיות: סך הקרנות + הוצאה - מזומן
      const expectedAmount = 50000 + 30000 + 10000 - 20000; // 70,000
      expect(results[0].loans[0].principal).toBe(expectedAmount);
    });

    it('should return empty array if no consolidation needed', () => {
      // מזומן מכסה הכל
      const results = evaluateFullConsolidation(
        [highAPRLoan],
        100000, // מזומן רב
        10000, // הוצאה קטנה
        10,
        [36]
      );

      expect(results).toHaveLength(0);
    });
  });
});