import { describe, expect, it } from 'vitest';
import {
  breakevenInflationPct,
  breakevenSpots,
  expectedInflationPath,
  fallbackInflationForecast,
  fisherNominalPct,
  inflationExpectationPct,
  inflationRateAtMonth,
  yearlyInflationExpectations,
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

describe('פישר, ציפיות ופורוורד', () => {
  /** עקום ציפיות יורד — כך ההבדל בין ספוט לפורוורד גלוי */
  const spots = [
    { years: 1, inflationPct: 3 },
    { years: 2, inflationPct: 2.5 },
    { years: 5, inflationPct: 2.2 },
  ];

  it('ברק-איבן הוא בדיוק נוסחת פישר, ושני הכיוונים מתהפכים זה לזה', () => {
    // (1 + נומינלי) = (1 + ריאלי) × (1 + אינפלציה)
    expect(breakevenInflationPct(4.5, 1.5)).toBeCloseTo(((1.045 / 1.015) - 1) * 100, 10);
    expect(fisherNominalPct(1.5, breakevenInflationPct(4.5, 1.5))).toBeCloseTo(4.5, 10);
  });

  it('הציפייה לאופק היא הערך שפורסם, בלי גזירת פורוורד', () => {
    expect(inflationExpectationPct(spots, 1)).toBeCloseTo(3, 6);
    expect(inflationExpectationPct(spots, 2)).toBeCloseTo(2.5, 6);
    expect(inflationExpectationPct(spots, 5)).toBeCloseTo(2.2, 6);
  });

  it('הפורוורד לשנה השנייה נמוך מהציפייה לשנתיים, כשהעקום יורד', () => {
    const annual = yearlyInflationRates(expectedInflationPath(spots), 2);
    // הציפייה לשנתיים היא ממוצע השנתיים; אם השנה הראשונה 3% והממוצע 2.5%,
    // השנה השנייה עצמה חייבת להיות נמוכה מ-2.5%
    expect(annual[1].rate).toBeLessThan(inflationExpectationPct(spots, 2));
  });

  it('הצטברות הפורוורד לאורך האופק מחזירה את הציפייה לאותו אופק', () => {
    const path = expectedInflationPath(spots);
    const months = 24;
    const compounded = path
      .slice(0, months)
      .reduce((acc, annualPct) => acc * (1 + annualPct / 100) ** (1 / 12), 1);
    const implied = (compounded ** (12 / months) - 1) * 100;
    expect(implied).toBeCloseTo(inflationExpectationPct(spots, 2), 1);
  });

  it('עקום שטוח — ציפייה ופורוורד זהים', () => {
    const flat = [
      { years: 1, inflationPct: 2 },
      { years: 5, inflationPct: 2 },
      { years: 10, inflationPct: 2 },
    ];
    const annual = yearlyInflationRates(expectedInflationPath(flat), 5);
    annual.forEach((point) => expect(point.rate).toBeCloseTo(2, 1));
    expect(yearlyInflationExpectations(flat, 5).every((p) => Math.abs(p.rate - 2) < 0.01)).toBe(true);
  });
});
