'use client';

import { useEffect, useState } from 'react';
import { fallbackMarketRates, mapBoiRatesToTrackTypes } from '@/lib/boi-average-rates';
import type { MarketRates } from '@/lib/refinance';

/**
 * הריביות הממוצעות בשוק לפי בנק ישראל, לפי סוג מסלול.
 * כשהשליפה נכשלת נשארים עם טבלת הריביות הפנימית, כדי שההשוואה ללקוח תמשיך לעבוד.
 */
export function useMarketRates(): { market: MarketRates; loading: boolean } {
  const [market, setMarket] = useState<MarketRates>(() => fallbackMarketRates());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/boi/rates', { cache: 'no-store' });
        if (!res.ok) throw new Error('rates request failed');
        const data = await res.json();
        if (!cancelled) setMarket(mapBoiRatesToTrackTypes(data));
      } catch {
        if (!cancelled) setMarket(fallbackMarketRates());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { market, loading };
}
