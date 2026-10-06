/**
 * ============================================================================
 *  מצב הון ותזרים — לוגיקה טהורה
 * ============================================================================
 *
 *  הכלי מרכז במקום אחד את המשכנתא, את כל ההלוואות של הלקוח ואת ההכנסה
 *  הפנויה (של לווה יחיד או של זוג, בכמה שורות לכל אחד), ומחשב:
 *
 *    • ההחזר החודשי — משכנתא, הלוואות וסך הכול.
 *    • יחס ההחזר בפועל — כל ההחזרים מתוך ההכנסה הפנויה.
 *    • יחס ההחזר לחישוב כושר ההחזר למשכנתא — כפי שהבנק בודק אותו: הלוואה
 *      שנותרו לה יותר מ-18 חודשים נוגסת בהכנסה הפנויה, והחזר המשכנתא לא יעלה
 *      על 40% ממה שנשאר. הלוואה של עד 18 חודשים לא נכנסת לחישוב הזה, אבל
 *      התשלום שלה נכנס לתזרים עד שהיא מסתיימת.
 *    • כמה כסף נשאר לאחר תשלום כל החובות, בכל חודש על ציר הזמן.
 *
 *  ההלוואות נפרסות בשפיצר (החזר חודשי קבוע). אפשר לקבע שלושה מתוך ארבעת
 *  הפרמטרים — סכום, תקופה, ריבית, החזר — ולחשב את הרביעי.
 * ============================================================================
 */

/** מגבלת יחס ההחזר למשכנתא — אותה מגבלה שבכל כלי הפלטפורמה */
export const MORTGAGE_RATIO_LIMIT = 0.4;
/** הלוואה שנותרו לה יותר מכך נוגסת בהכנסה הפנויה לחישוב כושר ההחזר */
export const LONG_LOAN_MONTHS = 18;
/** מעל זה יחס ההחזר כבר קרוב לגבול — התרעה צהובה */
export const RATIO_WARN = 0.35;

export type CashFlowHousehold = 'SINGLE' | 'COUPLE';
export type IncomeOwner = 'borrower' | 'partner';

export interface IncomeRow {
  id: string;
  label: string;
  amount: number | null;
}

export interface CashFlowLoan {
  id: string;
  name: string;
  /** סכום ההלוואה (או היתרה לסילוק בהלוואה קיימת) */
  amount: number | null;
  /** ריבית שנתית באחוזים */
  rate: number | null;
  /** מספר התשלומים שנותרו */
  months: number | null;
  /**
   * החזר חודשי שהוזן ידנית — להלוואה שהלקוח יודע רק את ההחזר שלה. כשיש סכום,
   * ריבית ותקופה ההחזר מחושב מהם והשדה הזה מתעלם.
   */
  payment: number | null;
}

export interface CashFlowMortgage {
  amount: number | null;
  rate: number | null;
  years: number | null;
  /** החזר ידוע, כשחסרים נתונים לחישוב (למשל הוזן רק ההחזר מההצעה) */
  payment: number | null;
}

export interface CashFlowState {
  household: CashFlowHousehold;
  borrowerName: string;
  partnerName: string;
  incomes: Record<IncomeOwner, IncomeRow[]>;
  mortgage: CashFlowMortgage;
  loans: CashFlowLoan[];
  updatedAt?: string | null;
}

// ───────────────────────────── מתמטיקה של הלוואה ─────────────────────────────

/** החזר חודשי בשפיצר */
export function annuityPayment(amount: number, annualRate: number, months: number): number {
  if (!(amount > 0) || !(months > 0)) return 0;
  const r = annualRate / 100 / 12;
  if (Math.abs(r) < 1e-12) return amount / months;
  return (amount * r) / (1 - Math.pow(1 + r, -months));
}

/** הסכום שאפשר לקחת בהחזר נתון */
export function amountForPayment(payment: number, annualRate: number, months: number): number {
  if (!(payment > 0) || !(months > 0)) return 0;
  const r = annualRate / 100 / 12;
  if (Math.abs(r) < 1e-12) return payment * months;
  return (payment * (1 - Math.pow(1 + r, -months))) / r;
}

/** מספר החודשים שבהם ההחזר הנתון מסלק את הסכום, או null כשההחזר לא מכסה אפילו את הריבית */
export function monthsForPayment(amount: number, annualRate: number, payment: number): number | null {
  if (!(amount > 0) || !(payment > 0)) return null;
  const r = annualRate / 100 / 12;
  if (Math.abs(r) < 1e-12) return Math.ceil(amount / payment);
  if (payment <= amount * r) return null;
  const n = -Math.log(1 - (amount * r) / payment) / Math.log(1 + r);
  // חצי אגורה של חוסר דיוק לא אמורה להוסיף חודש שלם
  return Math.ceil(n - 1e-6);
}

/** הריבית השנתית שבה ההחזר הנתון מסלק את הסכום בתקופה, או null כשאין כזו (0%–60%) */
export function rateForPayment(amount: number, months: number, payment: number): number | null {
  if (!(amount > 0) || !(months > 0) || !(payment > 0)) return null;
  if (payment * months < amount - 0.5) return null;
  let low = 0;
  let high = 60;
  if (annuityPayment(amount, high, months) < payment) return null;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (annuityPayment(amount, mid, months) > payment) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

export type SolveFor = 'amount' | 'months' | 'rate' | 'payment';

export interface LoanTerms {
  amount: number | null;
  months: number | null;
  rate: number | null;
  payment: number | null;
}

/** מחשב את הפרמטר `target` משלושת האחרים. מחזיר null כשאין פתרון */
export function solveLoan(terms: LoanTerms, target: SolveFor): number | null {
  const { amount, months, rate, payment } = terms;
  switch (target) {
    case 'payment':
      if (!amount || !months || rate === null) return null;
      return annuityPayment(amount, rate, months);
    case 'amount':
      if (!payment || !months || rate === null) return null;
      return amountForPayment(payment, rate, months);
    case 'months':
      if (!amount || !payment || rate === null) return null;
      return monthsForPayment(amount, rate, payment);
    case 'rate':
      if (!amount || !months || !payment) return null;
      return rateForPayment(amount, months, payment);
  }
}

/** ההחזר החודשי של הלוואה ברשימה */
export function loanPayment(loan: CashFlowLoan): number {
  if (loan.amount && loan.months && loan.rate !== null) {
    return annuityPayment(loan.amount, loan.rate, loan.months);
  }
  return Math.max(0, loan.payment ?? 0);
}

/** הלוואה שעדיין לא הוזנו לה תקופה — נחשבת ארוכה, כי כך הבנק יתייחס אליה */
export function isLongLoan(loan: CashFlowLoan): boolean {
  return !loan.months || loan.months > LONG_LOAN_MONTHS;
}

export function mortgagePayment(mortgage: CashFlowMortgage): number {
  if (mortgage.amount && mortgage.years && mortgage.rate !== null) {
    return annuityPayment(mortgage.amount, mortgage.rate, mortgage.years * 12);
  }
  return Math.max(0, mortgage.payment ?? 0);
}

export function mortgageMonths(mortgage: CashFlowMortgage): number {
  return Math.max(0, Math.round((mortgage.years ?? 0) * 12));
}

// ───────────────────────────── לוח סילוקין ─────────────────────────────

export interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function amortization(amount: number, annualRate: number, months: number): AmortRow[] {
  const rows: AmortRow[] = [];
  if (!(amount > 0) || !(months > 0)) return rows;
  const r = annualRate / 100 / 12;
  const payment = annuityPayment(amount, annualRate, months);
  let balance = amount;
  for (let month = 1; month <= months; month += 1) {
    const interest = balance * r;
    const principal = month === months ? balance : payment - interest;
    balance = Math.max(0, balance - principal);
    rows.push({ month, payment: principal + interest, principal, interest, balance });
  }
  return rows;
}

/** לוח הסילוקין של הלוואה ברשימה; להלוואה שהוזן לה רק החזר — שורות של החזר קבוע */
export function loanSchedule(loan: CashFlowLoan): AmortRow[] {
  if (loan.amount && loan.months && loan.rate !== null) {
    return amortization(loan.amount, loan.rate, loan.months);
  }
  const payment = loanPayment(loan);
  const months = loan.months ?? 0;
  return Array.from({ length: months }, (_, index) => ({
    month: index + 1,
    payment,
    principal: payment,
    interest: 0,
    balance: payment * (months - index - 1),
  }));
}

// ───────────────────────────── הסיכום ─────────────────────────────

export function incomeTotal(state: CashFlowState, owner?: IncomeOwner): number {
  const owners: IncomeOwner[] = owner ? [owner] : state.household === 'COUPLE' ? ['borrower', 'partner'] : ['borrower'];
  return owners.reduce(
    (sum, key) => sum + state.incomes[key].reduce((inner, row) => inner + Math.max(0, row.amount ?? 0), 0),
    0
  );
}

export interface CashFlowSummary {
  income: number;
  mortgagePayment: number;
  loansPayment: number;
  longLoansPayment: number;
  shortLoansPayment: number;
  totalPayment: number;
  /** כל ההחזרים מתוך ההכנסה הפנויה */
  actualRatio: number | null;
  /** ההכנסה שנשארת לחישוב כושר ההחזר — אחרי ההלוואות הארוכות */
  incomeForMortgage: number;
  /** החזר המשכנתא מתוך ההכנסה שאחרי ההלוואות הארוכות */
  mortgageRatio: number | null;
  /** ההחזר המקסימלי למשכנתא לפי המגבלה */
  maxMortgagePayment: number;
  /** כמה עוד אפשר להוסיף להחזר המשכנתא (שלילי — חריגה) */
  mortgageHeadroom: number;
  /** כמה נשאר אחרי כל ההחזרים */
  freeMoney: number;
  /** החודש שבו מסתיימת ההלוואה האחרונה */
  lastLoanMonth: number;
}

export function summarize(state: CashFlowState): CashFlowSummary {
  const income = incomeTotal(state);
  const mortgage = mortgagePayment(state.mortgage);
  let longLoans = 0;
  let shortLoans = 0;
  let lastLoanMonth = 0;
  for (const loan of state.loans) {
    const payment = loanPayment(loan);
    if (isLongLoan(loan)) longLoans += payment;
    else shortLoans += payment;
    lastLoanMonth = Math.max(lastLoanMonth, loan.months ?? 0);
  }
  const loans = longLoans + shortLoans;
  const total = mortgage + loans;
  const incomeForMortgage = Math.max(0, income - longLoans);
  const maxMortgagePayment = incomeForMortgage * MORTGAGE_RATIO_LIMIT;
  return {
    income,
    mortgagePayment: mortgage,
    loansPayment: loans,
    longLoansPayment: longLoans,
    shortLoansPayment: shortLoans,
    totalPayment: total,
    actualRatio: income > 0 ? total / income : null,
    incomeForMortgage,
    mortgageRatio: incomeForMortgage > 0 ? mortgage / incomeForMortgage : null,
    maxMortgagePayment,
    mortgageHeadroom: maxMortgagePayment - mortgage,
    freeMoney: income - total,
    lastLoanMonth,
  };
}

/** המשכנתא המקסימלית שההחזר המותר מאפשר, באותה ריבית ותקופה */
export function maxMortgageAmount(state: CashFlowState, summary = summarize(state)): number | null {
  const { rate, years } = state.mortgage;
  if (rate === null || !years || summary.maxMortgagePayment <= 0) return null;
  return amountForPayment(summary.maxMortgagePayment, rate, years * 12);
}

// ───────────────────────────── ציר הזמן ─────────────────────────────

export interface TimelinePoint {
  /** 0 — החודש הנוכחי */
  month: number;
  mortgage: number;
  /** ההחזר של כל הלוואה לפי המזהה שלה */
  loans: Record<string, number>;
  loansTotal: number;
  total: number;
  free: number;
  actualRatio: number | null;
  mortgageRatio: number | null;
}

/** האופק של הגרף: עד סוף ההלוואה האחרונה ועוד חצי שנה, לפחות שנתיים */
export function timelineHorizon(state: CashFlowState): number {
  const last = state.loans.reduce((max, loan) => Math.max(max, loan.months ?? 0), 0);
  return Math.min(360, Math.max(24, last + 6));
}

export function timeline(state: CashFlowState, horizon = timelineHorizon(state)): TimelinePoint[] {
  const income = incomeTotal(state);
  const mortgage = mortgagePayment(state.mortgage);
  const mortgageEnd = mortgageMonths(state.mortgage) || Infinity;
  const points: TimelinePoint[] = [];
  for (let month = 0; month < horizon; month += 1) {
    const mortgageNow = month < mortgageEnd ? mortgage : 0;
    const loans: Record<string, number> = {};
    let loansTotal = 0;
    let longNow = 0;
    for (const loan of state.loans) {
      const remaining = loan.months ? loan.months - month : Infinity;
      const payment = remaining > 0 ? loanPayment(loan) : 0;
      loans[loan.id] = payment;
      loansTotal += payment;
      // בכל נקודה בזמן — מה שנותר לה יותר מ-18 חודשים נוגס בהכנסה
      if (payment > 0 && remaining > LONG_LOAN_MONTHS) longNow += payment;
    }
    const total = mortgageNow + loansTotal;
    const forMortgage = Math.max(0, income - longNow);
    points.push({
      month,
      mortgage: mortgageNow,
      loans,
      loansTotal,
      total,
      free: income - total,
      actualRatio: income > 0 ? total / income : null,
      mortgageRatio: forMortgage > 0 ? mortgageNow / forMortgage : null,
    });
  }
  return points;
}

/** תווית לחודש על הציר: "היום", ואחרת חודש ושנה */
export function monthLabel(offset: number, from = new Date()): string {
  if (offset === 0) return 'היום';
  const date = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  return new Intl.DateTimeFormat('he-IL', { month: 'short', year: '2-digit' }).format(date);
}

// ───────────────────────────── התרעות ─────────────────────────────

export type AlertTone = 'bad' | 'warn' | 'info' | 'good';

export interface CashFlowAlert {
  id: string;
  tone: AlertTone;
  title: string;
  text: string;
}

const shekel = (value: number) => `₪${Math.round(value).toLocaleString('he-IL')}`;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export function cashFlowAlerts(state: CashFlowState, summary = summarize(state)): CashFlowAlert[] {
  const alerts: CashFlowAlert[] = [];
  if (summary.income <= 0) {
    alerts.push({
      id: 'no-income',
      tone: 'info',
      title: 'חסרה הכנסה פנויה',
      text: 'הזינו את ההכנסה הפנויה כדי לראות יחס החזר וכמה כסף נשאר בכל חודש.',
    });
    return alerts;
  }

  if (summary.mortgageRatio !== null && summary.mortgageRatio > MORTGAGE_RATIO_LIMIT) {
    alerts.push({
      id: 'mortgage-over',
      tone: 'bad',
      title: `יחס ההחזר למשכנתא ${pct(summary.mortgageRatio)} — מעל 40%`,
      text: `אחרי ההלוואות הארוכות נשארת הכנסה של ${shekel(summary.incomeForMortgage)}, וההחזר המותר למשכנתא הוא עד ${shekel(summary.maxMortgagePayment)}. הבנק לא יאשר החזר של ${shekel(summary.mortgagePayment)}.`,
    });
  } else if (summary.mortgageRatio !== null && summary.mortgageRatio > RATIO_WARN) {
    alerts.push({
      id: 'mortgage-near',
      tone: 'warn',
      title: `יחס ההחזר למשכנתא ${pct(summary.mortgageRatio)} — קרוב לגבול`,
      text: `נשארו ${shekel(summary.mortgageHeadroom)} בלבד עד התקרה של 40 אחוז. כל הלוואה ארוכה נוספת תקטין את המשכנתא שאפשר לקבל.`,
    });
  } else if (summary.mortgagePayment > 0) {
    alerts.push({
      id: 'mortgage-ok',
      tone: 'good',
      title: 'יחס ההחזר למשכנתא תקין',
      text: `ההחזר למשכנתא הוא ${pct(summary.mortgageRatio ?? 0)} מההכנסה הפנויה, ונשארו עוד ${shekel(summary.mortgageHeadroom)} עד התקרה של 40 אחוז.`,
    });
  }

  if (summary.freeMoney < 0) {
    alerts.push({
      id: 'negative',
      tone: 'bad',
      title: 'ההחזרים גבוהים מההכנסה',
      text: `אחרי כל ההחזרים חסרים ${shekel(-summary.freeMoney)} בכל חודש.`,
    });
  } else if (summary.actualRatio !== null && summary.actualRatio > 0.5) {
    alerts.push({
      id: 'actual-high',
      tone: 'warn',
      title: `יחס ההחזר בפועל ${pct(summary.actualRatio)}`,
      text: `יותר ממחצית ההכנסה הולכת להחזרים. נשארים ${shekel(summary.freeMoney)} לכל שאר ההוצאות.`,
    });
  }

  if (summary.longLoansPayment > 0) {
    alerts.push({
      id: 'long-loans',
      tone: 'info',
      title: `הלוואות ארוכות מקטינות את המשכנתא`,
      text: `הלוואות של יותר מ-18 חודשים מורידות ${shekel(summary.longLoansPayment)} מההכנסה שהבנק בודק, כלומר עד ${shekel(summary.longLoansPayment * MORTGAGE_RATIO_LIMIT)} פחות בהחזר המשכנתא המותר.`,
    });
  }

  for (const loan of state.loans) {
    const payment = loanPayment(loan);
    if (!loan.months || payment <= 0) continue;
    const name = loan.name || 'הלוואה';
    if (loan.months > LONG_LOAN_MONTHS && loan.months <= 30 && loan.amount && loan.rate !== null) {
      const sameAmount = annuityPayment(loan.amount, loan.rate, LONG_LOAN_MONTHS);
      alerts.push({
        id: `shorten-${loan.id}`,
        tone: 'info',
        title: `${name}: אפשר לקצר ל-18 חודשים`,
        text: `בפריסה ל-18 חודשים ההחזר יהיה ${shekel(sameAmount)} במקום ${shekel(payment)}, וההלוואה תצא מחישוב כושר ההחזר למשכנתא.`,
      });
    }
    if (loan.months <= LONG_LOAN_MONTHS) {
      alerts.push({
        id: `short-${loan.id}`,
        tone: 'info',
        title: `${name}: לא נכנסת לחישוב המשכנתא`,
        text: `נותרו ${loan.months} חודשים, ולכן הבנק לא מוריד אותה מההכנסה. עד שתסתיים תשלמו ${shekel(payment)} בכל חודש, סך הכול ${shekel(payment * loan.months)}.`,
      });
    }
  }

  return alerts;
}

// ───────────────────────────── ברירות מחדל ─────────────────────────────

let counter = 0;
export function cashFlowId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function emptyCashFlow(): CashFlowState {
  return {
    household: 'SINGLE',
    borrowerName: '',
    partnerName: '',
    incomes: {
      borrower: [{ id: cashFlowId('inc'), label: 'משכורת נטו', amount: null }],
      partner: [{ id: cashFlowId('inc'), label: 'משכורת נטו', amount: null }],
    },
    mortgage: { amount: null, rate: 5, years: 25, payment: null },
    loans: [],
    updatedAt: null,
  };
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseIncomes(value: unknown): IncomeRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .slice(0, 20)
    .map((row) => ({ id: str(row.id) || cashFlowId('inc'), label: str(row.label).slice(0, 60), amount: num(row.amount) }));
}

/** קריאה בטוחה של מה שנשמר — גם מהשרת, גם מהדפדפן */
export function parseCashFlow(value: unknown): CashFlowState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const incomes = (raw.incomes && typeof raw.incomes === 'object' ? raw.incomes : {}) as Record<string, unknown>;
  const mortgage = (raw.mortgage && typeof raw.mortgage === 'object' ? raw.mortgage : {}) as Record<string, unknown>;
  const loans = Array.isArray(raw.loans) ? raw.loans : [];
  return {
    household: raw.household === 'COUPLE' ? 'COUPLE' : 'SINGLE',
    borrowerName: str(raw.borrowerName).slice(0, 60),
    partnerName: str(raw.partnerName).slice(0, 60),
    incomes: { borrower: parseIncomes(incomes.borrower), partner: parseIncomes(incomes.partner) },
    mortgage: {
      amount: num(mortgage.amount),
      rate: num(mortgage.rate),
      years: num(mortgage.years),
      payment: num(mortgage.payment),
    },
    loans: loans
      .filter((loan): loan is Record<string, unknown> => !!loan && typeof loan === 'object')
      .slice(0, 30)
      .map((loan) => ({
        id: str(loan.id) || cashFlowId('loan'),
        name: str(loan.name).slice(0, 60),
        amount: num(loan.amount),
        rate: num(loan.rate),
        months: num(loan.months),
        payment: num(loan.payment),
      })),
    updatedAt: str(raw.updatedAt) || null,
  };
}

/** נתוני הלקוח שכבר קיימים בפלטפורמה — לטעינה ראשונה של הכלי */
export interface CashFlowSeed {
  household?: CashFlowHousehold;
  borrowerName?: string;
  partnerName?: string;
  income?: number | null;
  partnerIncome?: number | null;
  mortgageAmount?: number | null;
  mortgagePayment?: number | null;
  /** ריבית ממוצעת ידועה (מהתמהיל) — אחרת נגזרת מהסכום וההחזר */
  mortgageRate?: number | null;
  years?: number | null;
  loans?: { monthlyPayment: number | null; remainingMonths?: number | null; owner: IncomeOwner }[];
}

export function seedCashFlow(seed: CashFlowSeed): CashFlowState {
  const base = emptyCashFlow();
  const ownerName = (owner: IncomeOwner) =>
    owner === 'partner' ? seed.partnerName || 'בן/בת הזוג' : seed.borrowerName || 'לווה';
  return {
    ...base,
    household: seed.household ?? 'SINGLE',
    borrowerName: seed.borrowerName ?? '',
    partnerName: seed.partnerName ?? '',
    incomes: {
      borrower: [{ ...base.incomes.borrower[0], amount: seed.income ?? null }],
      partner: [{ ...base.incomes.partner[0], amount: seed.partnerIncome ?? null }],
    },
    mortgage: seedMortgage(seed, base.mortgage),
    loans: (seed.loans ?? [])
      .filter((loan) => (loan.monthlyPayment ?? 0) > 0)
      .map((loan, index) => ({
        id: cashFlowId('loan'),
        name: `הלוואה ${index + 1} · ${ownerName(loan.owner)}`,
        amount: null,
        rate: null,
        months: loan.remainingMonths ?? null,
        payment: loan.monthlyPayment,
      })),
  };
}

/** כשידועים הסכום וההחזר — הריבית נגזרת מהם, כדי שהכלי יחשב מהתנאים */
function seedMortgage(seed: CashFlowSeed, fallback: CashFlowMortgage): CashFlowMortgage {
  const amount = seed.mortgageAmount ?? null;
  const years = seed.years ?? fallback.years;
  const payment = seed.mortgagePayment ?? null;
  if (amount && years && seed.mortgageRate) {
    return { amount, years, rate: Math.round(seed.mortgageRate * 100) / 100, payment: null };
  }
  if (amount && years && payment) {
    const rate = rateForPayment(amount, years * 12, payment);
    if (rate !== null) return { amount, years, rate: Math.round(rate * 100) / 100, payment: null };
  }
  return { ...fallback, amount, years, payment };
}
