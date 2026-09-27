import type { Loan, LoanCategory } from './types';
import { annuityPayment, buildAmortSchedule, calculateLoanSummary } from './loanMath';

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
 * צבע קבוע לכל הלוואה, נגזר מהמזהה שלה. כך אותה הלוואה נצבעת אותו צבע בפאנל,
 * בפס ההרכב ובגרפים — גם כששתי הלוואות הן מאותו סוג.
 */
export function loanColor(loan: Loan): string {
  let hash = 0;
  for (let index = 0; index < loan.id.length; index += 1) {
    hash = (hash * 31 + loan.id.charCodeAt(index)) % 100_000;
  }
  return LOAN_PALETTE[hash % LOAN_PALETTE.length];
}

export interface LoanStats {
  loan: Loan;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  /** חלק הריבית מכל התשלומים של ההלוואה */
  interestShare: number;
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
  const summary = calculateLoanSummary(loan);
  return {
    loan,
    monthlyPayment: summary.monthlyPayment,
    totalInterest: summary.totalInterest,
    totalPaid: summary.totalPaid,
    interestShare: summary.totalPaid > 0 ? summary.totalInterest / summary.totalPaid : 0,
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
    payoffMonths: loans.reduce((max, loan) => Math.max(max, loan.months), 0),
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

  const schedules = loans.map((loan) => ({
    loan,
    rows: buildAmortSchedule({
      principal: loan.principal,
      apr: loan.apr,
      months: loan.months,
    }).rows,
  }));

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
  const sortedByApr = [...stats.loans].sort((a, b) => b.loan.apr - a.loan.apr);
  const costliest = sortedByApr[0];

  insights.push({
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

  const potential = savingsPotential(stats);
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

  const shortest = [...stats.loans].sort((a, b) => a.loan.months - b.loan.months)[0];
  if (stats.count > 1 && shortest) {
    insights.push({
      id: 'freed-cash',
      tone: 'neutral',
      title: `בעוד ${shortest.loan.months} חודשים מתפנים ${shekel(shortest.monthlyPayment)} בחודש`,
      detail: `${shortest.loan.name} נגמרת ראשונה. הפניית הסכום שמתפנה להלוואה היקרה, במקום להוצאות, מקצרת את כל התיק.`,
    });
  }

  return insights;
}
