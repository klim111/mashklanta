import { describe, expect, it } from 'vitest';
import {
  expectedBoiRatePath,
  expectedMarketPrimePath,
  fallbackPrimeForecast,
  forwardRate,
  interpolateSpotDecimal,
  isVariableRateStation,
  periodForwardAnnualPct,
  primeRateAtMonth,
  PRIME_OVER_BOI,
  variableUnlinkedRateAtMonth,
} from './prime-forward-curve';

describe('ריבית פורוורד מעקום אפס', () => {
  it('גוזרת את הריבית הגלומה לשנה השנייה', () => {
    const f = forwardRate(0.03, 1, 0.04, 2);
    expect(f).toBeCloseTo(1.04 ** 2 / 1.03 - 1, 10);
  });

  it('מתחילה מריבית בנק ישראל ב-t=0', () => {
    const spots = fallbackPrimeForecast().spots;
    expect(interpolateSpotDecimal(spots, 0, 0.035)).toBeCloseTo(0.035, 8);
    expect(interpolateSpotDecimal(spots, 1, 0.035)).toBeCloseTo(0.032425, 5);
  });
});

describe('עקום פריים צפוי', () => {
  it('בונה 360 חודשים ומשמר את מרווח המשכנתא בחודש הראשון', () => {
    const path = expectedMarketPrimePath(fallbackPrimeForecast().spots, 3.5);
    expect(path).toHaveLength(360);
    expect(path[0]).toBeGreaterThan(3);
    expect(path[0]).toBeLessThan(7);
    expect(primeRateAtMonth(4.5, 1, path)).toBeCloseTo(4.5, 8);
    expect(primeRateAtMonth(4.5, 120, path)).not.toBeCloseTo(4.5, 1);
  });

  it('מוסיפה 1.5% מעל בנק ישראל אחרי הורדת פרמיית הזמן', () => {
    const path = expectedMarketPrimePath([{ years: 1, yieldPct: 3.5 }], 3.5);
    expect(path[0]).toBeCloseTo(3.5 + PRIME_OVER_BOI, 1);
  });
});

describe('פורוורד לתקופת מל"צ', () => {
  it('ב-t=0 זהה לתשואת האפס לאותה תקופה', () => {
    const forecast = fallbackPrimeForecast();
    expect(periodForwardAnnualPct(forecast.spots, forecast.boiRate, 0, 5)).toBeCloseTo(3.5344, 4);
  });

  it('משמרת את הריבית שצוטטה עד התחנה הראשונה ומעדכנת רק אחריה', () => {
    const forecast = fallbackPrimeForecast();
    expect(variableUnlinkedRateAtMonth(4.6, 1, 1, 5, forecast)).toBeCloseTo(4.6, 8);
    expect(variableUnlinkedRateAtMonth(4.6, 60, 60, 5, forecast)).toBeCloseTo(4.6, 8);
    expect(variableUnlinkedRateAtMonth(4.6, 61, 61, 5, forecast)).not.toBeCloseTo(4.6, 1);
    expect(variableUnlinkedRateAtMonth(4.6, 61, 61, 5, forecast)).toBeCloseTo(
      variableUnlinkedRateAtMonth(4.6, 80, 80, 5, forecast),
      8
    );
  });

  it('מזהה תחנות לפי 2 ו-5 שנים', () => {
    expect(isVariableRateStation(1, 5)).toBe(false);
    expect(isVariableRateStation(60, 5)).toBe(false);
    expect(isVariableRateStation(61, 5)).toBe(true);
    expect(isVariableRateStation(25, 2)).toBe(true);
    expect(isVariableRateStation(24, 2)).toBe(false);
  });

  it('מוסיפה שינוי תרחיש רק מהתחנה הראשונה', () => {
    const forecast = fallbackPrimeForecast();
    expect(variableUnlinkedRateAtMonth(4.6, 1, 1, 5, forecast, 1)).toBeCloseTo(4.6, 8);
    expect(variableUnlinkedRateAtMonth(4.6, 61, 61, 5, forecast, 1)).toBeCloseTo(
      variableUnlinkedRateAtMonth(4.6, 61, 61, 5, forecast, 0) + 1,
      8
    );
  });
});

describe('ריבית בנק ישראל הצפויה והפריים שנגזר ממנה', () => {
  /** עקום עולה — הפורוורד חייב להיות מעל הספוט */
  const rising = [
    { years: 1, yieldPct: 4 },
    { years: 2, yieldPct: 4.5 },
    { years: 5, yieldPct: 5 },
  ];

  it('הפריים הוא ריבית בנק ישראל הצפויה ועוד 1.5% בכל חודש', () => {
    const boi = expectedBoiRatePath(rising, 4);
    const prime = expectedMarketPrimePath(rising, 4);
    expect(prime).toHaveLength(boi.length);
    prime.forEach((rate, index) => {
      expect(rate).toBeCloseTo(boi[index] + PRIME_OVER_BOI, 10);
    });
  });

  it('עקום שטוח — הפורוורד שווה לעקום, בלי תיקון שרירותי', () => {
    // כשכל התשואות שוות לריבית הקצרה, אין ציפייה לשינוי ולכן הפורוורד קבוע
    const flat = [
      { years: 1, yieldPct: 4 },
      { years: 5, yieldPct: 4 },
      { years: 10, yieldPct: 4 },
    ];
    const boi = expectedBoiRatePath(flat, 4);
    boi.slice(0, 120).forEach((rate) => expect(rate).toBeCloseTo(4, 6));
  });

  it('עקום עולה — הריבית הצפויה עולה עם הזמן ומעל הריבית של היום', () => {
    const boi = expectedBoiRatePath(rising, 4);
    expect(boi[0]).toBeCloseTo(4, 1);
    expect(boi[59]).toBeGreaterThan(boi[0]);
    expect(boi[59]).toBeGreaterThan(4.5);
  });

  it('הצטברות הפורוורד מחזירה את תשואת האפס לאותו אופק', () => {
    const boi = expectedBoiRatePath(rising, 4);
    const months = 24;
    const compounded = boi
      .slice(0, months)
      .reduce((acc, annualPct) => acc * (1 + annualPct / 100) ** (1 / 12), 1);
    const implied = (compounded ** (12 / months) - 1) * 100;
    // תשואת האפס לשנתיים היא 4.5% — הפורוורדים חייבים להצטבר בדיוק אליה
    expect(implied).toBeCloseTo(4.5, 1);
  });
});
