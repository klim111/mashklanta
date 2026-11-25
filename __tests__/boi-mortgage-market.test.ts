import { describe, expect, it } from 'vitest';
import { MORTGAGE_SERIES, buildMortgageMarket, seriesFromCsv, yearlyStats } from '@/lib/boi-mortgage-market';

const S = MORTGAGE_SERIES;

function csv(rows: [string, string, string][]): string {
  return ['SERIES_CODE,FREQ,TIME_PERIOD,OBS_VALUE', ...rows.map((r) => `${r[0]},M,${r[1]},${r[2]}`)].join('\n');
}

describe('seriesFromCsv', () => {
  it('skips empty cells instead of reading them as zero', () => {
    const map = seriesFromCsv(csv([[S.count, '2026-07', '10352'], [S.count, '2026-08', '']]));
    expect([...map.get(S.count)!.entries()]).toEqual([['2026-07', 10352]]);
  });
});

describe('yearlyStats', () => {
  it('sums months that have both count and volume, from 2012, volume in shekels', () => {
    const count = new Map([['2011-12', 5], ['2025-01', 100], ['2025-02', 300], ['2026-01', 50]]);
    const volume = new Map([['2011-12', 5], ['2025-01', 100_000], ['2025-02', 300_000]]);
    expect(yearlyStats(count, volume)).toEqual([
      { year: 2025, count: 400, volume: 400_000_000, average: 1_000_000, months: 2 },
    ]);
  });
});

describe('buildMortgageMarket', () => {
  const rows: [string, string, string][] = [
    [S.count, '2025-12', '9000'],
    [S.volume, '2025-12', '9000000'],
    [S.count, '2026-01', '8000'],
    [S.volume, '2026-01', '8800000'],
    [S.count, '2026-02', '10000'],
    [S.volume, '2026-02', '10600000'],
    [S.paymentToIncome, '2026-02', '29.23'],
    [S.fixedUnlinkedRate, '2026-02', '4.62'],
    [S.fixedLinkedRate, '2026-02', '3.29'],
    [S.variableLinkedAnchor, '2026-02', '1.64'],
    [S.variableLinkedMargin, '2026-02', '1.55'],
  ];

  it('builds rates, anchors and year-to-date totals from Bank of Israel series only', () => {
    const snapshot = buildMortgageMarket(seriesFromCsv(csv(rows)), { value: 3.25, asOf: '2026-09-26' });
    expect(snapshot.latestMonth).toBe('2026-02');
    expect(snapshot.latest).toEqual({ count: 10000, volume: 10_600_000_000, average: 1_060_000, paymentToIncome: 29.23 });
    expect(snapshot.yearToDate).toMatchObject({ year: 2026, count: 18000, months: 2 });

    const byKey = Object.fromEntries(snapshot.rates.map((r) => [r.key, r]));
    expect(byKey.fixed_unlinked).toMatchObject({ rate: 4.62, anchor: null });
    expect(byKey.fixed_linked).toMatchObject({ rate: 3.29, anchor: null });
    expect(byKey.variable_linked).toMatchObject({ rate: 3.19, anchor: 1.64, margin: 1.55 });
    expect(byKey.variable_unlinked).toMatchObject({ rate: null, anchor: 4.75 });
    expect(snapshot.rateHistory.at(-1)).toEqual({
      month: '2026-02',
      fixed_unlinked: 4.62,
      fixed_linked: 3.29,
      variable_linked: 3.19,
    });
  });

  it('leaves the prime anchor empty rather than inventing one when the BoI rate is missing', () => {
    const snapshot = buildMortgageMarket(seriesFromCsv(csv(rows)), null);
    const prime = snapshot.rates.find((r) => r.key === 'variable_unlinked')!;
    expect(prime.anchor).toBeNull();
  });

  it('throws when the core series are missing', () => {
    expect(() => buildMortgageMarket(seriesFromCsv(csv([[S.fixedLinkedRate, '2026-02', '3.29']])), null)).toThrow();
  });
});
