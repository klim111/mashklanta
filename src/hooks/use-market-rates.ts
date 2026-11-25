'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { fallbackMarketRates, type MarketRatesSnapshot } from '@/lib/market-rates';
import { applyLiveInterestRates } from '@/lib/rate-anchors';

/**
 * הריביות החיות של בנק ישראל בצד הלקוח.
 *
 * הנתונים נשמרים בחנות אחת ברמת המודול ולא ב-state של רכיב, כך שכל הכלים
 * בפלטפורמה — בונה התמהילים, המחשבונים, לוחות ההחזרים ולוחות הריביות —
 * רואים בדיוק את אותם ערכים, ומשיכה אחת מספיקה לכולם.
 *
 * המשיכה מתבצעת בכל טעינה של הדף (בלי מטמון דפדפן), מתרעננת כשחוזרים ללשונית
 * אחרי שהנתונים התיישנו, וניתנת לריענון יזום. כך הערכים המוצגים והמחושבים הם
 * תמיד מה שבנק ישראל מפרסם עכשיו.
 */

export type MarketRatesStatus = 'idle' | 'loading' | 'ready' | 'error';

interface MarketRatesState {
  snapshot: MarketRatesSnapshot;
  status: MarketRatesStatus;
  /** מתי הנתונים נמשכו בהצלחה בדפדפן הזה (ms) */
  loadedAt: number | null;
  error: string | null;
}

/** אחרי כמה זמן נתונים בדפדפן נחשבים ישנים ונמשכים מחדש */
const STALE_AFTER_MS = 10 * 60 * 1000;

let state: MarketRatesState = {
  snapshot: fallbackMarketRates(),
  status: 'idle',
  loadedAt: null,
  error: null,
};

const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;

function setState(patch: Partial<MarketRatesState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): MarketRatesState {
  return state;
}

/** בצד השרת אין משיכה — הרנדור הראשוני נעשה עם ערכי הנפילה ומתעדכן בדפדפן */
const serverState: MarketRatesState = {
  snapshot: fallbackMarketRates(),
  status: 'idle',
  loadedAt: null,
  error: null,
};

function getServerSnapshot(): MarketRatesState {
  return serverState;
}

function isSnapshot(value: unknown): value is MarketRatesSnapshot {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<MarketRatesSnapshot>;
  return (
    Number.isFinite(payload.primeRate) &&
    Number.isFinite(payload.boiRate) &&
    Array.isArray(payload.nominalCurve?.spots) &&
    Array.isArray(payload.realCurve?.spots) &&
    Array.isArray(payload.primeForecast?.spots)
  );
}

export function loadMarketRates(force = false): Promise<void> {
  if (inFlight) return inFlight;
  if (!force && state.status === 'ready' && state.loadedAt && Date.now() - state.loadedAt < STALE_AFTER_MS) {
    return Promise.resolve();
  }

  setState({ status: 'loading', error: null });

  inFlight = fetch(`/api/market/rates${force ? '?refresh=1' : ''}`, { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error('שגיאת רשת'))))
    .then((data) => {
      if (!isSnapshot(data)) throw new Error('נתונים לא תקינים');
      // הטבלה המרכזית מתעדכנת לפני ה-state, כדי שכל רכיב שיצויר מחדש בעקבות
      // העדכון כבר יקרא את הריביות החדשות
      applyLiveInterestRates(data);
      setState({ snapshot: data, status: 'ready', loadedAt: Date.now(), error: null });
    })
    .catch((error: unknown) => {
      // הערכים הקיימים נשמרים — עדיף נתון אחרון שנמשך בהצלחה על פני ריק
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'שגיאה במשיכת הריביות',
      });
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export interface UseMarketRates extends MarketRatesState {
  /** הנתונים נמשכו בהצלחה מבנק ישראל (ולא ערכי נפילה) */
  live: boolean;
  refresh: () => Promise<void>;
}

export function useMarketRates(): UseMarketRates {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadMarketRates();

    const onFocus = () => {
      void loadMarketRates();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const refresh = useCallback(() => loadMarketRates(true), []);

  return {
    ...value,
    live: value.status === 'ready' && value.snapshot.source !== 'fallback',
    refresh,
  };
}

/** לשימוש בטסטים בלבד — מאפס את החנות המשותפת */
export function resetMarketRatesStore(): void {
  state = { snapshot: fallbackMarketRates(), status: 'idle', loadedAt: null, error: null };
  inFlight = null;
  listeners.forEach((listener) => listener());
}
