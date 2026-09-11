import { describe, expect, it } from 'vitest';
import { applyMarketRates, trackAnchor, trackRateBreakdown, trackWithMarketRate } from './market';
import { computeMix } from './mix';
import { createTrack, createWorkspaceMix } from './factory';
import { fallbackMarketRates, type MarketRatesSnapshot } from '@/lib/market-rates';

function market(overrides: Partial<MarketRatesSnapshot> = {}): MarketRatesSnapshot {
  const base = fallbackMarketRates(new Date('2026-09-11T00:00:00Z'));
  return {
    ...base,
    source: 'boi',
    boiRateSource: 'boi',
    boiRate: 4,
    primeRate: 5.5,
    nominalCurve: {
      spots: [
        { years: 1, yieldPct: 3 },
        { years: 2, yieldPct: 3.5 },
        { years: 5, yieldPct: 4 },
        { years: 10, yieldPct: 4.5 },
      ],
      month: '2026-08',
      asOf: '2026-08-31',
      source: 'boi',
    },
    realCurve: {
      spots: [
        { years: 2, yieldPct: 1 },
        { years: 5, yieldPct: 1.5 },
        { years: 10, yieldPct: 2 },
      ],
      month: '2026-08',
      asOf: '2026-08-31',
      source: 'boi',
    },
    ...overrides,
  };
}

describe('עוגן המסלול', () => {
  it('נלקח לפי תחנת השינוי של המסלול, לא לפי תקופתו', () => {
    const track = createTrack({ type: 'variable_unlinked', years: 25, variablePeriod: 2 });
    expect(trackAnchor(track, market())?.rate).toBeCloseTo(3.5, 10);
  });

  it('נלקח לפי תקופת המסלול כשאין תחנת שינוי', () => {
    const track = createTrack({ type: 'fixed_unlinked', years: 10 });
    expect(trackAnchor(track, market())?.rate).toBeCloseTo(4.5, 10);
  });
});

describe('עדכון ריבית המסלול מול בנק ישראל', () => {
  it('גוזר מחדש את הריבית למסלול שיש עליו מרווח', () => {
    const track = createTrack({ type: 'prime', interestRate: 5, rateSpread: 0.5 });
    expect(trackWithMarketRate(track, market()).interestRate).toBeCloseTo(6, 10);
  });

  it('לא נוגע בריבית שהוזנה ידנית בלי מרווח', () => {
    const track = createTrack({ type: 'prime', interestRate: 4.25 });
    expect(trackWithMarketRate(track, market()).interestRate).toBeCloseTo(4.25, 10);
  });

  it('לא נוגע במסלול שאין לו עוגן שוק, גם כשיש עליו מרווח', () => {
    const track = createTrack({ type: 'eligibility', interestRate: 2.67, rateSpread: 1 });
    expect(trackWithMarketRate(track, market()).interestRate).toBeCloseTo(2.67, 10);
  });

  it('מחזיר את אותו אובייקט כשאין שינוי, כדי לא לגרום לחישוב מחדש מיותר', () => {
    const track = createTrack({ type: 'prime', interestRate: 6, rateSpread: 0.5 });
    expect(trackWithMarketRate(track, market())).toBe(track);
  });

  it('מפרק ריבית קיימת לעוגן ולמרווח לצורך תצוגה', () => {
    const track = createTrack({ type: 'prime', interestRate: 6.1 });
    const breakdown = trackRateBreakdown(track, market());
    expect(breakdown.anchor?.rate).toBeCloseTo(5.5, 10);
    expect(breakdown.spread).toBeCloseTo(0.6, 10);
    expect(breakdown.rate).toBeCloseTo(6.1, 10);
  });
});

describe('החלת נתוני בנק ישראל על תמהיל', () => {
  const mix = createWorkspaceMix({
    totalAmount: 900_000,
    tracks: [
      createTrack({ id: 'p', type: 'prime', amount: 300_000, years: 25, rateSpread: 0.5 }),
      createTrack({
        id: 'v',
        type: 'variable_unlinked',
        amount: 300_000,
        years: 25,
        variablePeriod: 2,
        rateSpread: 1.2,
      }),
      createTrack({ id: 'f', type: 'fixed_unlinked', amount: 300_000, years: 25, interestRate: 4.85 }),
    ],
  });

  it('מדביק את העקומים ואת הריביות בבת אחת', () => {
    const snapshot = market();
    const updated = applyMarketRates(mix, snapshot);
    expect(updated.assumptions.primeForecast).toBe(snapshot.primeForecast);
    expect(updated.assumptions.inflationForecast).toBe(snapshot.inflationForecast);
    expect(updated.tracks[0].interestRate).toBeCloseTo(6, 10);
    expect(updated.tracks[1].interestRate).toBeCloseTo(4.7, 10);
    expect(updated.tracks[2].interestRate).toBeCloseTo(4.85, 10);
  });

  it('מזיז את כל התשלומים העתידיים כשריבית הפריים שנמשכה משתנה', () => {
    const before = computeMix(applyMarketRates(mix, market()));
    const after = computeMix(applyMarketRates(mix, market({ boiRate: 4.5, primeRate: 6 })));

    const primeBefore = before.tracks.find((t) => t.track.id === 'p')!;
    const primeAfter = after.tracks.find((t) => t.track.id === 'p')!;

    expect(primeAfter.track.interestRate - primeBefore.track.interestRate).toBeCloseTo(0.5, 10);
    expect(primeAfter.monthlyPayment).toBeGreaterThan(primeBefore.monthlyPayment);
    expect(primeAfter.totalInterest).toBeGreaterThan(primeBefore.totalInterest);
    // כל חודש בלוח מתומחר לפי הריבית החדשה, לא רק החודשים הראשונים
    expect(
      primeAfter.schedule.every(
        (row) => Math.abs(row.annualRate - primeAfter.track.interestRate) < 1e-9
      )
    ).toBe(true);
    // מסלול קבוע שאין עליו מרווח אינו זז
    expect(after.tracks.find((t) => t.track.id === 'f')!.track.interestRate).toBeCloseTo(4.85, 10);
  });
});
