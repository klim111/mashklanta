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
import type { AuctionNegotiation } from '@/lib/mortgage-plan';
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

/** ההצעה הטובה של בנק מבין כל ההצעות שנתן */
export function bestOfBank(items: readonly PricedMix[], bank: string): PricedMix | null {
  return cheapestByWeightedRate(items.filter((item) => item.bank === bank));
}

/**
 * ההצעה האחרונה של בנק — הריביות של הסבב הקודם, שמוצגות לפני שהוא עונה. אחרי
 * "ללא שיפור" זו ההצעה הטובה ביותר שלו.
 */
export function latestOfBank(items: readonly PricedMix[], bank: string): PricedMix | null {
  const own = items.filter((item) => item.bank === bank);
  if (own.length === 0) return null;
  return own.reduce((latest, item) => {
    const byDay = item.receivedAt.localeCompare(latest.receivedAt);
    if (byDay !== 0) return byDay > 0 ? item : latest;
    return (item.savedAt ?? '').localeCompare(latest.savedAt ?? '') > 0 ? item : latest;
  });
}

/** ההצעה העדכנית של כל בנק שתמחר — עליהן נעשה המיקוח */
export function latestOffers(items: readonly PricedMix[]): PricedMix[] {
  const banks = [...new Set(items.map((item) => item.bank))];
  return banks.flatMap((bank) => {
    const latest = latestOfBank(items, bank);
    return latest ? [latest] : [];
  });
}

/**
 * הבנקים שעוד צריכים לענות בסבב הנוכחי: כל בנק שתמחר, חוץ מהזול שההצעה שלו
 * נשלחת לאחרים. כשיש בנק אחד בלבד, הוא עצמו מתבקש לשפר.
 */
export function awaitingBanks(state: AuctionNegotiation, items: readonly PricedMix[]): string[] {
  const offers = latestOffers(items);
  const cheapest = cheapestByWeightedRate(offers);
  const asked = offers.length <= 1 ? offers.map((item) => item.bank) : offers.filter((item) => item !== cheapest).map((item) => item.bank);
  return asked.filter((bank) => state.responses[bank]?.round !== state.round);
}

/** כל הבנקים שנשאלו בסבב ענו "ללא שיפור" — הזמן לסיים את המיקוח */
export function everyoneDeclined(state: AuctionNegotiation, items: readonly PricedMix[]): boolean {
  const responded = Object.values(state.responses).filter((item) => item.round === state.round);
  return (
    responded.length > 0 &&
    awaitingBanks(state, items).length === 0 &&
    responded.every((item) => item.kind === 'DECLINED')
  );
}

/**
 * הסבב עובר כשכל הבנקים שנשאלו ענו ולפחות אחד מהם שיפר. אם כולם ענו "ללא
 * שיפור", הסבב נשאר — מה שנשאר הוא לסמן שאף בנק לא מוכן לרדת.
 */
export function nextRoundDue(state: AuctionNegotiation, items: readonly PricedMix[]): boolean {
  if (state.endedAt) return false;
  const responded = Object.values(state.responses).filter((item) => item.round === state.round);
  return (
    responded.some((item) => item.kind === 'UPDATED') && awaitingBanks(state, items).length === 0
  );
}

/** תשובה של בנק בסבב הנוכחי */
export function withResponse(
  state: AuctionNegotiation,
  bank: string,
  kind: 'UPDATED' | 'DECLINED'
): AuctionNegotiation {
  return { ...state, endedAt: null, responses: { ...state.responses, [bank]: { round: state.round, kind } } };
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
