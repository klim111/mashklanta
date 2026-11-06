import { describe, expect, it } from 'vitest';
import { computeMix, createTrack, createWorkspaceMix, yearlySeries } from './index';

/**
 * מסך העבודה מחשב מחדש את כל התמהיל בכל תזוזה של סליידר, ולכן חישוב יחיד
 * חייב להישאר זול מאוד. הבדיקה שומרת על התקציב הזה.
 */
describe('recompute budget', () => {
  const mix = createWorkspaceMix({
    totalAmount: 2_000_000,
    tracks: [
      createTrack({ type: 'fixed_unlinked', amount: 500_000, years: 30 }),
      createTrack({ type: 'fixed_linked', amount: 400_000, years: 30 }),
      createTrack({ type: 'prime', amount: 400_000, years: 30 }),
      createTrack({ type: 'variable_unlinked', amount: 400_000, years: 30, variablePeriod: 5 }),
      createTrack({ type: 'variable_linked', amount: 300_000, years: 30, variablePeriod: 2 }),
    ],
    assumptions: { rateDeltas: { prime: 1.5, variable_unlinked: 1 }, annualInflation: 3 },
    events: [
      { id: 'p1', kind: 'prepayment', month: 24, amount: 150_000, mode: 'shorten_term' },
      { id: 'p2', kind: 'prepayment', month: 60, amount: 100_000, mode: 'reduce_payment' },
    ],
  });

  /**
   * הזמן נמדד כמיטב מכמה מקבצים ולא כמקבץ יחיד: כשחבילת הבדיקות רצה במקביל,
   * מקבץ בודד עלול להיתפס באמצע עומס מעבד ולחרוג מהתקציב בלי שדבר בקוד השתנה.
   * רגרסיה אמיתית מאטה את כל המקבצים, ולכן המינימום עדיין תופס אותה.
   */
  const timeOf = (target: typeof mix, runs = 60, batches = 3) => {
    let best = Infinity;
    for (let batch = 0; batch < batches; batch++) {
      const start = performance.now();
      for (let i = 0; i < runs; i++) {
        yearlySeries(computeMix(target));
      }
      best = Math.min(best, (performance.now() - start) / runs);
    }
    return best;
  };

  it('computes a five-track mix without events in a fraction of a frame', () => {
    expect(timeOf({ ...mix, events: [] })).toBeLessThan(4);
  });

  it('does not pay a real price for prepayments spread across tracks', () => {
    // הפיזור נעצר בחודש האירוע ולכן עלותו זניחה מול חישוב התמהיל עצמו
    expect(timeOf(mix)).toBeLessThan(4);
  });

  it('produces a complete schedule for the longest track', () => {
    const result = computeMix(mix);
    expect(result.schedule.length).toBeGreaterThan(300);
    expect(result.summary.totalInterest).toBeGreaterThan(0);
  });
});
