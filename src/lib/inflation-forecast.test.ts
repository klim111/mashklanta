import { describe, expect, it } from 'vitest';
import {
  breakevenInflationPct,
  breakevenSpots,
  expectedInflationPath,
  fallbackInflationForecast,
  inflationRateAtMonth,
  yearlyInflationRates,
} from './inflation-forecast';

describe('ברק-איבן', () => {
  it('גוזר אינפלציה מהפער בין תשואה נומינלית לצמודה', () => {
    expect(breakevenInflationPct(5, 2.5)).toBeCloseTo(((1.05 / 1.025) - 1) * 100, 10);
  });

  it('משדכת אופקים זהים בלבד', () => {
    const spots = breakevenSpots(
      [
        { years: 1, yieldPct: 4 },
        { years: 5, yieldPct: 5 },
      ],
      [
        { years: 1, yieldPct: 1.5 },
        { years: 10, yieldPct: 2 },
      ]
    );
    expect(spots).toHaveLength(1);
    expect(spots[0].years).toBe(1);
    expect(spots[0].inflationPct).toBeCloseTo(breakevenInflationPct(4, 1.5), 10);
  });
});

describe('נתיב אינפלציה חודשי', () => {
  it('בונה 360 חודשים שמתחילים סביב תחזית השנה הראשונה', () => {
    const path = expectedInflationPath(fallbackInflationForecast().spots);
    expect(path).toHaveLength(360);
    expect(path[0]).toBeCloseTo(2.3, 1);
    expect(inflationRateAtMonth(path, 1)).toBeCloseTo(path[0], 10);
    expect(inflationRateAtMonth(path, 400)).toBeCloseTo(path[359], 10);
  });

  it('אינו קו שטוח של 2% כמו יעד בנק ישראל', () => {
    const path = expectedInflationPath(fallbackInflationForecast().spots);
    const year1 = path[0];
    const year10 = path[119];
    expect(Math.abs(year1 - 2)).toBeGreaterThan(0.05);
    expect(Math.abs(year1 - year10)).toBeGreaterThan(0.02);
  });

  it('מחזיר נקודה לכל שנה בגרף', () => {
    const points = yearlyInflationRates(expectedInflationPath(fallbackInflationForecast().spots), 25);
    expect(points).toHaveLength(25);
    expect(points[0].year).toBe(1);
    expect(points[24].year).toBe(25);
  });
});
