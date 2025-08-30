import { describe, it, expect } from 'vitest';
import { annuityPayment, buildAmortSchedule, calculateLoanSummary, getRemainingBalance } from '../src/components/consumer-loans/loanMath';
import type { Loan } from '../src/components/consumer-loans/types';

describe('loanMath', () => {
  describe('annuityPayment', () => {
    it('should calculate correct monthly payment for standard loan', () => {
      // בדיקת הדוגמה מהדרישות: 100,000 ש"ח, 12% שנתי, 12 חודשים
      const payment = annuityPayment(100000, 12, 12);
      
      // התוצאה הצפויה היא בערך 8,884 ש"ח (סטייה של עד 5 ש"ח)
      expect(payment).toBeCloseTo(8884, -1); // דיוק של 10 ש"ח
      expect(Math.abs(payment - 8884)).toBeLessThan(5);
    });

    it('should handle zero interest rate', () => {
      const payment = annuityPayment(100000, 0, 12);
      expect(payment).toBeCloseTo(100000 / 12, 2);
    });

    it('should handle very small interest rate', () => {
      const payment = annuityPayment(100000, 0.000001, 12);
      expect(payment).toBeCloseTo(100000 / 12, 1);
    });

    it('should return 0 for invalid inputs', () => {
      expect(annuityPayment(0, 12, 12)).toBe(0);
      expect(annuityPayment(100000, 12, 0)).toBe(0);
      expect(annuityPayment(-100000, 12, 12)).toBe(0);
    });
  });

  describe('buildAmortSchedule', () => {
    it('should build correct amortization schedule', () => {
      const schedule = buildAmortSchedule({
        principal: 100000,
        apr: 12,
        months: 12,
      });

      // בדיקות בסיסיות
      expect(schedule.rows).toHaveLength(12);
      expect(schedule.totalPaid).toBeCloseTo(schedule.paymentInitial * 12, 0);
      expect(schedule.totalInterest).toBeCloseTo(schedule.totalPaid - 100000, 0);
      expect(schedule.monthsActual).toBe(12);

      // בדיקת השורה הראשונה
      const firstRow = schedule.rows[0];
      expect(firstRow.m).toBe(1);
      expect(firstRow.balStart).toBe(100000);
      expect(firstRow.balEnd).toBeLessThan(100000);

      // בדיקת השורה האחרונה
      const lastRow = schedule.rows[schedule.rows.length - 1];
      expect(lastRow.balEnd).toBeCloseTo(0, 0);
    });

    it('should handle prepayment correctly (reduce mode)', () => {
      const withoutPrepay = buildAmortSchedule({
        principal: 100000,
        apr: 12,
        months: 12,
      });

      const withPrepay = buildAmortSchedule({
        principal: 100000,
        apr: 12,
        months: 12,
        prepayAmount: 20000,
        prepayMonth: 1,
        mode: 'reduce',
      });

      // פרעון מוקדם צריך להפחית את סך הריבית
      expect(withPrepay.totalInterest).toBeLessThan(withoutPrepay.totalInterest);
      
      // מספר החודשים נשאר זהה במצב reduce
      expect(withPrepay.monthsActual).toBe(12);
      
      // בדיקת השורה הראשונה (הפרעון המוקדם)
      const prepayRow = withPrepay.rows[0];
      expect(prepayRow.pay).toBe(20000);
      expect(prepayRow.interest).toBe(0);
      expect(prepayRow.principal).toBe(20000);
    });
  });

  describe('calculateLoanSummary', () => {
    it('should calculate loan summary correctly', () => {
      const loan: Loan = {
        id: 'test',
        name: 'Test Loan',
        principal: 100000,
        apr: 12,
        months: 12,
      };

      const summary = calculateLoanSummary(loan);
      
      expect(summary.monthlyPayment).toBeCloseTo(8884, -1);
      expect(summary.totalPaid).toBeCloseTo(summary.monthlyPayment * 12, 0);
      expect(summary.totalInterest).toBeCloseTo(summary.totalPaid - 100000, 0);
    });
  });

  describe('getRemainingBalance', () => {
    it('should calculate remaining balance correctly', () => {
      const loan: Loan = {
        id: 'test',
        name: 'Test Loan',
        principal: 100000,
        apr: 12,
        months: 12,
      };

      // יתרה בתחילה
      expect(getRemainingBalance(loan, 0)).toBeCloseTo(100000, 0);
      
      // יתרה אחרי 6 חודשים
      const halfwayBalance = getRemainingBalance(loan, 6);
      expect(halfwayBalance).toBeGreaterThan(0);
      expect(halfwayBalance).toBeLessThan(100000);
      
      // יתרה בסוף
      expect(getRemainingBalance(loan, 12)).toBeCloseTo(0, 0);
      
      // יתרה אחרי תום התקופה
      expect(getRemainingBalance(loan, 15)).toBe(0);
    });
  });
});