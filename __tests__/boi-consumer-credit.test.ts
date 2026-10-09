import { describe, expect, it } from 'vitest';
import { buildConsumerCredit, lenderSeriesCode, seriesFromCsv } from '@/lib/boi-consumer-credit';

function csv(rows: [string, string, string][]): string {
  return ['SERIES_CODE,FREQ,TIME_PERIOD,OBS_VALUE', ...rows.map((r) => `${r[0]},M,${r[1]},${r[2]}`)].join('\n');
}

describe('lenderSeriesCode', () => {
  it('pads bank codes and keeps credit card company codes', () => {
    expect(lenderSeriesCode('10', 'LR_BIR_2155')).toBe('BNK_10001_LR_BIR_2155');
    expect(lenderSeriesCode('4', 'LR_BIR_2155')).toBe('BNK_4001_LR_BIR_2155');
    expect(lenderSeriesCode('12002', 'LR_BIR_2155')).toBe('BNK_12002_LR_BIR_2155');
  });
});

describe('buildConsumerCredit', () => {
  const series = seriesFromCsv(
    csv([
      ['BNK_99010_LR_BIR_1893', '2026-07', '7.94'],
      ['BNK_99010_LR_BIR_1893', '2026-08', '7.9'],
      ['BNK_99010_LR_BIR_1895', '2026-08', '5181678.68'],
      ['BNK_99010_LR_BIR_1890', '2026-08', '6.01'],
      ['CRA_OUT_0208', '2026-Q2', '260.0304704'],
      ['CRA_OUT_0194', '2026-Q2', '181.489087'],
      ['CRA_OUT_0217', '2026-Q2', '10.185419'],
      ['BNK_10001_LR_BIR_2155', '2024-11', '6.17'],
      ['BNK_10001_LR_BIR_2151', '2024-11', '2.91'],
      ['BNK_10001_LR_BIR_4122', '2024-11', '6.56'],
      ['BNK_10001_LR_BIR_4091', '2024-11', '15.11'],
      ['BNK_12002_LR_BIR_2155', '2025-06', '6'],
      ['BNK_12002_LR_BIR_2151', '2025-06', '4.5626'],
    ])
  );

  it('builds the system figures, debt by lender and the per-lender rates', () => {
    const snapshot = buildConsumerCredit(series, { value: 3.25, asOf: '2026-10-09' });
    expect(snapshot.system).toEqual({ month: '2026-08', rate: 7.9, volume: 5_181_678_680, termYears: 6.01 });
    expect(snapshot.rateHistory.map((p) => p.month)).toEqual(['2026-07', '2026-08']);
    expect(snapshot.debt).toMatchObject({ quarter: '2026-Q2', nonHousingTotal: 260.03, banks: 181.49, overdraft: 10.19 });
    expect(snapshot.lenders.find((l) => l.entity === '10')).toMatchObject({
      average: 9.08,
      low: 6.56,
      high: 15.11,
      asOf: '2024-11',
      kind: 'bank',
    });
    expect(snapshot.lenders.find((l) => l.entity === '12002')).toMatchObject({ average: 10.56, kind: 'card' });
    expect(snapshot.prime).toEqual({ value: 4.75, asOf: '2026-10-09' });
  });

  it('throws when nothing came back, instead of inventing values', () => {
    expect(() => buildConsumerCredit(new Map(), null)).toThrow();
  });
});
