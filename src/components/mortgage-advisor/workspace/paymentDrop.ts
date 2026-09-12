import { formatCurrency } from '../mortgageCalculations';
import { formatDuration, formatFullDate } from '../engine';
import type { MixResult, MixSummary, PrepaymentEvent, WorkspaceMix } from '../engine';

function formatShekel(value: number): string {
  return formatCurrency(Math.round(value));
}

function recurringPaymentOf(row: {
  payment: number;
  prepayment?: number;
  balloon?: number;
}): number {
  return Math.max(0, row.payment - (row.prepayment ?? 0) - (row.balloon ?? 0));
}

function dateOfMonth(mix: WorkspaceMix, month: number, result?: MixResult): string {
  const iso = result?.schedule[Math.max(0, month - 1)]?.date;
  if (iso) return formatFullDate(iso);
  if (mix.startDate) {
    const date = new Date(mix.startDate);
    date.setMonth(date.getMonth() + Math.max(0, month - 1));
    return formatFullDate(date.toISOString());
  }
  return `תשלום ${month}`;
}

function paymentAfterMonth(result: MixResult | undefined, month: number, fallback: number): number {
  if (!result) return fallback;
  const next = result.schedule[month];
  if (next) return recurringPaymentOf(next);
  const current = result.schedule[month - 1];
  return current ? recurringPaymentOf(current) : fallback;
}

/**
 * «יורד ל-…» מוצג רק כשיש סיבה מובחנת לירידת מדרגה בהחזר: פרעון מוקדם,
 * או מסלול שנגמר לפני האחרים. ירידה הדרגתית של קרן שווה אינה נחשבת.
 */
export function describePaymentDrop(
  mix: WorkspaceMix,
  summary: MixSummary,
  result?: MixResult
): string | undefined {
  if (summary.monthlyPayment <= 0.01) return undefined;

  const prepayments = mix.events.filter(
    (event): event is PrepaymentEvent => event.kind === 'prepayment'
  );
  const terms = mix.tracks.map((track) => Math.round(track.years * 12));
  const maxTerm = terms.length > 0 ? Math.max(...terms) : 0;
  const shorter = mix.tracks.filter((track) => Math.round(track.years * 12) < maxTerm - 0.5);

  if (prepayments.length === 0 && shorter.length === 0) return undefined;

  const parts: string[] = [];

  for (const track of shorter) {
    const months = Math.round(track.years * 12);
    const nextPay = paymentAfterMonth(result, months, summary.lastMonthlyPayment);
    if (summary.monthlyPayment - nextPay <= 1) continue;
    parts.push(
      `יורד ל-${formatShekel(nextPay)} מ${dateOfMonth(mix, months, result)} בעקבות סיום ${track.name} (${formatDuration(months)})`
    );
  }

  for (const event of prepayments) {
    const nextPay = paymentAfterMonth(result, event.month, summary.lastMonthlyPayment);
    if (summary.monthlyPayment - nextPay <= 1) continue;
    const target = event.trackId
      ? mix.tracks.find((track) => track.id === event.trackId)?.name ?? 'מסלול'
      : 'פיזור בין המסלולים';
    const kind = event.mode === 'reduce_payment' ? 'הקטנת החזר' : 'קיצור תקופה';
    parts.push(
      `יורד ל-${formatShekel(nextPay)} מ${dateOfMonth(mix, event.month, result)} בעקבות פרעון מוקדם (${kind}) של ${formatShekel(event.amount)} ב${target}`
    );
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function mixHasStaggeredTerms(mix: WorkspaceMix): boolean {
  const terms = mix.tracks.map((track) => Math.round(track.years * 12));
  if (terms.length < 2) return false;
  return Math.max(...terms) - Math.min(...terms) > 0.5;
}
