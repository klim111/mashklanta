import { describe, expect, it } from 'vitest';
import {
  anchorCurveFor,
  anchorForTrack,
  anchorYears,
  defaultRateFor,
  defaultSpreadFor,
  interpolateCurvePct,
  liveRatesList,
  resolveRate,
  roundRate,
} from './rate-anchors';
import { fallbackMarketRates, type MarketRatesSnapshot } from './market-rates';
import { INTEREST_RATE_KEYS, STATIC_INTEREST_RATES as INTEREST_RATES } from './interest-rates';

/** תצלום שוק מלאכותי עם עקומים "עגולים", כדי שהבדיקות יקראו כמו חשבון פשוט */
function snapshot(overrides: Partial<MarketRatesSnapshot> = {}): MarketRatesSnapshot {
  const base = fallbackMarketRates(new Date('2026-09-11T00:00:00Z'));
  return {
    ...base,
    boiRate: 4,
    primeRate: 5.5,
    boiRateSource: 'boi',
    source: 'boi',
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
        { years: 1, yieldPct: 0.8 },
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

describe('אינטרפולציה על עקום האפס', () => {
  const spots = [
    { years: 2, yieldPct: 3 },
    { years: 5, yieldPct: 4.5 },
  ];

  it('מחזירה בדיוק את הנקודה שפורסמה', () => {
    expect(interpolateCurvePct(spots, 2)).toBeCloseTo(3, 10);
    expect(interpolateCurvePct(spots, 5)).toBeCloseTo(4.5, 10);
  });

  it('מאנטרפלטת ליניארית בין נקודות', () => {
    expect(interpolateCurvePct(spots, 3.5)).toBeCloseTo(3.75, 10);
  });

  it('מצמידה לקצה ולא מבררת מעבר למה שבנק ישראל פרסם', () => {
    expect(interpolateCurvePct(spots, 0.5)).toBeCloseTo(3, 10);
    expect(interpolateCurvePct(spots, 30)).toBeCloseTo(4.5, 10);
  });

  it('מחזירה null כשאין עקום', () => {
    expect(interpolateCurvePct([], 5)).toBeNull();
  });
});

describe('בחירת העוגן לפי סוג המסלול', () => {
  const market = snapshot();

  it('פריים — ריבית הפריים במשק כפי שנמשכה מבנק ישראל', () => {
    const anchor = anchorForTrack('prime', market);
    expect(anchor?.curve).toBe('prime');
    expect(anchor?.rate).toBeCloseTo(5.5, 10);
    expect(anchor?.source).toBe('boi');
  });

  it('משתנה לא צמודה — עקום אפס נומינלי לתקופת השינוי של המסלול', () => {
    expect(anchorCurveFor('variable_unlinked')).toBe('nominal');
    expect(anchorForTrack('variable_unlinked', market, { variablePeriod: 2 })?.rate).toBeCloseTo(3.5, 10);
    expect(anchorForTrack('variable_unlinked', market, { variablePeriod: 5 })?.rate).toBeCloseTo(4, 10);
  });

  it('משתנה צמודה — עקום אפס ריאלי לאותה תקופת שינוי', () => {
    expect(anchorCurveFor('variable_linked')).toBe('real');
    expect(anchorForTrack('variable_linked', market, { variablePeriod: 2 })?.rate).toBeCloseTo(1, 10);
    expect(anchorForTrack('variable_linked', market, { variablePeriod: 5 })?.rate).toBeCloseTo(1.5, 10);
  });

  it('מק"מ — עקום אפס נומינלי לשנה, שזו תקופת המק"מ', () => {
    expect(anchorYears('makam')).toBe(1);
    expect(anchorForTrack('makam', market)?.rate).toBeCloseTo(3, 10);
  });

  it('קבועה — העקום המתאים לאורך התקופה של המסלול', () => {
    expect(anchorForTrack('fixed_unlinked', market, { years: 10 })?.rate).toBeCloseTo(4.5, 10);
    expect(anchorForTrack('fixed_linked', market, { years: 10 })?.rate).toBeCloseTo(2, 10);
  });

  it('זכאות ומענק — אין עוגן שוק, והריבית מוזנת ידנית', () => {
    expect(anchorForTrack('eligibility', market)).toBeNull();
    expect(anchorForTrack('grant', market)).toBeNull();
    expect(anchorForTrack('dollar', market)).toBeNull();
  });

  it('התווית מציינת את העקום, את הטווח ואת החודש שממנו נלקח', () => {
    const anchor = anchorForTrack('variable_unlinked', market, { variablePeriod: 2 });
    expect(anchor?.label).toContain('עקום אפס נומינלי');
    expect(anchor?.label).toContain('2 שנים');
    expect(anchor?.label).toContain('2026-08');
  });
});

describe('עוגן + מרווח = ריבית סופית', () => {
  const market = snapshot();

  it('גוזר את הריבית מהעוגן החי ומהמרווח השמור', () => {
    const resolved = resolveRate('variable_unlinked', market, {
      variablePeriod: 5,
      spread: 1.2,
      currentRate: 0,
    });
    expect(resolved.rate).toBeCloseTo(5.2, 10);
    expect(resolved.spread).toBeCloseTo(1.2, 10);
  });

  it('גוזר את המרווח מריבית שהוזנה ידנית, בלי לגעת בריבית עצמה', () => {
    const resolved = resolveRate('prime', market, { currentRate: 6.1 });
    expect(resolved.rate).toBeCloseTo(6.1, 10);
    expect(resolved.spread).toBeCloseTo(0.6, 10);
  });

  it('משאיר ריבית של מסלול בלי עוגן כפי שהיא', () => {
    const resolved = resolveRate('eligibility', market, { currentRate: 2.67, spread: 5 });
    expect(resolved.rate).toBeCloseTo(2.67, 10);
    expect(resolved.spread).toBeNull();
    expect(resolved.anchor).toBeNull();
  });

  it('מזיז את הריבית הסופית כשהעוגן זז, בלי לגעת במרווח', () => {
    const higher = snapshot({ boiRate: 5, primeRate: 6.5 });
    const before = resolveRate('prime', market, { spread: 0.6, currentRate: 0 });
    const after = resolveRate('prime', higher, { spread: 0.6, currentRate: 0 });
    expect(after.rate - before.rate).toBeCloseTo(1, 10);
    expect(after.spread).toBeCloseTo(before.spread!, 10);
  });
});

describe('ריביות ברירת המחדל החיות', () => {
  it('זהות לטבלה הסטטית כשאין נתונים חיים — ולכן אין רגרסיה בהתנהגות', () => {
    const offline = fallbackMarketRates(new Date('2026-09-11T00:00:00Z'));
    expect(defaultRateFor('prime', offline)).toBeCloseTo(INTEREST_RATES.prime, 2);
    expect(defaultRateFor('fixed_unlinked', offline, { years: 25 })).toBeCloseTo(
      INTEREST_RATES.fixed_unlinked,
      2
    );
    expect(defaultRateFor('fixed_linked', offline, { years: 25 })).toBeCloseTo(
      INTEREST_RATES.fixed_linked,
      2
    );
    expect(defaultRateFor('variable_unlinked', offline, { variablePeriod: 5 })).toBeCloseTo(
      INTEREST_RATES.variable_unlinked_5y,
      2
    );
    expect(defaultRateFor('variable_unlinked', offline, { variablePeriod: 2 })).toBeCloseTo(
      INTEREST_RATES.variable_unlinked_2y,
      2
    );
    expect(defaultRateFor('variable_linked', offline, { variablePeriod: 5 })).toBeCloseTo(
      INTEREST_RATES.variable_linked_5y,
      2
    );
    expect(defaultRateFor('makam', offline)).toBeCloseTo(INTEREST_RATES.makam, 2);
    expect(defaultRateFor('eligibility', offline)).toBeCloseTo(INTEREST_RATES.eligibility, 2);
  });

  it('עולות יחד עם העוגן כשעקום האפס עולה', () => {
    const offline = fallbackMarketRates(new Date('2026-09-11T00:00:00Z'));
    const raised = snapshot({
      nominalCurve: {
        ...snapshot().nominalCurve,
        spots: snapshot().nominalCurve.spots.map((spot) => ({ ...spot, yieldPct: spot.yieldPct + 1 })),
      },
    });
    const spread = defaultSpreadFor('variable_unlinked', { variablePeriod: 5 });
    expect(defaultRateFor('variable_unlinked', raised, { variablePeriod: 5 })).toBeCloseTo(
      roundRate(5 + spread),
      2
    );
    expect(defaultRateFor('variable_unlinked', raised, { variablePeriod: 5 })).toBeGreaterThan(
      defaultRateFor('variable_unlinked', offline, { variablePeriod: 5 })
    );
  });

  it('טבלת התצוגה מחזיקה את אותם מפתחות כמו הטבלה הסטטית', () => {
    const list = liveRatesList(snapshot());
    expect(list.map((item) => item.key)).toEqual([...INTEREST_RATE_KEYS]);
  });

  it('כל שורה בטבלה מקיימת עוגן + מרווח = ריבית', () => {
    liveRatesList(snapshot()).forEach((item) => {
      if (item.anchor === null || item.spread === null) return;
      expect(item.rate).toBeCloseTo(roundRate(item.anchor + item.spread), 2);
    });
  });

  it('מסמנת כלא-חיות את השורות שאין להן עוגן שוק', () => {
    const byKey = new Map(liveRatesList(snapshot()).map((item) => [item.key, item]));
    expect(byKey.get('eligibility')?.live).toBe(false);
    expect(byKey.get('prime')?.live).toBe(true);
  });
});
