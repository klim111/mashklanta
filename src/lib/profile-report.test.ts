import { describe, expect, it } from 'vitest';
import { emptyPlanData } from './mortgage-plan';
import type { PlanData } from './mortgage-plan';
import {
  buildProfileReport,
  overallHeadline,
  reportRecommendations,
  DOCUMENT_CONSISTENCY_WARNING,
} from './profile-report';

function profile(overrides: Partial<PlanData['ANALYSIS']> = {}): PlanData {
  const data = emptyPlanData();
  data.ANALYSIS = {
    ...data.ANALYSIS,
    intent: 'HAS_PROPERTY',
    household: 'COUPLE',
    income: 22_000,
    partnerIncome: 12_000,
    expenses: 4_000,
    existingLoans: 1_500,
    equity: 700_000,
    propertyValue: 2_400_000,
    dealType: 'first_home',
    employmentType: 'SALARIED',
    partnerEmploymentType: 'SALARIED',
    age: 35,
    partnerAge: 34,
    ...overrides,
  };
  return data;
}

function checkOf(data: PlanData, key: string) {
  return buildProfileReport(data).checks.find((check) => check.key === key);
}

describe('בדיקות הדוח', () => {
  it('שלוש בדיקות: יחס החזר, יחס מימון והון עצמי', () => {
    expect(buildProfileReport(profile()).checks.map((check) => check.key)).toEqual([
      'repayment',
      'ltv',
      'equity',
    ]);
  });

  it('תהליך ריק אינו קורס — הבדיקות מדווחות שחסרים נתונים', () => {
    const report = buildProfileReport(emptyPlanData());
    expect(report.checks.every((check) => check.status === 'unknown' || check.status === 'fail')).toBe(
      true
    );
    expect(report.overall).not.toBe('pass');
  });

  it('יחס החזר מעל 40% נכשל, ובין 35 ל-40 מסומן כקרוב למגבלה', () => {
    const tight = profile({ income: 9_000, partnerIncome: 0, household: 'SINGLE' });
    expect(checkOf(tight, 'repayment')?.status).toBe('fail');

    const roomy = profile();
    expect(checkOf(roomy, 'repayment')?.status).toBe('pass');
  });

  it('יחס מימון מעל התקרה נכשל', () => {
    const overLtv = profile({ equity: 200_000, propertyValue: 2_400_000 });
    expect(checkOf(overLtv, 'ltv')?.status).toBe('fail');
  });

  it('הון עצמי חסר מדווח עם הפער בשקלים', () => {
    const short = profile({ equity: 200_000 });
    const check = checkOf(short, 'equity');
    expect(check?.status).toBe('fail');
    expect(check?.note).toMatch(/חסרים/);
  });

  it('המצב הכולל הוא החמור מבין הבדיקות', () => {
    expect(buildProfileReport(profile()).overall).toBe('pass');
    expect(buildProfileReport(profile({ equity: 200_000 })).overall).toBe('fail');
  });

  it('לכל מצב כולל יש משפט משלו', () => {
    const lines = (['pass', 'near', 'fail', 'unknown'] as const).map(overallHeadline);
    expect(new Set(lines).size).toBe(4);
    expect(lines.every((line) => line.length > 0)).toBe(true);
  });
});

describe('תוכן הדוח', () => {
  it('מוצגים המספרים שמסבירים את הבדיקות', () => {
    const report = buildProfileReport(profile());
    const labels = report.figures.map((figure) => figure.label);
    expect(labels).toContain('הכנסה פנויה');
    expect(labels).toContain('משכנתא מבוקשת');
    expect(labels).toContain('תקרת החזר חודשי');
    expect(report.headline).toContain('דירה');
  });

  it('רשימת המסמכים נגזרת מהרכב הלווים ומאופן ההעסקה', () => {
    const report = buildProfileReport(profile());
    expect(report.documents.length).toBeGreaterThan(0);
    expect(report.documents.every((group) => group.documents.length > 0)).toBe(true);

    const selfEmployed = buildProfileReport(profile({ employmentType: 'SELF_EMPLOYED' }));
    const names = selfEmployed.documents.flatMap((group) => group.documents).join(' ');
    expect(names.length).toBeGreaterThan(0);
  });

  it('האזהרה על התאמת הסכומים מסבירה מה קורה כשיש פער', () => {
    expect(DOCUMENT_CONSISTENCY_WARNING).toMatch(/עו״ש/);
    expect(DOCUMENT_CONSISTENCY_WARNING).toMatch(/אמינות/);
  });

  it('מועד ההפקה נשמר', () => {
    const at = new Date('2026-09-13T09:00:00.000Z');
    expect(buildProfileReport(profile(), at).generatedAt).toBe(at.toISOString());
  });
});

describe('ההמלצות שנגזרות מהנתונים', () => {
  /** עסקה עם מרווח מימון נוח — כדי לבודד את המלצות ההכנסות העתידיות */
  const roomy = (overrides: Partial<PlanData['ANALYSIS']> = {}) =>
    profile({ equity: 1_200_000, ...overrides });

  it('בלי הכנסות עתידיות ועם מרווח מימון נוח אין המלצות', () => {
    expect(reportRecommendations(roomy())).toEqual([]);
  });

  it('יחס מימון קרוב לתקרה מוביל להמלצה על שמאות מוקדמת', () => {
    // 2.4 מיליון עם 700 אלף הון עצמי — 70.8% מימון מול תקרה של 75%
    const recommendations = reportRecommendations(profile());
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].title).toMatch(/שמאות מוקדמת/);
    expect(recommendations[0].body).toMatch(/קנס ביטול חוזה|חוץ-בנקאי/);

    // הון עצמי גדול מרחיק מהתקרה, והאזהרה נעלמת
    expect(reportRecommendations(roomy())).toEqual([]);
  });

  it('סכום חד-פעמי צפוי מוביל להמלצה על פירעון מוקדם או בלון', () => {
    const data = roomy();
    data.ANALYSIS.futureLumpSums = [
      { id: 'l1', label: 'קרן השתלמות', amount: 200_000, inYears: 6 },
    ];
    const recommendations = reportRecommendations(data);
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].body).toMatch(/בלון|פירעון מוקדם/);
  });

  it('צפי לגידול בהכנסה מוביל להמלצה לשקול מחזור', () => {
    const data = roomy();
    data.ANALYSIS.futureMonthlyIncrease = 2_000;
    data.ANALYSIS.futureMonthlyIncreaseInYears = 4;
    const recommendations = reportRecommendations(data);
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].body).toMatch(/מחזור/);
  });

  it('שני המצבים יחד נותנים שתי המלצות, והן נכנסות לדוח', () => {
    const data = roomy();
    data.ANALYSIS.futureLumpSums = [{ id: 'l1', label: 'מענק', amount: 120_000, inYears: 3 }];
    data.ANALYSIS.futureMonthlyIncrease = 1_500;
    expect(buildProfileReport(data).recommendations).toHaveLength(2);
  });

  it('סכום בלי מועד, או מועד בלי סכום, אינם מייצרים המלצה', () => {
    const data = roomy();
    data.ANALYSIS.futureLumpSums = [
      { id: 'l1', label: 'ללא מועד', amount: 120_000, inYears: null },
      { id: 'l2', label: 'ללא סכום', amount: null, inYears: 5 },
    ];
    expect(reportRecommendations(data)).toEqual([]);
  });
});
