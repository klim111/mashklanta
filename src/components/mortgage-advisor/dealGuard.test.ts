import { describe, expect, it } from 'vitest';
import { checkDealLimits } from './dealGuard';

const base = {
  propertyValue: 2_000_000,
  totalAmount: 1_400_000,
  dealType: 'first_home' as const,
  maxMonthlyPayment: 8_000,
  monthlyPayment: 7_000,
  profileCap: 8_000,
};

describe('מגבלות רגולציה על עריכת העסקה', () => {
  it('עסקה בתוך כל המגבלות עוברת', () => {
    expect(checkDealLimits(base, 'totalAmount')).toEqual([]);
  });

  it('משכנתא מעל 75% לדירה ראשונה נחסמת עם הסבר על התקרה', () => {
    const violations = checkDealLimits({ ...base, totalAmount: 1_600_000 }, 'totalAmount');
    expect(violations.map((v) => v.kind)).toEqual(['ltv']);
    expect(violations[0].message).toContain('80.0%');
    expect(violations[0].message).toContain('₪1,500,000');
  });

  it('הון עצמי נמוך מדי מנוסח לפי ההון, לא לפי המימון', () => {
    const violations = checkDealLimits({ ...base, totalAmount: 1_700_000 }, 'equity');
    expect(violations[0].kind).toBe('equity');
    expect(violations[0].message).toContain('₪300,000');
    expect(violations[0].message).toContain('25%');
  });

  it('תקרת החזר מעל 40% מההכנסה הפנויה נחסמת', () => {
    const violations = checkDealLimits({ ...base, maxMonthlyPayment: 9_500 }, 'maxMonthlyPayment');
    expect(violations.map((v) => v.kind)).toEqual(['ratio']);
    expect(violations[0].message).toContain('₪8,000');
  });

  it('שינוי סכום שמקפיץ את ההחזר של התמהיל מעל התקרה נחסם', () => {
    const violations = checkDealLimits({ ...base, monthlyPayment: 8_400 }, 'totalAmount');
    expect(violations.map((v) => v.kind)).toEqual(['ratio']);
  });

  it('עריכת עלות הנכס לא נחסמת בגלל החזר שכבר היה גבוה — הסכום לא השתנה', () => {
    expect(checkDealLimits({ ...base, monthlyPayment: 8_400 }, 'propertyValue')).toEqual([]);
  });

  it('בלי תקרה מהפרופיל, תקרת התמהיל היא המגבלה היחידה על ההחזר', () => {
    expect(
      checkDealLimits({ ...base, profileCap: undefined, monthlyPayment: 7_900 }, 'totalAmount')
    ).toEqual([]);
    expect(
      checkDealLimits({ ...base, profileCap: undefined, monthlyPayment: 8_200 }, 'totalAmount')
    ).toHaveLength(1);
  });
});
