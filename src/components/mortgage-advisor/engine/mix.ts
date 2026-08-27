import type { PrepaymentEvent } from './types';
import type {
  MixResult,
  MixScheduleRow,
  MixSummary,
  MortgageSnapshot,
  TrackResult,
  WorkspaceMix,
} from './types';
import { paymentProfile, simulateTrack } from './schedule';

type DistributedMap = Map<number, { amount: number; mode: PrepaymentEvent['mode'] }>;

function simulateAll(
  mix: WorkspaceMix,
  distributed: Map<string, DistributedMap>,
  stopAtMonth?: number
): TrackResult[] {
  return mix.tracks.map((track) =>
    simulateTrack({
      track,
      events: mix.events,
      assumptions: mix.assumptions,
      startDate: mix.startDate,
      distributedPrepayments: distributed.get(track.id),
      stopAtMonth,
    })
  );
}

function balanceAtMonth(result: TrackResult, month: number): number {
  if (month <= 1) return result.track.amount;
  const row = result.schedule[month - 2];
  return row ? row.balanceEnd : 0;
}

/**
 * פרעון מוקדם ללא מסלול מוגדר מפוזר בין המסלולים לפי יחס היתרות הפתוחות
 * באותו חודש. מכיוון שכל פיזור משנה את היתרות בהמשך, הפיזורים נקבעים
 * לפי סדר כרונולוגי כשכל שלב מסתמך על הרצה שכוללת את הפיזורים שלפניו.
 * ההרצה הזו נעצרת בחודש האירוע, כי רק היתרות עד אליו נדרשות.
 */
function resolveDistributedPrepayments(mix: WorkspaceMix): Map<string, DistributedMap> {
  const distributed = new Map<string, DistributedMap>();
  const shared = mix.events
    .filter((e): e is PrepaymentEvent => e.kind === 'prepayment' && !e.trackId)
    .sort((a, b) => a.month - b.month);

  if (shared.length === 0) return distributed;

  shared.forEach((event) => {
    const results = simulateAll(mix, distributed, Math.max(1, event.month - 1));
    const balances = results.map((r) => ({ id: r.track.id, balance: balanceAtMonth(r, event.month) }));
    const total = balances.reduce((sum, b) => sum + b.balance, 0);
    if (total <= 0.01) return;

    balances.forEach(({ id, balance }) => {
      if (balance <= 0.01) return;
      const share = (balance / total) * event.amount;
      const perTrack = distributed.get(id) ?? new Map();
      const existing = perTrack.get(event.month);
      perTrack.set(event.month, {
        amount: (existing?.amount ?? 0) + share,
        mode: event.mode,
      });
      distributed.set(id, perTrack);
    });
  });

  return distributed;
}

function aggregate(tracks: TrackResult[], startDate: string): MixScheduleRow[] {
  const months = tracks.reduce((max, t) => Math.max(max, t.schedule.length), 0);
  const rows: MixScheduleRow[] = [];

  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let cumulativePaid = 0;

  for (let i = 0; i < months; i++) {
    let balanceStart = 0;
    let payment = 0;
    let interest = 0;
    let principal = 0;
    let deferredInterest = 0;
    let prepayment = 0;
    let indexation = 0;
    let balloon = 0;
    let balanceEnd = 0;
    let weightedRateSum = 0;
    let date = '';
    let isRateStation = false;

    tracks.forEach((t) => {
      const row = t.schedule[i];
      if (!row) return;
      balanceStart += row.balanceStart;
      payment += row.payment;
      interest += row.interest;
      principal += row.principal;
      deferredInterest += row.deferredInterest;
      prepayment += row.prepayment;
      indexation += row.indexation;
      balloon += row.balloon;
      balanceEnd += row.balanceEnd;
      weightedRateSum += row.balanceStart * row.annualRate;
      date = row.date;
      if (row.isRateStation) isRateStation = true;
    });

    cumulativeInterest += interest;
    cumulativePrincipal += principal;
    cumulativePaid += payment;

    rows.push({
      month: i + 1,
      date: date || startDate,
      year: Math.floor(i / 12) + 1,
      balanceStart,
      payment,
      interest,
      principal,
      deferredInterest,
      prepayment,
      indexation,
      balloon,
      balanceEnd,
      cumulativeInterest,
      cumulativePrincipal,
      cumulativePaid,
      weightedRate: balanceStart > 0 ? weightedRateSum / balanceStart : 0,
      isRateStation,
    });
  }

  return rows;
}

function summarize(mix: WorkspaceMix, tracks: TrackResult[], schedule: MixScheduleRow[]): MixSummary {
  const principalSum = mix.tracks.reduce((s, t) => s + t.amount, 0);
  const totalInterest = tracks.reduce((s, t) => s + t.totalInterest, 0);
  const totalPaid = tracks.reduce((s, t) => s + t.totalPaid, 0);
  const totalIndexation = tracks.reduce((s, t) => s + t.totalIndexation, 0);
  const totalPrepaid = tracks.reduce((s, t) => s + t.totalPrepaid, 0);

  // תשלומי בלון ופרעונות מוקדמים אינם החזר חודשי, ולכן הם מופרדים מהפרופיל
  const profile = paymentProfile(schedule);
  const monthlyPayment = profile.first;
  const peakMonthlyPayment = schedule.reduce(
    (max, row) => Math.max(max, row.payment - row.prepayment - row.balloon),
    0
  );

  const weightedRateSum = mix.tracks.reduce((s, t) => s + t.interestRate * t.amount, 0);
  const weightedYearsSum = mix.tracks.reduce((s, t) => s + t.years * t.amount, 0);

  return {
    monthlyPayment,
    lastMonthlyPayment: profile.last,
    balloonPayment: profile.balloonPayment,
    peakMonthlyPayment,
    totalInterest,
    totalPaid,
    totalIndexation,
    totalPrepaid,
    averageRate: principalSum > 0 ? weightedRateSum / principalSum : 0,
    weightedAverageYears: principalSum > 0 ? weightedYearsSum / principalSum : 0,
    months: schedule.length,
    costPerShekel: principalSum > 0 ? totalPaid / principalSum : 0,
    ltv: mix.propertyValue && mix.propertyValue > 0 ? (principalSum / mix.propertyValue) * 100 : undefined,
  };
}

/** חישוב מלא של תמהיל: לוחות סילוקין לכל מסלול, לוח מאוחד וסיכום. */
export function computeMix(mix: WorkspaceMix): MixResult {
  const distributed = resolveDistributedPrepayments(mix);
  const tracks = simulateAll(mix, distributed);
  const schedule = aggregate(tracks, mix.startDate);
  return { mix, tracks, schedule, summary: summarize(mix, tracks, schedule) };
}

/**
 * מצב המשכנתא בסוף חודש נתון: כמה ריבית שולמה, מה החוב שנותר,
 * כמה ריבית עוד צפויה, ופירוט זהה לכל מסלול.
 */
export function snapshotAt(result: MixResult, month: number): MortgageSnapshot | null {
  const total = result.schedule.length;
  if (total === 0) return null;
  const idx = Math.min(Math.max(1, Math.round(month)), total) - 1;
  const row = result.schedule[idx];

  const totalInterest = result.summary.totalInterest;
  const totalPaid = result.summary.totalPaid;
  const principalSum = result.mix.tracks.reduce((s, t) => s + t.amount, 0);

  const tracks = result.tracks.map((t) => {
    const trackRow = t.schedule[idx];
    const closed = !trackRow;
    const last = t.schedule[t.schedule.length - 1];
    const interestPaidToDate = trackRow?.cumulativeInterest ?? last?.cumulativeInterest ?? 0;
    return {
      trackId: t.track.id,
      name: t.track.name,
      type: t.track.type,
      annualRate: trackRow?.annualRate ?? t.track.interestRate,
      paymentThisMonth: trackRow?.payment ?? 0,
      interestThisMonth: trackRow?.interest ?? 0,
      principalThisMonth: trackRow?.principal ?? 0,
      remainingBalance: trackRow?.balanceEnd ?? 0,
      interestPaidToDate,
      interestRemaining: Math.max(0, t.totalInterest - interestPaidToDate),
      monthsRemaining: Math.max(0, t.schedule.length - (idx + 1)),
      closed,
    };
  });

  return {
    month: row.month,
    date: row.date,
    year: row.year,
    paymentThisMonth: row.payment,
    interestThisMonth: row.interest,
    principalThisMonth: row.principal,
    remainingBalance: row.balanceEnd,
    interestPaidToDate: row.cumulativeInterest,
    principalPaidToDate: row.cumulativePrincipal,
    totalPaidToDate: row.cumulativePaid,
    interestRemaining: Math.max(0, totalInterest - row.cumulativeInterest),
    principalRemaining: row.balanceEnd,
    totalRemaining: Math.max(0, totalPaid - row.cumulativePaid),
    monthsRemaining: Math.max(0, total - row.month),
    principalProgress: principalSum > 0 ? Math.min(100, (row.cumulativePrincipal / principalSum) * 100) : 0,
    paymentProgress: totalPaid > 0 ? Math.min(100, (row.cumulativePaid / totalPaid) * 100) : 0,
    tracks,
  };
}

export interface SeriesPoint {
  month: number;
  year: number;
  balance: number;
  payment: number;
  interest: number;
  principal: number;
  cumulativeInterest: number;
  rate: number;
}

/**
 * דגימה שנתית לגרפים. נקודה 0 היא מצב הפתיחה, וכל נקודה נוספת היא סוף שנה
 * (או החודש האחרון בפועל אם המשכנתא מסתיימת באמצע שנה).
 */
export function yearlySeries(result: MixResult): SeriesPoint[] {
  const schedule = result.schedule;
  const principalSum = result.mix.tracks.reduce((s, t) => s + t.amount, 0);

  const points: SeriesPoint[] = [
    {
      month: 0,
      year: 0,
      balance: principalSum,
      payment: schedule[0]?.payment ?? 0,
      interest: 0,
      principal: 0,
      cumulativeInterest: 0,
      rate: schedule[0]?.weightedRate ?? result.summary.averageRate,
    },
  ];

  if (schedule.length === 0) return points;

  const years = Math.ceil(schedule.length / 12);
  for (let y = 1; y <= years; y++) {
    const idx = Math.min(y * 12, schedule.length) - 1;
    const row = schedule[idx];
    points.push({
      month: row.month,
      year: y,
      balance: row.balanceEnd,
      payment: row.payment - row.prepayment,
      interest: row.interest,
      principal: row.principal - row.prepayment,
      cumulativeInterest: row.cumulativeInterest,
      rate: row.weightedRate,
    });
  }

  return points;
}

/** דגימה שנתית למסלול בודד, לגרפים בתוך שורת מסלול. */
export function trackYearlySeries(track: TrackResult): SeriesPoint[] {
  const points: SeriesPoint[] = [
    {
      month: 0,
      year: 0,
      balance: track.track.amount,
      payment: track.schedule[0]?.payment ?? 0,
      interest: 0,
      principal: 0,
      cumulativeInterest: 0,
      rate: track.schedule[0]?.annualRate ?? track.track.interestRate,
    },
  ];

  const years = Math.ceil(track.schedule.length / 12);
  for (let y = 1; y <= years; y++) {
    const idx = Math.min(y * 12, track.schedule.length) - 1;
    const row = track.schedule[idx];
    if (!row) break;
    points.push({
      month: row.month,
      year: y,
      balance: row.balanceEnd,
      payment: row.payment - row.prepayment,
      interest: row.interest,
      principal: row.principal - row.prepayment,
      cumulativeInterest: row.cumulativeInterest,
      rate: row.annualRate,
    });
  }

  return points;
}
