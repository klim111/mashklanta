'use client';

import { createContext, useContext, useMemo } from 'react';
import { buildPricingView, type PricingView } from '@/data/platform/pricing';
import { DEFAULT_PRICING, normalizePricing, type PricingConfig } from '@/lib/pricing-config';

const PricingContext = createContext<PricingView | null>(null);

/**
 * המחירים והמסלולים שהיועץ הגדיר, לכל עמודי האתר. ה-layout קורא אותם בשרת
 * (getPricing) ומעביר לכאן, כך שאין הבהוב של מחיר ישן בטעינה.
 */
export function PricingProvider({ config, children }: { config: PricingConfig; children: React.ReactNode }) {
  const view = useMemo(() => buildPricingView(normalizePricing(config)), [config]);
  return <PricingContext.Provider value={view}>{children}</PricingContext.Provider>;
}

const fallback = buildPricingView(DEFAULT_PRICING);

/** המחירים העדכניים. מחוץ לספק (בדיקות, תצוגות מבודדות) — ערכי ברירת המחדל */
export function usePricing(): PricingView {
  return useContext(PricingContext) ?? fallback;
}
