import type { MortgageTrack } from '../types';
import { isIndexLinked, isRateVariable } from '../scenarioCalculations';
import { expectedMarketPrimePath, isVariableRateStation, primeRateAtMonth, variableUnlinkedRateAtMonth } from '@/lib/prime-forward-curve';
import type {
  AmortizationType,
  Assumptions,
  MixEvent,
  PrepaymentEvent,
  RefinanceEvent,
  ScheduleRow,
  TrackResult,
  TrackType,
} from './types';

const MIN_RATE = 0.01;

/** תשלום אנונה (שפיצר) על יתרה נתונה למספר חודשים נתון */
export function annuityPayment(balance: number, annualRate: number, months: number): number {
  if (months <= 0) return balance;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate <= 0) return balance / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (balance * monthlyRate * factor) / (factor - 1);
}

/** מספר החודשים הדרוש כדי לסלק יתרה בהחזק חודשי קבוע */
export function monthsToPayOff(balance: number, annualRate: number, payment: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (payment <= 0) return Infinity;
  if (monthlyRate <= 0) return Math.ceil(balance / payment);
  // אם ההחזר לא מכסה אפילו את הריבית החודשית — החוב לא נסגר
  if (payment <= balance * monthlyRate) return Infinity;
  const months = -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate);
  return Math.max(1, Math.ceil(months - 1e-9));
}

/**
 * מסלולים שהריבית בהם מתעדכנת בכל חודש (ולא בתחנות יציאה קבועות).
 * פריים ומק"מ נצמדים לריבית בנק ישראל, ומט"ח לריבית הבסיס במטבע.
 */
function repricesContinuously(type: TrackType): boolean {
  return type === 'prime' || type === 'makam' || type === 'dollar' || type === 'euro';
}

/**
 * הריבית השנתית של מסלול בחודש נתון.
 *
 * במסלול משתנה עם תחנת יציאה (מל"צ / מ"צ) הריבית מתעדכנת רק בתחנה עצמה, ולכן
 * שינוי הריבית בתרחיש נכנס לתוקף מהתחנה הראשונה והלאה ולא באופן מיידי.
 * במל"צ, כשיש עקום תשואות, כל תחנה מתומחרת לפי הפורוורד לאותה תקופה.
 */
export function rateForMonth(
  baseRate: number,
  type: TrackType,
  variablePeriod: number | undefined,
  monthWithinTerm: number,
  assumptions: Assumptions,
  primePath?: number[],
  calendarMonth?: number
): number {
  const lookupMonth = calendarMonth ?? monthWithinTerm;

  if (type === 'prime' && primePath && primePath.length > 0) {
    return primeRateAtMonth(baseRate, lookupMonth, primePath, assumptions.rateDeltas.prime ?? 0);
  }

  if (type === 'variable_unlinked' && assumptions.primeForecast) {
    return variableUnlinkedRateAtMonth(
      baseRate,
      lookupMonth,
      monthWithinTerm,
      variablePeriod,
      assumptions.primeForecast,
      assumptions.rateDeltas.variable_unlinked ?? 0
    );
  }

  if (!isRateVariable(type)) return Math.max(MIN_RATE, baseRate);

  const delta = assumptions.rateDeltas[type] ?? 0;
  if (delta === 0) return Math.max(MIN_RATE, baseRate);

  if (repricesContinuously(type)) return Math.max(MIN_RATE, baseRate + delta);

  const periodYears = variablePeriod && variablePeriod > 0 ? variablePeriod : 5;
  const firstResetMonth = periodYears * 12 + 1;
  return monthWithinTerm < firstResetMonth ? Math.max(MIN_RATE, baseRate) : Math.max(MIN_RATE, baseRate + delta);
}

function addMonths(iso: string, months: number): string {
  const base = new Date(iso);
  const d = new Date(base.getFullYear(), base.getMonth() + months, base.getDate());
  return d.toISOString();
}

interface TrackSimulationInput {
  track: MortgageTrack;
  events: MixEvent[];
  assumptions: Assumptions;
  startDate: string;
  /** פרעונות שחולקו לפי יחס יתרות ולכן אינם משויכים למסלול מראש */
  distributedPrepayments?: Map<number, { amount: number; mode: PrepaymentEvent['mode'] }>;
  /**
   * עצירה מוקדמת של הסימולציה. משמש כשצריך רק את היתרות עד חודש מסוים,
   * ולא את הלוח המלא — למשל לחלוקת פרעון מוקדם לפי יחס יתרות.
   */
  stopAtMonth?: number;
}

/**
 * סימולציית לוח סילוקין של מסלול בודד, חודש בחודשו.
 *
 * המנוע מטפל ב: הצמדה למדד (עם הגנת קרן), איפוס ריבית בתחנות יציאה, פרעון מוקדם
 * (קיצור תקופה או הקטנת החזר), מחזור המסלול, וכל סוגי לוחות הסילוקין.
 */
export function simulateTrack({
  track,
  events,
  assumptions,
  startDate,
  distributedPrepayments,
  stopAtMonth,
}: TrackSimulationInput): TrackResult {
  const schedule: ScheduleRow[] = [];

  const prepayments = new Map<number, { amount: number; mode: PrepaymentEvent['mode'] }>();
  const refinances = new Map<number, RefinanceEvent>();

  events.forEach((event) => {
    if (event.kind === 'prepayment' && event.trackId === track.id) {
      const existing = prepayments.get(event.month);
      prepayments.set(event.month, {
        amount: (existing?.amount ?? 0) + event.amount,
        mode: event.mode,
      });
    }
    if (event.kind === 'refinance' && event.trackId === track.id) {
      refinances.set(event.month, event);
    }
  });

  distributedPrepayments?.forEach((value, month) => {
    const existing = prepayments.get(month);
    prepayments.set(month, {
      amount: (existing?.amount ?? 0) + value.amount,
      mode: existing?.mode ?? value.mode,
    });
  });

  let balance = track.amount;
  /** ריבית שנצברה ולא שולמה — קיימת רק בגרייס מלא */
  let deferredInterest = 0;
  let baseRate = track.interestRate;
  let currentType: TrackType = track.type;
  let amortType: AmortizationType = track.amortizationType || 'spitzer';
  let remainingMonths = Math.max(1, Math.round(track.years * 12));
  /**
   * חודש הסיום החוזי של המסלול. נשמר תמיד, חוץ מקיצור תקופה בפרעון מוקדם,
   * כדי שמסלול של 25 שנים יישאר 25 שנים גם עם מדד, פריים או הקטנת החזר.
   */
  let lockedEndMonth: number | null = remainingMonths;
  let variablePeriod = track.variablePeriod;
  /** החודש שממנו נמדדת תקופת המסלול הנוכחית (משתנה אחרי מחזור) */
  let termAnchorMonth = 1;

  let payment = 0;
  let paymentDirty = true;
  let lastRate = -1;

  let indexLevel = 1;
  let indexFloorLevel = 1;

  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let cumulativePaid = 0;
  let totalIndexation = 0;
  let totalPrepaid = 0;

  const monthlyInflation = assumptions.annualInflation / 100 / 12;
  const hardLimit = stopAtMonth && stopAtMonth > 0 ? stopAtMonth : 12 * 40 + 12;
  const primePath = assumptions.primeForecast
    ? expectedMarketPrimePath(assumptions.primeForecast.spots, assumptions.primeForecast.boiRate)
    : undefined;

  for (let month = 1; month <= hardLimit && balance > 0.01 && remainingMonths > 0; month++) {
    const refinance = refinances.get(month);
    if (refinance) {
      baseRate = refinance.newRate;
      currentType = refinance.newType ?? currentType;
      amortType = refinance.newAmortizationType ?? amortType;
      variablePeriod = refinance.newType ? undefined : variablePeriod;
      remainingMonths = Math.max(1, Math.round(refinance.newYears * 12));
      lockedEndMonth = month + remainingMonths - 1;
      termAnchorMonth = month;
      if (refinance.fee) balance += refinance.fee;
      paymentDirty = true;
    }

    if (lockedEndMonth != null) {
      remainingMonths = Math.max(1, lockedEndMonth - month + 1);
    }

    // --- הצמדה למדד: הקרן נצמדת, עם הגנה מפני ירידת המדד מתחת לבסיס ---
    let indexation = 0;
    if (isIndexLinked(currentType) && monthlyInflation !== 0) {
      indexLevel *= 1 + monthlyInflation;
      const effective = Math.max(indexLevel, 1);
      const factor = indexFloorLevel > 0 ? effective / indexFloorLevel : 1;
      indexFloorLevel = effective;
      const indexed = balance * factor;
      indexation = indexed - balance;
      balance = indexed;
      if (indexation !== 0) paymentDirty = true;
    }
    totalIndexation += indexation;

    const monthWithinTerm = month - termAnchorMonth + 1;
    const annualRate = rateForMonth(
      baseRate,
      currentType,
      variablePeriod,
      monthWithinTerm,
      assumptions,
      currentType === 'prime' ? primePath : undefined,
      month
    );
    if (Math.abs(annualRate - lastRate) > 1e-9) {
      paymentDirty = true;
      lastRate = annualRate;
    }

    const monthlyRate = annualRate / 100 / 12;
    // בגרייס מלא הריבית שנצברה מצטרפת לחוב וצוברת ריבית בעצמה, ולכן היא חלק
    // מהבסיס לחישוב הריבית החודשית. בכל שאר הלוחות היא תמיד אפס.
    const interest = (balance + deferredInterest) * monthlyRate;
    const balanceStart = balance + deferredInterest;
    const remainingBeforePrepay = remainingMonths;
    const finalMonth = remainingMonths <= 1;

    let principal = 0;
    let actualPayment = 0;
    /** ריבית מחודשים קודמים שנפרעת עכשיו */
    let deferredPaid = 0;
    /** התשלום החד-פעמי בסוף התקופה, שאינו החזר חודשי שוטף */
    let balloon = 0;

    if (amortType === 'full_grace') {
      // אין תשלום שוטף. הריבית נצברת חודש בחודשו ונפרעת בתשלום אחד בסוף
      // התקופה, יחד עם כל הקרן.
      if (finalMonth) {
        principal = balance;
        deferredPaid = deferredInterest;
        actualPayment = principal + deferredPaid + interest;
        balloon = actualPayment;
        deferredInterest = 0;
      } else {
        deferredInterest += interest;
      }
    } else if (amortType === 'partial_grace') {
      // הריבית משולמת במלואה כל חודש, והקרן נפרעת בתשלום אחד בסוף התקופה.
      if (finalMonth) {
        principal = balance;
        actualPayment = principal + interest;
        balloon = principal;
      } else {
        actualPayment = interest;
      }
    } else if (amortType === 'equal_principal') {
      principal = Math.min(balance, balance / remainingMonths);
      actualPayment = principal + interest;
    } else {
      // שפיצר וכל הווריאנטים המבוססים עליו. כשהתקופה נעולה מחשבים את ההחזר
      // מחדש לפי מספר החודשים שנותרו עד הסיום החוזי — בלי לקצר את התקופה.
      if (paymentDirty || lockedEndMonth != null) {
        payment = annuityPayment(balance, annualRate, remainingMonths);
        paymentDirty = false;
      }
      principal = Math.min(balance, payment - interest);
      if (principal < 0) principal = 0;
      actualPayment = principal + interest;
    }

    let newBalance = Math.max(0, balance - principal);

    // --- פרעון מוקדם ---
    const prepay = prepayments.get(month);
    let prepaidThisMonth = 0;
    if (prepay && prepay.amount > 0 && newBalance > 0.01) {
      prepaidThisMonth = Math.min(prepay.amount, newBalance);
      newBalance -= prepaidThisMonth;
      totalPrepaid += prepaidThisMonth;
      actualPayment += prepaidThisMonth;
      principal += prepaidThisMonth;

      if (newBalance > 0.01) {
        if (prepay.mode === 'shorten_term') {
          // ההחזר החודשי נשמר — התקופה מתקצרת
          lockedEndMonth = null;
          if (amortType === 'spitzer' || amortType === 'ability_based' || amortType === 'secured') {
            const months = monthsToPayOff(newBalance, annualRate, payment);
            remainingMonths = Number.isFinite(months) ? months + 1 : remainingMonths;
          } else if (amortType === 'equal_principal') {
            const monthlyPrincipal = balanceStart / remainingMonths;
            remainingMonths = Math.max(1, Math.ceil(newBalance / monthlyPrincipal) + 1);
          }
        } else {
          // התקופה נשמרת — ההחזר החודשי קטן. נועלים את חודש הסיום המקורי
          // כדי שמספר השנים לא יתקצר גם כשהריבית המשתנה מתעדכנת.
          lockedEndMonth = month + remainingBeforePrepay - 1;
          remainingMonths = remainingBeforePrepay;
          paymentDirty = true;
        }
      }
    }

    balance = newBalance;

    // פרעון מוקדם שסוגר את הקרן בגרייס מלא מסלק גם את הריבית שנצברה עד אותו חודש
    if (deferredInterest > 0 && balance <= 0.01) {
      deferredPaid += deferredInterest;
      actualPayment += deferredInterest;
      balloon += deferredInterest;
      deferredInterest = 0;
    }

    cumulativeInterest += interest;
    cumulativePrincipal += principal;
    cumulativePaid += actualPayment;

    schedule.push({
      month,
      date: addMonths(startDate, month - 1),
      annualRate,
      isRateStation:
        currentType === 'variable_unlinked' && isVariableRateStation(monthWithinTerm, variablePeriod),
      balanceStart,
      payment: actualPayment,
      interest,
      principal,
      deferredInterest: deferredPaid,
      prepayment: prepaidThisMonth,
      indexation,
      balloon,
      balanceEnd: balance + deferredInterest,
      cumulativeInterest,
      cumulativePrincipal,
      cumulativePaid,
    });

    remainingMonths -= 1;
  }

  const totalPaid = cumulativePaid;
  const { first, last, balloonPayment } = paymentProfile(schedule);

  return {
    track: {
      ...track,
      monthlyPayment: first,
      totalInterest: cumulativeInterest,
      totalPaid,
    },
    schedule,
    monthlyPayment: first,
    lastMonthlyPayment: last,
    balloonPayment,
    totalInterest: cumulativeInterest,
    totalPaid,
    totalIndexation,
    totalPrepaid,
    months: schedule.length,
  };
}

/**
 * ההחזר השוטף בתחילת התקופה ובסופה, ותשלום הבלון שנפרד מהם.
 *
 * פרעון מוקדם ותשלום בלון אינם החזר חודשי, ולכן הם יורדים מהתשלום לפני
 * ההשוואה. בגרייס מלא אין בכלל החזר שוטף, ולכן שני הערכים אפס.
 */
export function paymentProfile(rows: Array<Pick<ScheduleRow, 'payment' | 'prepayment' | 'balloon'>>): {
  first: number;
  last: number;
  balloonPayment: number;
} {
  let first = 0;
  let last = 0;
  let balloonPayment = 0;

  rows.forEach((row) => {
    balloonPayment += row.balloon;
    const recurring = row.payment - row.prepayment - row.balloon;
    if (recurring <= 0.01) return;
    if (first === 0) first = recurring;
    last = recurring;
  });

  return { first, last, balloonPayment };
}
