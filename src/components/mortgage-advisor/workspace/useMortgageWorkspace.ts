'use client';

import { useMemo, useReducer } from 'react';
import type { MortgageTrack } from '../types';
import {
  allocatedAmount,
  applyMarketRates,
  computeMix,
  createEmptyMix,
  createTrack,
  isScenarioActive,
  normalizeMix,
  optimizeMix,
  pruneEvents,
  remainingAmount,
  withBaseScenario,
} from '../engine';
import type {
  MixEvent,
  MixResult,
  OptimizationConstraints,
  OptimizationGoal,
  OptimizationOutcome,
  PrepaymentEvent,
  RefinanceEvent,
  TrackType,
  WorkspaceMix,
} from '../engine';
import type { PrimeForecast } from '@/lib/prime-forward-curve';
import type { InflationForecast } from '@/lib/inflation-forecast';
import { fallbackMarketRates, type MarketRatesSnapshot } from '@/lib/market-rates';
import { anchorForTrack, defaultRateFor as marketDefaultRate, roundRate } from '@/lib/rate-anchors';

export interface WorkspaceState {
  mix: WorkspaceMix;
  constraints: OptimizationConstraints;
  /** תמהילים שנבחרו להשוואה מתוך התמהילים השמורים */
  comparedIds: string[];
  lastOptimization: OptimizationOutcome | null;
  /** הסבר על שינוי שנחסם, למשל חריגה מתקרת ההחזר החודשי */
  blockedNotice: string | null;
  /**
   * ריביות ברירת המחדל של היועץ, לפי `בנק|לוח סילוקין|סוג מסלול`.
   * הן נשמרות כמפה פשוטה כדי שהרדוסר יישאר טהור.
   */
  rateDefaults: Record<string, number>;
  /** המרווחים ששמר היועץ לאותם צירופים — מועדפים על פני ריבית סופית שמורה */
  rateSpreads: Record<string, number>;
  /**
   * הריביות והעקומים שנמשכו מבנק ישראל. הרדוסר צריך אותם כדי לפתוח כל מסלול
   * חדש עם עוגן עדכני, ולכן הם חלק מהמצב ולא נתון חיצוני.
   */
  marketRates: MarketRatesSnapshot;
}

/** ערך שמור לצירוף בנק + לוח סילוקין + מסלול, עם נפילה ללוח שפיצר */
function savedFor(
  map: Record<string, number>,
  bank: string | undefined,
  type: TrackType,
  amortizationType: MortgageTrack['amortizationType']
): number | undefined {
  if (!bank) return undefined;
  const exact = map[`${bank}|${amortizationType ?? 'spitzer'}|${type}`];
  if (typeof exact === 'number') return exact;
  const spitzer = map[`${bank}|spitzer|${type}`];
  return typeof spitzer === 'number' ? spitzer : undefined;
}

/**
 * הריבית והמרווח שמסלול חדש נפתח איתם.
 *
 * סדר העדיפות: מרווח שהיועץ שמר לבנק הזה, אחר כך ריבית סופית שהוא שמר (וממנה
 * נגזר המרווח מול העוגן), ואם לא הגדיר דבר — המרווח המקובל בשוק. בכל המקרים
 * הריבית הסופית היא העוגן החי של בנק ישראל ועוד המרווח, כדי שמסלול חדש ייפתח
 * תמיד עם ריבית עדכנית ולא עם ערך שנכתב בקוד.
 */
function defaultRateFor(
  state: WorkspaceState,
  type: TrackType,
  amortizationType: MortgageTrack['amortizationType'] = 'spitzer',
  context: { variablePeriod?: number } = {}
): { interestRate: number; rateSpread?: number } {
  const bank = state.mix.bank;
  const anchor = anchorForTrack(type, state.marketRates, context);

  const savedSpread = savedFor(state.rateSpreads, bank, type, amortizationType);
  if (typeof savedSpread === 'number' && anchor) {
    return { interestRate: roundRate(anchor.rate + savedSpread), rateSpread: savedSpread };
  }

  const savedRate = savedFor(state.rateDefaults, bank, type, amortizationType);
  if (typeof savedRate === 'number') {
    // ריבית סופית שהיועץ שמר נשמרת כפי שהיא; המרווח נגזר ממנה כדי שהיא תמשיך
    // לזוז עם העוגן בהרצות הבאות.
    return anchor
      ? { interestRate: savedRate, rateSpread: roundRate(savedRate - anchor.rate) }
      : { interestRate: savedRate };
  }

  const interestRate = marketDefaultRate(type, state.marketRates, context);
  return anchor
    ? { interestRate, rateSpread: roundRate(interestRate - anchor.rate) }
    : { interestRate };
}

type Action =
  | { type: 'load'; mix: WorkspaceMix; constraints?: OptimizationConstraints }
  | { type: 'patchMix'; patch: Partial<WorkspaceMix> }
  | { type: 'setTotalAmount'; amount: number }
  | { type: 'addTrack'; trackType?: TrackType }
  | { type: 'removeTrack'; id: string }
  | { type: 'updateTrack'; id: string; patch: Partial<MortgageTrack> }
  | { type: 'setTrackAmount'; id: string; amount: number }
  | { type: 'setRateDelta'; trackType: TrackType; delta: number }
  | { type: 'setInflation'; value: number }
  | { type: 'resetAssumptions' }
  | { type: 'setPrimeForecast'; forecast: PrimeForecast }
  | { type: 'setInflationForecast'; forecast: InflationForecast }
  | { type: 'setMarketForecasts'; prime: PrimeForecast; inflation: InflationForecast }
  | { type: 'addEvent'; event: MixEvent }
  | { type: 'removeEvent'; id: string }
  | { type: 'setConstraints'; patch: Partial<OptimizationConstraints> }
  | { type: 'applyOptimization'; outcome: OptimizationOutcome }
  | { type: 'clearOptimization' }
  | { type: 'toggleCompared'; id: string }
  | { type: 'setCompared'; ids: string[] }
  | { type: 'setRateDefaults'; rates: Record<string, number>; spreads?: Record<string, number> }
  | { type: 'applyMarketRates'; snapshot: MarketRatesSnapshot }
  | { type: 'dismissNotice' };

function touch(mix: WorkspaceMix): WorkspaceMix {
  return pruneEvents(normalizeMix({ ...mix, updatedAt: new Date().toISOString() }));
}

/**
 * שינוי בפרמטרים של התמהיל שנחסם בגלל חריגה מתקרת ההחזר החודשי שנקבעה ללקוח.
 * מוחזר null כשהשינוי מותר.
 */
function paymentOverflow(mix: WorkspaceMix): string | null {
  const cap = mix.maxMonthlyPayment;
  if (!cap || cap <= 0) return null;

  const monthlyPayment = computeMix(mix).summary.monthlyPayment;
  // סטייה של עד שקל היא הפרש עיגול ולא חריגה
  if (monthlyPayment <= cap + 1) return null;

  return (
    `ההחזר החודשי בשינוי הזה הוא ${Math.round(monthlyPayment).toLocaleString('he-IL')} ₪ ` +
    `וחורג מתקרת ההחזר שנקבעה — ${Math.round(cap).toLocaleString('he-IL')} ₪. ` +
    'השינוי לא בוצע. אפשר לפרוס את המשכנתא לתקופה ארוכה יותר, או לעדכן את תקרת ההחזר בפרטי העסקה.'
  );
}

/**
 * מחליף את התמהיל רק אם ההחזר החודשי שלו נשאר בתוך התקרה. שינוי חורג נדחה
 * ובמקומו נשמר הסבר למשתמש, כך שהמצב שמוצג תמיד עומד במגבלות הלקוח.
 */
function withMix(state: WorkspaceState, next: WorkspaceMix): WorkspaceState {
  const mix = touch(next);
  const blocked = paymentOverflow(mix);
  if (blocked) return { ...state, blockedNotice: blocked };
  return { ...state, mix, blockedNotice: null };
}

export type WorkspaceAction = Action;

/** רדוסר טהור — מיוצא כדי שניתן יהיה לבדוק את לוגיקת החלוקה מחדש ישירות. */
export function workspaceReducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'load':
      return {
        ...state,
        mix: touch(action.mix),
        constraints: action.constraints ?? state.constraints,
        lastOptimization: null,
        blockedNotice: null,
      };

    // פרטי העסקה — שם, כתובת ותקרת ההחזר — אינם משנים את ההחזר ולכן אינם נחסמים
    case 'patchMix': {
      const merged = touch({ ...state.mix, ...action.patch });
      // בחירת בנק מביאה איתה את הריביות שהיועץ הגדיר לאותו בנק, לכל מסלול לפי
      // סוגו ולוח הסילוקין שלו. אלה רק ערכי פתיחה — כל מסלול נשאר פתוח לעריכה.
      if (action.patch.bank && action.patch.bank !== state.mix.bank) {
        const withBank = { ...state, mix: merged };
        return {
          ...state,
          mix: {
            ...merged,
            tracks: merged.tracks.map((track) => ({
              ...track,
              ...defaultRateFor(withBank, track.type, track.amortizationType, { variablePeriod: track.variablePeriod }),
            })),
          },
          blockedNotice: null,
        };
      }
      return { ...state, mix: merged, blockedNotice: null };
    }

    case 'setTotalAmount': {
      // שינוי סכום המשכנתא שומר על הרכב התמהיל — כל מסלול נשאר באחוז שלו.
      const previous = allocatedAmount(state.mix);
      const amount = Math.max(0, action.amount);
      const tracks = previous > 0
        ? state.mix.tracks.map((t) => ({ ...t, amount: (t.amount / previous) * amount }))
        : state.mix.tracks.map((t, i) => ({ ...t, amount: i === 0 ? amount : 0 }));
      return withMix(state, { ...state.mix, totalAmount: amount, tracks });
    }

    case 'addTrack': {
      const type = action.trackType ?? 'fixed_unlinked';
      // המסלול החדש מקבל את הסכום שנותר להשלמת המשכנתא. כשהמשכנתא כבר משובצת
      // במלואה, המסלול נכנס עם עשירית מהתמהיל שנלקחת יחסית מהמסלולים הקיימים.
      const remaining = remainingAmount(state.mix);
      const allocated = allocatedAmount(state.mix);
      const carve = remaining > 0 ? 0 : allocated * 0.1;
      const tracks = state.mix.tracks.map((t) => ({
        ...t,
        amount: carve > 0 && allocated > 0 ? t.amount - (t.amount / allocated) * carve : t.amount,
      }));
      const years = state.mix.tracks[0]?.years ?? 25;
      return withMix(state, {
        ...state.mix,
        tracks: [
          ...tracks,
          createTrack({
            type,
            amount: remaining || carve || 100_000,
            years,
            ...defaultRateFor(state, type, 'spitzer'),
          }),
        ],
      });
    }

    case 'removeTrack': {
      const tracks = state.mix.tracks.filter((t) => t.id !== action.id);
      if (tracks.length === state.mix.tracks.length || tracks.length === 0) return state;
      // הסכום של המסלול שהוסר חוזר להיות סכום שנותר לשבץ, ולא מתפזר על הנותרים,
      // כדי שהחלוקה שהיועץ קבע במסלולים האחרים לא תשתנה מאחורי הגב שלו.
      return withMix(state, { ...state.mix, tracks });
    }

    case 'updateTrack': {
      const tracks = state.mix.tracks.map((t) => {
        if (t.id !== action.id) return t;
        const next = { ...t, ...action.patch };
        // החלפת לוח הסילוקין מביאה את הריבית שהיועץ הגדיר לאותו לוח מול הבנק.
        if (
          action.patch.amortizationType &&
          action.patch.amortizationType !== t.amortizationType &&
          action.patch.interestRate === undefined &&
          !action.patch.type
        ) {
          Object.assign(
            next,
            defaultRateFor(state, next.type, action.patch.amortizationType, { variablePeriod: next.variablePeriod })
          );
        }
        // החלפת סוג מסלול מביאה איתה את ריבית ברירת המחדל ואת השדות הרלוונטיים.
        if (action.patch.type && action.patch.type !== t.type) {
          next.variablePeriod = action.patch.type.includes('variable')
            ? (action.patch.variablePeriod ?? t.variablePeriod ?? 5)
            : undefined;
          // בחירת מסלול מביאה איתה את העוגן העדכני של אותו סוג ריבית, ועליו
          // המרווח — ולא ערך ריבית שנכתב בקוד.
          if (action.patch.interestRate === undefined) {
            Object.assign(
              next,
              defaultRateFor(state, action.patch.type, next.amortizationType, { variablePeriod: next.variablePeriod })
            );
          }
          if (action.patch.type === 'dollar') next.currency = 'USD';
          else if (action.patch.type === 'euro') next.currency = 'EUR';
          else next.currency = undefined;
        }

        /**
         * תחנת השינוי והתקופה הן שקובעות לאיזה טווח בעקום האפס העוגן מתייחס:
         * מל"צ שמשתנה כל שנתיים מתומחר מול העקום לשנתיים, וכל 5 שנים מול העקום
         * לחמש. לכן שינוי שלהן מזיז את העוגן, והריבית הסופית נגזרת מחדש כדי
         * שהיא תישאר עוגן + מרווח ולא תישאר על ערך של תחנה אחרת.
         */
        const anchorMoved =
          (action.patch.variablePeriod !== undefined &&
            action.patch.variablePeriod !== t.variablePeriod) ||
          (action.patch.years !== undefined && action.patch.years !== t.years);
        if (anchorMoved && action.patch.interestRate === undefined) {
          const spread = next.rateSpread;
          const anchor =
            typeof spread === 'number' && Number.isFinite(spread)
              ? anchorForTrack(next.type, state.marketRates, {
                  variablePeriod: next.variablePeriod,
                })
              : null;
          if (anchor) next.interestRate = roundRate(anchor.rate + spread!);
        }

        return next;
      });
      return withMix(state, { ...state.mix, tracks });
    }

    case 'setTrackAmount': {
      const target = state.mix.tracks.find((t) => t.id === action.id);
      if (!target) return state;
      // הסכום במסלול נקבע לעצמו ואינו נלקח מהמסלולים האחרים; התקרה היא מה שנותר
      // מסכום המשכנתא, וההפרש שנשאר מוצג כסכום שיש להשלים במסלול נוסף.
      const others = allocatedAmount(state.mix) - target.amount;
      const available = Math.max(0, state.mix.totalAmount - others);
      const amount = Math.max(0, Math.min(available, action.amount));
      if (Math.abs(amount - target.amount) < 0.5) return state;
      const tracks = state.mix.tracks.map((t) => (t.id === action.id ? { ...t, amount } : t));
      return withMix(state, { ...state.mix, tracks });
    }

    case 'setRateDelta':
      return {
        ...state,
        mix: touch({
          ...state.mix,
          assumptions: {
            ...state.mix.assumptions,
            rateDeltas: { ...state.mix.assumptions.rateDeltas, [action.trackType]: action.delta },
          },
        }),
      };

    case 'setInflation':
      return {
        ...state,
        mix: touch({
          ...state.mix,
          assumptions: { ...state.mix.assumptions, annualInflation: action.value },
        }),
      };

    case 'resetAssumptions':
      return {
        ...state,
        mix: touch({
          ...state.mix,
          assumptions: withBaseScenario(state.mix.assumptions),
        }),
      };

    case 'setPrimeForecast':
      return {
        ...state,
        mix: touch({
          ...state.mix,
          assumptions: { ...state.mix.assumptions, primeForecast: action.forecast },
        }),
      };

    case 'setInflationForecast':
      return {
        ...state,
        mix: touch({
          ...state.mix,
          assumptions: { ...state.mix.assumptions, inflationForecast: action.forecast },
        }),
      };

    case 'setMarketForecasts':
      return {
        ...state,
        mix: touch({
          ...state.mix,
          assumptions: {
            ...state.mix.assumptions,
            primeForecast: action.prime,
            inflationForecast: action.inflation,
          },
        }),
      };

    case 'addEvent':
      return { ...state, mix: touch({ ...state.mix, events: [...state.mix.events, action.event] }) };

    case 'removeEvent':
      return {
        ...state,
        mix: touch({ ...state.mix, events: state.mix.events.filter((e) => e.id !== action.id) }),
      };

    case 'setConstraints':
      return { ...state, constraints: { ...state.constraints, ...action.patch } };

    case 'applyOptimization': {
      const next = withMix(state, action.outcome.mix);
      return next.blockedNotice ? next : { ...next, lastOptimization: action.outcome };
    }

    case 'clearOptimization':
      return { ...state, lastOptimization: null };

    case 'dismissNotice':
      return { ...state, blockedNotice: null };

    case 'toggleCompared':
      return {
        ...state,
        comparedIds: state.comparedIds.includes(action.id)
          ? state.comparedIds.filter((id) => id !== action.id)
          : [...state.comparedIds, action.id],
      };

    case 'setCompared':
      return { ...state, comparedIds: action.ids };

    case 'setRateDefaults':
      return { ...state, rateDefaults: action.rates, rateSpreads: action.spreads ?? {} };

    /**
     * הנתונים שנמשכו מבנק ישראל נכנסים לתמהיל: העקומים להנחות, והעוגן החי
     * לכל מסלול שיש עליו מרווח. עדכון כזה לעולם אינו נחסם בגלל תקרת ההחזר —
     * הוא משקף את המציאות בשוק, לא שינוי שהיועץ ביקש.
     */
    case 'applyMarketRates':
      return {
        ...state,
        marketRates: action.snapshot,
        mix: touch(applyMarketRates(state.mix, action.snapshot)),
      };

    default:
      return state;
  }
}

export const DEFAULT_CONSTRAINTS: OptimizationConstraints = { maxYears: 30, minYears: 4 };

/**
 * הכלי נפתח ריק: ללא תמהיל התחלתי אין מסלולים ואין סכום, ומסך הפתיחה הוא
 * שמציע ליצור תמהיל חדש או לטעון תמהיל שמור.
 */
export function createInitialWorkspaceState(initialMix?: WorkspaceMix): WorkspaceState {
  return {
    mix: initialMix ?? createEmptyMix(),
    constraints: { ...DEFAULT_CONSTRAINTS },
    comparedIds: [],
    lastOptimization: null,
    blockedNotice: null,
    rateDefaults: {},
    rateSpreads: {},
    marketRates: fallbackMarketRates(),
  };
}

const initialState = createInitialWorkspaceState;

export interface MortgageWorkspace {
  state: WorkspaceState;
  mix: WorkspaceMix;
  result: MixResult;
  /** התמהיל ללא שינויי תרחיש — בסיס להשוואה בגרפים ובמדדים */
  baseResult: MixResult;
  scenarioActive: boolean;
  actions: {
    load: (mix: WorkspaceMix, constraints?: OptimizationConstraints) => void;
    patchMix: (patch: Partial<WorkspaceMix>) => void;
    setTotalAmount: (amount: number) => void;
    addTrack: (type?: TrackType) => void;
    removeTrack: (id: string) => void;
    updateTrack: (id: string, patch: Partial<MortgageTrack>) => void;
    setTrackAmount: (id: string, amount: number) => void;
    setRateDelta: (type: TrackType, delta: number) => void;
    setInflation: (value: number) => void;
    resetAssumptions: () => void;
    setPrimeForecast: (forecast: PrimeForecast) => void;
    setInflationForecast: (forecast: InflationForecast) => void;
    setMarketForecasts: (prime: PrimeForecast, inflation: InflationForecast) => void;
    addPrepayment: (event: Omit<PrepaymentEvent, 'id' | 'kind'>) => void;
    addRefinance: (event: Omit<RefinanceEvent, 'id' | 'kind'>) => void;
    removeEvent: (id: string) => void;
    setConstraints: (patch: Partial<OptimizationConstraints>) => void;
    optimize: (goal: OptimizationGoal) => OptimizationOutcome;
    previewOptimization: (goal: OptimizationGoal) => OptimizationOutcome;
    clearOptimization: () => void;
    toggleCompared: (id: string) => void;
    setCompared: (ids: string[]) => void;
    dismissNotice: () => void;
    /** ריביות ברירת המחדל של היועץ, כפי שנשמרו בהגדרות שלו */
    setRateDefaults: (rates: Record<string, number>, spreads?: Record<string, number>) => void;
    /** הריביות והעקומים שנמשכו מבנק ישראל — מתגלגלים לכל המסלולים */
    applyMarketRates: (snapshot: MarketRatesSnapshot) => void;
  };
}

let eventCounter = 0;
function eventId(): string {
  eventCounter += 1;
  return `event-${Date.now().toString(36)}-${eventCounter.toString(36)}`;
}

export function useMortgageWorkspace(initialMix?: WorkspaceMix): MortgageWorkspace {
  const [state, dispatch] = useReducer(workspaceReducer, initialMix, initialState);

  const result = useMemo(() => computeMix(state.mix), [state.mix]);

  const scenarioActive = useMemo(() => isScenarioActive(state.mix.assumptions), [state.mix.assumptions]);

  const baseResult = useMemo(
    () =>
      scenarioActive
        ? computeMix({ ...state.mix, assumptions: withBaseScenario(state.mix.assumptions) })
        : result,
    [scenarioActive, state.mix, result]
  );

  const actions = useMemo<MortgageWorkspace['actions']>(() => ({
    load: (mix, constraints) => dispatch({ type: 'load', mix, constraints }),
    patchMix: (patch) => dispatch({ type: 'patchMix', patch }),
    setTotalAmount: (amount) => dispatch({ type: 'setTotalAmount', amount }),
    addTrack: (trackType) => dispatch({ type: 'addTrack', trackType }),
    removeTrack: (id) => dispatch({ type: 'removeTrack', id }),
    updateTrack: (id, patch) => dispatch({ type: 'updateTrack', id, patch }),
    setTrackAmount: (id, amount) => dispatch({ type: 'setTrackAmount', id, amount }),
    setRateDelta: (trackType, delta) => dispatch({ type: 'setRateDelta', trackType, delta }),
    setInflation: (value) => dispatch({ type: 'setInflation', value }),
    resetAssumptions: () => dispatch({ type: 'resetAssumptions' }),
    setPrimeForecast: (forecast) => dispatch({ type: 'setPrimeForecast', forecast }),
    setInflationForecast: (forecast) => dispatch({ type: 'setInflationForecast', forecast }),
    setMarketForecasts: (prime, inflation) => dispatch({ type: 'setMarketForecasts', prime, inflation }),
    addPrepayment: (event) => dispatch({ type: 'addEvent', event: { ...event, id: eventId(), kind: 'prepayment' } }),
    addRefinance: (event) => dispatch({ type: 'addEvent', event: { ...event, id: eventId(), kind: 'refinance' } }),
    removeEvent: (id) => dispatch({ type: 'removeEvent', id }),
    setConstraints: (patch) => dispatch({ type: 'setConstraints', patch }),
    optimize: (goal) => {
      const outcome = optimizeMix(state.mix, goal, state.constraints);
      dispatch({ type: 'applyOptimization', outcome });
      return outcome;
    },
    previewOptimization: (goal) => optimizeMix(state.mix, goal, state.constraints),
    clearOptimization: () => dispatch({ type: 'clearOptimization' }),
    toggleCompared: (id) => dispatch({ type: 'toggleCompared', id }),
    setCompared: (ids) => dispatch({ type: 'setCompared', ids }),
    setRateDefaults: (rates, spreads) => dispatch({ type: 'setRateDefaults', rates, spreads }),
    applyMarketRates: (snapshot) => dispatch({ type: 'applyMarketRates', snapshot }),
    dismissNotice: () => dispatch({ type: 'dismissNotice' }),
  }), [state.mix, state.constraints]);

  return { state, mix: state.mix, result, baseResult, scenarioActive, actions };
}
