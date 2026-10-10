import { amountForPayment, annuityPayment, monthsForPayment, rateForPayment } from '@/lib/cash-flow';

/**
 * נעילת ערכים בכלי "מה אני יכול להרשות לעצמי".
 *
 * המשתנים: סכום המשכנתא (L), ההון העצמי שנכנס לעסקה (E), התקופה בחודשים (n)
 * והריבית השנתית (r). מהם נגזרים מחיר הנכס (P = L + E), אחוז המימון (L ÷ P)
 * וההחזר החודשי הכולל — החזר שפיצר לבנק ועוד ביטוחים (ביטוח מבנה קבוע, ביטוח
 * חיים לפי גובה ההלוואה).
 *
 * כשמשנים פרמטר, הנעולים נשארים במקומם וזזים רק הפתוחים:
 * - מחיר נעול: שינוי בסכום המשכנתא בא על חשבון ההון העצמי שנכנס לעסקה.
 * - אחוז מימון נעול: מחיר הנכס זז יחד עם המשכנתא.
 * - החזר נעול: כשהמשכנתא גדלה או קטנה התקופה מתארכת או מתקצרת; כשהתקופה נעולה
 *   גם היא — הריבית היא שמשתנה ("באיזו ריבית זה מסתדר").
 * - בלי נעילות: ההון העצמי נשאר כמו שהוא, כמו שהכלי עבד עד היום.
 */

export type AffordKey = 'price' | 'ltv' | 'loan' | 'payment' | 'term' | 'rate';

export interface AffordState {
  /** סכום המשכנתא */
  loan: number;
  /** ההון העצמי שנכנס לעסקה */
  equity: number;
  /** תקופה בחודשים */
  months: number;
  /** ריבית שנתית באחוזים */
  rate: number;
}

export interface AffordEnv {
  /** ביטוח מבנה חודשי — לא תלוי בגובה ההלוואה */
  propertyInsurance: number;
  /** ביטוח חיים חודשי לכל 100,000 ₪ של הלוואה */
  healthPer100k: number;
  minMonths: number;
  maxMonths: number;
}

/** הערכים הנעולים, כפי שהיו ברגע הנעילה */
export type AffordLocks = Partial<Record<AffordKey, number>>;

export interface AffordDerived {
  price: number;
  /** אחוז מימון, 0–100 */
  ltv: number;
  bankPayment: number;
  insurance: number;
  /** ההחזר החודשי הכולל — בנק וביטוחים */
  payment: number;
}

export const MAX_SIM_RATE = 20;

export function bankPaymentFor(loan: number, rate: number, months: number): number {
  return annuityPayment(loan, rate, months);
}

export function deriveAfford(state: AffordState, env: AffordEnv): AffordDerived {
  const price = state.loan + state.equity;
  const bankPayment = bankPaymentFor(state.loan, state.rate, state.months);
  const insurance = env.propertyInsurance + (Math.max(0, state.loan) * env.healthPer100k) / 100_000;
  return {
    price,
    ltv: price > 0 ? (state.loan / price) * 100 : 0,
    bankPayment,
    insurance,
    payment: bankPayment + insurance,
  };
}

export function valueOf(key: AffordKey, state: AffordState, env: AffordEnv): number {
  const derived = deriveAfford(state, env);
  switch (key) {
    case 'price':
      return derived.price;
    case 'ltv':
      return derived.ltv;
    case 'loan':
      return state.loan;
    case 'payment':
      return derived.payment;
    case 'term':
      return state.months;
    case 'rate':
      return state.rate;
  }
}

/** סכום המשכנתא לא יכול לזוז: נעול, או שגם המחיר וגם אחוז המימון נעולים */
export function loanFrozen(locks: AffordLocks): boolean {
  return locks.loan !== undefined || (locks.price !== undefined && locks.ltv !== undefined);
}

/**
 * אילו פרמטרים אי אפשר להזיז בגלל הנעילות — כדי לנטרל את המכוון שלהם מראש.
 * פרמטר נעול לא זז; ושלישייה מחיר–משכנתא–אחוז מימון נקבעת משניים מהם.
 */
export function isFrozen(key: AffordKey, locks: AffordLocks): boolean {
  if (locks[key] !== undefined) return true;
  const priceLocked = locks.price !== undefined;
  const ltvLocked = locks.ltv !== undefined;
  const loanLocked = locks.loan !== undefined;
  if (key === 'loan') return priceLocked && ltvLocked;
  if (key === 'price') return loanLocked && ltvLocked;
  if (key === 'ltv') return priceLocked && loanLocked;
  return false;
}

/** מעבירים את המשכנתא לסכום חדש ומזיזים את המחיר או את ההון העצמי לפי הנעילות */
function moveLoan(state: AffordState, loan: number, locks: AffordLocks): AffordState | null {
  if (!(loan >= 0) || !Number.isFinite(loan)) return null;
  if (Math.abs(loan - state.loan) < 0.5) return { ...state, loan };
  if (loanFrozen(locks)) return null;
  if (locks.price !== undefined) {
    const equity = locks.price - loan;
    if (equity < 0) return null;
    return { ...state, loan, equity };
  }
  if (locks.ltv !== undefined) {
    const ratio = locks.ltv / 100;
    if (!(ratio > 0)) return null;
    return { ...state, loan, equity: loan / ratio - loan };
  }
  return { ...state, loan };
}

function loanForPayment(payment: number, rate: number, months: number, env: AffordEnv): number | null {
  const bankAndHealth = payment - env.propertyInsurance;
  if (!(bankAndHealth > 0)) return null;
  const annuity = amountForPayment(1, rate, months);
  if (!(annuity > 0)) return null;
  const loan = bankAndHealth / (1 / annuity + env.healthPer100k / 100_000);
  return Number.isFinite(loan) ? loan : null;
}

/** ההחזר לבנק לבד, כשההחזר הכולל צריך להיות payment */
function bankShare(payment: number, loan: number, env: AffordEnv): number {
  return payment - env.propertyInsurance - (loan * env.healthPer100k) / 100_000;
}

type Free = 'loan' | 'term' | 'rate';

/**
 * ההחזר נעול: מחזירים אותו לערך שננעל על ידי שינוי של אחד הפרמטרים הפתוחים,
 * לפי הסדר שהתקבל. תקופה מעוגלת לחודש שלם כלפי מעלה, כדי שההחזר לא יעבור את
 * מה שננעל.
 */
function restorePayment(
  state: AffordState,
  env: AffordEnv,
  locks: AffordLocks,
  order: Free[]
): AffordState | null {
  const target = locks.payment;
  if (target === undefined) return state;
  if (Math.abs(deriveAfford(state, env).payment - target) < 0.5) return state;

  for (const free of order) {
    if (free === 'loan') {
      if (loanFrozen(locks)) continue;
      const loan = loanForPayment(target, state.rate, state.months, env);
      if (loan === null) continue;
      const moved = moveLoan(state, loan, locks);
      if (moved) return moved;
    }
    if (free === 'term') {
      if (locks.term !== undefined) continue;
      const bank = bankShare(target, state.loan, env);
      const months = monthsForPayment(state.loan, state.rate, bank);
      if (months === null || months < env.minMonths || months > env.maxMonths) continue;
      return { ...state, months };
    }
    if (free === 'rate') {
      if (locks.rate !== undefined) continue;
      const bank = bankShare(target, state.loan, env);
      const rate = rateForPayment(state.loan, state.months, bank);
      if (rate === null || rate <= 0 || rate > MAX_SIM_RATE) continue;
      return { ...state, rate };
    }
  }
  return null;
}

export type AffordChange = { ok: true; state: AffordState } | { ok: false; reason: string };

const LABEL: Record<AffordKey, string> = {
  price: 'מחיר הנכס',
  ltv: 'אחוז המימון',
  loan: 'סכום המשכנתא',
  payment: 'ההחזר החודשי',
  term: 'התקופה',
  rate: 'הריבית',
};

export function affordLabel(key: AffordKey): string {
  return LABEL[key];
}

function blocked(key: AffordKey, locks: AffordLocks): AffordChange {
  const locked = (Object.keys(locks) as AffordKey[]).filter((item) => item !== key).map((item) => LABEL[item]);
  return {
    ok: false,
    reason: locked.length
      ? `אי אפשר לשנות את ${LABEL[key]} כשנעולים ${locked.join(', ')}. שחררו אחת הנעילות.`
      : `אין פתרון ל${LABEL[key]} בערך הזה.`,
  };
}

/**
 * שינוי של פרמטר אחד, כשהנעולים נשארים במקומם. מחזיר את המצב החדש, או הסבר
 * למה אי אפשר — למשל כשההחזר נעול והתקופה הדרושה יוצאת מהטווח.
 */
export function applyAffordChange(
  state: AffordState,
  env: AffordEnv,
  locks: AffordLocks,
  key: AffordKey,
  value: number
): AffordChange {
  if (!Number.isFinite(value) || isFrozen(key, locks)) return blocked(key, locks);

  let next: AffordState | null = null;
  let order: Free[] = [];

  switch (key) {
    case 'loan': {
      next = moveLoan(state, Math.max(0, value), locks);
      order = ['term', 'rate'];
      break;
    }
    case 'price': {
      const price = Math.max(0, value);
      if (loanFrozen(locks)) {
        // המשכנתא קבועה — ההפרש נכנס או יוצא מההון העצמי
        if (price < state.loan) break;
        next = { ...state, equity: price - state.loan };
      } else if (locks.ltv !== undefined) {
        const loan = (price * locks.ltv) / 100;
        next = { ...state, loan, equity: price - loan };
      } else {
        // ההון העצמי נשאר; נכס זול ממנו פשוט לא צריך משכנתא
        const loan = Math.max(0, price - state.equity);
        next = { ...state, loan, equity: price - loan };
      }
      order = ['term', 'rate'];
      break;
    }
    case 'ltv': {
      const ratio = Math.min(0.99, Math.max(0, value / 100));
      if (locks.price !== undefined) {
        const loan = locks.price * ratio;
        next = { ...state, loan, equity: locks.price - loan };
      } else if (loanFrozen(locks)) {
        if (!(ratio > 0)) break;
        next = { ...state, equity: state.loan / ratio - state.loan };
      } else {
        const loan = (state.equity * ratio) / (1 - ratio);
        next = { ...state, loan };
      }
      order = ['term', 'rate'];
      break;
    }
    case 'payment': {
      // ההחזר עצמו זז, ולכן משחררים אותו זמנית ומחפשים מי יזוז במקומו
      const target = Math.max(0, value);
      next = restorePayment(state, env, { ...locks, payment: target }, ['loan', 'term', 'rate']);
      break;
    }
    case 'term': {
      const months = Math.round(Math.min(env.maxMonths, Math.max(env.minMonths, value)));
      next = { ...state, months };
      order = ['loan', 'rate'];
      break;
    }
    case 'rate': {
      if (!(value > 0) || value > MAX_SIM_RATE) break;
      next = { ...state, rate: value };
      order = ['loan', 'term'];
      break;
    }
  }

  if (!next) return blocked(key, locks);
  if (key !== 'payment') {
    next = restorePayment(next, env, locks, order);
    if (!next) return blocked(key, locks);
  }
  return { ok: true, state: next };
}
