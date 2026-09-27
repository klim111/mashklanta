import { describe, expect, it } from 'vitest';
import { previewPrimeForwardPoints, previewVariableForwardPoints, yearlyPrimeRates } from './PrimeForwardChart';
import {
  fallbackPrimeForecast,
  primeRateAtMonth,
  expectedMarketPrimePath,
  variableUnlinkedRateAtMonth,
} from '@/lib/prime-forward-curve';

describe('yearlyPrimeRates', () => {
  it('לוקחת נקודה אחת לכל שנה ומתחילה משנה 1', () => {
    const schedule = Array.from({ length: 36 }, (_, i) => ({
      month: i + 1,
      annualRate: 5 + i * 0.01,
    }));
    expect(yearlyPrimeRates(schedule)).toEqual([
      { year: 1, rate: 5 },
      { year: 2, rate: 5.12 },
      { year: 3, rate: 5.24 },
    ]);
  });
});

describe('previewVariableForwardPoints', () => {
  it('משמרת את הריבית שצוטטה בשנים שלפני התחנה הראשונה', () => {
    const forecast = fallbackPrimeForecast();
    const points = previewVariableForwardPoints(4.6, 15, 5, forecast);
    expect(points[0].rate).toBeCloseTo(4.6, 8);
    expect(points[4].rate).toBeCloseTo(4.6, 8);
    expect(points[5].rate).toBeCloseTo(variableUnlinkedRateAtMonth(4.6, 61, 61, 5, forecast), 8);
  });
});

describe('previewPrimeForwardPoints', () => {
  it('משמרת את הריבית שצוטטה בשנה הראשונה', () => {
    const forecast = fallbackPrimeForecast();
    const points = previewPrimeForwardPoints(6, 10, forecast);
    expect(points.length).toBe(10);
    expect(points[0].year).toBe(1);
    expect(points[0].rate).toBeCloseTo(6, 8);

    const path = expectedMarketPrimePath(forecast.spots, forecast.boiRate);
    expect(points[9].rate).toBeCloseTo(primeRateAtMonth(6, 12 * 9 + 1, path), 8);
  });
});
