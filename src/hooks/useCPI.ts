import { useState, useEffect } from 'react';

interface CPIData {
  value: number;
  date: string;
  previousValue: number;
  change: number;
  changePercentage: number;
  source: 'cbs' | 'boi' | 'fallback';
}

/**
 * מדד המחירים לצרכן האחרון שפורסם.
 *
 * כשאין נתון עדכני מהמקור הרשמי מוחזר `null` ולא מספר משוער — מדד הוא נתון
 * רשמי, והצגת ערך שנכתב בקוד כאילו הוא המדד היא הטעיה.
 */
export function useCPI() {
  const [cpiData, setCpiData] = useState<CPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCPI = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/boi/cpi', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch CPI data');

        const data: CPIData = await response.json();
        if (cancelled) return;
        setCpiData(data.source === 'fallback' || !Number.isFinite(data.value) || data.value <= 0 ? null : data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setCpiData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchCPI();
    return () => {
      cancelled = true;
    };
  }, []);

  return { cpiData, loading, error };
}
