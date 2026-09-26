import { describe, expect, it } from 'vitest';
import {
  BROKERAGE_PERCENT,
  BROKERAGE_PRESET_KEY,
  EQUITY_CATEGORY_ID,
  buildInitialExpenses,
  calculateEquityTotals,
  calculateExpenseDate,
  equityCalendarExpenses,
  equityStanding,
  minEquityRequired,
  sanitizeExpenses,
} from './equity-planning';
import type { EquityPlanView, PropertyData } from './equity-planning';

const property: PropertyData = {
  price: 2_000_000,
  targetDate: '2026-06-01',
  financingProfile: 'first-home',
};

describe('ברירות המחדל של הטבלה', () => {
  it('פותחת את שורת ההון העצמי עם המינימום לפי תקנות בנק ישראל', () => {
    const expenses = buildInitialExpenses(property);
    const equity = expenses.find((expense) => expense.categoryId === EQUITY_CATEGORY_ID);
    expect(equity?.amount).toBe(500_000);
    expect(minEquityRequired(property)).toBe(500_000);
  });

  it('משאירה את כל שאר ההוצאות ריקות', () => {
    const expenses = buildInitialExpenses(property);
    const others = expenses.filter((expense) => expense.categoryId !== EQUITY_CATEGORY_ID);
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((expense) => expense.amount === 0)).toBe(true);
  });

  it('שומרת את הסכום המקובל כהצעה לצד השורה, בלי למלא אותו', () => {
    const expenses = buildInitialExpenses(property);
    const lawyer = expenses.find((expense) => expense.description === 'שכר טרחה עורך דין');
    expect(lawyer?.amount).toBe(0);
    expect(lawyer?.suggested).toBe(8000);
  });

  it('ממלאת את שורת התיווך ב-1.5% מערך הנכס כשהעסקה מבוצעת בעזרת מתווך', () => {
    const withBroker = buildInitialExpenses(property, true);
    const brokerage = withBroker.find((expense) => expense.presetKey === BROKERAGE_PRESET_KEY);
    expect(brokerage?.amount).toBe(property.price * BROKERAGE_PERCENT);

    const without = buildInitialExpenses(property, false);
    expect(without.find((expense) => expense.presetKey === BROKERAGE_PRESET_KEY)?.amount).toBe(0);
  });
});

describe('סיכומים', () => {
  it('סופר רק את מה שהוזן בפועל', () => {
    const expenses = buildInitialExpenses(property);
    const totals = calculateEquityTotals({
      propertyData: property,
      expenses,
      usesBroker: false,
      currentStep: 1,
    });
    expect(totals.equityAmount).toBe(500_000);
    expect(totals.sideExpenses).toBe(0);
    expect(totals.totalExpenses).toBe(500_000);
  });

  it('מפריד בין הון עצמי להוצאות נלוות אחרי הזנה', () => {
    const expenses = buildInitialExpenses(property).map((expense) =>
      expense.description === 'מס רכישה' ? { ...expense, amount: 70_000 } : expense
    );
    const totals = calculateEquityTotals({
      propertyData: property,
      expenses,
      usesBroker: false,
      currentStep: 1,
    });
    expect(totals.sideExpenses).toBe(70_000);
    expect(totals.totalEquityNeeded).toBe(500_000 + 570_000);
  });
});

describe('מועדי תשלום', () => {
  it('שורת ההון העצמי יושבת על מועד היעד עצמו', () => {
    expect(calculateExpenseDate(EQUITY_CATEGORY_ID, '2026-06-01')).toBe('2026-06-01');
  });

  it('עלות לקיחת המשכנתא מוקדמת למועד היעד ומתפזרת בין השורות', () => {
    const first = calculateExpenseDate('mortgage', '2026-06-01', 0);
    const second = calculateExpenseDate('mortgage', '2026-06-01', 1);
    expect(first < '2026-06-01').toBe(true);
    expect(second > first).toBe(true);
  });
});

describe('מצב ההון העצמי', () => {
  it('מתריע כשההון נמוך מהמינימום', () => {
    expect(equityStanding(400_000, 500_000, 2_000_000).level).toBe('below');
  });

  it('מזהה עמידה מדויקת במינימום ומעבר לו', () => {
    expect(equityStanding(500_000, 500_000, 2_000_000).level).toBe('minimum');
    expect(equityStanding(560_000, 500_000, 2_000_000).level).toBe('good');
    expect(equityStanding(800_000, 500_000, 2_000_000).level).toBe('excellent');
  });
});

describe('חיבור ללוח השנה', () => {
  const view: EquityPlanView = {
    id: 'plan',
    propertyPrice: property.price,
    targetDate: property.targetDate,
    financingProfile: 'first-home',
    usesBroker: false,
    expenses: buildInitialExpenses(property).map((expense) =>
      expense.description === 'שמאות' ? { ...expense, amount: 2500 } : expense
    ),
    minEquityRequired: 500_000,
    totalExpenses: 502_500,
    totalRequired: 1_002_500,
    updatedAt: new Date().toISOString(),
  };

  it('מעביר ללוח רק הוצאות עם סכום ומועד', () => {
    const events = equityCalendarExpenses(view);
    expect(events.some((event) => event.title === 'שמאות')).toBe(true);
    expect(events.some((event) => event.title === 'מס רכישה')).toBe(false);
    expect(events.every((event) => event.amount > 0)).toBe(true);
  });
});

describe('ניקוי נתונים מהדפדפן', () => {
  it('מסנן ערכים לא תקינים ומשלים ברירות מחדל', () => {
    const rows = sanitizeExpenses([
      { id: 'a', categoryId: 'legal', description: 'עו״ד', amount: -5, paymentDate: 'לא תאריך' },
      'לא אובייקט',
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].amount).toBe(0);
    expect(rows[0].paymentDate).toBe('');
    expect(rows[0].status).toBe('planned');
    expect(rows[1].categoryId).toBe('emergency');
  });
});
