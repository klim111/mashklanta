import type { ConsolidationPlan, Loan, LoanCategory } from './types';
import { annuityPayment, buildLoanSchedule } from './loanMath';

/**
 * הנתונים הנגזרים של תיק ההלוואות.
 *
 * כל מה שלוח הבקרה והדאשבורד מציגים מחושב כאן, מאותן נוסחאות של `loanMath`:
 * מצב התיק כולו, התפלגות לאורך הזמן, והתובנות שמראות ללקוח מה יקר לו ומה
 * ישתלם לו לשנות. אין כאן הנחות על נתונים שהלקוח לא הזין — כל מספר נגזר
 * מההלוואות שברשימה, ומההכנסה כשהיא הוזנה.
 */

export const LOAN_CATEGORY_LABELS: Record<LoanCategory, string> = {
  bank: 'בנקאית',
  credit: 'אשראי / חוץ-בנקאי',
  car: 'רכב / ליסינג',
  family: 'משפחה / מעסיק',
  other: 'אחר',
};

/** ערכת הצבעים של ההלוואות — אותה ערכה שבשאר כלי הניתוח של הפלטפורמה */
const LOAN_PALETTE = ['#2563eb', '#e11d48', '#f59e0b', '#059669', '#7c3aed', '#0891b2', '#ea580c'];

export function loanCategoryOf(loan: Loan): LoanCategory {
  return loan.category ?? 'other';
}

/**
 * צבע קבוע לכל הלוואה. הלוואה מקבלת את הצבע הפנוי הבא בפעם הראשונה שהיא מוצגת
 * ושומרת אותו, כך שאותה הלוואה נצבעת אותו צבע בפאנל, בפס ההרכב ובגרפים, ושתי
 * הלוואות סמוכות לא מקבלות את אותו צבע.
 */
const assignedColors = new Map<string, string>();

export function loanColor(loan: { id: string }): string {
  const existing = assignedColors.get(loan.id);
  if (existing) return existing;
  const color = LOAN_PALETTE[assignedColors.size % LOAN_PALETTE.length];
  assignedColors.set(loan.id, color);
  return color;
}

export interface LoanStats {
  loan: Loan;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  /** חלק הריבית מכל התשלומים של ההלוואה */
  interestShare: number;
  /** מספר התשלומים בפועל — קצר מהתקופה כשיש פירעון מוקדם שמקצר */
  monthsActual: number;
}

export interface PortfolioStats {
  count: number;
  totalPrincipal: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  /** ריבית שנתית משוקללת לפי גובה הקרן */
  weightedApr: number;
  /** החודש שבו נגמרת ההלוואה הארוכה בתיק */
  payoffMonths: number;
  /** חלק הריבית מכל מה שישולם */
  interestShare: number;
  loans: LoanStats[];
}

export function loanStats(loan: Loan): LoanStats {
  const schedule = buildLoanSchedule(loan);
  return {
    loan,
    monthlyPayment: schedule.paymentInitial,
    totalInterest: schedule.totalInterest,
    totalPaid: schedule.totalPaid,
    interestShare: schedule.totalPaid > 0 ? schedule.totalInterest / schedule.totalPaid : 0,
    monthsActual: schedule.monthsActual,
  };
}

export function portfolioStats(loans: Loan[]): PortfolioStats {
  const stats = loans.map(loanStats);
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0);
  const monthlyPayment = stats.reduce((sum, item) => sum + item.monthlyPayment, 0);
  const totalInterest = stats.reduce((sum, item) => sum + item.totalInterest, 0);
  const totalPaid = stats.reduce((sum, item) => sum + item.totalPaid, 0);
  const weightedApr =
    totalPrincipal > 0
      ? loans.reduce((sum, loan) => sum + loan.apr * loan.principal, 0) / totalPrincipal
      : 0;

  return {
    count: loans.length,
    totalPrincipal,
    monthlyPayment,
    totalInterest,
    totalPaid,
    weightedApr,
    payoffMonths: stats.reduce((max, item) => Math.max(max, item.monthsActual), 0),
    interestShare: totalPaid > 0 ? totalInterest / totalPaid : 0,
    loans: stats,
  };
}

/* ------------------------------------------------------------------ */
/* סדרות לגרפים                                                        */
/* ------------------------------------------------------------------ */

export interface PortfolioYearPoint {
  year: number;
  /** יתרת החוב הכוללת בסוף השנה */
  balance: number;
  /** ריבית מצטברת ששולמה עד סוף השנה */
  cumulativeInterest: number;
  /** ההחזר החודשי שמשולם בפועל בשנה הזו */
  monthlyPayment: number;
}

/**
 * מצב התיק שנה אחר שנה: יתרת החוב, הריבית המצטברת וההחזר החודשי שיורד בכל פעם
 * שהלוואה נגמרת. זו התמונה שמראה ללקוח מתי הוא באמת משתחרר.
 */
export function portfolioYearlySeries(loans: Loan[]): PortfolioYearPoint[] {
  if (loans.length === 0) return [];

  const schedules = loans.map((loan) => ({ loan, rows: buildLoanSchedule(loan).rows }));

  const horizon = Math.max(...schedules.map((item) => item.rows.length));
  const points: PortfolioYearPoint[] = [];
  let cumulativeInterest = 0;

  for (let month = 1; month <= horizon; month += 1) {
    let balance = 0;
    let monthlyPayment = 0;
    for (const { rows } of schedules) {
      const row = rows[month - 1];
      if (!row) continue;
      cumulativeInterest += row.interest;
      balance += row.balEnd;
      monthlyPayment += row.pay;
    }

    if (month % 12 === 0 || month === horizon) {
      points.push({
        year: Math.ceil(month / 12),
        balance: Math.round(balance),
        cumulativeInterest: Math.round(cumulativeInterest),
        monthlyPayment: Math.round(monthlyPayment),
      });
    }
  }

  return points;
}

/* ------------------------------------------------------------------ */
/* תובנות                                                             */
/* ------------------------------------------------------------------ */

export interface LoanInsight {
  id: string;
  tone: 'alert' | 'opportunity' | 'neutral';
  title: string;
  detail: string;
}

/** יחס ההחזר — אותו יחס שהבנק בוחן לפני שהוא מאשר משכנתא */
export interface PaymentToIncome {
  ratio: number;
  /** הרף שמעליו הבנק מתחיל להסתייג (בנק ישראל מגביל את יחס ההחזר ל-50%) */
  status: 'healthy' | 'watch' | 'risk';
}

export function paymentToIncome(monthlyPayment: number, monthlyIncome: number): PaymentToIncome | null {
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  const ratio = monthlyPayment / monthlyIncome;
  return {
    ratio,
    status: ratio <= 0.2 ? 'healthy' : ratio <= 0.35 ? 'watch' : 'risk',
  };
}

/**
 * הריבית שאליה משווים תרחיש איחוד — שתי נקודות מתחת לריבית המשוקללת של התיק,
 * ולא פחות מ-5%. זו הנחה מוצהרת, שמוצגת ללקוח ליד המספר.
 */
export const CONSOLIDATION_RATE_DISCOUNT = 2;
export const CONSOLIDATION_RATE_FLOOR = 5;

export function consolidationBenchmarkRate(weightedApr: number): number {
  return Math.max(CONSOLIDATION_RATE_FLOOR, Math.round((weightedApr - CONSOLIDATION_RATE_DISCOUNT) * 10) / 10);
}

export interface SavingsPotential {
  /** הריבית שאליה הושוו ההלוואות */
  benchmarkRate: number;
  /** התקופה שנבדקה — התקופה הממוצעת המשוקללת של התיק */
  months: number;
  monthlyPayment: number;
  totalInterest: number;
  /** החיסכון בריבית מול המצב הקיים. שלילי = התרחיש יקר יותר */
  interestSaved: number;
  monthlyDelta: number;
}

/**
 * פוטנציאל החיסכון שמוצג ליד ההזמנה ליועץ: מה קורה אם כל החוב מאוחד לריבית
 * הבנצ'מרק, לאותה תקופה ממוצעת שמשולמת היום. חישוב שקוף, על הנתונים שהוזנו.
 */
export function savingsPotential(stats: PortfolioStats): SavingsPotential | null {
  if (stats.count === 0 || stats.totalPrincipal <= 0) return null;

  const weightedMonths = Math.round(
    stats.loans.reduce((sum, item) => sum + item.loan.months * item.loan.principal, 0) /
      stats.totalPrincipal
  );
  if (weightedMonths <= 0) return null;

  const benchmarkRate = consolidationBenchmarkRate(stats.weightedApr);
  const monthlyPayment = annuityPayment(stats.totalPrincipal, benchmarkRate, weightedMonths);
  const totalInterest = monthlyPayment * weightedMonths - stats.totalPrincipal;

  return {
    benchmarkRate,
    months: weightedMonths,
    monthlyPayment,
    totalInterest,
    interestSaved: stats.totalInterest - totalInterest,
    monthlyDelta: monthlyPayment - stats.monthlyPayment,
  };
}

const shekel = (value: number) => `₪${Math.round(value).toLocaleString('he-IL')}`;

/**
 * התובנות שמוצגות מעל הדאשבורד. כולן נגזרות מהנתונים שהוזנו, ומנוסחות
 * כפעולה שאפשר לעשות — לא כאזהרה כללית.
 */
export function loanInsights(stats: PortfolioStats, income?: number): LoanInsight[] {
  if (stats.count === 0) return [];

  const insights: LoanInsight[] = [];
  // השוואה בין הלוואות — היקרה, האיחוד, זו שנגמרת ראשונה — יש לה משמעות רק משתי הלוואות
  const comparable = stats.count >= 2;
  const sortedByApr = [...stats.loans].sort((a, b) => b.loan.apr - a.loan.apr);
  const costliest = sortedByApr[0];

  if (comparable) insights.push({
    id: 'costliest',
    tone: 'alert',
    title: `ההלוואה היקרה שלכם: ${costliest.loan.name} — ${costliest.loan.apr.toFixed(2)}%`,
    detail: `היא לבדה תעלה ${shekel(costliest.totalInterest)} ריבית עד סופה. כל שקל פנוי שמופנה אליה קודם חוסך יותר מכל הלוואה אחרת בתיק.`,
  });

  insights.push({
    id: 'interest-share',
    tone: stats.interestShare > 0.25 ? 'alert' : 'neutral',
    title: `${Math.round(stats.interestShare * 100)}% מכל מה שתשלמו הוא ריבית`,
    detail: `על חוב של ${shekel(stats.totalPrincipal)} תשלמו ${shekel(stats.totalPaid)} — מתוכם ${shekel(stats.totalInterest)} ריבית. זה הסכום שנמצא במשא ומתן.`,
  });

  const potential = comparable ? savingsPotential(stats) : null;
  if (potential && potential.interestSaved > 0) {
    insights.push({
      id: 'consolidation',
      tone: 'opportunity',
      title: `איחוד ב-${potential.benchmarkRate.toFixed(1)}% חוסך ${shekel(potential.interestSaved)} ריבית`,
      detail: `לפי אותה תקופה ממוצעת שאתם משלמים היום (${potential.months} חודשים), וריבית נמוכה ב-${CONSOLIDATION_RATE_DISCOUNT} נקודות מהריבית המשוקללת שלכם (${stats.weightedApr.toFixed(2)}%). ההחזר החודשי ${
        potential.monthlyDelta <= 0 ? 'יורד ב-' : 'עולה ב-'
      }${shekel(Math.abs(potential.monthlyDelta))}.`,
    });
  }

  const ratio = paymentToIncome(stats.monthlyPayment, income ?? 0);
  if (ratio) {
    insights.push({
      id: 'dti',
      tone: ratio.status === 'risk' ? 'alert' : ratio.status === 'watch' ? 'neutral' : 'opportunity',
      title: `יחס ההחזר שלכם: ${Math.round(ratio.ratio * 100)}% מההכנסה`,
      detail:
        ratio.status === 'risk'
          ? 'ברמה הזו הבנק יקטין משמעותית את המשכנתא שיאשר, ולפעמים יסרב. סגירה או פריסה של ההלוואות היקרות לפני הבקשה משנה את התמונה.'
          : ratio.status === 'watch'
            ? 'יחס סביר, אבל הוא נכנס לחישוב המשכנתא: כל שקל של החזר צרכני מקטין את ההחזר שהבנק יאשר למשכנתא.'
            : 'יחס בריא — ההלוואות הקיימות לא יגרעו משמעותית מהמשכנתא שתוכלו לקבל.',
    });
  }

  const shortest = [...stats.loans].sort((a, b) => a.monthsActual - b.monthsActual)[0];
  if (comparable && shortest) {
    insights.push({
      id: 'freed-cash',
      tone: 'neutral',
      title: `בעוד ${shortest.monthsActual} חודשים מתפנים ${shekel(shortest.monthlyPayment)} בחודש`,
      detail: `${shortest.loan.name} נגמרת ראשונה. הפניית הסכום שמתפנה להלוואה היקרה, במקום להוצאות, מקצרת את כל התיק.`,
    });
  }

  return insights;
}

/* ------------------------------------------------------------------ */
/* איחוד הלוואות                                                       */
/* ------------------------------------------------------------------ */

export interface ConsolidationOutcome {
  /** ההלוואות שנבחרו לאיחוד */
  selected: Loan[];
  /** הסכום הכולל שמאוחד */
  amount: number;
  /** ההלוואה המאוחדת — רק כשהוזנו ריבית ותקופה */
  merged: Loan | null;
  /** התיק כולו היום */
  before: PortfolioStats;
  /** התיק כולו אחרי האיחוד — ההלוואות שלא נבחרו נשארות כמו שהן */
  after: PortfolioStats | null;
  /** הלוואות התיק אחרי האיחוד, לגרפים */
  afterLoans: Loan[] | null;
}

export function consolidationOutcome(loans: Loan[], plan: ConsolidationPlan): ConsolidationOutcome {
  const selected = loans.filter((loan) => plan.loanIds.includes(loan.id));
  const rest = loans.filter((loan) => !plan.loanIds.includes(loan.id));
  const amount = selected.reduce((sum, loan) => sum + loan.principal, 0);
  const ready =
    selected.length >= 2 &&
    amount > 0 &&
    plan.apr !== null &&
    plan.apr >= 0 &&
    plan.months !== null &&
    plan.months > 0;

  const merged: Loan | null = ready
    ? {
        id: 'consolidated',
        name: 'ההלוואה המאוחדת',
        principal: amount,
        apr: plan.apr as number,
        months: plan.months as number,
        category: 'bank',
      }
    : null;
  const afterLoans = merged ? [...rest, merged] : null;

  return {
    selected,
    amount,
    merged,
    before: portfolioStats(loans),
    after: afterLoans ? portfolioStats(afterLoans) : null,
    afterLoans,
  };
}

/** יתרת החוב החודשית של כמה סדרות הלוואות זו מול זו, לגרף ההשוואה */
export function balanceComparisonSeries(
  series: Record<string, Loan[]>
): Array<Record<string, number>> {
  const schedules = Object.entries(series).map(([key, loans]) => ({
    key,
    rows: loans.map((loan) => buildLoanSchedule(loan).rows),
  }));
  const horizon = Math.max(
    0,
    ...schedules.flatMap((item) => item.rows.map((rows) => rows.length))
  );
  const points: Array<Record<string, number>> = [];
  for (let month = 0; month <= horizon; month += 1) {
    if (month % 6 !== 0 && month !== horizon) continue;
    const point: Record<string, number> = { month };
    for (const { key, rows } of schedules) {
      point[key] = Math.round(
        rows.reduce((sum, list) => {
          if (month === 0) return sum + (list[0]?.balStart ?? 0);
          const row = list[month - 1];
          return sum + (row ? row.balEnd : 0);
        }, 0)
      );
    }
    points.push(point);
  }
  return points;
}
