import { describe, expect, it } from 'vitest';
import { monthlyCashFlowIrr } from './irr';
import { annuityPayment } from './schedule';
import { computeMix, createTrack, createWorkspaceMix } from '.';

describe('ריבית מתואמת (IRR)', () => {
  it('בהלוואת שפיצר קבועה ה-IRR הוא הריבית האפקטיבית השנתית', () => {
    const payment = annuityPayment(1_000_000, 5, 240);
    const irr = monthlyCashFlowIrr(1_000_000, Array.from({ length: 240 }, () => payment));
    // (1 + 5%/12)^12 - 1 = 5.116%
    expect(irr).toBeCloseTo(((1 + 0.05 / 12) ** 12 - 1) * 100, 3);
  });

  it('זרם ריק או קרן אפס נותנים אפס', () => {
    expect(monthlyCashFlowIrr(0, [1, 2, 3])).toBe(0);
    expect(monthlyCashFlowIrr(1000, [])).toBe(0);
  });

  it('מסלול קבוע לא צמוד: הממוצעת היא הנקובה וה-IRR מעט מעליה', () => {
    const mix = createWorkspaceMix({
      totalAmount: 900_000,
      tracks: [
        createTrack({ type: 'fixed_unlinked', amount: 900_000, years: 20, interestRate: 4.5 }),
      ],
    });
    const result = computeMix(mix);
    expect(result.tracks[0].averageRate).toBeCloseTo(4.5, 6);
    expect(result.tracks[0].irr).toBeGreaterThan(4.5);
    expect(result.tracks[0].irr).toBeLessThan(4.7);
    expect(result.summary.irr).toBeCloseTo(result.tracks[0].irr, 6);
    expect(result.summary.averageRate).toBeCloseTo(4.5, 6);
  });
});
