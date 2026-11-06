import { describe, expect, it } from 'vitest';
import { analyzeProfile, emptyPlanData } from './mortgage-plan';
import type { PlanData } from './mortgage-plan';
import {
  buildProfileReport,
  graceHorizon,
  overallHeadline,
  profileRecommendations,
  repaymentRatioStatus,
  reportRecommendations,
  shouldAskIncomeIncrease,
  DOCUMENT_CONSISTENCY_WARNING,
  MIX_TRACKS,
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

describe('ההמלצות שצפות בזמן ההזנה', () => {
  it('יחס החזר קרוב לגבול העליון מעלה את המלצת התלושים, ומעבר לו היא הופכת לקריטית', () => {
    // 1,700,000 ל-25 שנים ≈ ₪9,780 בחודש; הכנסה נטו אחרי הלוואות של 26,000 → כ-37.6%
    const near = profile({ income: 15_000, partnerIncome: 12_500, existingLoans: 1_500 }).ANALYSIS;
    expect(repaymentRatioStatus(analyzeProfile(near).repaymentRatio)).toBe('near');
    const nearRec = profileRecommendations(near).find((item) => item.id === 'repayment-ratio');
    expect(nearRec?.tone).toBe('warning');
    expect(nearRec?.body).toMatch(/תלושי שכר/);
    expect(nearRec?.bullets?.[0]).toMatch(/ההכנסה הפנויה הריאלית/);
    expect(nearRec?.screens).toEqual(['borrowers', 'deal']);

    const over = { ...near, income: 10_000, partnerIncome: 9_000 };
    expect(profileRecommendations(over).find((item) => item.id === 'repayment-ratio')?.tone).toBe('critical');

    expect(profileRecommendations(profile().ANALYSIS).some((item) => item.id === 'repayment-ratio')).toBe(false);
  });

  it('עלייה צפויה בהכנסה כשהיחס גבוה פותחת מסלול גרייס באורך התקופה עד העלייה', () => {
    const data = profile({ income: 15_000, partnerIncome: 12_500, existingLoans: 1_500 }).ANALYSIS;
    expect(shouldAskIncomeIncrease(data)).toBe(true);
    expect(graceHorizon(data)).toBeNull();

    data.expectsIncomeIncrease = true;
    data.futureMonthlyIncrease = 3_000;
    data.futureMonthlyIncreaseInYears = 3;
    const grace = graceHorizon(data);
    expect(grace?.months).toBe(36);
    expect(grace?.reasons[0].kind).toBe('income');
    expect(profileRecommendations(data).find((item) => item.id === 'grace-track')?.title).toMatch(/3 שנים/);

    // כשהיחס תקין השאלה אינה נשאלת, והתשובה שנשמרה אינה פותחת גרייס
    const roomy = { ...data, income: 22_000, partnerIncome: 12_000 };
    expect(shouldAskIncomeIncrease(roomy)).toBe(false);
    expect(graceHorizon(roomy)).toBeNull();
  });

  it('הלוואה שמסתיימת בתוך פחות מחמש שנים מצדיקה גרייס גם כשיחס ההחזר תקין, ואורכו לפי האירוע הקרוב', () => {
    const data = profile().ANALYSIS;
    data.borrowerLoans = [{ id: 'a', monthlyPayment: 1_500, remainingMonths: 30 }];
    data.partnerLoans = [{ id: 'b', monthlyPayment: 500, remainingMonths: 48 }];

    const grace = graceHorizon(data);
    expect(grace?.months).toBe(30);
    expect(grace?.reasons).toHaveLength(2);
    expect(profileRecommendations(data).find((item) => item.id === 'grace-track')?.bullets).toHaveLength(2);

    // מעל חמש שנים או מתחת ל-18 חודשים — אין סיבה לגרייס
    data.borrowerLoans = [{ id: 'a', monthlyPayment: 1_500, remainingMonths: 72 }];
    data.partnerLoans = [{ id: 'b', monthlyPayment: 500, remainingMonths: 12 }];
    expect(graceHorizon(data)).toBeNull();
  });

  it('שמאות מוקדמת צפה במסך הנכס עם אותו נוסח של המלצת התמהיל, ואינה נכפלת בדוח', () => {
    const tight = profile({ equity: 610_000 });
    const inline = profileRecommendations(tight.ANALYSIS).find((item) => item.id === 'early-appraisal');
    expect(inline?.screens).toEqual(['deal']);
    const report = buildProfileReport(tight);
    expect(report.recommendations.some((item) => item.title === inline?.title)).toBe(true);
    expect(report.alerts.some((item) => item.id === 'early-appraisal')).toBe(false);
  });

  it('בחירת הבנק של החשבון מעלה המלצה לכלול אותו בהגשה, פעם אחת לכל בנק', () => {
    const data = profile().ANALYSIS;
    expect(profileRecommendations(data).some((item) => item.id === 'primary-bank')).toBe(false);

    data.primaryBank = 'לאומי';
    data.partnerPrimaryBank = 'לאומי';
    const rec = profileRecommendations(data).find((item) => item.id === 'primary-bank');
    expect(rec?.title).toBe('כללו את בנק לאומי בין הבנקים שאליהם תוגש הבקשה לאישור עקרוני');
    expect(rec?.body).toMatch(/סבבי מיקוח/);

    data.partnerPrimaryBank = 'הפועלים';
    expect(profileRecommendations(data).find((item) => item.id === 'primary-bank')?.title).toMatch(
      /בנק לאומי ובנק הפועלים/
    );
  });
});

describe('מספרי הדשבורד, הסיכונים והקווים המנחים', () => {
  it('מחשב את ההכנסה הפנויה אחרי המשכנתא ואת סך הריביות לאורך התקופה', () => {
    const data = profile();
    const { summary } = buildProfileReport(data);
    const analysis = analyzeProfile(data.ANALYSIS);

    expect(summary.ready).toBe(true);
    expect(summary.mortgageAmount).toBe(1_700_000);
    expect(summary.months).toBe(300);
    expect(summary.disposableAfterMortgage).toBeCloseTo(
      analysis.disposableIncome - analysis.estimatedMonthlyPayment,
      5
    );
    expect(summary.totalPaid).toBeCloseTo(analysis.estimatedMonthlyPayment * 300, 5);
    expect(summary.totalInterest).toBeCloseTo(summary.totalPaid - 1_700_000, 5);
    expect(summary.interestShare).toBeGreaterThan(0);
    expect(summary.ratioStatus).toBe('pass');
    expect(summary.borrowers).toHaveLength(2);
  });

  it('הסיכונים והקווים המנחים מגיבים לפרופיל', () => {
    const data = profile({
      partnerEmploymentType: 'SELF_EMPLOYED',
      futureLumpSums: [{ id: 'l', label: 'קרן השתלמות', amount: 150_000, inYears: 4 }],
      borrowerLoans: [{ id: 'a', monthlyPayment: 1_500, remainingMonths: 24 }],
    });
    const report = buildProfileReport(data);

    expect(report.risks.some((risk) => risk.id === 'self-employed')).toBe(true);
    expect(report.risks.some((risk) => risk.id === 'loans')).toBe(true);
    expect(report.guidelines.map((item) => item.id)).toEqual([
      'frame',
      'stability',
      'grace',
      'flexibility',
      'linkage',
      'term',
      'cash-flow',
    ]);
    expect(report.guidelines.find((item) => item.id === 'flexibility')?.body).toMatch(/150,000/);
  });

  it('גיל מבוגר מקצר את התקופה המותרת ומסומן כסיכון', () => {
    const report = buildProfileReport(profile({ partnerAge: 58 }));
    expect(report.summary.maxYearsByAge).toBe(17);
    expect(report.risks.some((risk) => risk.id === 'age')).toBe(true);
  });

  it('בלי נכס הדשבורד אינו מוכן אך אינו נופל', () => {
    const report = buildProfileReport(profile({ intent: 'FEASIBILITY', propertyValue: null }));
    expect(report.summary.ready).toBe(false);
    expect(report.risks[0].id).toBe('no-property');
  });
});

describe('התזרים, לוח הזמנים, התמהיל הסכמטי והסימולציה', () => {
  it('המפל החודשי מסתכם: הכנסה פחות הוצאות והלוואות, פחות ההחזר, שווה מה שנשאר', () => {
    const report = buildProfileReport(profile());
    const { cashFlow } = report;
    expect(cashFlow.income).toBe(34_000);
    expect(cashFlow.expenses).toBe(4_000);
    expect(cashFlow.existingLoans).toBe(1_500);
    expect(cashFlow.disposable).toBe(28_500);
    expect(cashFlow.mortgagePayment).toBeCloseTo(report.summary.estimatedMonthlyPayment, 6);
    expect(cashFlow.remaining).toBeCloseTo(28_500 - report.summary.estimatedMonthlyPayment, 6);
    expect(cashFlow.steps.map((step) => step.key)).toEqual([
      'income',
      'expenses',
      'loans',
      'disposable',
      'mortgage',
      'remaining',
    ]);
  });

  it('ציר הזמן משחרר הלוואה שמסתיימת ומכניס הכנסה שצפויה לגדול במועדה', () => {
    const report = buildProfileReport(
      profile({
        years: 10,
        borrowerLoans: [{ id: 'car', monthlyPayment: 1_500, remainingMonths: 24 }],
        futureMonthlyIncrease: 2_000,
        futureMonthlyIncreaseInYears: 3,
      })
    );
    const { timeline } = report.cashFlow;
    expect(timeline).toHaveLength(11);
    expect(timeline[0].loans).toBe(1_500);
    expect(timeline[2].loans).toBe(0);
    expect(timeline[2].events).toHaveLength(1);
    expect(timeline[2].events[0]).toMatch(/^סיום הלוואה \(.*1,500.*לחודש\)$/);
    expect(timeline[3].income).toBe(36_000);
    expect(timeline[3].events).toHaveLength(1);
    expect(timeline[3].events[0]).toMatch(/^עלייה בהכנסה \(.*2,000.*לחודש\)$/);
    expect(timeline[4].events).toEqual([]);
    expect(timeline[3].remaining).toBeGreaterThan(timeline[0].remaining);
    expect(timeline[0].ratio).toBeCloseTo(report.summary.repaymentRatio ?? 0, 6);
  });

  it('בלי נתונים אין החזר בתזרים', () => {
    const report = buildProfileReport(emptyPlanData());
    expect(report.cashFlow.mortgagePayment).toBe(0);
    expect(report.cashFlow.remainingShare).toBeNull();
  });

  it('לוח הזמנים: חמשת השלבים, שמאות מוקדמת, ועבודה מול עורך הדין לאורך כל התהליך', () => {
    const items = buildProfileReport(profile({ equity: 1_000_000 })).timeline;
    expect(items.map((item) => item.id)).toEqual([
      'ANALYSIS',
      'appraisal',
      'lawyer',
      'MIX',
      'APPLICATIONS',
      'AUCTION',
      'SIGNING',
    ]);
    items.forEach((item) => {
      expect(item.endWeek).toBeGreaterThan(item.startWeek);
      expect(item.when.length).toBeGreaterThan(0);
    });

    const end = Math.max(...items.map((item) => item.endWeek));
    const lawyer = items.find((item) => item.id === 'lawyer');
    expect(lawyer?.startWeek).toBe(1);
    expect(lawyer?.endWeek).toBe(end);
    expect(lawyer?.note).toContain('לוח התשלומים');

    const mix = items.find((item) => item.id === 'MIX');
    expect(mix?.startWeek).toBe(2);
    expect((mix!.endWeek - mix!.startWeek) * 7).toBeCloseTo(3, 6);

    const signing = items.find((item) => item.id === 'SIGNING');
    expect(signing?.startWeek).toBe(10);
    expect(signing?.endWeek).toBe(14);
    expect(signing?.duration).toContain('מוכנות המסמכים');

    expect(items.find((item) => item.id === 'appraisal')?.emphasized).toBe(false);
  });

  it('שמאות מוקדמת מודגשת בלוח הזמנים כשהמימון קרוב לתקרה', () => {
    const near = buildProfileReport(profile({ equity: 620_000 })).timeline;
    expect(near.find((item) => item.id === 'appraisal')?.emphasized).toBe(true);
  });

  it('תיאור המסלולים אינו נגזר מהפרופיל, ומדרג לכל מסלול סיכון, גמישות ועלות', () => {
    const report = buildProfileReport(profile());
    expect(report.mixTracks).toBe(MIX_TRACKS);
    expect(report.mixTracks.map((track) => track.id)).toEqual([
      'fixed_unlinked',
      'fixed_linked',
      'prime',
      'variable_unlinked',
      'variable_linked',
      'makam',
      'eligibility',
    ]);
    report.mixTracks.forEach((track) => {
      [track.risk, track.flexibility, track.cost].forEach((level) => {
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(3);
      });
      expect(track.role.length).toBeGreaterThan(40);
    });
  });

  it('המסלולים הצמודים מסומנים, והסבריהם מזכירים את הצמדת הקרן למדד', () => {
    const linked = MIX_TRACKS.filter((track) => track.linked).map((track) => track.id);
    expect(linked).toEqual(['fixed_linked', 'variable_linked', 'eligibility']);
    MIX_TRACKS.filter((track) => track.linked).forEach((track) => {
      expect(track.role).toContain('מדד');
    });
    expect(MIX_TRACKS.find((track) => track.id === 'fixed_unlinked')?.linked).toBe(false);
  });
});

describe('שמות הלווים', () => {
  it('בלי שם נשארת התווית הגנרית, ועם שם הוא מחליף אותה בדוח ובתיק המסמכים', () => {
    const generic = buildProfileReport(profile());
    expect(generic.summary.borrowers.map((borrower) => borrower.label)).toEqual(['לווה 1', 'לווה 2']);
    expect(generic.documents.some((group) => group.title.includes('לווה 1'))).toBe(true);

    const named = buildProfileReport(
      profile({
        firstName: 'דנה',
        lastName: 'כהן',
        partnerFirstName: 'יואב',
        partnerLastName: 'כהן',
      })
    );
    expect(named.summary.borrowers.map((borrower) => borrower.label)).toEqual(['דנה כהן', 'יואב כהן']);
    expect(named.documents.some((group) => group.title === 'מסמכים של דנה כהן')).toBe(true);
    expect(named.documents.some((group) => group.title === 'מסמכים של יואב כהן')).toBe(true);
    expect(named.documents.some((group) => group.title.includes('לווה'))).toBe(false);
  });

  it('לווה יחיד עם שם מוצג בשמו, ובלי שם כ«הלווה»', () => {
    const single = buildProfileReport(profile({ household: 'SINGLE' }));
    expect(single.summary.borrowers[0].label).toBe('הלווה');

    const named = buildProfileReport(
      profile({ household: 'SINGLE', firstName: 'אבי', lastName: 'לוי' })
    );
    expect(named.summary.borrowers[0].label).toBe('אבי לוי');
  });
});
