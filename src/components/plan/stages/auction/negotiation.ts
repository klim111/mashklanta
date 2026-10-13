/**
 * המיקוח על הריביות בשלב המכרז.
 *
 * אחרי שהוזנו ריביות, הכלי מוצא את ההצעה הזולה לפי הריבית הכוללת המשוקללת —
 * ממוצע הריביות של המסלולים, משוקלל לפי הסכום בכל מסלול — וממליץ לשלוח אותה
 * לשאר הבנקים שנתנו אישור עקרוני כדי שישפרו. כל בנק שחוזר עם ריביות מעודכנות
 * נכנס כהצעה חדשה, והמיקוח חוזר עד שהלקוח מסמן שאף בנק לא מוכן לרדת.
 *
 * הקובץ טהור — בלי React.
 */

import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import type { PricedMix } from './pricedMixes';

/** הריבית הכוללת המשוקללת של הצעה, באחוזים */
export function weightedRateOf(item: PricedMix): number {
  const tracks = item.mix.tracks;
  const total = tracks.reduce((sum, track) => sum + track.amount, 0);
  if (total <= 0) return item.summary.averageRate;
  return tracks.reduce((sum, track) => sum + track.interestRate * track.amount, 0) / total;
}

/** ההצעה הזולה ביותר לפי הריבית הכוללת המשוקללת; בשוויון — לפי סך התשלומים */
export function cheapestByWeightedRate(items: readonly PricedMix[]): PricedMix | null {
  if (items.length === 0) return null;
  return items.reduce((best, item) => {
    const diff = weightedRateOf(item) - weightedRateOf(best);
    if (Math.abs(diff) > 1e-9) return diff < 0 ? item : best;
    return item.summary.totalPaid < best.summary.totalPaid ? item : best;
  });
}

/** ההצעה הטובה של כל בנק — אחרי מיקוח, זו בדרך כלל ההצעה המעודכנת שלו */
export function bestOfBank(items: readonly PricedMix[], bank: string): PricedMix | null {
  return cheapestByWeightedRate(items.filter((item) => item.bank === bank));
}

/**
 * הבנקים שמשתתפים במיקוח: מי שנתן אישור עקרוני, ואחריהם בנק שהוזנו ממנו
 * ריביות בלי אישור — לפי הסדר שבו הם הגיעו.
 */
export function negotiationBanks(approved: readonly string[], items: readonly PricedMix[]): string[] {
  const banks = [...approved];
  for (const item of items) if (!banks.includes(item.bank)) banks.push(item.bank);
  return banks;
}

function rate(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** תוכן המייל לבנקאי: ההצעה הזולה, מסלול אחרי מסלול, ובקשה לשפר אותה */
export function negotiationEmail(
  cheapest: PricedMix,
  to: { bank: string; bankerName?: string | null }
): { subject: string; text: string } {
  const lines = cheapest.mix.tracks.map((track) => {
    const label = TRACK_TYPES[track.type] ?? track.name;
    return `• ${label} — ${Math.round(track.amount).toLocaleString('he-IL')} ₪ ל-${track.years} שנים: ${rate(track.interestRate)}`;
  });
  const greeting = to.bankerName?.trim() ? `שלום ${to.bankerName.trim()},` : 'שלום,';
  return {
    subject: `בקשה לשיפור הריביות במשכנתא — הצעה מתחרה מבנק ${cheapest.bank}`,
    text: [
      greeting,
      '',
      `קיבלנו מבנק ${cheapest.bank} הצעה על אותו תמהיל שהגשנו אליכם, בריבית כוללת משוקללת של ${rate(weightedRateOf(cheapest))}:`,
      ...lines,
      '',
      `נשמח לדעת אם ${to.bank} יכול לשפר את הריביות שנתתם לנו.`,
      '',
      'תודה רבה',
    ].join('\n'),
  };
}
