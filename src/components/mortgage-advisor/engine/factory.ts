import type { DealType, MortgageMix, MortgageTrack } from '../types';
import { AMORTIZATION_TYPES, DEAL_TYPES, DEFAULT_INTEREST_RATES, TRACK_TYPES } from '../types';
import { DEFAULT_ASSUMPTIONS } from './types';
import type { PrimeForecast } from '@/lib/prime-forward-curve';
import type { Assumptions, TrackType, WorkspaceMix } from './types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/**
 * מספר תקין או ברירת מחדל. נתונים שנשמרו בגרסאות קודמות עלולים להכיל null,
 * מחרוזת או NaN בשדות מספריים, ואלה היו מפילים כל חישוב או תצוגה שמסתמכים עליהם.
 */
function finiteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function sanitizePrimeForecast(value: unknown): PrimeForecast | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<PrimeForecast>;
  if (!Array.isArray(source.spots) || source.spots.length < 2) return undefined;
  const spots = source.spots
    .map((spot) => ({
      years: finiteNumber((spot as { years?: unknown }).years, 0),
      yieldPct: finiteNumber((spot as { yieldPct?: unknown }).yieldPct, 0),
    }))
    .filter((spot) => spot.years > 0 && spot.yieldPct > 0);
  if (spots.length < 2) return undefined;
  return {
    asOf: typeof source.asOf === 'string' ? source.asOf : '',
    source: source.source === 'boi' ? 'boi' : 'fallback',
    boiRate: finiteNumber(source.boiRate, 3.5),
    spots,
  };
}

/** שם ברירת מחדל למסלול, נגזר מהרכבו כך שהוא מתעדכן עם כל שינוי. */
export function autoTrackName(track: Pick<MortgageTrack, 'type' | 'years' | 'interestRate' | 'amortizationType'>): string {
  const typeLabel = (TRACK_TYPES[track.type] || 'מסלול').replace(/^ריבית\s+/, '');
  const amort = AMORTIZATION_TYPES[track.amortizationType || 'spitzer'];
  return `${typeLabel} · ${formatDuration(Math.round(finiteNumber(track.years, 25) * 12))} · ${finiteNumber(track.interestRate, 0).toFixed(2)}% · ${amort}`;
}

/**
 * מסלול תקין תמיד. השדות המספריים נכפים למספרים אחרי הפריסה של הערכים
 * שהתקבלו, כדי שערך פגום במקור לא יחזור פנימה ויפיל חישוב או תצוגה.
 */
export function createTrack(overrides: Partial<MortgageTrack> = {}): MortgageTrack {
  const type = (TRACK_TYPES[overrides.type as TrackType] ? overrides.type : 'fixed_unlinked') as TrackType;
  const base: MortgageTrack = {
    ...overrides,
    id: overrides.id || nextId('track'),
    name: '',
    type,
    amount: finiteNumber(overrides.amount, 0),
    percentage: finiteNumber(overrides.percentage, 0),
    interestRate: finiteNumber(overrides.interestRate, DEFAULT_INTEREST_RATES[type]),
    years: finiteNumber(overrides.years, 25),
    amortizationType: AMORTIZATION_TYPES[overrides.amortizationType ?? 'spitzer']
      ? overrides.amortizationType ?? 'spitzer'
      : 'spitzer',
    variablePeriod: type.includes('variable')
      ? finiteNumber(overrides.variablePeriod, 5)
      : undefined,
  };
  return { ...base, name: overrides.name || autoTrackName(base) };
}

function firstOfNextMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

export function createWorkspaceMix(overrides: Partial<WorkspaceMix> = {}): WorkspaceMix {
  const totalAmount = overrides.totalAmount ?? 1_200_000;
  const now = new Date().toISOString();
  const tracks = overrides.tracks ?? [
    createTrack({ type: 'fixed_unlinked', amount: totalAmount * 0.34, years: 25 }),
    createTrack({ type: 'prime', amount: totalAmount * 0.33, years: 25 }),
    createTrack({ type: 'variable_unlinked', amount: totalAmount * 0.33, years: 25, variablePeriod: 5 }),
  ];

  return normalizeMix({
    id: nextId('mix'),
    name: 'תמהיל חדש',
    totalAmount,
    tracks,
    events: [],
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    startDate: firstOfNextMonth(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

/**
 * תמהיל ריק — נקודת הפתיחה של הכלי לפני שהיועץ הזין סכום או מסלולים.
 * מסלולים נוספים אליו אחד-אחד באשף ההקמה.
 */
export function createEmptyMix(overrides: Partial<WorkspaceMix> = {}): WorkspaceMix {
  const now = new Date().toISOString();
  return {
    id: nextId('mix'),
    name: '',
    totalAmount: 0,
    tracks: [],
    events: [],
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    startDate: firstOfNextMonth(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * עותק עצמאי של תמהיל — מזהה חדש ושם ריק, ושאר הפרמטרים כמו במקור.
 * המסלולים והאירועים מועתקים כדי שעריכה באחד לא תשנה את השני.
 */
export function cloneWorkspaceMix(
  source: WorkspaceMix,
  overrides: Partial<WorkspaceMix> = {}
): WorkspaceMix {
  const now = new Date().toISOString();
  return normalizeMix({
    ...source,
    tracks: source.tracks.map((track) => ({ ...track })),
    events: source.events.map((event) => ({ ...event })),
    assumptions: {
      ...source.assumptions,
      rateDeltas: { ...source.assumptions.rateDeltas },
    },
    ...overrides,
    id: nextId('mix'),
    name: overrides.name ?? '',
    locked: false,
    createdAt: now,
    updatedAt: now,
  });
}

/** מדביק עקום פריים לתמהיל, בלי לדרוס שאר ההנחות */
export function mixWithPrimeForecast(mix: WorkspaceMix, forecast: PrimeForecast): WorkspaceMix {
  return {
    ...mix,
    assumptions: { ...mix.assumptions, primeForecast: forecast },
  };
}

/**
 * מיישר את התמהיל: אחוזי המסלולים נגזרים מסכום המשכנתא.
 *
 * סכום המשכנתא נקבע בפרטי העסקה ואינו נגזר מהמסלולים, כדי שהפרש בין סך
 * המסלולים לסכום המשכנתא יישאר גלוי כסכום שנותר לשבץ. רק תמהיל שאין בו סכום
 * עסקה — נתון ישן — נופל לסך המסלולים.
 */
export function normalizeMix(mix: WorkspaceMix): WorkspaceMix {
  const sum = mix.tracks.reduce((s, t) => s + t.amount, 0);
  const total = mix.totalAmount > 0 ? mix.totalAmount : sum;
  return {
    ...mix,
    totalAmount: total,
    tracks: mix.tracks.map((t) => ({
      ...t,
      percentage: total > 0 ? (t.amount / total) * 100 : 0,
    })),
  };
}

/** סך הסכום שכבר שובץ למסלולים */
export function allocatedAmount(mix: Pick<WorkspaceMix, 'tracks'>): number {
  return mix.tracks.reduce((sum, track) => sum + track.amount, 0);
}

/**
 * הסכום שנותר לשבץ במסלולים כדי להשלים את המשכנתא. הפרשי עיגול של פחות משקל
 * אינם נחשבים סכום חסר.
 */
export function remainingAmount(mix: Pick<WorkspaceMix, 'tracks' | 'totalAmount'>): number {
  const remaining = mix.totalAmount - allocatedAmount(mix);
  return remaining > 1 ? remaining : 0;
}

/**
 * מתקן תמהיל שנקרא מאחסון מקומי. תמהילים שנשמרו בגרסאות קודמות עלולים לחסור
 * שדות או להחזיק בהם null, ולכן כל מה שנטען מהדפדפן עובר כאן לפני שהוא מוצג
 * או מחושב. מחזיר null כשאין מה להציל.
 */
export function sanitizeMix(raw: unknown): WorkspaceMix | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<WorkspaceMix>;
  if (!Array.isArray(source.tracks) || source.tracks.length === 0) return null;

  const tracks = source.tracks
    .filter((track): track is MortgageTrack => !!track && typeof track === 'object')
    .map((track) => createTrack(track));
  if (tracks.length === 0) return null;

  const now = new Date().toISOString();
  const rateDeltas = source.assumptions?.rateDeltas;

  return normalizeMix({
    ...source,
    id: source.id || nextId('mix'),
    name: typeof source.name === 'string' ? source.name : '',
    totalAmount: finiteNumber(source.totalAmount, 0),
    tracks,
    events: Array.isArray(source.events) ? source.events.filter((event) => !!event) : [],
    assumptions: {
      rateDeltas: rateDeltas && typeof rateDeltas === 'object' ? rateDeltas : {},
      annualInflation: finiteNumber(source.assumptions?.annualInflation, DEFAULT_ASSUMPTIONS.annualInflation),
      primeForecast: sanitizePrimeForecast(source.assumptions?.primeForecast),
    },
    startDate: typeof source.startDate === 'string' ? source.startDate : firstOfNextMonth(),
    propertyValue:
      source.propertyValue === undefined || source.propertyValue === null
        ? undefined
        : finiteNumber(source.propertyValue, 0) || undefined,
    dealType: DEAL_TYPES[source.dealType as DealType] ? source.dealType : undefined,
    propertyAddress:
      typeof source.propertyAddress === 'string' && source.propertyAddress.trim()
        ? source.propertyAddress
        : undefined,
    maxMonthlyPayment:
      source.maxMonthlyPayment === undefined || source.maxMonthlyPayment === null
        ? undefined
        : finiteNumber(source.maxMonthlyPayment, 0) || undefined,
    locked: source.locked === true,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : now,
  });
}

/** מחיקת אירועים שמצביעים על מסלולים שכבר לא קיימים בתמהיל. */
export function pruneEvents(mix: WorkspaceMix): WorkspaceMix {
  const ids = new Set(mix.tracks.map((t) => t.id));
  return {
    ...mix,
    events: mix.events.filter((e) => !e.trackId || ids.has(e.trackId)),
  };
}

export function toWorkspaceMix(mix: MortgageMix, assumptions?: Assumptions): WorkspaceMix {
  const createdAt = mix.createdAt ? new Date(mix.createdAt).toISOString() : new Date().toISOString();
  return normalizeMix({
    id: mix.id,
    name: mix.name,
    bank: mix.bank,
    totalAmount: finiteNumber(mix.totalAmount, 0),
    tracks: mix.tracks.map((track) => createTrack(track)),
    events: [],
    assumptions: assumptions ?? { ...DEFAULT_ASSUMPTIONS },
    startDate: firstOfNextMonth(),
    notes: mix.notes,
    createdAt,
    updatedAt: createdAt,
  });
}

export function toLegacyMix(mix: WorkspaceMix): MortgageMix {
  return {
    id: mix.id,
    name: mix.name,
    bank: mix.bank,
    totalAmount: mix.totalAmount,
    tracks: mix.tracks,
    createdAt: new Date(mix.createdAt),
    notes: mix.notes,
  };
}

const HEBREW_MONTH_DATE = new Intl.DateTimeFormat('he-IL', { month: '2-digit', year: 'numeric' });
const HEBREW_FULL_DATE = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatMonthLabel(iso: string): string {
  return HEBREW_MONTH_DATE.format(new Date(iso));
}

export function formatFullDate(iso: string): string {
  return HEBREW_FULL_DATE.format(new Date(iso));
}

/** "12 שנים ו-3 חודשים" — ניסוח קריא למספר חודשים. */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return rest === 1 ? 'חודש אחד' : `${rest} חודשים`;
  const yearsLabel = years === 1 ? 'שנה' : `${years} שנים`;
  if (rest === 0) return yearsLabel;
  return `${yearsLabel} ו-${rest} חודשים`;
}
