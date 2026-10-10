/**
 * תכנון ההון העצמי וההוצאות הנלוות לרכישת דירה.
 *
 * הקובץ טהור בכוונה (בלי React ובלי Prisma): הוא נטען בכלי עצמו, במסלולי
 * ה-API ששומרים את התכנון בבסיס הנתונים, ובסדר היום של האזור האישי — כדי
 * שהתשלומים שמוזנים בכלי יופיעו בלוח השנה הראשי בלי לחשב אותם מחדש.
 *
 * ברירות המחדל: רק שורת ההון העצמי לרכישה נפתחת עם סכום (לפי תקנות בנק
 * ישראל). כל שאר ההוצאות נפתחות ריקות ומתעדכנות לפי מה שהמשתמש מזין. שורת
 * התיווך היא היוצאת מן הכלל: כשמסמנים שהעסקה מבוצעת בעזרת מתווך היא מקבלת
 * ערך ברירת מחדל של 1.5% מערך הנכס, שניתן לשנות.
 */

export type EquityExpenseStatus = 'paid' | 'planned' | 'pending';
export type EquityCalculationSource = 'percentage' | 'fixed' | 'range';

export interface EquityExpense {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  /** YYYY-MM-DD */
  paymentDate: string;
  status: EquityExpenseStatus;
  calculationSource: EquityCalculationSource;
  percentageOfPrice?: number;
  minAmount?: number;
  maxAmount?: number;
  notes: string;
  /** מפתח התבנית שממנה נוצרה השורה — משמש לשורות מיוחדות כמו התיווך */
  presetKey?: string;
  /**
   * הסכום שהתבנית מציעה. השורה נפתחת ריקה, וההצעה מוצגת לצדה כדי שאפשר יהיה
   * למלא אותה בלחיצה אחת במקום לנחש.
   */
  suggested?: number;
}

export interface EquityPreset {
  /** מפתח יציב לשורות שיש להן התנהגות משלהן (תיווך) */
  key?: string;
  description: string;
  defaultAmount?: number;
  percentageOfPrice?: number;
  minAmount?: number;
  maxAmount?: number;
  notes: string;
}

export interface EquityCategory {
  id: string;
  name: string;
  description: string;
  /** שם הצבע במערכת העיצוב — הרכיב ממפה אותו למחלקות ולגוון הגרף */
  color: string;
  presets: EquityPreset[];
}

export type FinancingProfileId = 'first-home' | 'replacement' | 'investment' | 'any-purpose';

export interface PropertyData {
  price: number;
  /** YYYY-MM-DD */
  targetDate: string;
  financingProfile: FinancingProfileId;
}

export interface EquityPlanningData {
  propertyData: PropertyData;
  expenses: EquityExpense[];
  /** העסקה מבוצעת בעזרת מתווך — מפעיל את ברירת המחדל בשורת התיווך */
  usesBroker: boolean;
  currentStep: number;
}

/** ברירת המחדל של עמלת התיווך, כשהעסקה מבוצעת בעזרת מתווך */
export const BROKERAGE_PERCENT = 0.015;
export const BROKERAGE_PRESET_KEY = 'brokerage';
export const BROKERAGE_TOGGLE_LABEL = 'העסקה מבוצעת בעזרת מתווך';

export const EQUITY_CATEGORY_ID = 'equity';

export const FINANCING_PROFILES: Record<FinancingProfileId, { name: string; minEquityPercent: number }> = {
  'first-home': { name: 'דירה ראשונה', minEquityPercent: 0.25 },
  replacement: { name: 'דירה חליפית', minEquityPercent: 0.3 },
  investment: { name: 'דירה להשקעה', minEquityPercent: 0.5 },
  'any-purpose': { name: 'לכל מטרה', minEquityPercent: 0.5 },
};

export const FINANCING_PROFILE_IDS = Object.keys(FINANCING_PROFILES) as FinancingProfileId[];

export function isFinancingProfile(value: unknown): value is FinancingProfileId {
  return typeof value === 'string' && (FINANCING_PROFILE_IDS as string[]).includes(value);
}

/**
 * הקטגוריות לפי סדר התהליך. ה-presets הם ההצעות שמוצגות בשורה — הם אינם
 * ממלאים את הסכום, אלא מסבירים מה מקובל ומאפשרים למלא בלחיצה אחת.
 */
export const EQUITY_CATEGORIES: EquityCategory[] = [
  {
    id: EQUITY_CATEGORY_ID,
    name: 'הון עצמי לרכישת הדירה',
    description: 'הון עצמי מינימלי הנדרש על פי תקנות בנק ישראל',
    color: 'emerald',
    presets: [],
  },
  {
    id: 'mortgage',
    name: 'עלות לקיחת משכנתא',
    description: 'פתיחת תיק, נוטריון, שמאות',
    color: 'blue',
    presets: [
      {
        description: 'פתיחת תיק משכנתא',
        percentageOfPrice: 0.0025,
        notes: 'בדרך כלל 0.25% ממחיר הנכס',
      },
      {
        description: 'אישור חתימות נוטריון',
        defaultAmount: 500,
        notes: 'אישור חתימות אצל נוטריון',
      },
      {
        description: 'שמאות',
        minAmount: 2000,
        maxAmount: 3500,
        notes: 'בין 2,000-3,500 ₪ בהתאם לערך הנכס',
      },
    ],
  },
  {
    id: 'legal',
    name: 'משפטי',
    description: 'שכר טרחת עורך דין',
    color: 'green',
    presets: [
      {
        description: 'שכר טרחה עורך דין',
        defaultAmount: 8000,
        notes: 'בדרך כלל 6,000-12,000 ₪',
      },
    ],
  },
  {
    id: 'property-search',
    name: 'מציאת נכס',
    description: 'תיווך, נסיעות, ימי עבודה',
    color: 'purple',
    presets: [
      {
        key: BROKERAGE_PRESET_KEY,
        description: 'עמלת תיווך',
        percentageOfPrice: BROKERAGE_PERCENT,
        notes: '1.5% מערך הנכס — מופיע כשהעסקה מבוצעת בעזרת מתווך',
      },
      {
        description: 'נסיעות ומעקבים',
        defaultAmount: 1500,
        notes: 'הוצאות נסיעה וביקורים בנכסים',
      },
      {
        description: 'אובדן ימי עבודה',
        defaultAmount: 5000,
        notes: 'ערך של ימי עבודה שהוקדשו לחיפוש',
      },
    ],
  },
  {
    id: 'taxation',
    name: 'מיסוי',
    description: 'מס רכישה, מס שבח, היטל השבחה',
    color: 'red',
    presets: [
      {
        description: 'מס רכישה',
        percentageOfPrice: 0.035,
        notes: 'תלוי בסוג הנכס - 3.5% לדירה ראשונה',
      },
      {
        description: 'מס שבח',
        defaultAmount: 0,
        notes: 'רק אם לא זכאי לפטור',
      },
      {
        description: 'היטל השבחה',
        defaultAmount: 0,
        notes: 'תלוי ברשות המקומית',
      },
    ],
  },
  {
    id: 'logistics',
    name: 'לוגיסטיקה',
    description: 'אחסון, מגורים זמניים, הובלה',
    color: 'amber',
    presets: [
      {
        description: 'אחסון זמני',
        defaultAmount: 2000,
        notes: 'אם יש צורך באחסון',
      },
      {
        description: 'מגורים זמניים',
        defaultAmount: 8000,
        notes: 'דמי שכירות זמניים בין מכירה לרכישה',
      },
      {
        description: 'חברת הובלה',
        defaultAmount: 3000,
        notes: 'תלוי בכמות החפצים ובמרחק',
      },
    ],
  },
  {
    id: 'new-home',
    name: 'בדירה החדשה',
    description: 'שיפוצים, מכשירי חשמל, ריהוט',
    color: 'orange',
    presets: [
      {
        description: 'שיפוצים',
        minAmount: 50000,
        maxAmount: 150000,
        notes: 'תלוי במצב הנכס',
      },
      {
        description: 'מכשירי חשמל',
        defaultAmount: 25000,
        notes: 'מקרר, מכונת כביסה, מדיח וכו׳',
      },
      {
        description: 'ריהוט',
        defaultAmount: 40000,
        notes: 'מיטות, ארונות, שולחן וכו׳',
      },
    ],
  },
  {
    id: 'emergency',
    name: 'חירום ובלתי צפוי',
    description: 'הוצאות נוספות שלא נכללו בקטגוריות',
    color: 'gray',
    presets: [],
  },
];

export function equityCategory(id: string): EquityCategory | undefined {
  return EQUITY_CATEGORIES.find((category) => category.id === id);
}

/** הסכום המוצע לשורה לפי התבנית — מה שהיה פעם ברירת המחדל, וכעת מוצע בלחיצה */
export function suggestedAmount(preset: EquityPreset, price: number): number {
  if (preset.percentageOfPrice) return Math.round(price * preset.percentageOfPrice);
  if (preset.minAmount !== undefined && preset.maxAmount !== undefined) {
    return Math.round((preset.minAmount + preset.maxAmount) / 2);
  }
  return preset.defaultAmount ?? 0;
}

export function calculationSourceOf(preset: EquityPreset): EquityCalculationSource {
  if (preset.percentageOfPrice) return 'percentage';
  if (preset.minAmount !== undefined && preset.maxAmount !== undefined) return 'range';
  return 'fixed';
}

/**
 * מועד התשלום המשוער של שורה, נגזר מתאריך היעד לרכישה. השורות בתוך קטגוריה
 * מתפזרות על פני כמה ימים כדי שלוח התשלומים לא יתרכז ביום אחד.
 */
export function calculateExpenseDate(categoryId: string, targetDate: string, itemIndex = 0): string {
  if (!targetDate) return new Date().toISOString().split('T')[0];

  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return new Date().toISOString().split('T')[0];

  switch (categoryId) {
    case EQUITY_CATEGORY_ID:
      // במועד היעד עצמו
      break;
    case 'mortgage':
      // חודש וחצי לפני, בפריסה
      target.setMonth(target.getMonth() - 1);
      target.setDate(target.getDate() - 15 + itemIndex * 3);
      break;
    case 'legal':
      // חודש לפני
      target.setMonth(target.getMonth() - 1);
      target.setDate(target.getDate() + itemIndex * 2);
      break;
    case 'property-search':
      // חודשיים-שלושה לפני, בפריסה
      target.setMonth(target.getMonth() - 2);
      target.setDate(target.getDate() - itemIndex * 7);
      break;
    case 'taxation':
      // סביב מועד היעד, בפריסה
      target.setDate(target.getDate() - itemIndex * 2);
      break;
    case 'logistics':
      // סביב מועד היעד, בפריסה
      target.setDate(target.getDate() + itemIndex * 3);
      break;
    case 'new-home':
      // חודש-חודשיים אחרי, בפריסה
      target.setMonth(target.getMonth() + 1);
      target.setDate(target.getDate() + itemIndex * 7);
      break;
    default:
      break;
  }

  return target.toISOString().split('T')[0];
}

export function minEquityRequired(property: PropertyData): number {
  return property.price * FINANCING_PROFILES[property.financingProfile].minEquityPercent;
}

/**
 * השורות שנפתחות כשנכנסים לטבלת ההוצאות: שורת ההון העצמי עם הסכום המינימלי,
 * וכל שאר השורות ריקות — מתעדכנות לפי מה שהמשתמש מזין.
 */
export function buildInitialExpenses(property: PropertyData, usesBroker = false): EquityExpense[] {
  const stamp = Date.now();
  const percent = FINANCING_PROFILES[property.financingProfile].minEquityPercent;

  const expenses: EquityExpense[] = [
    {
      id: `equity-main-${stamp}`,
      categoryId: EQUITY_CATEGORY_ID,
      description: 'הון עצמי לרכישת הדירה',
      amount: minEquityRequired(property),
      paymentDate: property.targetDate,
      status: 'planned',
      calculationSource: 'percentage',
      percentageOfPrice: percent,
      notes: `הון עצמי מינימלי ${percent * 100}% לפי תקנות בנק ישראל`,
    },
  ];

  EQUITY_CATEGORIES.forEach((category) => {
    if (category.id === EQUITY_CATEGORY_ID || category.presets.length === 0) return;

    category.presets.forEach((preset, index) => {
      const isBrokerage = preset.key === BROKERAGE_PRESET_KEY;
      expenses.push({
        id: `${category.id}-preset-${index}-${stamp}-${index}`,
        categoryId: category.id,
        description: preset.description,
        // ברירת המחדל ריקה — מלבד התיווך כשהעסקה מבוצעת בעזרת מתווך
        amount: isBrokerage && usesBroker ? Math.round(property.price * BROKERAGE_PERCENT) : 0,
        paymentDate: calculateExpenseDate(category.id, property.targetDate, index),
        status: 'planned',
        calculationSource: calculationSourceOf(preset),
        percentageOfPrice: preset.percentageOfPrice,
        minAmount: preset.minAmount,
        maxAmount: preset.maxAmount,
        notes: preset.notes,
        presetKey: preset.key,
        suggested: suggestedAmount(preset, property.price),
      });
    });
  });

  return expenses;
}

export type EquityViewMode = 'best' | 'worst' | 'expected';

export const EQUITY_VIEW_MODE_LABELS: Record<EquityViewMode, string> = {
  best: 'מינימום',
  expected: 'ממוצע',
  worst: 'מקסימום',
};

/**
 * הסכום שמציעה תבנית שהוגדרה כטווח, לפי התרחיש שנבחר. כך אפשר למלא שורת טווח
 * בלחיצה אחת — בתרחיש האופטימי, הצפוי או הפסימי — בלי שערכים ייכנסו לטבלה
 * מאליהם.
 */
export function rangeAmount(expense: EquityExpense, viewMode: EquityViewMode): number | null {
  if (expense.minAmount === undefined || expense.maxAmount === undefined) return null;
  if (viewMode === 'best') return expense.minAmount;
  if (viewMode === 'worst') return expense.maxAmount;
  return Math.round((expense.minAmount + expense.maxAmount) / 2);
}

/** הסכום של שורה. שורה ריקה היא אפס — ערכים נכנסים רק כשהמשתמש מזין אותם */
export function expenseAmount(expense: EquityExpense): number {
  return Number.isFinite(expense.amount) ? expense.amount : 0;
}

export interface EquityTotals {
  /** סך כל השורות בטבלה, כולל שורת ההון העצמי */
  totalExpenses: number;
  /** ההוצאות הנלוות בלבד */
  sideExpenses: number;
  /** ההון העצמי שהוזן בשורת ההון העצמי */
  equityAmount: number;
  minEquityRequired: number;
  totalEquityNeeded: number;
  budgetGap: number;
  paid: number;
  planned: number;
  pending: number;
  percentageOfPrice: number;
}

export function calculateEquityTotals(data: EquityPlanningData): EquityTotals {
  const totalExpenses = data.expenses.reduce((sum, expense) => sum + expenseAmount(expense), 0);
  const equityAmount = data.expenses
    .filter((expense) => expense.categoryId === EQUITY_CATEGORY_ID)
    .reduce((sum, expense) => sum + expenseAmount(expense), 0);
  const sideExpenses = totalExpenses - equityAmount;
  const required = minEquityRequired(data.propertyData);

  const byStatus = (status: EquityExpenseStatus) =>
    data.expenses
      .filter((expense) => expense.status === status)
      .reduce((sum, expense) => sum + expenseAmount(expense), 0);

  return {
    totalExpenses,
    sideExpenses,
    equityAmount,
    minEquityRequired: required,
    totalEquityNeeded: required + totalExpenses,
    budgetGap: required + totalExpenses,
    paid: byStatus('paid'),
    planned: byStatus('planned'),
    pending: byStatus('pending'),
    percentageOfPrice: data.propertyData.price > 0 ? (totalExpenses / data.propertyData.price) * 100 : 0,
  };
}

export type EquityStandingLevel = 'below' | 'minimum' | 'good' | 'great' | 'excellent';

export interface EquityStanding {
  level: EquityStandingLevel;
  message: string;
  motivation: string;
}

/**
 * איפה ההון העצמי שהוזן עומד מול המינימום הנדרש — הטקסט והצבע שמופיעים
 * בשורת ההון העצמי.
 */
export function equityStanding(
  currentEquity: number,
  required: number,
  propertyPrice: number
): EquityStanding {
  const percentage = propertyPrice > 0 ? (currentEquity / propertyPrice) * 100 : 0;
  const minPercentage = propertyPrice > 0 ? (required / propertyPrice) * 100 : 0;

  if (currentEquity < required) {
    return {
      level: 'below',
      message: `⚠️ הון עצמי נמוך מהמינימום הנדרש (${minPercentage.toFixed(1)}%)`,
      motivation: '',
    };
  }
  if (currentEquity === required) {
    return {
      level: 'minimum',
      message: `✓ הון עצמי מינימלי ${minPercentage.toFixed(1)}% לפי תקנות בנק ישראל`,
      motivation: '💡 העלאת ההון העצמי תשפר את תנאי המשכנתא ותפחית ריבית',
    };
  }
  if (currentEquity < required * 1.2) {
    return {
      level: 'good',
      message: `✓ ${percentage.toFixed(1)}% הון עצמי - מעל המינימום!`,
      motivation: '👍 תנאי משכנתא משופרים! המשך להעלות לתנאים עוד יותר טובים',
    };
  }
  if (currentEquity < required * 1.5) {
    return {
      level: 'great',
      message: `✓ ${percentage.toFixed(1)}% הון עצמי - מצוין!`,
      motivation: '🎉 ריבית מופחתת משמעותית! חיסכון גדול על פני שנות המשכנתא',
    };
  }
  return {
    level: 'excellent',
    message: `✓ ${percentage.toFixed(1)}% הון עצמי - מעולה!`,
    motivation: '🌟 תנאי משכנתא מצוינים! ריבית נמוכה במיוחד וחיסכון מקסימלי',
  };
}

export const EMPTY_EQUITY_PLAN: EquityPlanningData = {
  propertyData: { price: 0, targetDate: '', financingProfile: 'first-home' },
  expenses: [],
  usesBroker: false,
  currentStep: 0,
};

// ───────────────────────── מעבר בין הכלי לבסיס הנתונים ─────────────────────────

/** התכנון כפי שהוא עובר בין השרת לדפדפן */
export interface EquityPlanView {
  id: string;
  propertyPrice: number;
  /** YYYY-MM-DD, או ריק */
  targetDate: string;
  financingProfile: FinancingProfileId;
  usesBroker: boolean;
  expenses: EquityExpense[];
  minEquityRequired: number;
  totalExpenses: number;
  totalRequired: number;
  updatedAt: string;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function cleanDate(value: unknown): string {
  const text = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

/** ניקוי שורות שהגיעו מהדפדפן לפני שמירה, כדי שלא ניכנס לבסיס הנתונים עם זבל */
export function sanitizeExpenses(value: unknown): EquityExpense[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const status = item.status;
    const source = item.calculationSource;
    return {
      id: cleanText(item.id, 64) || `expense-${index}`,
      categoryId: cleanText(item.categoryId, 40) || 'emergency',
      description: cleanText(item.description, 200),
      amount: cleanNumber(item.amount),
      paymentDate: cleanDate(item.paymentDate),
      status:
        status === 'paid' || status === 'pending' || status === 'planned'
          ? (status as EquityExpenseStatus)
          : 'planned',
      calculationSource:
        source === 'percentage' || source === 'range' ? (source as EquityCalculationSource) : 'fixed',
      percentageOfPrice: typeof item.percentageOfPrice === 'number' ? item.percentageOfPrice : undefined,
      minAmount: typeof item.minAmount === 'number' ? item.minAmount : undefined,
      maxAmount: typeof item.maxAmount === 'number' ? item.maxAmount : undefined,
      notes: cleanText(item.notes, 500),
      presetKey: cleanText(item.presetKey, 40) || undefined,
      suggested: typeof item.suggested === 'number' ? item.suggested : undefined,
    };
  });
}

export function planDataFromView(view: EquityPlanView | null): EquityPlanningData | null {
  if (!view) return null;
  return {
    propertyData: {
      price: view.propertyPrice,
      targetDate: view.targetDate,
      financingProfile: view.financingProfile,
    },
    expenses: view.expenses,
    usesBroker: view.usesBroker,
    currentStep: view.expenses.length > 0 ? 1 : 0,
  };
}

// ───────────────────────── חיבור ללוח השנה של האזור האישי ─────────────────────────

/** הוצאה מתוכננת כפי שלוח השנה הראשי צריך לראות אותה */
export interface EquityCalendarExpense {
  id: string;
  title: string;
  categoryName: string;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  status: EquityExpenseStatus;
}

/**
 * ההוצאות שיש להן מועד וסכום — אלה שמופיעות בלוח השנה של האזור האישי. שורה
 * ריקה (בלי סכום) אינה מועד שצריך להיערך אליו, ולכן אינה נכנסת ללוח.
 */
export function equityCalendarExpenses(view: EquityPlanView | null): EquityCalendarExpense[] {
  if (!view) return [];
  return view.expenses
    .filter((expense) => expense.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(expense.paymentDate))
    .map((expense) => ({
      id: expense.id,
      title: expense.description || equityCategory(expense.categoryId)?.name || 'הוצאה מתוכננת',
      categoryName: equityCategory(expense.categoryId)?.name ?? 'הוצאות',
      amount: expense.amount,
      date: expense.paymentDate,
      status: expense.status,
    }));
}
