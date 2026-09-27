'use client';

import { useEffect, useState } from 'react';
import { fallbackPrimeForecast } from '@/lib/prime-forward-curve';
import type { PrimeForecast } from '@/lib/prime-forward-curve';

function forecastFromPayload(data: unknown): PrimeForecast | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as {
    asOf?: unknown;
    source?: unknown;
    boiRate?: unknown;
    spots?: unknown;
  };
  if (!Array.isArray(payload.spots) || payload.spots.length < 2) return null;
  return {
    asOf: typeof payload.asOf === 'string' ? payload.asOf : '',
    source: payload.source === 'boi' ? 'boi' : 'fallback',
    boiRate: Number(payload.boiRate) || 3.5,
    spots: payload.spots,
  };
}

/**
 * עקום הפריים החי של בנק ישראל. עד שהבקשה חוזרת — ואם היא נכשלת — משתמשים
 * בנתוני הנפילה, כדי שמסלולים משתנים יתומחרו עם פורוורד גם בלי רשת.
 */
export function usePrimeForecast(): PrimeForecast {
  const [forecast, setForecast] = useState<PrimeForecast>(() => fallbackPrimeForecast());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/boi/prime-curve')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setForecast(forecastFromPayload(data) ?? fallbackPrimeForecast());
      })
      .catch(() => {
        if (!cancelled) setForecast(fallbackPrimeForecast());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return forecast;
}
