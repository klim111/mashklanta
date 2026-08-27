import { describe, expect, it } from 'vitest';
import {
  PLAN_STAGES,
  analysisFromPlanning,
  analyzeProfile,
  clampDealMortgage,
  clampPlanYears,
  dealMaxMortgage,
  emptyPlanData,
  missingForStage,
  monthsToYears,
  mortgageFromLtvPercent,
  mortgageFromProperty,
  maxPropertyForEquity,
  parseStageData,
  planProgress,
  planSnapshot,
  preApprovalDocumentGroups,
  preApprovalDocuments,
  stageHints,
  stageIsComplete,
  unfinishedPrerequisites,
  yearsToMonths,
} from './mortgage-plan';
import type { PlanData, PlanStageId, PlanStageStatus } from './mortgage-plan';
import { defaultMortgagePlanningUserData } from './mortgage-affordability';

/** פרופיל שלם שאפשר לסגור איתו את שלב הניתוח */
function profile(): PlanData {
  const data = emptyPlanData();
  data.ANALYSIS = {
    ...data.ANALYSIS,
    intent: 'HAS_PROPERTY',
    household: 'COUPLE',
    age: 34,
    partnerAge: 33,
    income: 18_000,
    partnerIncome: 12_000,
    employmentType: 'SALARIED',
    partnerEmploymentType: 'SELF_EMPLOYED',
    expenses: 8_000,
    existingLoans: 2_000,
    equity: 700_000,
    dealType: 'first_home',
    propertyValue: 2_400_000,
    years: 25,
  };
  return data;
}

describe('סדר השלבים', () => {
  it('בניית התמהיל באה אחרי האישור העקרוני ולפני מכרז הריביות', () => {
    expect(PLAN_STAGES).toEqual(['ANALYSIS', 'APPLICATIONS', 'MIX', 'AUCTION', 'SIGNING']);
  });

  it('שלבים קודמים שטרם נסגרו הם אלה שצריך להשלים לפני עבודה בשלב', () => {
    const statuses = {
      ANALYSIS: 'IN_PROGRESS',
      APPLICATIONS: 'PENDING',
      MIX: 'PENDING',
      AUCTION: 'PENDING',
      SIGNING: 'PENDING',
    } as const;
    expect(unfinishedPrerequisites('ANALYSIS', statuses)).toEqual([]);
    expect(unfinishedPrerequisites('MIX', statuses)).toEqual(['ANALYSIS', 'APPLICATIONS']);
  });
});

describe('תקופת המשכנתא בחודשים', () => {
  it('חותכת לתחום 48–360 חודשים ושומרת כל חודש ביניים', () => {
    expect(clampPlanYears(999)).toBe(30);
    expect(clampPlanYears(2)).toBe(4);
    expect(yearsToMonths(25)).toBe(300);
    expect(monthsToYears(246)).toBe(20.5);
    expect(clampPlanYears(20.5)).toBe(20.5);
    expect(parseStageData('ANALYSIS', { years: 246 / 12 }).years).toBe(20.5);
  });
});

describe('ניתוח הפרופיל הפיננסי', () => {
  it('סכום המשכנתא ואחוז המימון נגזרים משווי הנכס וההון העצמי', () => {
    const result = analyzeProfile(profile().ANALYSIS);

    expect(result.totalIncome).toBe(30_000);
    expect(result.requiredLoan).toBe(1_700_000);
    expect(result.ltv).toBeCloseTo((1_700_000 / 2_400_000) * 100, 5);
    expect(result.maxLtv).toBe(75);
  });

  it('הכנסת בן הזוג נספרת רק כשהלווים הם זוג', () => {
    const single = { ...profile().ANALYSIS, household: 'SINGLE' as const };
    expect(analyzeProfile(single).totalIncome).toBe(18_000);
  });

  it('חוסר בהון עצמי מזוהה מול תקרת המימון של סוג העסקה', () => {
    // דירה שנייה מוגבלת ל-50% מימון, ולכן אותו הון עצמי כבר אינו מספיק
    const second = { ...profile().ANALYSIS, dealType: 'second_home' as const };
    const result = analyzeProfile(second);

    expect(result.maxLtv).toBe(50);
    expect(result.equityGap).toBe(2_400_000 * 0.5 - 700_000);
    expect(result.requiredLoan).toBe(1_200_000);
    expect(result.ltv).toBeCloseTo(50, 5);
  });

  it('יחס ההחזר נמדד אחרי ניכוי ההלוואות הקיימות', () => {
    const result = analyzeProfile(profile().ANALYSIS);
    const base = 30_000 - 2_000;

    expect(result.repaymentRatio).toBeCloseTo((result.estimatedMonthlyPayment / base) * 100, 5);
  });

  it('תקרת ההחזר היא 40% מההכנסה הפנויה של היחיד או של סכום ההכנסות הפנויות של הזוג', () => {
    const couple = analyzeProfile(profile().ANALYSIS);
    expect(couple.disposableIncome).toBe(20_000);
    expect(couple.maxMonthlyPayment).toBeCloseTo(20_000 * 0.4, 5);

    const single = analyzeProfile({ ...profile().ANALYSIS, household: 'SINGLE' });
    expect(single.disposableIncome).toBe(8_000);
    expect(single.maxMonthlyPayment).toBeCloseTo(8_000 * 0.4, 5);
  });

  it('בלי נתונים אין מה לחשב, ולא נופלים על חלוקה באפס', () => {
    const result = analyzeProfile(emptyPlanData().ANALYSIS);

    expect(result.hasInputs).toBe(false);
    expect(result.ltv).toBeNull();
    expect(result.repaymentRatio).toBeNull();
    expect(result.estimatedMonthlyPayment).toBe(0);
  });
});

describe('סגירת שלבים', () => {
  it('שלב הפרופיל נסגר רק כשיש נכס, הכנסה, הון עצמי ופרטי הלווים', () => {
    expect(stageIsComplete('ANALYSIS', emptyPlanData())).toBe(false);
    expect(stageIsComplete('ANALYSIS', profile())).toBe(true);
  });

  it('בלי בחירת נקודת פתיחה אין מה לבדוק הלאה', () => {
    expect(missingForStage('ANALYSIS', emptyPlanData())).toEqual(['בחירת נקודת הפתיחה']);
  });

  it('בדיקת היתכנות אינה סוגרת את השלב — צריך נכס כדי להגיש לבנק', () => {
    const data = profile();
    data.ANALYSIS.intent = 'FEASIBILITY';

    expect(stageIsComplete('ANALYSIS', data)).toBe(false);
    expect(missingForStage('ANALYSIS', data)[0]).toMatch(/היתכנות/);
  });

  it('מה שחסר לסגירת השלב מדווח ללקוח', () => {
    const data = profile();
    data.ANALYSIS.propertyValue = null;
    data.ANALYSIS.partnerEmploymentType = null;

    expect(missingForStage('ANALYSIS', data)).toEqual([
      'מחיר הנכס',
      'אופן ההעסקה של לווה 2',
    ]);
    expect(missingForStage('ANALYSIS', profile())).toEqual([]);
  });

  it('שלב האישור העקרוני נסגר רק כשהלקוח מסמן שהאישור בידו', () => {
    const data = profile();
    data.APPLICATIONS = { ...data.APPLICATIONS, bank: 'לאומי' };
    expect(stageIsComplete('APPLICATIONS', data)).toBe(false);
    expect(missingForStage('APPLICATIONS', data)).toEqual(['סימון שהאישור העקרוני התקבל']);

    data.APPLICATIONS.approved = true;
    expect(stageIsComplete('APPLICATIONS', data)).toBe(true);
  });

  it('פרטים שחסרים בפרופיל חוסמים את הגשת הבקשה לאישור עקרוני', () => {
    const data = profile();
    data.ANALYSIS.partnerEmploymentType = null;
    data.APPLICATIONS = { ...data.APPLICATIONS, bank: 'לאומי', approved: true };

    expect(stageIsComplete('APPLICATIONS', data)).toBe(false);
    expect(missingForStage('APPLICATIONS', data)[0]).toMatch(/אופן ההעסקה של לווה 2/);
  });

  it('תיק המסמכים נבנה לכל לווה לפי אופן ההעסקה שלו', () => {
    const data = profile();
    const groups = preApprovalDocumentGroups(data);
    const borrowers = groups.filter((group) => group.id !== 'shared');

    expect(borrowers).toHaveLength(2);
    expect(borrowers[0].documents.some((doc) => doc.key === 'b1:payslips')).toBe(true);
    expect(borrowers[1].documents.some((doc) => doc.key === 'b2:self_employed_tax')).toBe(true);
    // מסמכי שכיר אינם נדרשים מהעצמאי, ולהיפך
    expect(borrowers[1].documents.some((doc) => doc.key.endsWith('payslips'))).toBe(false);
  });

  it('ליחיד יש רשימה אחת, ובלי אופן העסקה היא ריקה', () => {
    const data = profile();
    data.ANALYSIS.household = 'SINGLE';
    data.ANALYSIS.employmentType = null;
    const groups = preApprovalDocumentGroups(data);

    expect(groups.filter((group) => group.id !== 'shared')).toHaveLength(1);
    expect(preApprovalDocuments(data).every((doc) => !doc.key.includes(':'))).toBe(true);
  });

  it('חשבון משותף שם את תדפיס העו"ש בראש מסמכי משק הבית', () => {
    const data = profile();
    data.ANALYSIS.bankAccountMode = 'JOINT';
    const shared = preApprovalDocumentGroups(data).find((group) => group.id === 'shared');
    const keys = shared?.documents.map((doc) => doc.key) ?? [];

    expect(keys.slice(0, 3)).toEqual(['bank_statements', 'account_management', 'loans_report']);
    expect(preApprovalDocuments(data).some((doc) => doc.key === 'b1:bank_statements')).toBe(false);
  });

  it('חשבונות נפרדים דורשים תדפיס עו"ש ואישור ניהול חשבון לכל לווה', () => {
    const data = profile();
    data.ANALYSIS.bankAccountMode = 'SEPARATE';
    const groups = preApprovalDocumentGroups(data);
    const shared = groups.find((group) => group.id === 'shared');
    const b1 = groups.find((group) => group.id === 'b1');
    const b2 = groups.find((group) => group.id === 'b2');

    expect(shared?.documents.some((doc) => doc.key === 'bank_statements')).toBe(false);
    expect(b1?.documents.map((doc) => doc.key)).toEqual(
      expect.arrayContaining(['b1:bank_statements', 'b1:account_management', 'b1:loans_report'])
    );
    expect(b2?.documents.map((doc) => doc.key)).toEqual(
      expect.arrayContaining(['b2:bank_statements', 'b2:account_management', 'b2:loans_report'])
    );
  });

  it('שלב המכרז נסגר רק כשנבחרה הצעה זוכה', () => {
    const data = profile();
    data.AUCTION.offers = [
      { id: 'o1', bank: 'מזרחי', round: 1, monthlyPayment: 8_100, averageRate: 4.4, totalPaid: 2_430_000, note: '' },
    ];
    expect(stageIsComplete('AUCTION', data)).toBe(false);

    data.AUCTION.winnerOfferId = 'o1';
    expect(stageIsComplete('AUCTION', data)).toBe(true);
  });

  it('ההתקדמות היא שיעור השלבים שנסגרו', () => {
    const statuses = {} as Record<PlanStageId, PlanStageStatus>;
    PLAN_STAGES.forEach((stage) => {
      statuses[stage] = 'PENDING';
    });

    expect(planProgress(statuses)).toBe(0);
    statuses.ANALYSIS = 'COMPLETED';
    statuses.MIX = 'COMPLETED';
    expect(planProgress(statuses)).toBe(40);

    PLAN_STAGES.forEach((stage) => {
      statuses[stage] = 'COMPLETED';
    });
    expect(planProgress(statuses)).toBe(100);
  });
});

describe('תמונת המצב של התהליך', () => {
  it('התנאים שנחתמו גוברים על ההצעה ועל התמהיל המתוכנן', () => {
    const data = profile();
    data.MIX = { ...data.MIX, totalAmount: 1_700_000, monthlyPayment: 8_400 };
    data.AUCTION.offers = [
      { id: 'o1', bank: 'לאומי', round: 1, monthlyPayment: 8_200, averageRate: 4.3, totalPaid: 2_460_000, note: '' },
    ];
    data.AUCTION.winnerOfferId = 'o1';

    expect(planSnapshot(data).monthlyPayment).toBe(8_200);

    data.SIGNING = { ...data.SIGNING, finalMonthlyPayment: 8_250, finalAmount: 1_690_000 };
    const snapshot = planSnapshot(data);
    expect(snapshot.monthlyPayment).toBe(8_250);
    expect(snapshot.mortgageAmount).toBe(1_690_000);
  });

  it('כתובת הנכס ושווי הנכס מגיעים מהתמהיל אחרי שהוזנו בכלי התכנון', () => {
    const data = profile();
    data.ANALYSIS.propertyAddress = '';
    data.ANALYSIS.propertyValue = null;
    data.MIX = {
      ...data.MIX,
      totalAmount: 1_200_000,
      propertyAddress: 'הרצל 10, תל אביב',
      propertyValue: 2_000_000,
    };

    const snapshot = planSnapshot(data);
    expect(snapshot.propertyAddress).toBe('הרצל 10, תל אביב');
    expect(snapshot.propertyValue).toBe(2_000_000);
    expect(snapshot.mortgageAmount).toBe(1_200_000);
  });

  it('בלי הצעה או תמהיל, הכרטיס מציג את ההערכה משלב הניתוח', () => {
    const data = profile();
    const snapshot = planSnapshot(data);

    expect(snapshot.mortgageAmount).toBe(1_700_000);
    expect(snapshot.monthlyPayment).toBeCloseTo(
      analyzeProfile(data.ANALYSIS).estimatedMonthlyPayment,
      5
    );
  });
});

describe('ניקוי נתונים שהגיעו מבחוץ', () => {
  it('ערכים פגומים הופכים לשדות ריקים במקום להפיל את הטופס', () => {
    const parsed = parseStageData('ANALYSIS', {
      income: 'לא מספר',
      propertyValue: '2,400,000',
      dealType: 'unknown_deal',
      years: 999,
      household: 'OTHER',
    });

    expect(parsed.income).toBeNull();
    expect(parsed.propertyValue).toBe(2_400_000);
    expect(parsed.dealType).toBeNull();
    expect(parsed.years).toBe(30);
    expect(parsed.household).toBe('SINGLE');
  });

  it('הצעה בלי בנק נזרקת, ובחירת זוכה שאינו קיים מתאפסת', () => {
    const parsed = parseStageData('AUCTION', {
      offers: [{ id: 'o1', bank: 'לאומי' }, { monthlyPayment: 7_000 }, null],
      winnerOfferId: 'missing',
    });

    expect(parsed.offers).toHaveLength(1);
    expect(parsed.offers[0].round).toBe(1);
    expect(parsed.winnerOfferId).toBeNull();
  });

  it('סימוני מסמכים שאינם בקטלוג אינם נשמרים', () => {
    const parsed = parseStageData('APPLICATIONS', {
      bank: 'לאומי',
      documents: {
        'b1:payslips': true,
        'b2:self_employed_tax': true,
        made_up_key: true,
        bank_statements: false,
      },
    });

    expect(parsed.documents).toEqual({ 'b1:payslips': true, 'b2:self_employed_tax': true });
  });

  it('סל אחיד שאינו בקטלוג נזרק, וריביות של מסלולים זרים אינן נשמרות', () => {
    const parsed = parseStageData('APPLICATIONS', {
      bank: 'מזרחי',
      requestedAmount: 1_500_000,
      baskets: [
        { basketId: 'fixed', rates: { fixed_unlinked: 4.7, prime: 5.2 } },
        { basketId: 'made_up_basket', rates: { prime: 5 } },
      ],
    });

    expect(parsed.baskets).toHaveLength(1);
    expect(parsed.baskets[0].rates).toEqual({ fixed_unlinked: 4.7 });
  });

  it('תהליך מהמבנה הישן ממשיך עם הבנק שכבר אישר את הבקשה', () => {
    const parsed = parseStageData('APPLICATIONS', {
      banks: [
        { id: 'a', bank: 'דיסקונט', status: 'REJECTED' },
        { id: 'b', bank: 'הפועלים', status: 'APPROVED' },
      ],
    });

    expect(parsed.bank).toBe('הפועלים');
    expect(parsed.approved).toBe(true);
  });
});

describe('הצעת כלים לפי הנתונים', () => {
  it('החזר על הלוואות קיימות מעלה את מתכנן ההלוואות הצרכניות', () => {
    const hints = stageHints('ANALYSIS', profile());
    expect(hints.some((hint) => hint.toolId === 'consumer-loans')).toBe(true);
  });

  it('בלי הלוואות קיימות הכלי אינו מוצע', () => {
    const data = profile();
    data.ANALYSIS.existingLoans = null;
    const hints = stageHints('ANALYSIS', data);
    expect(hints.some((hint) => hint.toolId === 'consumer-loans')).toBe(false);
  });

  it('חוסר בהון עצמי מסמן את תכנון ההון העצמי כאזהרה', () => {
    const data = profile();
    data.ANALYSIS.dealType = 'second_home';
    const equity = stageHints('ANALYSIS', data).find((hint) => hint.toolId === 'equity');

    expect(equity?.tone).toBe('warning');
  });

  it('גם כשההון מספיק, תכנון ההון העצמי מוצע כי יש הוצאות נלוות מעבר למקדמה', () => {
    const hints = stageHints('ANALYSIS', profile());
    const equity = hints.find((hint) => hint.toolId === 'equity');

    expect(equity?.tone).toBe('info');
  });
});

describe('גזירה מכלי בניית הפרופיל', () => {
  it('הכנסה, הון עצמי וסוג עסקה נגזרים מהשדות של הכלי הקיים', () => {
    const planning = defaultMortgagePlanningUserData();
    planning.applicationType = 'individual';
    planning.propertyType = 'דירה ראשונה';
    planning.monthlyIncome = '18000';
    planning.ownCapital = '700000';
    planning.age = '34';

    const analysis = analysisFromPlanning(planning, 'profile-complete');
    const data = emptyPlanData();
    data.ANALYSIS = analysis;

    expect(analysis.income).toBe(18_000);
    expect(analysis.equity).toBe(700_000);
    expect(analysis.dealType).toBe('first_home');
    expect(analysis.propertyValue).toBeNull();
    // בלי נכס ובלי אופן העסקה עוד אין מה להגיש לבנק
    expect(stageIsComplete('ANALYSIS', data)).toBe(false);
  });

  it('מה שהלקוח ערך בטופס הפרופיל גובר על הנתונים שהגיעו מהכלי', () => {
    const planning = defaultMortgagePlanningUserData();
    planning.applicationType = 'individual';
    planning.propertyType = 'דירה ראשונה';
    planning.monthlyIncome = '18000';
    planning.ownCapital = '700000';
    planning.age = '34';

    const edited = parseStageData('ANALYSIS', {
      ...analysisFromPlanning(planning, 'personal-info'),
      intent: 'HAS_PROPERTY',
      income: 21_000,
      propertyValue: 2_400_000,
      employmentType: 'SALARIED',
    });

    expect(edited.income).toBe(21_000);
    expect(edited.equity).toBe(700_000);
    expect(edited.propertyValue).toBe(2_400_000);
    expect(stageIsComplete('ANALYSIS', { ...emptyPlanData(), ANALYSIS: edited })).toBe(true);
  });

  it('סכום המשכנתא הוא מחיר הנכס פחות ההון העצמי, בתוך תקרת סוג העסקה', () => {
    const data = profile().ANALYSIS;

    expect(analyzeProfile(data).requiredLoan).toBe(1_700_000);
    expect(analyzeProfile({ ...data, mortgageAmount: 1_500_000 }).requiredLoan).toBe(1_700_000);

    const cheaper = analyzeProfile({ ...data, propertyValue: 2_000_000 });
    expect(cheaper.requiredLoan).toBe(1_300_000);
    expect(cheaper.ltv).toBeCloseTo(65, 5);
  });

  it('סכום המשכנתא נחתך לתקרת המימון של סוג העסקה', () => {
    expect(dealMaxMortgage(2_400_000, 'first_home')).toBe(1_800_000);
    expect(clampDealMortgage(2_000_000, 2_400_000, 'first_home')).toBe(1_800_000);
    expect(mortgageFromProperty(2_400_000, 700_000, 'first_home')).toBe(1_700_000);
    expect(mortgageFromProperty(2_400_000, null, 'first_home')).toBe(1_800_000);
    expect(mortgageFromLtvPercent(2_400_000, 60, 'first_home')).toBe(1_440_000);
    expect(mortgageFromLtvPercent(2_400_000, 90, 'first_home')).toBe(1_800_000);
    expect(maxPropertyForEquity(700_000, 'first_home')).toBe(2_800_000);
    expect(parseStageData('ANALYSIS', { ...profile().ANALYSIS, propertyValue: 3_500_000 }).propertyValue).toBe(
      2_800_000
    );
  });

  it('הלוואות לפי לווה נסכמות להחזר החודשי הקיים', () => {
    const parsed = parseStageData('ANALYSIS', {
      intent: 'HAS_PROPERTY',
      household: 'COUPLE',
      borrowerLoans: [
        { id: 'a', monthlyPayment: 1_200 },
        { id: 'b', monthlyPayment: 800 },
      ],
      partnerLoans: [{ id: 'c', monthlyPayment: 500 }],
    });

    expect(parsed.existingLoans).toBe(2_500);
    expect(parsed.borrowerLoans).toHaveLength(2);
    expect(parsed.partnerLoans).toHaveLength(1);
  });

  it('הלוואה משותפת וחשבון בנק נשמרים בפרופיל', () => {
    const parsed = parseStageData('ANALYSIS', {
      household: 'COUPLE',
      bankAccountMode: 'SEPARATE',
      borrowerLoans: [{ id: 'a', monthlyPayment: 1_000, shared: true }],
    });

    expect(parsed.bankAccountMode).toBe('SEPARATE');
    expect(parsed.borrowerLoans[0].shared).toBe(true);
  });
});
