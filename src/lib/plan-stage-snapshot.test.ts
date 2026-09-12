import { describe, expect, it } from 'vitest';
import { PLAN_STAGES, emptyPlanData } from './mortgage-plan';
import type { PlanData } from './mortgage-plan';
import { stageSnapshot } from './plan-stage-snapshot';

function filled(): PlanData {
  const data = emptyPlanData();
  data.ANALYSIS = {
    ...data.ANALYSIS,
    intent: 'HAS_PROPERTY',
    household: 'COUPLE',
    income: 22_000,
    partnerIncome: 12_000,
    expenses: 6_000,
    existingLoans: 1_500,
    equity: 700_000,
    propertyValue: 2_400_000,
  };
  data.APPLICATIONS = {
    ...data.APPLICATIONS,
    bank: 'לאומי',
    approved: true,
    approvedAmount: 1_700_000,
    validUntil: '2026-12-31',
    documents: { 'b1:payslips': true },
  };
  data.MIX = {
    ...data.MIX,
    mixKey: 'mix-1',
    mixName: 'תמהיל מאוזן',
    totalAmount: 1_700_000,
    monthlyPayment: 8_400,
    averageRate: 4.35,
    finalLocked: true,
  };
  data.AUCTION = {
    ...data.AUCTION,
    signedMix: {
      mixKey: 'mix-quoted',
      mixRecordId: null,
      bank: 'מזרחי',
      name: 'תמהיל מאוזן · ריביות מזרחי',
      monthlyPayment: 8_100,
      averageRate: 4.12,
      totalInterest: 720_000,
      totalPaid: 2_420_000,
      months: 300,
      chosenAt: '2026-09-12T10:00:00.000Z',
    },
  };
  data.SIGNING = {
    ...data.SIGNING,
    bank: 'מזרחי',
    signingDate: '2026-10-01',
    finalMonthlyPayment: 8_130,
  };
  return data;
}

describe('תמונת המצב של השלב', () => {
  it('לכל שלב יש כותרת וארבעה נתונים', () => {
    const data = filled();
    for (const stage of PLAN_STAGES) {
      const snapshot = stageSnapshot(stage, data);
      expect(snapshot.headline.length).toBeGreaterThan(0);
      expect(snapshot.items).toHaveLength(4);
    }
  });

  it('תהליך ריק אינו קורס — הנתונים חסרים, לא שגויים', () => {
    const data = emptyPlanData();
    for (const stage of PLAN_STAGES) {
      const snapshot = stageSnapshot(stage, data);
      expect(snapshot.headline.length).toBeGreaterThan(0);
      expect(snapshot.items.every((item) => item.value === null || typeof item.value === 'string')).toBe(
        true
      );
    }
  });

  it('הפרופיל מציג הכנסה פנויה ותקרת החזר', () => {
    const snapshot = stageSnapshot('ANALYSIS', filled());
    expect(snapshot.items[0].label).toBe('הכנסה פנויה');
    // 22,000 + 12,000 − 6,000 − 1,500
    expect(snapshot.items[0].value).toBe('₪26,500');
  });

  it('האישור העקרוני מדווח כשהתקבל, עם הבנק', () => {
    const snapshot = stageSnapshot('APPLICATIONS', filled());
    expect(snapshot.headline).toContain('לאומי');
    expect(snapshot.items.find((item) => item.label === 'סכום מאושר')?.value).toBe('₪1,700,000');
  });

  it('שלב התמהיל מדווח שהתמהיל ננעל', () => {
    const snapshot = stageSnapshot('MIX', filled());
    expect(snapshot.headline).toContain('נעול');
    expect(snapshot.items[0].value).toBe('תמהיל מאוזן');
  });

  it('שלב התמחור מציג את הבנק שנבחר ואת מספריו', () => {
    const snapshot = stageSnapshot('AUCTION', filled());
    expect(snapshot.headline).toContain('מזרחי');
    expect(snapshot.items.find((item) => item.label === 'החזר חודשי')?.value).toBe('₪8,100');
    expect(snapshot.items.find((item) => item.label === 'ריבית ממוצעת')?.value).toBe('4.12%');
  });

  it('בלי הצעה שנבחרה, שלב התמחור אומר שהיועץ עדיין מתמחר', () => {
    const snapshot = stageSnapshot('AUCTION', emptyPlanData());
    expect(snapshot.headline).toContain('מתמחר');
    expect(snapshot.items[0].value).toBeNull();
  });

  it('שלב החתימה סופר את הבדיקות שהושלמו', () => {
    const snapshot = stageSnapshot('SIGNING', filled());
    const checks = snapshot.items.find((item) => item.label === 'בדיקות שהושלמו')?.value;
    expect(checks).toMatch(/^0 מתוך \d+$/);
  });

  it('שלב שנסגר מדווח על כך בכותרת', () => {
    expect(stageSnapshot('SIGNING', filled(), 'COMPLETED').headline).toBe('המשכנתא נחתמה');
  });
});
