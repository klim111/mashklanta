import { isIndexLinked } from '../scenarioCalculations';
import { computeMix } from './mix';
import type {
  MixSummary,
  OptimizationConstraints,
  OptimizationGoal,
  OptimizationOutcome,
  WorkspaceMix,
} from './types';

export const GOAL_LABELS: Record<OptimizationGoal, string> = {
  lower_monthly: 'החזר חודשי נמוך',
  lower_total_interest: 'תשלום ריבית כללי קטן',
  faster_payoff: 'סילוק המשכנתא מהר יותר',
  faster_equity: 'קצב החזר חוב מהיר',
  balanced: 'איזון בין החזר לריבית',
};

export const GOAL_DESCRIPTIONS: Record<OptimizationGoal, string> = {
  lower_monthly: 'מאריך תקופות עד המקסימום המותר כדי להוריד את ההחזר החודשי כמה שאפשר.',
  lower_total_interest: 'מקצר קודם את המסלולים היקרים ביותר, כך שסך הריבית לאורך החיים יורד מקסימלית בתוך תקרת ההחזר.',
  faster_payoff: 'מוצא את התקופה הקצרה ביותר שעדיין נכנסת בתקרת ההחזר החודשי.',
  faster_equity: 'מזרז את קצב סילוק הקרן — מקצר קודם מסלולים גדולים וצמודי מדד שמאטים את ההחזר בפועל.',
  balanced: 'מכוון להחזר חודשי של כ-92% מהתקרה, ומשאיר מרווח ביטחון לשינויי ריבית ומדד.',
};

const DEFAULT_MAX_YEARS = 30;
const DEFAULT_MIN_YEARS = 4;

function clampYears(years: number, c: OptimizationConstraints): number {
  const min = c.minYears ?? DEFAULT_MIN_YEARS;
  const max = c.maxYears ?? DEFAULT_MAX_YEARS;
  return Math.min(max, Math.max(min, Math.round(years)));
}

function withYears(mix: WorkspaceMix, yearsById: Map<string, number>): WorkspaceMix {
  return {
    ...mix,
    tracks: mix.tracks.map((t) => ({ ...t, years: yearsById.get(t.id) ?? t.years })),
  };
}

function initialMonthly(mix: WorkspaceMix): number {
  return computeMix(mix).summary.monthlyPayment;
}

function scaledYears(mix: WorkspaceMix, scale: number, c: OptimizationConstraints): Map<string, number> {
  const map = new Map<string, number>();
  mix.tracks.forEach((t) => map.set(t.id, clampYears(t.years * scale, c)));
  return map;
}

/**
 * מציאת התקופה הקצרה ביותר (כמכפיל אחיד על תקופות המסלולים) שבה ההחזר
 * החודשי ההתחלתי עדיין נמוך מהתקרה. ההחזר יורד מונוטונית עם התקופה,
 * ולכן חיפוש בינארי מספיק.
 */
function shortestTermWithinCap(
  mix: WorkspaceMix,
  cap: number,
  c: OptimizationConstraints
): { years: Map<string, number>; feasible: boolean } {
  const maxYears = c.maxYears ?? DEFAULT_MAX_YEARS;
  const longest = mix.tracks.reduce((m, t) => Math.max(m, t.years), 1);
  const upperScale = Math.max(1, (maxYears / longest) * 1.05);

  const atUpper = scaledYears(mix, upperScale, c);
  if (initialMonthly(withYears(mix, atUpper)) > cap) {
    return { years: atUpper, feasible: false };
  }

  let lo = 0.1;
  let hi = upperScale;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const monthly = initialMonthly(withYears(mix, scaledYears(mix, mid, c)));
    if (monthly > cap) lo = mid;
    else hi = mid;
  }

  return { years: scaledYears(mix, hi, c), feasible: true };
}

/**
 * קיצור חמדני: בכל צעד מקצרים בשנה את המסלול בעל העדיפות הגבוהה ביותר,
 * כל עוד ההחזר החודשי נשאר בתוך התקרה. `priority` קובע את סדר הקיצור
 * ולכן את אופי הפתרון (חיסכון בריבית מול זירוז סילוק הקרן).
 */
function greedyShorten(
  mix: WorkspaceMix,
  cap: number,
  c: OptimizationConstraints,
  priority: (track: WorkspaceMix['tracks'][number]) => number
): Map<string, number> {
  const minYears = c.minYears ?? DEFAULT_MIN_YEARS;
  const years = new Map<string, number>();
  mix.tracks.forEach((t) => years.set(t.id, t.years));

  const order = [...mix.tracks].sort((a, b) => priority(b) - priority(a));

  let progressed = true;
  let guard = 0;
  while (progressed && guard++ < 400) {
    progressed = false;
    for (const track of order) {
      const current = years.get(track.id) ?? track.years;
      if (current <= minYears) continue;
      const candidate = new Map(years);
      candidate.set(track.id, current - 1);
      if (initialMonthly(withYears(mix, candidate)) <= cap) {
        years.set(track.id, current - 1);
        progressed = true;
      }
    }
  }

  return years;
}

function describeChanges(before: WorkspaceMix, after: WorkspaceMix): string[] {
  const changes: string[] = [];
  after.tracks.forEach((track) => {
    const original = before.tracks.find((t) => t.id === track.id);
    if (!original || original.years === track.years) return;
    const direction = track.years > original.years ? 'הוארך' : 'קוצר';
    changes.push(`${track.name}: ${direction} מ-${original.years} ל-${track.years} שנים`);
  });
  return changes;
}

/**
 * בונה הצעת תמהיל לפי מטרה שהיועץ בחר, בכפוף לתקרת החזר חודשי.
 * כל המטרות עובדות על תקופות המסלולים ומשאירות את הרכב הסכומים והריביות
 * כפי שהיועץ קבע, כדי שההצעה תישאר מובנת ובת-הסבר ללקוח.
 */
export function optimizeMix(
  mix: WorkspaceMix,
  goal: OptimizationGoal,
  constraints: OptimizationConstraints
): OptimizationOutcome {
  const before = computeMix(mix).summary;
  const cap = constraints.maxMonthlyPayment && constraints.maxMonthlyPayment > 0
    ? constraints.maxMonthlyPayment
    : Number.POSITIVE_INFINITY;

  let years: Map<string, number>;
  let feasible = true;

  if (goal === 'lower_monthly') {
    const maxYears = constraints.maxYears ?? DEFAULT_MAX_YEARS;
    years = new Map(mix.tracks.map((t) => [t.id, clampYears(maxYears, constraints)]));
    feasible = Number.isFinite(cap) ? initialMonthly(withYears(mix, years)) <= cap : true;
  } else if (goal === 'faster_payoff') {
    const fit = shortestTermWithinCap(mix, cap, constraints);
    years = fit.years;
    feasible = fit.feasible;
  } else if (goal === 'lower_total_interest') {
    // המסלול היקר ביותר נסגר ראשון — שם כל שנה שנחסכת שווה הכי הרבה ריבית.
    years = greedyShorten(mix, cap, constraints, (t) => t.interestRate);
    feasible = initialMonthly(withYears(mix, years)) <= cap;
  } else if (goal === 'faster_equity') {
    // קצב סילוק הקרן נפגע במסלולים גדולים ובצמודי מדד, ולכן הם מקוצרים ראשונים.
    years = greedyShorten(
      mix,
      cap,
      constraints,
      (t) => t.amount * (isIndexLinked(t.type) ? 1.4 : 1) * (1 + t.interestRate / 100)
    );
    feasible = initialMonthly(withYears(mix, years)) <= cap;
  } else {
    const target = Number.isFinite(cap) ? cap * 0.92 : cap;
    const fit = shortestTermWithinCap(mix, target, constraints);
    years = fit.years;
    feasible = fit.feasible;
  }

  const optimized = withYears(mix, years);
  const after = computeMix(optimized).summary;

  return {
    goal,
    mix: optimized,
    before,
    after,
    changes: describeChanges(mix, optimized),
    feasible,
  };
}

/** האם התמהיל עומד בתקרת ההחזר, כולל אזהרה על שיא ההחזר בהמשך התקופה. */
export function evaluateCap(
  summary: MixSummary,
  maxMonthlyPayment?: number
): { withinCap: boolean; peakWithinCap: boolean; gap: number } | null {
  if (!maxMonthlyPayment || maxMonthlyPayment <= 0) return null;
  return {
    withinCap: summary.monthlyPayment <= maxMonthlyPayment + 1,
    peakWithinCap: summary.peakMonthlyPayment <= maxMonthlyPayment + 1,
    gap: summary.monthlyPayment - maxMonthlyPayment,
  };
}
