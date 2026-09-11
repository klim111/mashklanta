/**
 * חיבור המסלולים לנתוני בנק ישראל החיים.
 *
 * המנוע עצמו עובד עם ריבית סופית אחת לכל מסלול (`interestRate`). המודול הזה
 * הוא מה שממלא אותה: הוא לוקח את העוגן שנמשך מבנק ישראל ומחבר אליו את המרווח
 * ששמור על המסלול. כך ריבית שהתעדכנה בבנק ישראל מתגלגלת מיד לכל ההחזרים, לסך
 * הריבית וללוח הסילוקין — בלי שהיועץ צריך לגעת במשהו.
 */

import type { MortgageTrack } from '../types';
import {
  anchorForTrack,
  resolveRate,
  roundRate,
  type AnchorContext,
  type RateAnchor,
} from '@/lib/rate-anchors';
import type { MarketRatesSnapshot } from '@/lib/market-rates';
import type { WorkspaceMix } from './types';

/** ההקשר שקובע לאיזה טווח בעקום האפס העוגן של המסלול מתייחס */
export function anchorContextFor(track: Pick<MortgageTrack, 'variablePeriod'>): AnchorContext {
  return { variablePeriod: track.variablePeriod };
}

/** העוגן של מסלול לפי הנתונים העדכניים, או null כשאין לסוג המסלול עוגן שוק */
export function trackAnchor(
  track: Pick<MortgageTrack, 'type' | 'variablePeriod'>,
  snapshot: MarketRatesSnapshot
): RateAnchor | null {
  return anchorForTrack(track.type, snapshot, anchorContextFor(track));
}

export interface TrackRateBreakdown {
  anchor: RateAnchor | null;
  /** המרווח מעל העוגן. null כשאין עוגן ולכן אין מה לפרק */
  spread: number | null;
  /** הריבית הסופית */
  rate: number;
}

/**
 * פירוק הריבית של מסלול לעוגן ולמרווח.
 *
 * כשעל המסלול שמור מרווח — הריבית נגזרת ממנו ומהעוגן החי. אחרת הריבית נשארת
 * כפי שהוזנה, והמרווח שמוצג הוא ההפרש בינה לבין העוגן.
 */
export function trackRateBreakdown(
  track: Pick<MortgageTrack, 'type' | 'interestRate' | 'rateSpread' | 'variablePeriod'>,
  snapshot: MarketRatesSnapshot
): TrackRateBreakdown {
  const resolved = resolveRate(track.type, snapshot, {
    ...anchorContextFor(track),
    spread: track.rateSpread,
    currentRate: track.interestRate,
  });
  return { anchor: resolved.anchor, spread: resolved.spread, rate: resolved.rate };
}

/**
 * מסלול עם ריבית מעודכנת לפי העוגן החי. מסלול בלי מרווח שמור מוחזר כמו שהוא —
 * ריבית שהוזנה ידנית לא משתנה מאחורי הגב של מי שהזין אותה.
 */
export function trackWithMarketRate(
  track: MortgageTrack,
  snapshot: MarketRatesSnapshot
): MortgageTrack {
  if (typeof track.rateSpread !== 'number' || !Number.isFinite(track.rateSpread)) return track;
  const anchor = trackAnchor(track, snapshot);
  if (!anchor) return track;

  const rate = roundRate(anchor.rate + track.rateSpread);
  if (Math.abs(rate - track.interestRate) < 0.0001) return track;
  return { ...track, interestRate: rate };
}

/**
 * תמהיל שכל מסלוליו מתומחרים לפי הנתונים שנמשכו עכשיו מבנק ישראל, כולל עקום
 * הפריים וציפיות האינפלציה שמשמשים את המסלולים המשתנים והצמודים.
 */
export function applyMarketRates(mix: WorkspaceMix, snapshot: MarketRatesSnapshot): WorkspaceMix {
  return {
    ...mix,
    tracks: mix.tracks.map((track) => trackWithMarketRate(track, snapshot)),
    assumptions: {
      ...mix.assumptions,
      primeForecast: snapshot.primeForecast,
      inflationForecast: snapshot.inflationForecast,
    },
  };
}
